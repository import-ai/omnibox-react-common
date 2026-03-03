/**
 * Platform-agnostic HTTP client interface
 * Implementations should provide platform-specific HTTP handling (fetch, axios, etc.)
 */

export interface HttpRequestConfig {
  /** Request headers */
  headers?: Record<string, string>;
  /** Whether to suppress automatic error handling */
  mute?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Additional config options */
  [key: string]: any;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface HttpProvider {
  /**
   * Make a GET request
   * @param url - The request URL
   * @param config - Optional request configuration
   */
  get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * Make a POST request
   * @param url - The request URL
   * @param data - The request body
   * @param config - Optional request configuration
   */
  post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * Make a PUT request
   * @param url - The request URL
   * @param data - The request body
   * @param config - Optional request configuration
   */
  put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * Make a PATCH request
   * @param url - The request URL
   * @param data - The request body
   * @param config - Optional request configuration
   */
  patch<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * Make a DELETE request
   * @param url - The request URL
   * @param config - Optional request configuration
   */
  delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
}

/**
 * Simple fetch-based HTTP provider implementation
 * Works in browser and React Native environments
 */
export class FetchHttpProvider implements HttpProvider {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(options: { baseURL?: string; defaultHeaders?: Record<string, string> } = {}) {
    this.baseURL = options.baseURL ?? '';
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config: HttpRequestConfig = {}
  ): Promise<HttpResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...config.headers,
    };

    const fetchConfig: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      fetchConfig.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    const response = await fetch(fullUrl, fetchConfig);
    const responseData = await response.json().catch(() => null);

    // Convert headers to plain object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    };
  }

  get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request('GET', url, undefined, config);
  }

  post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request('POST', url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request('PUT', url, data, config);
  }

  patch<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request('PATCH', url, data, config);
  }

  delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request('DELETE', url, undefined, config);
  }
}
