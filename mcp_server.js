import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBanks, getBankById } from "./build/tokenio.js";
import fetch from "node-fetch";

// Environment configurables for Token.io Payment API
const API_BASE_URL = 'https://api.sandbox.token.io';
const WEB_APP_BASE_URL = 'https://app.sandbox.token.io/session';
const TOKEN_API_KEY = 'bS0zY25ia2M5NlR5MWlQQlhSTWZEU2pidTM5SlAzLTV6S3RYRUFxOmFlNjJjNmRkLWY0YjItNDQ5MC1iMGNkLTgyZGFkZWFlMDMzYQ==';
const TOKEN_MEMBER_ID = 'm:3cnbkc96Ty1iPBXRMfDSjbu39JP3:5zKtXEAq';

// URLs for callbacks
const DEFAULT_REDIRECT_URL = 'https://samfrench.io/callback';

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
 * Create an Account Information Services (AIS) token request
 * @param {string} redirectUrl URL to redirect after authorization
 * @param {Array<string>} resourceTypes Resources to access (e.g., ACCOUNTS, BALANCES, TRANSACTIONS)
 * @param {boolean} userPresent Whether the user is present in the session
 * @returns {Promise<Object>} The token request response
 */
async function createAisTokenRequest(redirectUrl, resourceTypes, userPresent = true) {
    console.error(`Creating AIS token request`);
    
    // Build the request payload
    const requestBody = {
        "requestPayload": {
            "to": {
                "alias": {"realmId": "m:pnH2XbpZQcXoUF8q3x3riSAV6hk:5zKtXEAq", "type": "DOMAIN", "value": "samfrench.io"},
                "id": TOKEN_MEMBER_ID
            },
            "accessBody": {
                "resources": resourceTypes
            },
            "callbackState": { 
                "innerState": generateRefId().toString(),
                "successUrl": redirectUrl,
                "failureUrl": redirectUrl
            },
            "refId": generateRefId().toString(),
            "userRefId": generateRefId().toString(),
            "redirectUrl": redirectUrl
        }
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/token-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${TOKEN_API_KEY}`,
                'customer-initiated': userPresent ? 'true' : 'false'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data && data.tokenRequest && data.tokenRequest.id) {
            console.error(`AIS token request created: ${data.tokenRequest.id}`);
            return data;
        } else {
            console.error('Error creating AIS token request:', data);
            throw new Error('Failed to create AIS token request');
        }
    } catch (error) {
        console.error('Error during API call:', error);
        throw error;
    }
}

/**
 * Initiate bank authorization for an AIS token request
 * @param {string} tokenRequestId The token request ID
 * @param {string} bankId The bank ID to authorize with
 * @returns {Promise<string>} The authorization URL
 */
async function initiateBankAuthorization(tokenRequestId, bankId) {
    console.error(`Initiating bank authorization: ${tokenRequestId} with bank ${bankId}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/token-requests/${tokenRequestId}/authorization`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${TOKEN_API_KEY}`
            },
            body: JSON.stringify({
                bankId: bankId
            })
        });
        
        const data = await response.json();
        
        if (data && data.url) {
            console.error(`Bank authorization URL created: ${data.url}`);
            return data.url;
        } else {
            console.error('Error initiating bank authorization:', data);
            throw new Error('Failed to initiate bank authorization');
        }
    } catch (error) {
        console.error('Error during API call:', error);
        throw error;
    }
}

/**
 * Get the result of a token request (access token)
 * @param {string} tokenRequestId The token request ID
 * @returns {Promise<Object>} The token result
 */
