import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeServer } from "./server.js";

async function main() {
  // Create the MCP server
  const server = initializeServer();
  
  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect the server to the transport
  await server.connect(transport);
  
  console.log("Token.io MCP server started with stdio transport");
  
  // The server is now running and will continue until process is terminated
}

// Run the server
main().catch((err) => {
  console.error("Error running server:", err);
  process.exit(1);
}); 