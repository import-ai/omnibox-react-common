/**
 * Platform-agnostic WebSocket interface
 * Implementations should provide platform-specific WebSocket handling
 */

export interface WebSocketProvider {
  /**
   * Connect to the WebSocket server
   */
  connect(): void;

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void;

  /**
   * Check if the WebSocket is connected
   */
  isConnected(): boolean;

  /**
   * Emit an event with data
   * @param event - The event name
   * @param data - The event data
   */
  emit(event: string, data: any): void;

  /**
   * Listen for an event
   * @param event - The event name
   * @param callback - The event handler
   */
  on(event: string, callback: (data: any) => void): void;

  /**
   * Remove an event listener
   * @param event - The event name
   * @param callback - The event handler to remove
   */
  off(event: string, callback: (data: any) => void): void;

  /**
   * Listen for an event once
   * @param event - The event name
   * @param callback - The event handler
   */
  once(event: string, callback: (data: any) => void): void;
}

export interface WebSocketProviderOptions {
  /** The WebSocket URL */
  url: string;
  /** The path for the WebSocket connection */
  path?: string;
  /** Authentication token */
  token?: string;
  /** Whether to enable reconnection */
  reconnection?: boolean;
  /** Number of reconnection attempts */
  reconnectionAttempts?: number;
  /** Delay between reconnection attempts in ms */
  reconnectionDelay?: number;
  /** Transports to use (e.g., ['websocket', 'polling']) */
  transports?: string[];
}

/**
 * Factory function type for creating WebSocket providers
 */
export type WebSocketProviderFactory = (options: WebSocketProviderOptions) => WebSocketProvider;
