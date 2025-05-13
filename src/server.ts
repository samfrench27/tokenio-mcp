import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { TOKEN_MEMBER_ID } from "./auth.js";
import {
  getMemberInfo,
  listAccounts,
  getAccountDetails,
  getAccountBalances,
  getAccountTransactions,
  createTransfer,
  initiateOpenBankingPayment,
  getPaymentStatus,
  createRecurringPaymentConsent,
  getConsentStatus,
  getBanks,
  getBankById
} from "./tokenio.js";

/**
 * Initialize and configure the MCP server with all the Token.io tools
 * @returns Configured MCP server instance
 */
export function initializeServer(): McpServer {
  // Create server instance
  const server = new McpServer({
    name: "Token.io MCP",
    version: "1.0.0",
    capabilities: {
      resources: {},
      tools: {},
    },
  });

  // Get member info
  server.tool(
    "tokenio-get-member-info",
    "Get Token.io member information",
    {},
    async ({ }) => {
      try {
        const memberInfo = await getMemberInfo();

        return {
          content: [
            {
              type: "text",
              text: `Member information: ${JSON.stringify(memberInfo, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve member information: " + error
            }
          ]
        };
      }
    }
  );

  // List accounts
  server.tool(
    "tokenio-list-accounts",
    "List all bank accounts linked to the Token.io member",
    {},
    async ({ }) => {
      try {
        const accounts = await listAccounts();

        return {
          content: [
            {
              type: "text",
              text: `Accounts: ${JSON.stringify(accounts, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to list accounts: " + error
            }
          ]
        };
      }
    }
  );

  // Get account details
  server.tool(
    "tokenio-get-account-details",
    "Get details for a specific bank account",
    {
      accountId: z.string().describe("The ID of the account to retrieve details for")
    },
    async ({ accountId }) => {
      try {
        const accountDetails = await getAccountDetails(accountId);

        return {
          content: [
            {
              type: "text",
              text: `Account details: ${JSON.stringify(accountDetails, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve account details: " + error
            }
          ]
        };
      }
    }
  );

  // Get account balances
  server.tool(
    "tokenio-get-account-balances",
    "Get balances for a specific bank account",
    {
      accountId: z.string().describe("The ID of the account to retrieve balances for")
    },
    async ({ accountId }) => {
      try {
        const balances = await getAccountBalances(accountId);

        return {
          content: [
            {
              type: "text",
              text: `Account balances: ${JSON.stringify(balances, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve account balances: " + error
            }
          ]
        };
      }
    }
  );

  // Get account transactions
  server.tool(
    "tokenio-get-account-transactions",
    "Get transactions for a specific bank account",
    {
      accountId: z.string().describe("The ID of the account to retrieve transactions for"),
      offset: z.number().optional().describe("Pagination offset"),
      limit: z.number().optional().describe("Pagination limit"),
      fromDate: z.string().optional().describe("Start date for transactions (YYYY-MM-DD)"),
      toDate: z.string().optional().describe("End date for transactions (YYYY-MM-DD)")
    },
    async ({ accountId, offset, limit, fromDate, toDate }) => {
      try {
        const transactions = await getAccountTransactions(accountId, offset, limit, fromDate, toDate);

        return {
          content: [
            {
              type: "text",
              text: `Account transactions: ${JSON.stringify(transactions, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve account transactions: " + error
            }
          ]
        };
      }
    }
  );

  // Create a transfer
  server.tool(
    "tokenio-create-transfer",
    "Create a money transfer from one account to another",
    {
      sourceAccountId: z.string().describe("ID of the source account"),
      destinationType: z.string().describe("Type of destination (ACCOUNT, BANK, SEPA)"),
      accountId: z.string().optional().describe("ID of the destination account (for ACCOUNT type)"),
      accountNumber: z.string().optional().describe("Account number (for BANK type)"),
      sortCode: z.string().optional().describe("Sort code (for BANK type)"),
      iban: z.string().optional().describe("IBAN (for SEPA type)"),
      bic: z.string().optional().describe("BIC (for SEPA type)"),
      accountName: z.string().describe("Name of the destination account holder"),
      amount: z.string().describe("Amount to transfer (e.g., '10.50')"),
      currency: z.string().describe("Currency code (e.g., 'GBP')"),
      description: z.string().describe("Description of the transfer"),
      reference: z.string().optional().describe("Payment reference")
    },
    async ({ 
      sourceAccountId, 
      destinationType, 
      accountId, 
      accountNumber, 
      sortCode, 
      iban, 
      bic, 
      accountName, 
      amount, 
      currency, 
      description, 
      reference 
    }) => {
      try {
        const transferRequest = {
          from: {
            accountId: sourceAccountId
          },
          to: {
            type: destinationType,
            accountId,
            accountNumber,
            sortCode,
            iban,
            bic,
            accountName
          },
          amount: {
            value: amount,
            currency
          },
          description,
          reference
        };

        const transfer = await createTransfer(transferRequest);

        return {
          content: [
            {
              type: "text",
              text: `Transfer created successfully: ${JSON.stringify(transfer, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to create transfer: " + error
            }
          ]
        };
      }
    }
  );

  // Initiate open banking payment
  server.tool(
    "tokenio-initiate-open-banking-payment",
    "Initiate an open banking payment",
    {
      amount: z.string().describe("Amount to transfer (e.g., '10.50')"),
      currency: z.string().describe("Currency code (e.g., 'GBP')"),
      description: z.string().describe("Description of the payment"),
      redirectUrl: z.string().describe("URL to redirect after payment completion"),
      bankId: z.string().optional().describe("ID of the bank to use"),
      reference: z.string().optional().describe("Payment reference"),
      callbackUrl: z.string().optional().describe("URL for payment status callbacks")
    },
    async ({ amount, currency, description, redirectUrl, bankId, reference, callbackUrl }) => {
      try {
        const paymentRequest = {
          amount: {
            value: amount,
            currency
          },
          description,
          redirectUrl,
          bankId,
          reference,
          callbackUrl
        };

        const payment = await initiateOpenBankingPayment(paymentRequest);

        return {
          content: [
            {
              type: "text",
              text: `Open Banking payment initiated: ${JSON.stringify(payment, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to initiate Open Banking payment: " + error
            }
          ]
        };
      }
    }
  );

  // Get payment status
  server.tool(
    "tokenio-get-payment-status",
    "Get the status of a payment",
    {
      paymentId: z.string().describe("ID of the payment to check")
    },
    async ({ paymentId }) => {
      try {
        const paymentStatus = await getPaymentStatus(paymentId);

        return {
          content: [
            {
              type: "text",
              text: `Payment status: ${JSON.stringify(paymentStatus, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve payment status: " + error
            }
          ]
        };
      }
    }
  );

  // Create recurring payment consent
  server.tool(
    "tokenio-create-recurring-payment-consent",
    "Create a consent for recurring payments",
    {
      bankId: z.string().describe("ID of the bank"),
      redirectUrl: z.string().describe("URL to redirect after consent approval"),
      callbackUrl: z.string().optional().describe("URL for consent status callbacks"),
      maxAmount: z.string().describe("Maximum amount per payment (e.g., '50.00')"),
      currency: z.string().describe("Currency code (e.g., 'GBP')"),
      frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).describe("Payment frequency"),
      validUntil: z.string().describe("Consent validity end date (ISO format, e.g., '2023-12-31')"),
      reference: z.string().optional().describe("Consent reference")
    },
    async ({ bankId, redirectUrl, callbackUrl, maxAmount, currency, frequency, validUntil, reference }) => {
      try {
        const consentRequest = {
          bankId,
          redirectUrl,
          callbackUrl,
          maxAmount: {
            value: maxAmount,
            currency
          },
          frequency,
          validUntil,
          reference
        };

        const consent = await createRecurringPaymentConsent(consentRequest);

        return {
          content: [
            {
              type: "text",
              text: `Recurring payment consent created: ${JSON.stringify(consent, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to create recurring payment consent: " + error
            }
          ]
        };
      }
    }
  );

  // Get consent status
  server.tool(
    "tokenio-get-consent-status",
    "Get the status of a consent",
    {
      consentId: z.string().describe("ID of the consent to check")
    },
    async ({ consentId }) => {
      try {
        const consentStatus = await getConsentStatus(consentId);

        return {
          content: [
            {
              type: "text",
              text: `Consent status: ${JSON.stringify(consentStatus, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve consent status: " + error
            }
          ]
        };
      }
    }
  );

  // Get list of banks with filtering options
  server.tool(
    "tokenio-get-banks",
    "Get a list of banks with optional filtering",
    {
      page: z.number().optional().describe("Page number for pagination"),
      perPage: z.number().optional().describe("Number of results per page (default: 200)"),
      sort: z.enum(["NAME", "COUNTRY", "STANDARD", "RANK"]).optional().describe("Sort order for results"),
      search: z.string().optional().describe("Search term to filter banks by name or identifier"),
      countries: z.array(z.string()).optional().describe("Filter banks by country codes (ISO 3166-1 alpha-2)"),
      bankGroup: z.array(z.string()).optional().describe("Filter banks by bank group names (e.g., 'HSBC', 'Coop')"),
      bankSubGroup: z.array(z.string()).optional().describe("Filter banks by bank sub-group names"),
      bankCode: z.string().optional().describe("Filter banks with a BIC (or BLZ, if German) that matches this code"),
      bics: z.array(z.string()).optional().describe("Filter banks by matching BICs"),
      openBankingStandards: z.array(z.string()).optional().describe("Filter banks by Open Banking standards they implement"),
      supportedLocalInstruments: z.array(z.string()).optional().describe("Filter banks by supported payment networks (e.g., SEPA, FASTER_PAYMENTS)"),
      supportsAccountList: z.boolean().optional().describe("Filter banks that support fetching accounts"),
      supportsAccountDetails: z.boolean().optional().describe("Filter banks that support fetching account details"),
      supportsAccountBalance: z.boolean().optional().describe("Filter banks that support fetching account balances"),
      supportsTransactionList: z.boolean().optional().describe("Filter banks that support fetching transactions"),
      supportsSinglePayment: z.boolean().optional().describe("Filter banks that support single immediate payments"),
      supportsScheduledPayment: z.boolean().optional().describe("Filter banks that support future dated payments"),
      supportsStandingOrder: z.boolean().optional().describe("Filter banks that support recurring payments/standing orders"),
      supportsFundsConfirmation: z.boolean().optional().describe("Filter banks that support confirmation of available funds"),
      supportsVariableRecurringPayment: z.boolean().optional().describe("Filter banks that support variable recurring payments")
    },
    async ({ 
      page, 
      perPage, 
      sort, 
      search, 
      countries, 
      bankGroup,
      bankSubGroup,
      bankCode,
      bics,
      openBankingStandards,
      supportedLocalInstruments, 
      supportsAccountList,
      supportsAccountDetails,
      supportsAccountBalance,
      supportsTransactionList,
      supportsSinglePayment, 
      supportsScheduledPayment,
      supportsStandingOrder,
      supportsFundsConfirmation,
      supportsVariableRecurringPayment 
    }) => {
      try {
        const banks = await getBanks({
          page,
          perPage,
          sort,
          search,
          countries,
          bankGroup,
          bankSubGroup,
          bankCode,
          bics,
          openBankingStandards,
          supportedLocalInstruments,
          supportsAccountList,
          supportsAccountDetails,
          supportsAccountBalance,
          supportsTransactionList,
          supportsSinglePayment,
          supportsScheduledPayment,
          supportsStandingOrder,
          supportsFundsConfirmation,
          supportsVariableRecurringPayment
        });

        return {
          content: [
            {
              type: "text",
              text: `Banks: ${JSON.stringify(banks, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve banks: " + error
            }
          ]
        };
      }
    }
  );

  // Get details for a specific bank
  server.tool(
    "tokenio-get-bank-details",
    "Get detailed information about a specific bank, including supported features, payment types, and authentication methods",
    {
      bankId: z.string().describe("ID of the bank to retrieve details for (e.g., 'ob-modelo', 'deutsche', 'barclays')")
    },
    async ({ bankId }) => {
      try {
        const bankDetails = await getBankById(bankId);

        // Format the response to be more user-friendly
        let formattedResponse = bankDetails;
        
        // If there's an error or empty response, return the raw data
        if (!bankDetails || bankDetails.error) {
          return {
            content: [
              {
                type: "text",
                text: `Bank details: ${JSON.stringify(bankDetails, null, 2)}`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Bank details: ${JSON.stringify(formattedResponse, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve bank details: " + error
            }
          ]
        };
      }
    }
  );

  return server;
} 