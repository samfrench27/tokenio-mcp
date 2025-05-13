import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBanks, getBankById } from "./build/tokenio.js";
import fetch from "node-fetch";

// Environment configurables for Token.io Payment API
const API_BASE_URL = 'https://api.sandbox.token.io';
const WEB_APP_BASE_URL = 'https://app.sandbox.token.io/session';
const TOKEN_API_KEY = 'bS0zY25ia2M5NlR5MWlQQlhSTWZEU2pidTM5SlAzLTV6S3RYRUFxOmFlNjJjNmRkLWY0YjItNDQ5MC1iMGNkLTgyZGFkZWFlMDMzYQ==';
const TOKEN_MEMBER_ID = 'm:3cnbkc96Ty1iPBXRMfDSjbu39JP3:5zKtXEAq';

// Generate random RefID
const generateRefId = () => {
    return Math.floor(Math.random() * 9000000000) + 1000000000;
};

/**
 * Create a payment link using Token.io API
 * @param {string} currency Currency code (GBP or EUR)
 * @param {string} amountValue Amount to be paid
 * @param {string} redirectUrl URL to redirect after payment
 * @param {string} description Description of the payment
 * @returns {Promise<string>} Payment link URL
 */
async function createPaymentLink(currency, amountValue, redirectUrl, description) {
    console.error(`Creating payment link: ${currency} ${amountValue}`);
    
    // Set transfer destinations based on currency
    let transferDestinations;
    if (currency === 'GBP') {
        transferDestinations = {
            "fasterPayments": {
                "sortCode": "050005",
                "accountNumber": "05251199"
            },
            "customerData": {
                "legalNames": ["Sams coffee shop"]
            }
        };
    } else if (currency === 'EUR') {
        transferDestinations = {
            "sepa": {
                "iban": "FR1420041010050500013M02606"
            },
            "customerData": {
                "legalNames": ["Sams coffee shop"]
            }
        };
    } else {
        throw new Error(`Unsupported currency: ${currency}`);
    }
    
    // Create the request payload
    const requestBody = {
        "requestPayload": {
            "to": {
                "alias": {"realmId": "m:pnH2XbpZQcXoUF8q3x3riSAV6hk:5zKtXEAq", "type": "DOMAIN", "value": "samfrench.io"},
                "id": TOKEN_MEMBER_ID
            },
            "transferBody": {
                "currency": currency,
                "lifetimeAmount": amountValue,
                "instructions": {
                    "transferDestinations": [transferDestinations]
                }
            },
            "description": description || "Payment",
            "refId": generateRefId(),
            "redirectUrl": redirectUrl
        }
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/token-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${TOKEN_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data && data.tokenRequest && data.tokenRequest.id) {
            const sipConsentId = data.tokenRequest.id;
            const paymentUrl = `${WEB_APP_BASE_URL}/${sipConsentId}`;
            console.error(`Payment link created: ${paymentUrl}`);
            return paymentUrl;
        } else {
            console.error('Error creating payment link:', data);
            throw new Error('Failed to create payment link');
        }
    } catch (error) {
        console.error('Error during API call:', error);
        throw error;
    }
}

/**
 * Initialize and configure the MCP server with Token.io banking tools
 * @returns Configured MCP server instance
 */
export function initializeServer() {
  // Create server instance
  const server = new McpServer({
    name: "Token.io MCP",
    version: "1.0.0",
    capabilities: {
      resources: {},
      tools: {},
    },
  });

  // Get banks
  server.tool(
    "tokenio-get-banks",
    "Get a list of banks with optional filtering",
    {
      search: z.string().optional().describe("Search term to filter banks by name"),
      countries: z.array(z.string()).optional().describe("Filter banks by country codes (ISO 3166-1 alpha-2)"),
      supportedLocalInstruments: z.array(z.string()).optional().describe("Filter banks by supported payment networks (e.g., SEPA, FASTER_PAYMENTS)")
    },
    async ({ search, countries, supportedLocalInstruments }) => {
      try {
        console.error(`Fetching banks with params: ${JSON.stringify({ search, countries, supportedLocalInstruments })}`);
        
        const queryOptions = {};
        if (search) queryOptions.search = search;
        if (countries) queryOptions.countries = countries;
        if (supportedLocalInstruments) queryOptions.supportedLocalInstruments = supportedLocalInstruments;
        
        const banks = await getBanks(queryOptions);
        
        console.error("Successfully retrieved banks data");
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(banks, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error("Failed to retrieve banks:", error);
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve banks: " + error.message
            }
          ]
        };
      }
    }
  );

  // Get bank details
  server.tool(
    "tokenio-get-bank-details",
    "Get detailed information about a specific bank",
    {
      bankId: z.string().describe("ID of the bank to retrieve details for (e.g., 'ob-modelo', 'deutsche', 'barclays')")
    },
    async ({ bankId }) => {
      try {
        console.error(`Fetching bank details for: ${bankId}`);
        
        const bankDetails = await getBankById(bankId);
        
        console.error("Successfully retrieved bank details");
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(bankDetails, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error("Failed to retrieve bank details:", error);
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve bank details: " + error.message
            }
          ]
        };
      }
    }
  );
  
  // Create payment link
  server.tool(
    "tokenio-create-payment-link",
    "Generate a payment link for a specific amount and currency",
    {
      currency: z.enum(["GBP", "EUR"]).describe("Currency code (GBP or EUR)"),
      amount: z.string().describe("Amount to be paid"),
      redirectUrl: z.string().describe("URL to redirect after payment"),
      description: z.string().optional().describe("Description of the payment")
    },
    async ({ currency, amount, redirectUrl, description }) => {
      try {
        console.error(`Creating payment link for ${amount} ${currency}`);
        
        const paymentLink = await createPaymentLink(
          currency,
          amount,
          redirectUrl,
          description || "Payment via Token.io"
        );
        
        return {
          content: [
            {
              type: "text",
              text: `Payment link created: ${paymentLink}`
            }
          ]
        };
      } catch (error) {
        console.error("Failed to create payment link:", error);
        return {
          content: [
            {
              type: "text",
              text: "Failed to create payment link: " + error.message
            }
          ]
        };
      }
    }
  );

  return server;
} 