import * as react_jsx_runtime from 'react/jsx-runtime';
import * as React from 'react';
import React__default, { Dispatch, SetStateAction, ReactNode } from 'react';
import { Socket } from 'socket.io-client';

/**
 * Chat response types - defines the structure of streaming chat responses
 */
declare enum MessageStatus {
    PENDING = "pending",
    STREAMING = "streaming",
    SUCCESS = "success",
    STOPPED = "stopped",
    INTERRUPTED = "interrupted",
    FAILED = "failed"
}
declare enum OpenAIMessageRole {
    SYSTEM = "system",
    USER = "user",
    ASSISTANT = "assistant",
    TOOL = "tool"
}
declare enum ChatMode {
    ASK = "ask",
    WRITE = "write"
}
interface Citation {
    id: string;
    title: string;
    snippet: string;
    link: string;
}
interface OpenAIFunction {
    name: string;
    arguments: string;
}
interface OpenAIToolCall {
    id: string;
    type: 'function';
    function: OpenAIFunction;
}
interface OpenAIMessage {
    role: OpenAIMessageRole;
    content?: string;
    reasoning_content?: string;
    tool_calls?: OpenAIToolCall[];
    tool_call_id?: string;
}
interface MessageAttrs {
    citations?: Citation[];
}
type ChatResponseType = 'bos' | 'delta' | 'eos' | 'done' | 'error';
interface ChatBaseResponse {
    response_type: ChatResponseType;
}
interface ChatBOSResponse extends ChatBaseResponse {
    response_type: 'bos';
    role: OpenAIMessageRole;
    id: string;
    parentId: string;
}
interface ChatEOSResponse extends ChatBaseResponse {
    response_type: 'eos';
}
interface ChatDeltaResponse extends ChatBaseResponse {
    response_type: 'delta';
    message: Partial<OpenAIMessage>;
    attrs?: MessageAttrs;
}
interface ChatDoneResponse extends ChatBaseResponse {
    response_type: 'done';
}
interface ChatErrorResponse extends ChatBaseResponse {
    response_type: 'error';
    error: string;
}
type ChatResponse = ChatBOSResponse | ChatDeltaResponse | ChatEOSResponse | ChatDoneResponse | ChatErrorResponse;

/**
 * Tool types for chat functionality
 */
declare enum ToolType {
    WEB_SEARCH = "web_search",
    PRIVATE_SEARCH = "private_search",
    REASONING = "reasoning"
}
type ChatActionType = 'stop' | 'disabled';
type PrivateSearchResourceType = 'resource' | 'folder';
interface PrivateSearchResource {
    name: string;
    id: string;
    type: PrivateSearchResourceType;
}
interface IChatTool {
    name: ToolType;
}
interface WebSearch extends IChatTool {
    name: ToolType.WEB_SEARCH;
}
interface PrivateSearch extends IChatTool {
    name: ToolType.PRIVATE_SEARCH;
    resources?: PrivateSearchResource[];
}
interface Reasoning extends IChatTool {
    name: ToolType.REASONING;
}
type ChatTool = WebSearch | PrivateSearch | Reasoning;
interface ChatRequestBody {
    conversation_id: string;
    query: string;
    tools?: ChatTool[];
    parent_message_id?: string;
    enable_thinking: boolean;
    lang?: '简体中文' | 'English';
    namespace_id?: string;
    share_id?: string;
    share_password?: string;
}
interface IResTypeContext {
    type: PrivateSearchResourceType;
    resource: {
        id: string;
        name?: string;
    };
}

/**
 * Common interfaces shared across the SDK
 */
interface IBase {
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
}
type Permission = 'no_access' | 'can_view' | 'can_comment' | 'can_edit' | 'full_access';
type SpaceType = 'private' | 'teamspace';
type ResourceType = 'doc' | 'file' | 'link' | 'folder';
interface PathItem {
    id: string;
    name: string;
}
interface ResourceMeta {
    id: string;
    name?: string;
    parent_id: string | null;
    resource_type: ResourceType;
    created_at?: string;
    updated_at?: string;
    attrs?: Record<string, any>;
    has_children?: boolean;
}
interface ResourceSummary {
    id: string;
    name: string;
    resource_type: ResourceType;
    attrs: Record<string, any>;
    content: string;
    has_children: boolean;
    created_at: string;
    updated_at: string;
}
type WizardLang = '简体中文' | 'English';

/**
 * Conversation and message types
 */

interface ConversationSummary extends IBase {
    id: string;
    title: string;
    user_content?: string;
    assistant_content?: string;
}
interface ConversationMessageAttrs {
    citations?: Citation[];
    tools?: ChatTool[];
    enable_thinking?: boolean;
    lang?: '简体中文' | 'English';
}
interface MessageDetail extends IBase {
    id: string;
    message: OpenAIMessage;
    status: MessageStatus;
    parent_id: string;
    children: string[];
    attrs?: ConversationMessageAttrs;
}
interface ConversationDetail extends IBase {
    id: string;
    title?: string;
    mapping: Record<string, MessageDetail>;
    current_node?: string;
}

