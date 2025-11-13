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
