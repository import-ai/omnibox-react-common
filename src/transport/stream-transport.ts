/**
 * Stream transport abstraction
 * Supports both SSE and WebSocket transports
 */

import { StreamTransport } from './types';
import { createSSETransport as createSSE } from './sse';

// Re-export types
export type { StreamTransport } from './types';
export type { SSETransportOptions } from './sse';

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
  /** Auth token */
  token?: string;
  /** Whether to use WebSocket instead of SSE (default: true) */
  useWebSocket?: boolean;
  /** WebSocket URL (required for WebSocket) */
  webSocketUrl?: string;
  /** WebSocket path (default: /socket.io) */
  webSocketPath?: string;
  /** Additional headers for SSE requests */
  headers?: Record<string, string>;
  /** Error handler */
  onError?: (error: string) => void;
  /** Complete handler */
  onComplete?: () => void;
}

/**
 * Create a stream transport (WebSocket or SSE)
 * Uses socket.io directly for WebSocket transport
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
    token,
    useWebSocket = true,
    webSocketUrl,
    webSocketPath = '/socket.io',
    headers = {},
    onError,
    onComplete,
  } = options;

  if (useWebSocket) {
    return createSocketIOTransport({
      url,
      body,
      callback,
      token,
      webSocketUrl,
      webSocketPath,
      onError,
      onComplete,
    });
  }

  return createSSE({
    url,
    body,
    onMessage: callback,
    onError,
    token,
    headers,
  });
}

interface CreateSocketIOTransportOptions {
  url: string;
  body: Record<string, any>;
  callback: (data: string) => void | Promise<void>;
  token?: string;
  webSocketUrl?: string;
  webSocketPath?: string;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

function createSocketIOTransport(
  options: CreateSocketIOTransportOptions
): StreamTransport {
  const { url, body, callback, token, webSocketUrl, webSocketPath, onError, onComplete } =
    options;

  let socket: ReturnType<typeof import('socket.io-client')['io']> | null = null;
  let isAborted = false;

  // Determine event name based on URL and body
  let event = url.includes('/ask') ? 'ask' : 'write';
  if (body.share_id) {
    event = `share_${event}`;
  }

  return {
    start: async () => {
      const { io } = await import('socket.io-client');

      const wsUrl = webSocketUrl || url;
      const authToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);

      socket = io(wsUrl, {
        path: webSocketPath,
        transports: ['websocket', 'polling'],
        auth: authToken ? { token: `Bearer ${authToken}` } : undefined,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      const messageHandler = async (data: unknown) => {
        if (!isAborted) {
          await callback(String(data));
        }
      };

      const errorHandler = (data: unknown) => {
        if (onError && !isAborted && typeof data === 'object' && data !== null && 'error' in data) {
          onError(String((data as { error: string }).error));
        }
      };

      const completeHandler = () => {
        cleanup();
        if (onComplete && !isAborted) {
          onComplete();
        }
      };

      const cleanup = () => {
        socket?.off('message', messageHandler);
        socket?.off('error', errorHandler);
        socket?.off('complete', completeHandler);
      };

      socket.on('message', messageHandler);
      socket.on('error', errorHandler);
      socket.on('complete', completeHandler);

      // Wait for connection before emitting
      if (socket.connected) {
        socket.emit(event, body);
      } else {
        socket.once('connect', () => {
          socket?.emit(event, body);
        });
      }
    },
    destroy: () => {
      isAborted = true;
      socket?.disconnect();
      socket = null;
    },
  };
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

// Re-export SSE transport
export { createSSETransport as createSSETransportImpl } from './sse';
