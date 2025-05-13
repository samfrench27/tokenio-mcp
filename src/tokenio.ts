import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { API_KEY, CLIENT_ID, TOKEN_MEMBER_ID, TPP_ID, BASE_URI, SANDBOX_URI, USE_SANDBOX } from "./auth.js";

// Configuration with default values that can be overridden
export const config = {
  userAgent: 'tokenio-mcp/1.0.0',
  tokenExpiryFallbackSeconds: 1800, // 30 minutes fallback if expires_in is not present
  tokenExpiryBufferMs: 60000, // 60 second buffer for token validity check
  consentExpiryDays: 90 // Default consent expiry in days
};

// Get the base URL based on environment configuration
const getBaseUrl = () => USE_SANDBOX ? SANDBOX_URI : BASE_URI;

// Token cache to avoid unnecessary token requests
const tokenCache = {
  token: null as string | null,
  expiresAt: 0, // timestamp when the token expires
};

// Check if token is valid, with a buffer of 60 seconds to avoid edge cases
const isTokenValid = (): boolean => {
  return (
    tokenCache.token !== null &&
    tokenCache.expiresAt > Date.now() + config.tokenExpiryBufferMs
  );
};

// Get cached token or generate a new one if needed
export async function getAccessToken(): Promise<string> {
  if (isTokenValid()) {
    return tokenCache.token!;
  }

  try {
    const response = await axios.post(`${getBaseUrl()}/auth`, {
      clientId: CLIENT_ID,
      apiKey: API_KEY
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': config.userAgent
      }
    });

    tokenCache.token = response.data.token;
    
    // Calculate expiration time in milliseconds
    const expiresIn = response.data.expiresIn || config.tokenExpiryFallbackSeconds;
    tokenCache.expiresAt = Date.now() + (expiresIn * 1000);

    return tokenCache.token;
  } catch (error) {
    console.error("Authentication failed:", error);
    throw new Error("Failed to authenticate with Token.io API");
  }
}

// Helper function to make authenticated API requests
async function makeAuthenticatedRequest(method: string, endpoint: string, data?: any) {
  const token = await getAccessToken();
  
  try {
    const response = await axios({
      method,
      url: `${getBaseUrl()}${endpoint}`,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': config.userAgent
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`API request failed (${method} ${endpoint}):`, error);
    throw error;
  }
}

// Get member information
export async function getMemberInfo(): Promise<any> {
  return makeAuthenticatedRequest('GET', `/members/${TOKEN_MEMBER_ID}`);
}

// List bank accounts for the member
export async function listAccounts(): Promise<any> {
  return makeAuthenticatedRequest('GET', `/members/${TOKEN_MEMBER_ID}/accounts`);
}

// Get account details
export async function getAccountDetails(accountId: string): Promise<any> {
  return makeAuthenticatedRequest('GET', `/members/${TOKEN_MEMBER_ID}/accounts/${accountId}`);
}

// Get account balances
export async function getAccountBalances(accountId: string): Promise<any> {
  return makeAuthenticatedRequest('GET', `/members/${TOKEN_MEMBER_ID}/accounts/${accountId}/balances`);
}

// Get account transactions
export async function getAccountTransactions(
  accountId: string,
  offset: number = 0,
  limit: number = 25,
  fromDate?: string,
  toDate?: string
): Promise<any> {
  const params = new URLSearchParams();
  params.append('offset', offset.toString());
  params.append('limit', limit.toString());
  
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);
  
  return makeAuthenticatedRequest(
    'GET', 
    `/members/${TOKEN_MEMBER_ID}/accounts/${accountId}/transactions?${params.toString()}`
  );
}

// Create a transfer
export interface TransferRequest {
  from: {
    accountId: string;
  };
  to: {
    type: string; // 'ACCOUNT' | 'TOKEN' | 'BANK' | 'SEPA'
    accountId?: string;
    accountNumber?: string;
    sortCode?: string;
    iban?: string;
    bic?: string;
    accountName: string;
  };
  amount: {
    value: string;
    currency: string;
  };
  description: string;
  reference?: string;
}

export async function createTransfer(transferRequest: TransferRequest): Promise<any> {
  const request = {
    ...transferRequest,
    requestId: uuidv4(),
    tppId: TPP_ID
  };
  
  return makeAuthenticatedRequest('POST', `/transfers`, request);
}