async function getTokenRequestResult(tokenRequestId) {
    console.error(`Getting token request result: ${tokenRequestId}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/token-requests/${tokenRequestId}/result`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${TOKEN_API_KEY}`
            }
        });
        
        const data = await response.json();
        
        if (data && data.status === 'SUCCESS' && data.tokenId) {
            console.error(`Token request succeeded: ${data.tokenId}`);
            return data;
        } else if (data && data.status === 'PENDING') {
            console.error(`Token request still pending`);
            return data;
        } else {
            console.error('Error getting token result:', data);
            throw new Error('Failed to get token result');
        }
    } catch (error) {
        console.error('Error during API call:', error);
        throw error;
    }
}

/**
 * Get account information using an access token
 * @param {string} accessToken The access token (tokenId)
 * @returns {Promise<Object>} Account information
 */
async function getAccounts(accessToken) {
    console.error(`Getting accounts with token: ${accessToken}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/accounts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${TOKEN_API_KEY}`,
                'on-behalf-of': accessToken
            }
        });
        
        const data = await response.json();
        
        if (data && data.accounts) {
            console.error(`Retrieved ${data.accounts.length} accounts`);
            return data;
        } else {
            console.error('Error getting accounts:', data);
            throw new Error('Failed to get accounts');
        }
    } catch (error) {
        console.error('Error during API call:', error);
        throw error;
    }
}

/**
 * Get account balance
 * @param {string} accessToken The access token (tokenId)
 * @param {string} accountId The account ID
 * @returns {Promise<Object>} Account balance information
 */
async function getAccountBalance(accessToken, accountId) {
    console.error(`Getting balance for account: ${accountId}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/balance`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${TOKEN_API_KEY}`,
                'on-behalf-of': accessToken
            }
        });
        
        const data = await response.json();
        
        if (data && data.balances) {
            console.error(`Retrieved balances for account ${accountId}`);
            return data;
        } else {
            console.error('Error getting account balance:', data);
            throw new Error('Failed to get account balance');
        }
    } catch (error) {
        console.error('Error during API call:', error);
        throw error;
    }
}

/**
 * Get account transactions
 * @param {string} accessToken The access token (tokenId)
 * @param {string} accountId The account ID
 * @param {Object} options Additional options (fromDate, toDate, offset, limit)
 * @returns {Promise<Object>} Account transactions
 */
