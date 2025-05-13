import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeServer } from "./mcp_server.js";

async function main() {
  console.error("Initializing Token.io MCP server...");
  
  // Create the MCP server
  const server = initializeServer();
  
  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect the server to the transport
  await server.connect(transport);
  
  console.error("Token.io MCP server started with stdio transport");
  
  // The server is now running and will continue until process is terminated
}

// Run the server
main().catch((err) => {
  console.error("Error running Token.io MCP server:", err);
  process.exit(1);
}); 