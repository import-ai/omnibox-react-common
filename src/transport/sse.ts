/**
 * Server-Sent Events (SSE) transport implementation
 */

import { StreamTransport, ErrorHandler } from './types';

export interface SSETransportOptions {
  /** The SSE endpoint URL */
  url: string;
  /** The request body */
  body: Record<string, any>;
  /** Callback for each SSE message */
  onMessage: (data: string) => void | Promise<void>;
  /** Callback for errors */
  onError?: ErrorHandler;
  /** Authentication token */
  token?: string;
  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Create an SSE transport
 * @param options - Transport configuration options
 * @returns StreamTransport instance
 */
export function createSSETransport(options: SSETransportOptions): StreamTransport {
  let isAborted = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  return {
    start: async () => {
      const { url, body, onMessage, onError, token, headers = {} } = options;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('Response body is not readable');
        }

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!isAborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          while (!isAborted) {
            const lineEnd = buffer.indexOf('\n');
            if (lineEnd === -1) break;

            const line = buffer.slice(0, lineEnd).trim();
            buffer = buffer.slice(lineEnd + 1);

            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              await onMessage(data);
            }
          }
        }
      } catch (error) {
        if (onError && !isAborted) {
          onError(error instanceof Error ? error.message : String(error));
        }
        throw error;
      } finally {
        if (reader) {
          await reader.cancel();
        }
      }
    },
    destroy: () => {
      isAborted = true;
      if (reader) {
        reader.cancel().catch(() => {});
      }
    },
  };
}
