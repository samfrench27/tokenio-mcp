# Token.io MCP Server for Claude AI

A Model Context Protocol (MCP) server that enables Claude AI to interact with Token.io banking APIs. This server allows Claude to perform various financial operations through natural language requests.

## Author

Developed by Sam French (samfrench.io)

## License

This project is released under the MIT License. See the LICENSE file for details.

## Features

- **Bank Information Retrieval**: Look up banks by name, country, or payment network support
- **Payment Link Generation**: Generate payment links for GBP or EUR currencies
- **Account Information Services (AIS)**: Access account information, balances, and transactions with user consent
- **Claude AI Integration**: Seamless integration with Claude AI through the Model Context Protocol
- **Secure API Integration**: Uses the Token.io sandbox environment for safe testing

## How It Works

This project creates a bridge between Claude AI and the Token.io banking API using the Model Context Protocol (MCP). When you interact with Claude, it can:

1. Recognize your intent to perform a banking operation
2. Extract relevant parameters from your request
3. Call the appropriate Token.io API through the MCP server
4. Return useful financial information or generate links

## Example Conversations

**User**: "Show me banks in the UK that support faster payments"

**Claude**: "Here are banks in the UK that support faster payments: [list of banks]"

**User**: "Create a payment link for £50 that redirects to my website after completion"

**Claude**: "I've created a payment link for you. Here it is: https://app.sandbox.token.io/session/[token-id]"

**User**: "Connect to my Barclays bank account to view my transactions"

**Claude**: "I'll help you connect to your Barclays account. Please follow this link to authorize access: [authorization URL]"

**User**: "Show me my latest transactions from my connected bank account"

**Claude**: "Here are your recent transactions: [transaction data]"

## Account Information Services (AIS) Flow

The AIS functionality follows this flow:

1. **Create Token Request**: Initiate a request to access account information
2. **Bank Authorization**: Generate a URL for the user to authenticate with their bank
3. **Retrieve Access Token**: Obtain an access token after successful authorization
4. **Access Account Data**: Use the token to fetch accounts, balances, and transactions

## Technical Implementation

The server is built using:

- Node.js
- Model Context Protocol SDK (@modelcontextprotocol/sdk)
- Token.io API
- Zod for validation

The architecture consists of:

- **mcp_server.js**: Defines the tools and their functionality
- **mcp_index.js**: Sets up the stdio transport to connect with Claude

## Setup

### Prerequisites

- Node.js (v14 or later)
- npm
- Claude Desktop (or compatible Claude interface)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/samfrench27/tokenio-mcp.git
cd tokenio-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration with Claude Desktop

To use this MCP server with Claude Desktop:

1. Locate your Claude Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the Token.io MCP server to your configuration:

```json
{
  "mcpServers": {
    "tokenio": {
      "command": "node",
      "args": [
        "/path/to/tokenio-mcp/mcp_index.js"
      ]
    }
  }
}
```

Replace `/path/to/tokenio-mcp` with the actual path to this project on your system.

## Available Tools

The MCP server currently exposes these tools:

### Bank Information
- `tokenio-get-banks`: Get a list of banks with optional filtering
- `tokenio-get-bank-details`: Get detailed information about a specific bank

### Payments
- `tokenio-create-payment-link`: Generate a payment link for a specific amount and currency

### Account Information Services (AIS)
- `tokenio-create-ais-token-request`: Create an AIS token request for accessing accounts
- `tokenio-initiate-bank-authorization`: Initiate the bank authorization process
- `tokenio-get-token-request-result`: Get the access token after authorization
- `tokenio-get-accounts`: Retrieve all linked bank accounts
- `tokenio-get-account-balance`: Get balance information for a specific account
- `tokenio-get-account-transactions`: Get transaction history for a specific account

The architecture is designed to be extensible, allowing additional Token.io functionality to be added as needed.

## Extensibility

The MCP server is designed with extensibility in mind. Additional banking operations can be added to the server by:

1. Implementing new API functions in the tokenio.js module
2. Adding new tool definitions in the mcp_server.js file
3. Registering the tools with the MCP server

## Disclaimer

This project is for demonstration purposes only. It is not officially endorsed or supported by Token.io. The integration uses the Token.io sandbox environment and should not be used for production purposes without proper security review and enhancements. 