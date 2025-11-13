# Xeams MCP Server
An MCP server implementation for Xeams, an on-premise email server.

## Features
- Exposes a Model Context Protocol (MCP) server for querying email status on an on-premise email server.
- This MCP server works with Xeams, an on-premise email server with %100 privacy. 
- You can use this server with any MCP client, or AI tools such as Claude Desktop to:
	- Validate email addresses
	- Check the status of outbound emails sent.
	
## Requirement
- Xeams server, version 9.9 or newer
- Node.js
 
## Setup

1. **Clone the repository:**
	```sh
	git clone https://github.com/Synametrics/xeams-mcp-server
	cd xeams-mcp-server
	```

2. **Install dependencies**
	```sh
	npm install
	```

3. **Configure environment variables:**
- Copy `.env.sample` to `.env`:
	```sh
     cp .env.sample .env
    ```
- Edit `.env` and fill in your Xeams API and Secret.

   | Variable               | Description                                      | Required |
   |------------------------|--------------------------------------------------|----------|
   | XEAMS_API_KEY          | Xeams API Key                                    | Yes      |
   | XEAMS_SECRET           | Xeams API Secret                                 | Yes      |
   | XEAMS_API_BASE         | URL for your Xeams server                        | Yes      |
   | SENDER_EMAIL           | Email address used for sender's address.         | Yes      |
   
4. **Configuring Xeams**
- Download and install Xeams if needed, from [https://www.xeams.com](https://www.xeams.com)
- Log into your Xeams console with your administrator's credentials
- Click **Home > Plugins**, and click the **Manage** button for Xeams API
- Create new API Key and grant permission to send emails.
- Copy the generated API key and secret to the environment file seen above.

## Running the MCP Server
Use the following command to run the server manually:
```sh
node index.js
```

## Testing Communication with Xeams
To ensure your API key and secret values are working, use the `--test` parameter, as shown below.
```sh
node index.js --test
```

## Use Case
Imagine you're working on implementing a Chatbot for your organization where your customers can ask questions about their recent orders. Using this MCP server, you can query your email server to determine if an email containing the recent purchase and order confirmation was sent to the client and if the recipient's SMTP server received the message.

Additionally, you can also confirm if an email address specified by a user is correct. This check is more than a simple syntax check. The MCP server actually connects to the recipient's SMTP server to confirm the user exists.


## Configuration with Claude Desktop
To install this MCP server using Claude Desktop, follow the steps below.

- Download and install Claude Desktop from [https://www.claude.com/download](https://www.claude.com/download).
- Click **File > Settings* after clicking the hamburger icon on the upper left hand corner.
- Click **Edit Config**
- Copy/paste the following JSON snippet into the claude_desktop_config.json file.
```json
{
  "mcpServers": {
    "Xeams-MCP-Server": {
      "command": "node",
      "args": ["C:\\path\\to\\the\\downloaded\\file\\index.js"],
      "env": {
        "XEAMS_API_KEY": "YourAPIKey",
        "XEAMS_SECRET": "YourAPISecret",
        "XEAMS_API_BASE": "https://mail.yourserver.com",
        "SENDER_EMAIL": "you@yourcompany.com"
      }
    }
  }
}

```
- Restart Claude

Once done, you should be able to submits prompts like:

```txt
Please confirm if john.doe@example.com is a valid email address.
```

```txt
I sent an email to aFriend@example.com yesterday. Did he get my message?
```

## Available tools
This MCP server exposes two tools to any MCP client:

1. Validate email address, allowing a user to validate if an email address is correct. This validation is more than a simple syntax check. It confirms the domain name has an MX record and the user's address exists in the recipient's server.
2. Confirms the status of a previously sent email. In this case, it will report the status of the message, the IP address of the receiving SMTP server and if encryption was used.