async function getAccountTransactions(accessToken, accountId, options = {}) {
    console.error(`Getting transactions for account: ${accountId}`);
    
    // Build query string
    const queryParams = new URLSearchParams();
    if (options.fromDate) queryParams.append('fromDate', options.fromDate);
    if (options.toDate) queryParams.append('toDate', options.toDate);
    if (options.offset) queryParams.append('offset', options.offset);
    if (options.limit) queryParams.append('limit', options.limit);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/transactions${queryString}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${TOKEN_API_KEY}`,
                'on-behalf-of': accessToken
            }
        });
        
        const data = await response.json();
        
        if (data && data.transactions) {
            console.error(`Retrieved ${data.transactions.length} transactions for account ${accountId}`);
            return data;
        } else {
            console.error('Error getting account transactions:', data);
            throw new Error('Failed to get account transactions');
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

  // Create AIS token request
  server.tool(
    "tokenio-create-ais-token-request",
    "Create an Account Information Services (AIS) token request",
    {
      redirectUrl: z.string().describe("URL to redirect after bank authorization"),
      resourceTypes: z.array(z.enum(["ACCOUNTS", "BALANCES", "TRANSACTIONS"])).describe("Resources to access"),
      userPresent: z.boolean().optional().describe("Whether the user is present in the session")
    },
    async ({ redirectUrl, resourceTypes, userPresent }) => {
      try {
        console.error(`Creating AIS token request for resources: ${resourceTypes.join(', ')}`);
        
        const tokenRequest = await createAisTokenRequest(
          redirectUrl || DEFAULT_REDIRECT_URL,
          resourceTypes,
          userPresent !== undefined ? userPresent : true
        );
        
        return {
          content: [
            {
              type: "text",
              text: `AIS token request created. Request ID: ${tokenRequest.tokenRequest.id}`
            }
          ],
          tokenRequestId: tokenRequest.tokenRequest.id
        };
      } catch (error) {
        console.error("Failed to create AIS token request:", error);
        return {
          content: [
            {
              type: "text",
              text: "Failed to create AIS token request: " + error.message
            }
          ]
        };
      }
    }
  );

  // Initiate bank authorization
  server.tool(
    "tokenio-initiate-bank-authorization",
    "Initiate the bank authorization process for an AIS token request",
    {
      tokenRequestId: z.string().describe("Token request ID to authorize"),
      bankId: z.string().describe("ID of the bank to authorize with")
    },
    async ({ tokenRequestId, bankId }) => {
      try {
        console.error(`Initiating bank authorization for request: ${tokenRequestId} with bank: ${bankId}`);
        
        const authUrl = await initiateBankAuthorization(tokenRequestId, bankId);
        
        return {
          content: [
            {
              type: "text",
              text: `Bank authorization initiated. Please direct the user to this URL to authenticate with their bank:`
            },
            {
              type: "text",
              text: authUrl
            }
          ],
          authorizationUrl: authUrl
        };
      } catch (error) {
        console.error("Failed to initiate bank authorization:", error);
        return {
          content: [
            {
              type: "text",
              text: "Failed to initiate bank authorization: " + error.message
            }
          ]
        };
      }
    }
  );

  // Get token request result (access token)
  server.tool(
    "tokenio-get-token-request-result",
    "Check the status of a token request and get the access token if available",
    {
      tokenRequestId: z.string().describe("Token request ID to check")
    },
    async ({ tokenRequestId }) => {
      try {
        console.error(`Getting token request result for: ${tokenRequestId}`);
        
        const result = await getTokenRequestResult(tokenRequestId);
        
        if (result.status === 'SUCCESS') {
          return {
            content: [
              {
                type: "text",
                text: `Token request succeeded. Access token: ${result.tokenId}`
              }
            ],
            accessToken: result.tokenId,
            status: 'SUCCESS'
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Token request status: ${result.status}`
              }
            ],
            status: result.status
          };
        }
      } catch (error) {
        console.error("Failed to get token request result:", error);
        return {
          content: [
            {
              type: "text",
              text: "Failed to get token request result: " + error.message
            }
          ]
        };
      }
    }
  );

  // Get accounts
  server.tool(
    "tokenio-get-accounts",
    "Get information for all linked bank accounts",
    {
      accessToken: z.string().describe("Access token (tokenId) obtained from authorization")
    },
    async ({ accessToken }) => {
      try {
        console.error(`Getting accounts with access token: ${accessToken}`);
        
        const accountsData = await getAccounts(accessToken);
        
        return {
          content: [
            {
              type: "text",
              text: `Retrieved ${accountsData.accounts.length} accounts:`
            },
            {
              type: "text",
              text: JSON.stringify(accountsData, null, 2)
            }
          ],
          accounts: accountsData.accounts
        };
      } catch (error) {
        console.error("Failed to get accounts:", error);
        return {
          content: [
            {
              type: "text",
              text: "Failed to get accounts: " + error.message
            }
          ]
        };
      }
    }
  );

  // Get account balance
  server.tool(
    "tokenio-get-account-balance",
    "Get balance information for a specific account",
    {
      accessToken: z.string().describe("Access token (tokenId) obtained from authorization"),
      accountId: z.string().describe("ID of the account to get balance for")
    },
    async ({ accessToken, accountId }) => {
      try {
        console.error(`Getting balance for account: ${accountId}`);
        
        const balanceData = await getAccountBalance(accessToken, accountId);
        
        return {
          content: [
            {
              type: "text",
              text: `Account balance information:`
            },
            {
              type: "text",
              text: JSON.stringify(balanceData, null, 2)
            }
          ],
          balances: balanceData.balances
        };
      } catch (error) {
        console.error("Failed to get account balance:", error);
        return {
          content: [
            {
              type: "text",
              text: "Failed to get account balance: " + error.message
            }
          ]
        };
      }
    }
  );

  // Get account transactions
  server.tool(
    "tokenio-get-account-transactions",
    "Get transaction history for a specific account",
    {
      accessToken: z.string().describe("Access token (tokenId) obtained from authorization"),
      accountId: z.string().describe("ID of the account to get transactions for"),
      fromDate: z.string().optional().describe("Start date for transactions (YYYY-MM-DD)"),
      toDate: z.string().optional().describe("End date for transactions (YYYY-MM-DD)"),
      offset: z.number().optional().describe("Pagination offset"),
      limit: z.number().optional().describe("Maximum number of transactions to return")
    },
    async ({ accessToken, accountId, fromDate, toDate, offset, limit }) => {
      try {
        console.error(`Getting transactions for account: ${accountId}`);
        
        const options = {};
        if (fromDate) options.fromDate = fromDate;
        if (toDate) options.toDate = toDate;
        if (offset !== undefined) options.offset = offset;
        if (limit !== undefined) options.limit = limit;
        
        const transactionsData = await getAccountTransactions(accessToken, accountId, options);
        
        return {
          content: [
            {
              type: "text",
              text: `Retrieved ${transactionsData.transactions.length} transactions:`
            },
            {
              type: "text",
              text: JSON.stringify(transactionsData, null, 2)
            }
          ],
          transactions: transactionsData.transactions
        };
      } catch (error) {
        console.error("Failed to get account transactions:", error);
        return {
          content: [
            {
              type: "text",
              text: "Failed to get account transactions: " + error.message
            }
          ]
        };
      }
    }
  );

  return server;
} 