/**
 * Main chat client for managing conversations and streaming
 * @deprecated Use useChat hook from React context instead
 */

import {
  createStreamTransport,
  CreateStreamTransportOptions,
} from '../transport/stream-transport';
import { StreamTransport } from '../transport/types';
import {
  ConversationDetail,
  MessageDetail,
} from '../types';
import { ChatRequestBody, IResTypeContext, ToolType } from '../types/tools';
import { WizardLang } from '../types/common';
import {
  createMessageOperator,
  CreateMessageOperatorOptions,
  MessageOperator,
} from './message-operator';
import { ask, prepareBody, AskOptions } from './utils';

export interface ChatClientOptions {
  /** Base URL for API requests */
  baseURL: string;
  /** Auth token for requests */
  token?: string;
  /** WebSocket URL (default: same as baseURL) */
  webSocketUrl?: string;
  /** WebSocket path (default: /socket.io) */
  webSocketPath?: string;
  /** Whether to prefer WebSocket over SSE (default: true) */
  preferWebSocket?: boolean;
  /** Default namespace ID */
  namespaceId?: string;
  /** Error handler for chat errors */
  onError?: (error: string) => void;
}

export interface AskRequest {
  /** The conversation ID */
  conversationId: string;
  /** The user query */
  query: string;
  /** Selected tool types (default: empty) */
  tools?: ToolType[];
  /** Selected resources for private search (default: empty) */
  context?: IResTypeContext[];
  /** Optional parent message ID for branching */
  parentMessageId?: string;
  /** Language preference (default: 'English') */
  lang?: WizardLang;
  /** Whether to enable reasoning/thinking (default: false) */
  enableThinking?: boolean;
  /** Share ID (for public shares) */
  shareId?: string;
  /** Share password (if required) */
  sharePassword?: string;
  /** Callback for conversation updates */
  onConversationUpdate?: (conversation: ConversationDetail) => void;
  /** Callback for message updates */
  onMessageUpdate?: (message: MessageDetail) => void;
  /** Callback for stream completion */
  onComplete?: () => void;
}

/**
 * Chat client for managing conversations and streaming chat
 * @deprecated Use useChat hook from React context instead
 */
export class ChatClient {
  private options: ChatClientOptions;

  constructor(options: ChatClientOptions) {
    this.options = options;
  }

  /**
   * Create a message operator for the given conversation
   * @param conversation - The conversation state
   * @param setConversation - Callback to update conversation state
   * @returns MessageOperator instance
   */
  createMessageOperator(
    conversation: ConversationDetail,
    setConversation: CreateMessageOperatorOptions['setConversation']
  ): MessageOperator {
    return createMessageOperator({ conversation, setConversation });
  }

  /**
   * Create a stream transport for chat
   * @param url - The endpoint URL
   * @param body - The request body
   * @param callback - Callback for each message
   * @returns StreamTransport instance
   */
  createStreamTransport(
    url: string,
    body: Record<string, any>,
    callback: (data: string) => void | Promise<void>
  ): StreamTransport {
    const options: CreateStreamTransportOptions = {
      url,
      body,
      callback,
      token: this.options.token,
      useWebSocket: this.options.preferWebSocket ?? true,
      webSocketUrl: this.options.webSocketUrl ?? this.options.baseURL,
      webSocketPath: this.options.webSocketPath,
      onError: this.options.onError,
    };

    return createStreamTransport(options);
  }

  /**
   * Send a chat message and receive streaming response
   * @param request - The ask request
   * @returns Object with transport, message operator, and cleanup function
   */
  ask(request: AskRequest): {
    transport: StreamTransport;
    messageOperator: MessageOperator;
    cleanup: () => void;
  } {
    const conversation: ConversationDetail = {
      id: request.conversationId,
      mapping: {},
      current_node: undefined,
    };

    const setConversation = (updater: (prev: ConversationDetail) => ConversationDetail) => {
      const newConversation = updater(conversation);
      Object.assign(conversation, newConversation);
      request.onConversationUpdate?.(conversation);
    };

    const messageOperator = this.createMessageOperator(conversation, setConversation);

    const askOptions: AskOptions = {
      conversationId: request.conversationId,
      query: request.query,
      tools: request.tools ?? [],
      context: request.context ?? [],
      parent_message_id: request.parentMessageId,
      messageOperator,
      url: `/namespaces/${request.shareId ? 'share' : (this.options.namespaceId || 'default')}/chat`,
      lang: request.lang,
      namespaceId: this.options.namespaceId,
      shareId: request.shareId,
      sharePassword: request.sharePassword,
      enable_thinking: request.enableThinking,
      createTransport: (body, callback) =>
        this.createStreamTransport(
          `/namespaces/${request.shareId ? 'share' : (this.options.namespaceId || 'default')}/chat`,
          body,
          callback
        ),
      onError: this.options.onError,
    };

    const askTransport = ask(askOptions);

    return {
      transport: askTransport,
      messageOperator,
      cleanup: () => {
        askTransport.destroy();
      },
    };
  }

  /**
   * Prepare a chat request body without sending
   * @param conversationId - The conversation ID
   * @param query - The user query
   * @param tools - Selected tool types
   * @param context - Selected resources
   * @param options - Additional options
   * @returns Prepared request body
   */
  prepareRequestBody(
    conversationId: string,
    query: string,
    tools: ToolType[] = [],
    context: IResTypeContext[] = [],
    options: {
      parentMessageId?: string;
      lang?: WizardLang;
      enableThinking?: boolean;
      shareId?: string;
      sharePassword?: string;
    } = {}
  ): ChatRequestBody {
    const body = prepareBody(
      conversationId,
      query,
      tools,
      context,
      options.parentMessageId,
      options.lang ?? 'English',
      options.enableThinking
    );

    body.namespace_id = this.options.namespaceId;
    body.share_id = options.shareId;
    body.share_password = options.sharePassword;

    return body;
  }
}

export { createMessageOperator, prepareBody, ask };
export type { MessageOperator, CreateMessageOperatorOptions };
