import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import 'dotenv/config';
import * as readline from 'readline';
const XEAMS_API_KEY = process.env.XEAMS_API_KEY;
const XEAMS_SECRET = process.env.XEAMS_SECRET;
const XEAMS_API_BASE = process.env.XEAMS_API_BASE || "https://xeams.yourcompanycom/api";
const SENDER_EMAIL = process.env.SENDER_EMAIL;
// Create an MCP server instance
const server = new McpServer({
    name: "xeams-mcp-server",
    version: "1.0.0",
});
async function isValidEmail(email) {
    try {
        // Call Xeams API to validate email address
        const url = new URL('/api/email/validate', XEAMS_API_BASE);
        url.searchParams.append('re', email);
        url.searchParams.append('se', SENDER_EMAIL || '');
        url.searchParams.append('deep', 'true');
        // Encode API key and secret for BASIC authentication
        const response = await fetchUrl(url);
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return -1;
        }
        const data = await response.json();
        return data.code || -2;
    }
    catch (error) {
        console.error('Error validating email:', error);
        return -3;
    }
}
async function fetchUrl(url) {
    const credentials = btoa(`${XEAMS_API_KEY || ''}:${XEAMS_SECRET || ''}`);
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        }
    });
    return response;
}
async function postUrl(url, body) {
    const credentials = btoa(`${XEAMS_API_KEY || ''}:${XEAMS_SECRET || ''}`);
    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    return response;
}
async function checkEmailStatus(email) {
    try {
        // Call Xeams API to validate email address
        const url = new URL('/api/email/status', XEAMS_API_BASE);
        url.searchParams.append('re', email);
        url.searchParams.append('se', SENDER_EMAIL || '');
        // Encode API key and secret for BASIC authentication
        const response = await fetchUrl(url);
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return [];
        }
        const data = await response.json();
        // Parse the JSON array and map to EmailStatus objects
        if (Array.isArray(data)) {
            return data.map((item) => ({
                status: item.status || 0,
                statusStr: item.statusStr || '',
                receivedOn: item.receivedOn ? new Date(item.receivedOn).toISOString() : '',
                sentOn: item.sentOn ? new Date(item.sentOn).toISOString() : '',
                subject: item.subject || '',
                senderIP: item.senderIP || '',
                recipientIP: item.recipientIP || '',
                inboundEncryption: item.inhoundEncryption || item.inboundEncryption || false, // Handle typo in API response
                outboundEncryption: item.outboundEncryption || false
            }));
        }
        return [];
    }
    catch (error) {
        console.error('Error validating email:', error);
        return [];
    }
}
async function getServerStatus() {
    try {
        const url = new URL('/api/server/status', XEAMS_API_BASE);
        url.searchParams.append('auth-key', XEAMS_API_KEY || '');
        url.searchParams.append('secret', XEAMS_SECRET || '');
        const response = await fetchUrl(url);
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return null;
        }
        return await response.json();
    }
    catch (error) {
        console.error('Error fetching server status:', error);
        return null;
    }
}
async function searchEmails(searchFor, numDays, profileId) {
    try {
        const url = new URL('/api/email/search', XEAMS_API_BASE);
        url.searchParams.append('auth-key', XEAMS_API_KEY || '');
        url.searchParams.append('secret', XEAMS_SECRET || '');
        const body = { searchFor };
        if (numDays !== undefined)
            body.numDays = numDays;
        if (profileId !== undefined)
            body.profileId = profileId;
        const response = await postUrl(url, body);
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return [];
        }
        const data = await response.json();
        return Array.isArray(data.ResultsArray) ? data.ResultsArray : [];
    }
    catch (error) {
        console.error('Error searching emails:', error);
        return [];
    }
}
function buildEmailFetchUrl(path, params) {
    const url = new URL(path, XEAMS_API_BASE);
    url.searchParams.append('auth-key', XEAMS_API_KEY || '');
    url.searchParams.append('secret', XEAMS_SECRET || '');
    url.searchParams.append('lcid', String(params.lcid));
    if (params.clusterIndex !== undefined)
        url.searchParams.append('clusterIndex', String(params.clusterIndex));
    if (params.profileId !== undefined)
        url.searchParams.append('profileId', String(params.profileId));
    if (params.startingDate !== undefined)
        url.searchParams.append('startingDate', params.startingDate);
    return url;
}
async function fetchEmailRaw(params) {
    try {
        const url = buildEmailFetchUrl('/api/email/fetch/raw', params);
        const response = await fetchUrl(url);
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return { code: response.status, description: '' };
        }
        return await response.json();
    }
    catch (error) {
        console.error('Error fetching raw email:', error);
        return { code: -3, description: '' };
    }
}
async function fetchEmailBody(params) {
    try {
        const url = buildEmailFetchUrl('/api/email/fetch/body', params);
        const response = await fetchUrl(url);
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return { code: response.status, description: '' };
        }
        return await response.json();
    }
    catch (error) {
        console.error('Error fetching email body:', error);
        return { code: -3, description: '' };
    }
}
async function fetchEmailAttachments(params) {
    try {
        const url = buildEmailFetchUrl('/api/email/fetch/attachments', params);
        const response = await fetchUrl(url);
        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return { code: response.status, description: '', attachments: [] };
        }
        const data = await response.json();
        return {
            code: data.code,
            description: data.description || '',
            attachments: Array.isArray(data.attachments) ? data.attachments : []
        };
    }
    catch (error) {
        console.error('Error fetching email attachments:', error);
        return { code: -3, description: '', attachments: [] };
    }
}
// Define the 'validateAddress' tool
server.registerTool("ValidateAddress", // Tool name
{
    title: "Validate Email Address",
    description: "Validates an email address",
    inputSchema: { email: z.string().email().describe("Email address to validate.") },
    outputSchema: { result: z.number().describe("1 if valid, 2 if email address has a syntax error, 3 if domain is invalid, 4 if the user does not exist, 5 if the test is inconclusive.") }
}, async ({ email }) => {
    // Execute function for the 'validateAddress' tool
    const result = await isValidEmail(email);
    return {
        content: [
            {
                type: "text",
                text: `Email ${email} is ${result === 1 ? 'valid' : 'invalid'} (result: ${result})`,
            },
        ],
        structuredContent: {
            result: result
        }
    };
});
//The CheckEmailStatus tool accepts one input parameter, email, which is a string representing the recipient's email address.
//It returns an array of objects. Each object contains the following fields:
// status: An integer indicating the status of the email (1 for delivered, 2 for failed, 3 for not found, 4 for quarantined, 5 for queued, 6 for received and 0 for processing).
// statusStr: A string providing a human-readable description of the email status.
// receivedOn: A string representing the date and time when the email was received in ISO 8601 format.
// sentOn: A string representing the date and time when the email was sent in ISO 8601 format.
// subject: A string representing the subject of the email.
// senderIP: A string representing the IP address of the sender.
// recipientIP: A string representing the recipient's SMTP server's IP address.
// inboundEncryption: A boolean indicating whether the inbound email was encrypted.
// outboundEncryption: A boolean indicating whether the outbound email was encrypted.
server.registerTool("CheckEmailStatus", {
    title: "Check Email Status",
    description: "Checks the status of an email that was sent and returns an array of email status objects.",
    inputSchema: { email: z.string().email().describe("Recipient's email address.") },
    outputSchema: {
        results: z.array(z.object({
            status: z.number().describe("Status code (1 for delivered, 2 for failed, 3 for not found, 4 for quarantined, 5 for queued, 6 for received, 0 for processing)"),
            statusStr: z.string().describe("Human-readable status description"),
            receivedOn: z.string().describe("Date and time when email was received (ISO 8601)"),
            sentOn: z.string().describe("Date and time when email was sent (ISO 8601)"),
            subject: z.string().describe("Email subject"),
            senderIP: z.string().describe("Sender's IP address"),
            recipientIP: z.string().describe("Recipient's SMTP server IP address"),
            inboundEncryption: z.boolean().describe("Whether inbound email was encrypted"),
            outboundEncryption: z.boolean().describe("Whether outbound email was encrypted")
        })).describe("Array of email status objects")
    }
}, async ({ email }) => {
    // Return MCP content format with structured data
    const results = await checkEmailStatus(email);
    return {
        content: [
            {
                type: "text",
                text: `Found ${results.length} email status record(s) for ${email}`,
            },
        ],
        structuredContent: {
            results: results
        }
    };
});
// Define the 'GetServerStatus' tool
server.registerTool("GetServerStatus", {
    title: "Get Server Status",
    description: "Fetches Xeams server status, including uptime, memory usage, disk space, and email queue counts.",
    inputSchema: {},
    outputSchema: {
        buildNo: z.number().describe("Build number"),
        runningSince: z.string().describe("Date and time the server started"),
        upTime: z.string().describe("Human-readable uptime"),
        maxMemory: z.string().describe("Maximum JVM memory"),
        allocatedMemory: z.string().describe("Allocated JVM memory"),
        freeMemory: z.string().describe("Free JVM memory"),
        incomingEmails: z.number().describe("Number of incoming emails"),
        outgoingEmails: z.number().describe("Number of outgoing emails"),
        stuckInOutboundQueue: z.number().describe("Number of emails stuck in the outbound queue"),
        processingQueue: z.number().describe("Number of emails currently being processed"),
        freeDisk: z.string().describe("Free disk space"),
        totalDisk: z.string().describe("Total disk space")
    }
}, async () => {
    const status = await getServerStatus();
    if (!status) {
        return {
            content: [{ type: "text", text: "Failed to fetch server status." }],
            isError: true
        };
    }
    return {
        content: [
            {
                type: "text",
                text: `Xeams build ${status.buildNo}, up ${status.upTime}. Memory: ${status.allocatedMemory}/${status.maxMemory} (${status.freeMemory} free). Disk: ${status.freeDisk} free of ${status.totalDisk}. Incoming: ${status.incomingEmails}, outgoing: ${status.outgoingEmails}, queued: ${status.processingQueue}, stuck: ${status.stuckInOutboundQueue}.`,
            },
        ],
        structuredContent: {
            buildNo: status.buildNo,
            runningSince: status.runningSince,
            upTime: status.upTime,
            maxMemory: status.maxMemory,
            allocatedMemory: status.allocatedMemory,
            freeMemory: status.freeMemory,
            incomingEmails: status.incomingEmails,
            outgoingEmails: status.outgoingEmails,
            stuckInOutboundQueue: status.stuckInOutboundQueue,
            processingQueue: status.processingQueue,
            freeDisk: status.freeDisk,
            totalDisk: status.totalDisk
        }
    };
});
// Define the 'SearchEmails' tool
server.registerTool("SearchEmails", {
    title: "Search Emails",
    description: "Searches for emails in Xeams matching a search string, optionally scoped to a number of days back and a profile ID. Returns matching messages with their lcid/clusterIndex, which can be used with FetchEmailRaw, FetchEmailBody, or FetchEmailAttachments.",
    inputSchema: {
        searchFor: z.string().describe("Text to search for."),
        numDays: z.number().int().optional().describe("Number of days back to search. If missing, the server default is used."),
        profileId: z.number().int().optional().describe("Profile ID to search within. If missing, the default profile is searched.")
    },
    outputSchema: {
        results: z.array(z.object({
            lcid: z.number().describe("LCID identifying the message"),
            clusterIndex: z.number().describe("Cluster index (-1 for master Xeams)"),
            subject: z.string().describe("Email subject"),
            date: z.number().describe("Date in milliseconds since Unix epoch"),
            score: z.number().describe("Spam/relevance score"),
            senderName: z.string().describe("Sender's display name"),
            senderEmail: z.string().describe("Sender's email address"),
            recipients: z.string().describe("Comma-separated list of recipients")
        })).describe("Array of matching messages")
    }
}, async ({ searchFor, numDays, profileId }) => {
    const results = await searchEmails(searchFor, numDays, profileId);
    return {
        content: [
            {
                type: "text",
                text: `Found ${results.length} email(s) matching "${searchFor}".`,
            },
        ],
        structuredContent: { results }
    };
});
const emailFetchInputSchema = {
    lcid: z.number().int().describe("LCID identifying the message, obtained from SearchEmails."),
    clusterIndex: z.number().int().optional().describe("Cluster index. -1 means the master Xeams. If missing, -1 is assumed."),
    profileId: z.number().int().optional().describe("Profile ID. If missing, 1 is assumed."),
    startingDate: z.string().optional().describe("Starting date to search for, in YYYY-MM-DD format. If missing, the server's message cache configuration is used.")
};
// Define the 'FetchEmailRaw' tool
server.registerTool("FetchEmailRaw", {
    title: "Fetch Raw Email",
    description: "Fetches the raw MIME content (*.eml) of an email, encoded in base64. Contains headers, body and attachments.",
    inputSchema: emailFetchInputSchema,
    outputSchema: {
        code: z.number().describe("200 on success, 404 if the email is not found."),
        description: z.string().describe("Base64 encoded EML content on success.")
    }
}, async ({ lcid, clusterIndex, profileId, startingDate }) => {
    const result = await fetchEmailRaw({ lcid, clusterIndex, profileId, startingDate });
    const found = result.code === 200;
    return {
        content: [
            {
                type: "text",
                text: found
                    ? `Fetched raw EML for lcid ${lcid} (base64, ${result.description.length} chars).`
                    : `Email with lcid ${lcid} not found (code: ${result.code}).`,
            },
        ],
        structuredContent: result
    };
});
// Define the 'FetchEmailBody' tool
server.registerTool("FetchEmailBody", {
    title: "Fetch Email Body",
    description: "Fetches the body of an email, encoded in base64. HTML body is preferred over plain text when both are present.",
    inputSchema: emailFetchInputSchema,
    outputSchema: {
        code: z.number().describe("200 on success, 404 if the email is not found."),
        description: z.string().describe("Base64 encoded email body on success.")
    }
}, async ({ lcid, clusterIndex, profileId, startingDate }) => {
    const result = await fetchEmailBody({ lcid, clusterIndex, profileId, startingDate });
    const found = result.code === 200;
    return {
        content: [
            {
                type: "text",
                text: found
                    ? `Fetched body for lcid ${lcid} (base64, ${result.description.length} chars).`
                    : `Email with lcid ${lcid} not found (code: ${result.code}).`,
            },
        ],
        structuredContent: result
    };
});
// Define the 'FetchEmailAttachments' tool
server.registerTool("FetchEmailAttachments", {
    title: "Fetch Email Attachments",
    description: "Fetches the attachments of an email. Each attachment's content is base64 encoded.",
    inputSchema: emailFetchInputSchema,
    outputSchema: {
        code: z.number().describe("200 on success, 404 if the email is not found."),
        description: z.string().describe("Arbitrary description."),
        attachments: z.array(z.object({
            content: z.string().describe("Base64 encoded file content"),
            name: z.string().describe("File name"),
            type: z.string().optional().describe("MIME type"),
            inline: z.boolean().optional().describe("True if the image is part of the HTML content"),
            "content-id": z.string().optional().describe("Content ID, used for inline images")
        })).describe("Array of attachments")
    }
}, async ({ lcid, clusterIndex, profileId, startingDate }) => {
    const result = await fetchEmailAttachments({ lcid, clusterIndex, profileId, startingDate });
    const found = result.code === 200;
    return {
        content: [
            {
                type: "text",
                text: found
                    ? `Found ${result.attachments.length} attachment(s) for lcid ${lcid}: ${result.attachments.map(a => a.name).join(', ') || 'none'}.`
                    : `Email with lcid ${lcid} not found (code: ${result.code}).`,
            },
        ],
        structuredContent: result
    };
});
let testEmail = "support@AnInvalidDomain.com";
let isTest = false;
for (const arg of process.argv) {
    if (arg === '--test') {
        isTest = true;
    }
    if (arg.startsWith('--testEmail=')) {
        testEmail = arg.split('=')[1];
    }
}
if (isTest) {
    // Run test code. This is useful for debugging outside of an MCP environment.
    const r1 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    r1.question('Enter an email to validate: ', async (inputEmail) => {
        const result = await isValidEmail(inputEmail);
        console.log(`Email Validation Result for ${inputEmail}: ${result}`);
        r1.question("Enter a recipient's email to check status: ", async (inputEmail2) => {
            const statusResults = await checkEmailStatus(inputEmail2);
            console.log(`Email Status Results for ${inputEmail2}:`, statusResults);
            r1.close();
        });
    });
}
else {
    // Create a standard I/O transport
    const transport = new StdioServerTransport();
    // Connect the server to the transport
    await server.connect(transport);
}