// Initiate an open banking payment
export interface OpenBankingPaymentRequest {
  amount: {
    value: string;
    currency: string;
  };
  description: string;
  redirectUrl: string;
  bankId?: string; // Optional if user selects bank in Token UI
  reference?: string;
  callbackUrl?: string;
}

export async function initiateOpenBankingPayment(
  request: OpenBankingPaymentRequest
): Promise<any> {
  const paymentRequest = {
    ...request,
    requestId: uuidv4(),
    tppId: TPP_ID,
    memberId: TOKEN_MEMBER_ID
  };
  
  return makeAuthenticatedRequest('POST', '/payments/open-banking', paymentRequest);
}

// Get payment status
export async function getPaymentStatus(paymentId: string): Promise<any> {
  return makeAuthenticatedRequest('GET', `/payments/${paymentId}`);
}

// Create recurring payment consent
export interface RecurringPaymentConsentRequest {
  bankId: string;
  redirectUrl: string;
  callbackUrl?: string;
  maxAmount: {
    value: string;
    currency: string;
  };
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  validUntil: string; // ISO date
  reference?: string;
}

export async function createRecurringPaymentConsent(
  request: RecurringPaymentConsentRequest
): Promise<any> {
  const consentRequest = {
    ...request,
    requestId: uuidv4(),
    tppId: TPP_ID,
    memberId: TOKEN_MEMBER_ID
  };
  
  return makeAuthenticatedRequest('POST', '/consents/recurring-payment', consentRequest);
}

// Get consent status
export async function getConsentStatus(consentId: string): Promise<any> {
  return makeAuthenticatedRequest('GET', `/consents/${consentId}`);
} 

/**
 * Get a list of banks from the Banks v2 API
 * This endpoint is publicly accessible and doesn't require authentication
 * @param options Optional query parameters for filtering banks
 * @returns A list of banks matching the specified filters
 */
export interface BanksQueryOptions {
  page?: number;
  perPage?: number;
  sort?: 'NAME' | 'COUNTRY' | 'STANDARD' | 'RANK';
  search?: string;
  countries?: string[];
  ids?: string[];
  bankGroup?: string[];
  bankSubGroup?: string[];
  bankCode?: string;
  bics?: string[];
  openBankingStandards?: string[];
  supportedLocalInstruments?: string[];
  supportsAccountList?: boolean;
  supportsAccountDetails?: boolean;
  supportsAccountBalance?: boolean;
  supportsTransactionList?: boolean;
  supportsTransactionDetails?: boolean;
  supportsStandingOrderList?: boolean;
  supportsTransactionsDateFilter?: boolean;
  requiresOneStepPayment?: boolean;
  supportsSinglePayment?: boolean;
  supportsScheduledPayment?: boolean;
  supportsStandingOrder?: boolean;
  supportsReturnRefundAccount?: boolean;
  supportsReturnRefundAccountHolderName?: boolean;
  supportsFundsConfirmation?: boolean;
  supportsVariableRecurringPayment?: boolean;
}

