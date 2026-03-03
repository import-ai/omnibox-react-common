/**
 * WebSocket transport implementation using platform-agnostic provider
 */

import { StreamTransport, ErrorHandler } from './types';
import { WebSocketProvider } from '../platform/websocket';

export interface WebSocketTransportOptions {
  /** The WebSocket provider instance */
  provider: WebSocketProvider;
  /** The event name to emit */
  event: string;
  /** The request body */
  body: Record<string, any>;
  /** Callback for each message */
  onMessage: (data: string) => void | Promise<void>;
  /** Callback for errors */
  onError?: ErrorHandler;
  /** Callback when stream completes */
  onComplete?: () => void;
}

/**
 * Create a WebSocket transport
 * @param options - Transport configuration options
 * @returns StreamTransport instance
 */
export function createWebSocketTransport(options: WebSocketTransportOptions): StreamTransport {
  const { provider, event, body, onMessage, onError, onComplete } = options;
  let isAborted = false;

  const messageHandler = async (data: string) => {
    if (!isAborted) {
      await onMessage(data);
    }
  };

  const errorHandler = (error: { error: string }) => {
    if (onError && !isAborted) {
      onError(error.error);
    }
  };

  const completeHandler = () => {
    cleanup();
    if (onComplete && !isAborted) {
      onComplete();
    }
  };

  const cleanup = () => {
    provider.off('message', messageHandler);
    provider.off('error', errorHandler);
    provider.off('complete', completeHandler);
  };

  return {
    start: async () => {
      provider.on('message', messageHandler);
      provider.on('error', errorHandler);
      provider.on('complete', completeHandler);

      provider.emit(event, body);
    },
    destroy: () => {
      isAborted = true;
      cleanup();
    },
  };
}

/**
 * Create a WebSocket transport for chat operations
 * Automatically determines the correct event name based on URL and options
 * @param provider - The WebSocket provider
 * @param url - The endpoint URL (used to determine event type)
 * @param body - The request body
 * @param callback - Message callback
 * @param options - Additional options
 * @returns StreamTransport instance
 */
export function createChatWebSocketTransport(
  provider: WebSocketProvider,
  url: string,
  body: Record<string, any>,
  callback: (data: string) => void | Promise<void>,
  options?: {
    onError?: ErrorHandler;
    onComplete?: () => void;
  }
): StreamTransport {
  let event = url.includes('/ask') ? 'ask' : 'write';
  if (body.share_id) {
    event = `share_${event}`;
  }

  return createWebSocketTransport({
    provider,
    event,
    body,
    onMessage: callback,
    onError: options?.onError,
    onComplete: options?.onComplete,
  });
}
