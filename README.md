# Token.io Payment Link Generator for Claude AI

A Model Context Protocol (MCP) server that enables Claude AI to generate payment links and retrieve bank information through the Token.io API.

## Author

Developed by Sam French (samfrench.io)

## License

This project is released under the MIT License. See the LICENSE file for details.

## Features

- **Payment Link Generation**: Generate payment links for GBP or EUR currencies through natural language requests
- **Bank Information Retrieval**: Look up banks by name, country, or payment network support
- **Claude AI Integration**: Seamless integration with Claude AI through the Model Context Protocol
- **Secure API Integration**: Uses the Token.io sandbox environment for safe testing

## How It Works

This project creates a bridge between Claude AI and the Token.io payment API using the Model Context Protocol (MCP). When you ask Claude to generate a payment link, it:

1. Recognizes your intent to create a payment link
2. Extracts parameters like currency, amount, and description from your request
3. Calls the Token.io API through the MCP server
4. Returns a payment link that can be used to complete the transaction

## Example Conversations

**User**: "Create a payment link for £50 that redirects to my website after completion"

**Claude**: "I'll create a payment link for you. Here's your payment link: https://app.sandbox.token.io/session/[token-id]"

**User**: "Show me banks in the UK that support faster payments"

**Claude**: "Here are banks in the UK that support faster payments: [list of banks]"

## Technical Implementation

The server is built using:

- Node.js
- Model Context Protocol SDK (@modelcontextprotocol/sdk)
- Token.io API
- Zod for validation

The architecture consists of:

- **mcp_server.js**: Defines the tools and their functionality (payment link generation, bank lookup)
- **mcp_index.js**: Sets up the stdio transport to connect with Claude

## Setup

### Prerequisites

- Node.js (v14 or later)
- npm
- Claude Desktop (or compatible Claude interface)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/samfrench/tokenio-payment-link-generator.git
cd tokenio-payment-link-generator
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
        "/path/to/tokenio-payment-link-generator/mcp_index.js"
      ]
    }
  }
}
```

Replace `/path/to/tokenio-payment-link-generator` with the actual path to this project on your system.

## Available Tools

The MCP server exposes these tools:

- `tokenio-get-banks`: Get a list of banks with optional filtering
- `tokenio-get-bank-details`: Get detailed information about a specific bank
- `tokenio-create-payment-link`: Generate a payment link for a specific amount and currency

## Disclaimer

This project is for demonstration purposes only. It is not officially endorsed or supported by Token.io. The integration uses the Token.io sandbox environment and should not be used for production purposes without proper security review and enhancements. 