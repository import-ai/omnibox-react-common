/**
 * Stream transport abstraction
 * Supports both SSE and WebSocket transports
 */

import { StorageProvider } from '../platform/storage';
import { WebSocketProvider } from '../platform/websocket';
import { StreamTransport } from './types';
import { createSSETransport as createSSE } from './sse';
import { createChatWebSocketTransport as createWebSocket } from './websocket';

// Re-export types
export type { StreamTransport } from './types';
export type { SSETransportOptions } from './sse';
export type { WebSocketTransportOptions } from './websocket';

/**
 * Options for creating a stream transport
 */
export interface CreateStreamTransportOptions {
  /** The endpoint URL (for SSE) or identifier (for WebSocket) */
  url: string;
  /** The request body */
  body: Record<string, any>;
  /** Callback for each message received */
  callback: (data: string) => void | Promise<void>;
  /** Storage provider for retrieving auth token */
  storage: StorageProvider;
  /** WebSocket provider (required for WebSocket transport) */
  webSocketProvider?: WebSocketProvider;
  /** Whether to use WebSocket instead of SSE (default: true if webSocketProvider is provided) */
  useWebSocket?: boolean;
  /** Additional headers for SSE requests */
  headers?: Record<string, string>;
  /** Error handler */
  onError?: (error: string) => void;
  /** Complete handler */
  onComplete?: () => void;
  /** Storage key for auth token (default: 'token') */
  tokenKey?: string;
}

/**
 * Create a stream transport (WebSocket or SSE)
 * @param options - Transport configuration options
 * @returns StreamTransport instance
 */
export function createStreamTransport(
  options: CreateStreamTransportOptions
): StreamTransport {
  const {
    url,
    body,
    callback,
    storage,
    webSocketProvider,
    useWebSocket = !!webSocketProvider,
    headers = {},
    onError,
    onComplete,
    tokenKey = 'token',
  } = options;

  if (useWebSocket && webSocketProvider) {
    return createWebSocket(webSocketProvider, url, body, callback, {
      onError,
      onComplete,
    });
  }

  // Get token from storage
  const token = storage.getItem(tokenKey);
  const resolvedToken = token instanceof Promise ? undefined : token ?? undefined;

  return createSSE({
    url,
    body,
    onMessage: callback,
    onError,
    token: resolvedToken,
    headers,
  });
}

/**
 * Create an SSE-only stream transport
 * @param options - SSE transport configuration options
 * @returns StreamTransport instance
 */
export function createSSETransport(options: {
  url: string;
  body: Record<string, any>;
  callback: (data: string) => void | Promise<void>;
  token?: string;
  headers?: Record<string, string>;
  onError?: (error: string) => void;
}): StreamTransport {
  return createSSE({
    url: options.url,
    body: options.body,
    onMessage: options.callback,
    onError: options.onError,
    token: options.token,
    headers: options.headers,
  });
}

// Re-export transport functions
export { createSSETransport as createSSETransportImpl } from './sse';
export {
  createWebSocketTransport,
  createChatWebSocketTransport,
} from './websocket';
