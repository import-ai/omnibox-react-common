/**
 * Hook for managing WebSocket connection
 */

import { useEffect, useRef, useCallback } from 'react';
import { useChatContext } from '../context/ChatContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketType = any;

export interface UseWebSocketOptions {
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Callback when connected */
  onConnect?: () => void;
  /** Callback when disconnected */
  onDisconnect?: (reason: string) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

export interface UseWebSocketReturn {
  socket: SocketType | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { config, socket, setSocket } = useChatContext();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentSocket = socket as any;
    if (currentSocket?.connected) return;

    const { webSocketUrl, webSocketPath, token } = config;

    // Dynamically import socket.io-client
    import('socket.io-client').then(({ io }) => {
      const newSocket = io(webSocketUrl ?? config.baseURL, {
        path: webSocketPath ?? '/api/v1/socket.io',
        transports: ['websocket', 'polling'],
        auth: token ? { token: `Bearer ${token}` } : undefined,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        optionsRef.current.onConnect?.();
      });

      newSocket.on('disconnect', (reason) => {
        optionsRef.current.onDisconnect?.(reason);
      });

      newSocket.on('connect_error', (error) => {
        optionsRef.current.onError?.(error);
      });

      setSocket(newSocket);
    });
  }, [config, socket, setSocket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [socket, setSocket]);

  useEffect(() => {
    if (options.autoConnect) {
      connect();
    }

    return () => {
      if (options.autoConnect) {
        disconnect();
      }
    };
  }, [options.autoConnect, connect, disconnect]);

  return {
    socket,
    isConnected: socket?.connected ?? false,
    connect,
    disconnect,
  };
}
