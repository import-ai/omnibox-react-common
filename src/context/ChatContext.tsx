/**
 * React Context and Provider for Omnibox Chat
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';
import {
  ConversationDetail,
  ToolType,
  IResTypeContext,
  ChatMode,
} from '../types';
import { createMessageOperator, MessageOperator } from '../chat/message-operator';
import { StreamTransport } from '../transport/types';

export interface ChatConfig {
  /** Base URL for API requests */
  baseURL: string;
  /** Default namespace ID */
  namespaceId?: string;
  /** WebSocket URL (defaults to baseURL) */
  webSocketUrl?: string;
  /** WebSocket path */
  webSocketPath?: string;
  /** Auth token */
  token?: string;
  /** Whether to use WebSocket (default: true) */
  useWebSocket?: boolean;
}

export interface ChatContextValue {
  // Config
  config: ChatConfig;
  // Conversation state
  conversation: ConversationDetail;
  setConversation: React.Dispatch<React.SetStateAction<ConversationDetail>>;
  // Message operator
  messageOperator: MessageOperator;
  // Loading state
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  // Tools and context
  tools: ToolType[];
  setTools: React.Dispatch<React.SetStateAction<ToolType[]>>;
  context: IResTypeContext[];
  setContext: React.Dispatch<React.SetStateAction<IResTypeContext[]>>;
  // Mode
  mode: ChatMode;
  setMode: React.Dispatch<React.SetStateAction<ChatMode>>;
  // WebSocket
  socket: Socket | null;
  setSocket: React.Dispatch<React.SetStateAction<Socket | null>>;
  // Current stream transport (for cleanup)
  currentTransport: StreamTransport | null;
  setCurrentTransport: React.Dispatch<React.SetStateAction<StreamTransport | null>>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps {
  children: ReactNode;
  config: ChatConfig;
  initialConversation?: ConversationDetail;
}

export function ChatProvider({
  children,
  config,
  initialConversation,
}: ChatProviderProps) {
  // Conversation state
  const [conversation, setConversation] = useState<ConversationDetail>(
    initialConversation ?? {
      id: '',
      mapping: {},
    }
  );

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Tools and context state
  const [tools, setTools] = useState<ToolType[]>([]);
  const [context, setContext] = useState<IResTypeContext[]>([]);

  // Mode state
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);

  // WebSocket state
  const [socket, setSocket] = useState<Socket | null>(null);

  // Current transport for cleanup
  const [currentTransport, setCurrentTransport] = useState<StreamTransport | null>(null);

  // Create message operator
  const messageOperator = React.useMemo(
    () =>
      createMessageOperator({
        conversation,
        setConversation,
      }),
    [conversation]
  );

  // Cleanup transport on unmount
  useEffect(() => {
    return () => {
      if (currentTransport) {
        currentTransport.destroy();
      }
    };
  }, [currentTransport]);

  const value: ChatContextValue = {
    config,
    conversation,
    setConversation,
    messageOperator,
    isLoading,
    setIsLoading,
    tools,
    setTools,
    context,
    setContext,
    mode,
    setMode,
    socket,
    setSocket,
    currentTransport,
    setCurrentTransport,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