/**
 * Message state management for chat conversations
 */

interface MessageOperator {
    /**
     * Update a message with delta content
     * @param delta - The delta response from the server
     * @param id - Optional message ID (defaults to current_node)
     */
    update: (delta: ChatDeltaResponse, id?: string) => void;
    /**
     * Add a new message to the conversation
     * @param chatResponse - The BOS response containing message metadata
     * @returns The ID of the added message
     */
    add: (chatResponse: ChatBOSResponse) => string;
    /**
     * Mark a message as done (success status)
     * @param id - Optional message ID (defaults to current_node)
     */
    done: (id?: string) => void;
    /**
     * Activate a message branch
     * @param id - The message ID to activate
     */
    activate: (id: string) => void;
    /**
     * Get siblings of a message
     * @param id - The message ID
     * @returns Array of sibling message IDs
     */
    getSiblings: (id: string) => string[];
    /**
     * Get the non-tool parent of a message
     * @param id - The message ID
     * @returns The parent message ID
     */
    getParent: (id: string) => string;
}
type SetConversationFn = ((updater: (prev: ConversationDetail) => ConversationDetail) => void) | Dispatch<SetStateAction<ConversationDetail>>;
interface CreateMessageOperatorOptions {
    /**
     * The conversation state
     */
    conversation: ConversationDetail;
    /**
     * Callback to update the conversation state
     */
    setConversation: SetConversationFn;
}
/**
 * Create a message operator for managing message state
 * @param options - Configuration options
 * @returns MessageOperator instance
 */
declare function createMessageOperator(options: CreateMessageOperatorOptions): MessageOperator;

/**
 * Common transport types
 */
/**
 * Stream transport interface
 * Provides a common interface for SSE and WebSocket transports
 */
interface StreamTransport {
    /** Start the transport and begin receiving messages */
    start: () => Promise<void>;
    /** Destroy the transport and clean up resources */
    destroy: () => void;
}
/**
 * Error handler type for transport errors
 */
type ErrorHandler = (error: string) => void;
/**
 * Message handler type for transport messages
 */
type MessageHandler = (data: string) => void | Promise<void>;

