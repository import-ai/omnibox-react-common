/**
 * Common transport types
 */

/**
 * Stream transport interface
 * Provides a common interface for SSE and WebSocket transports
 */
export interface StreamTransport {
  /** Start the transport and begin receiving messages */
  start: () => Promise<void>;
  /** Destroy the transport and clean up resources */
  destroy: () => void;
}

/**
 * Error handler type for transport errors
 */
export type ErrorHandler = (error: string) => void;

/**
 * Message handler type for transport messages
 */
export type MessageHandler = (data: string) => void | Promise<void>;