export async function getBanks(options: BanksQueryOptions = {}): Promise<any> {
  // Build query parameters
  const params = new URLSearchParams();
  
  // Add all parameters to the URL if they exist
  if (options.page !== undefined) params.append('page', options.page.toString());
  if (options.perPage !== undefined) params.append('perPage', options.perPage.toString());
  if (options.sort) params.append('sort', options.sort);
  if (options.search) params.append('search', options.search);
  if (options.bankCode) params.append('bankCode', options.bankCode);
  
  // Handle array parameters
  if (options.countries && options.countries.length > 0) {
    options.countries.forEach(country => params.append('countries', country));
  }
  
  if (options.ids && options.ids.length > 0) {
    options.ids.forEach(id => params.append('ids', id));
  }
  
  if (options.bankGroup && options.bankGroup.length > 0) {
    options.bankGroup.forEach(group => params.append('bankGroup', group));
  }
  
  if (options.bankSubGroup && options.bankSubGroup.length > 0) {
    options.bankSubGroup.forEach(subGroup => params.append('bankSubGroup', subGroup));
  }
  
  if (options.bics && options.bics.length > 0) {
    options.bics.forEach(bic => params.append('bics', bic));
  }
  
  if (options.openBankingStandards && options.openBankingStandards.length > 0) {
    options.openBankingStandards.forEach(standard => params.append('openBankingStandards', standard));
  }
  
  if (options.supportedLocalInstruments && options.supportedLocalInstruments.length > 0) {
    options.supportedLocalInstruments.forEach(instrument => params.append('supportedLocalInstruments', instrument));
  }
  
  // Handle boolean parameters
  if (options.supportsAccountList !== undefined) params.append('supportsAccountList', options.supportsAccountList.toString());
  if (options.supportsAccountDetails !== undefined) params.append('supportsAccountDetails', options.supportsAccountDetails.toString());
  if (options.supportsAccountBalance !== undefined) params.append('supportsAccountBalance', options.supportsAccountBalance.toString());
  if (options.supportsTransactionList !== undefined) params.append('supportsTransactionList', options.supportsTransactionList.toString());
  if (options.supportsTransactionDetails !== undefined) params.append('supportsTransactionDetails', options.supportsTransactionDetails.toString());
  if (options.supportsStandingOrderList !== undefined) params.append('supportsStandingOrderList', options.supportsStandingOrderList.toString());
  if (options.supportsTransactionsDateFilter !== undefined) params.append('supportsTransactionsDateFilter', options.supportsTransactionsDateFilter.toString());
  if (options.requiresOneStepPayment !== undefined) params.append('requiresOneStepPayment', options.requiresOneStepPayment.toString());
  if (options.supportsSinglePayment !== undefined) params.append('supportsSinglePayment', options.supportsSinglePayment.toString());
  if (options.supportsScheduledPayment !== undefined) params.append('supportsScheduledPayment', options.supportsScheduledPayment.toString());
  if (options.supportsStandingOrder !== undefined) params.append('supportsStandingOrder', options.supportsStandingOrder.toString());
  if (options.supportsReturnRefundAccount !== undefined) params.append('supportsReturnRefundAccount', options.supportsReturnRefundAccount.toString());
  if (options.supportsReturnRefundAccountHolderName !== undefined) params.append('supportsReturnRefundAccountHolderName', options.supportsReturnRefundAccountHolderName.toString());
  if (options.supportsFundsConfirmation !== undefined) params.append('supportsFundsConfirmation', options.supportsFundsConfirmation.toString());
  if (options.supportsVariableRecurringPayment !== undefined) params.append('supportsVariableRecurringPayment', options.supportsVariableRecurringPayment.toString());
  
  // Make the API request with the built query string without authentication
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  // Use the direct URL that we know works
  const apiUrl = 'https://api.sandbox.token.io/v2/banks';
  
  try {
    console.log(`Calling Banks API: ${apiUrl}${queryString}`);
    const response = await axios({
      method: 'GET',
      url: `${apiUrl}${queryString}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'tokenio-mcp/1.0.0'
      }
    });
    
    console.log('Banks API response:', response.status);
    return response.data;
  } catch (error) {
    console.error(`API request failed (GET ${apiUrl}):`, error.message);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Get details for a specific bank by ID
 * This endpoint is publicly accessible and doesn't require authentication
 * @param bankId The ID of the bank to retrieve
 * @returns Details about the specified bank
 */
export async function getBankById(bankId: string): Promise<any> {
  // Use the direct URL that we know works with the ids parameter
  const apiUrl = 'https://api.sandbox.token.io/v2/banks';
    
  try {
    console.log(`Calling Bank Details API for bank ID: ${bankId}`);
    const response = await axios({
      method: 'GET',
      url: `${apiUrl}?ids=${bankId}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'tokenio-mcp/1.0.0'
      }
    });
    
    console.log('Bank Details API response:', response.status);
    
    // Extract the first bank from the results (should be the only one)
    if (response.data && response.data.banks && response.data.banks.length > 0) {
      return response.data.banks[0];
    } else {
      throw new Error(`Bank with ID ${bankId} not found`);
    }
  } catch (error) {
    console.error(`API request failed (GET ${apiUrl}?ids=${bankId}):`, error.message);
    throw error;
  }
} 