interface ChatConfig {
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
interface ChatContextValue {
    config: ChatConfig;
    conversation: ConversationDetail;
    setConversation: React__default.Dispatch<React__default.SetStateAction<ConversationDetail>>;
    messageOperator: MessageOperator;
    isLoading: boolean;
    setIsLoading: React__default.Dispatch<React__default.SetStateAction<boolean>>;
    tools: ToolType[];
    setTools: React__default.Dispatch<React__default.SetStateAction<ToolType[]>>;
    context: IResTypeContext[];
    setContext: React__default.Dispatch<React__default.SetStateAction<IResTypeContext[]>>;
    mode: ChatMode;
    setMode: React__default.Dispatch<React__default.SetStateAction<ChatMode>>;
    socket: Socket | null;
    setSocket: React__default.Dispatch<React__default.SetStateAction<Socket | null>>;
    currentTransport: StreamTransport | null;
    setCurrentTransport: React__default.Dispatch<React__default.SetStateAction<StreamTransport | null>>;
}
interface ChatProviderProps {
    children: ReactNode;
    config: ChatConfig;
    initialConversation?: ConversationDetail;
}
declare function ChatProvider({ children, config, initialConversation, }: ChatProviderProps): react_jsx_runtime.JSX.Element;
declare function useChatContext(): ChatContextValue;

/**
 * Main chat hook for managing conversations and streaming
 */

interface UseChatOptions {
    /** Namespace ID (overrides config) */
    namespaceId?: string;
    /** Share ID for public shares */
    shareId?: string;
    /** Share password */
    sharePassword?: string;
    /** Language preference */
    lang?: WizardLang;
    /** Callback when conversation updates */
    onConversationUpdate?: (conversation: {
        id: string;
        mapping: Record<string, any>;
        current_node?: string;
    }) => void;
    /** Callback for errors */
    onError?: (error: string) => void;
    /** Callback when stream completes */
    onComplete?: () => void;
}
interface AskOptions {
    /** The user query */
    query: string;
    /** Optional parent message ID for branching */
    parentMessageId?: string;
    /** Whether to enable reasoning/thinking */
    enableThinking?: boolean;
}
declare function useChat(options?: UseChatOptions): {
    ask: ({ query, parentMessageId, enableThinking }: AskOptions) => Promise<void>;
    stop: () => void;
    regenerate: (messageId: string) => Promise<void>;
    edit: (targetMessageId: string, newContent: string) => Promise<void>;
    isLoading: boolean;
};

declare function useMessageOperator(): {
    update: (delta: ChatDeltaResponse, id?: string) => void;
    add: (chatResponse: ChatBOSResponse) => string;
    done: (id?: string) => void;
    activate: (id: string) => void;
    getSiblings: (id: string) => string[];
    getParent: (id: string) => string;
    conversation: ConversationDetail;
    setConversation: React.Dispatch<React.SetStateAction<ConversationDetail>>;
};

/**
 * Hook for managing messages in a conversation
 */

declare function useMessages(): {
    messages: MessageDetail[];
    visibleMessages: MessageDetail[];
    lastAssistantMessage: MessageDetail | undefined;
};

/**
 * Hook for managing WebSocket connection
 */
type SocketType = any;
interface UseWebSocketOptions {
    /** Auto-connect on mount */
    autoConnect?: boolean;
    /** Callback when connected */
    onConnect?: () => void;
    /** Callback when disconnected */
    onDisconnect?: (reason: string) => void;
    /** Callback for errors */
    onError?: (error: Error) => void;
}
interface UseWebSocketReturn {
    socket: SocketType | null;
    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;
}
declare function useWebSocket(options?: UseWebSocketOptions): UseWebSocketReturn;

/**
 * Stream transport abstraction
 * Supports both SSE and WebSocket transports
 */

/**
 * Options for creating a stream transport
 */
interface CreateStreamTransportOptions {
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
declare function createStreamTransport(options: CreateStreamTransportOptions): StreamTransport;
/**
 * Create an SSE-only stream transport
 * @param options - SSE transport configuration options
 * @returns StreamTransport instance
 */
declare function createSSETransport(options: {
    url: string;
    body: Record<string, any>;
    callback: (data: string) => void | Promise<void>;
    token?: string;
    headers?: Record<string, string>;
    onError?: (error: string) => void;
}): StreamTransport;

/**
 * Chat utility functions for preparing requests and extracting settings
 */

/**
 * Convert ChatTool[] from backend to ToolType[] and IResTypeContext[] for UI
 */
declare function extractToolsAndContext(chatTools: ChatTool[]): {
    tools: ToolType[];
    context: IResTypeContext[];
};
/**
 * Extract original tools/settings from a message's attributes with fallback to current state
 */
declare function extractOriginalMessageSettings(message: MessageDetail | undefined, fallbacks: {
    tools: ToolType[];
    context: IResTypeContext[];
    lang: WizardLang;
    enableThinking?: boolean;
}): {
    originalTools: ToolType[];
    originalContext: IResTypeContext[];
    originalLang: WizardLang;
    originalEnableThinking: boolean | undefined;
};
/**
 * Prepare the request body for a chat request
 * @param conversationId - The conversation ID
 * @param query - The user query
 * @param tools - Selected tool types
 * @param context - Selected resources for private search
 * @param parent_message_id - Optional parent message ID for branching
 * @param lang - Language preference
 * @param enable_thinking - Whether to enable reasoning/thinking
 * @returns The prepared ChatRequestBody
 */
declare function prepareBody(conversationId: string, query: string, tools: ToolType[], context: IResTypeContext[], parent_message_id: string | undefined, lang: WizardLang | undefined, enable_thinking?: boolean): ChatRequestBody;
/**
 * Find the first message whose parent_id does not exist in the messages array
 * This is typically the root message of a conversation
 * @param messages - Array of messages
 * @returns The root message or undefined
 */
declare function findFirstMessageWithMissingParent(messages: MessageDetail[]): MessageDetail | undefined;

export { type AskOptions, type ChatActionType, type ChatBOSResponse, type ChatBaseResponse, type ChatConfig, type ChatContextValue, type ChatDeltaResponse, type ChatDoneResponse, type ChatEOSResponse, type ChatErrorResponse, ChatMode, ChatProvider, type ChatProviderProps, type ChatRequestBody, type ChatResponse, type ChatResponseType, type ChatTool, type Citation, type ConversationDetail, type ConversationMessageAttrs, type ConversationSummary, type CreateMessageOperatorOptions, type ErrorHandler, type IBase, type IChatTool, type IResTypeContext, type MessageAttrs, type MessageDetail, type MessageHandler, type MessageOperator, MessageStatus, type OpenAIFunction, type OpenAIMessage, OpenAIMessageRole, type OpenAIToolCall, type PathItem, type Permission, type PrivateSearch, type PrivateSearchResource, type PrivateSearchResourceType, type Reasoning, type ResourceMeta, type ResourceSummary, type ResourceType, type SpaceType, type StreamTransport, ToolType, type UseChatOptions, type UseWebSocketOptions, type UseWebSocketReturn, type WebSearch, type WizardLang, createMessageOperator, createSSETransport, createStreamTransport, extractOriginalMessageSettings, extractToolsAndContext, findFirstMessageWithMissingParent, prepareBody, useChat, useChatContext, useMessageOperator, useMessages, useWebSocket };
