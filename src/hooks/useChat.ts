/**
 * Main chat hook for managing conversations and streaming
 */

import { useCallback, useRef } from 'react';
import { useChatContext } from '../context/ChatContext';
import { ChatResponse, WizardLang } from '../types';
import { createStreamTransport } from '../transport/stream-transport';
import { StreamTransport } from '../transport/types';

export interface UseChatOptions {
  /** Namespace ID (overrides config) */
  namespaceId?: string;
  /** Share ID for public shares */
  shareId?: string;
  /** Share password */
  sharePassword?: string;
  /** Language preference */
  lang?: WizardLang;
  /** Callback when conversation updates */
  onConversationUpdate?: (conversation: { id: string; mapping: Record<string, any>; current_node?: string }) => void;
  /** Callback for errors */
  onError?: (error: string) => void;
  /** Callback when stream completes */
  onComplete?: () => void;
}

export interface AskOptions {
  /** The user query */
  query: string;
  /** Optional parent message ID for branching */
  parentMessageId?: string;
  /** Whether to enable reasoning/thinking */
  enableThinking?: boolean;
}

export function useChat(options: UseChatOptions = {}) {
  const {
    config,
    conversation,
    messageOperator,
    isLoading,
    setIsLoading,
    tools,
    context,
    mode,
    socket,
    currentTransport,
    setCurrentTransport,
  } = useChatContext();

  const abortRef = useRef<(() => void) | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Stop the current streaming request
   */
  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    if (currentTransport) {
      currentTransport.destroy();
      setCurrentTransport(null);
    }
    setIsLoading(false);
  }, [currentTransport, setCurrentTransport, setIsLoading]);

  /**
   * Send a message and receive streaming response
   */
  const ask = useCallback(
    async ({ query, parentMessageId, enableThinking }: AskOptions) => {
      const {
        namespaceId: configNamespaceId,
        baseURL,
        useWebSocket = true,
        token,
      } = config;

      const namespaceId = options.namespaceId ?? configNamespaceId ?? 'default';
      const conversationId = ''; // TODO: Get from context

      if (!query.trim()) return;

      setIsLoading(true);

      try {
        // Prepare request body
        const { prepareBody } = await import('../chat/utils');
        const body = prepareBody(
          conversationId,
          query,
          tools,
          context,
          parentMessageId,
          options.lang ?? 'English',
          enableThinking
        ) as unknown as Record<string, unknown>;

        // Add namespace/share info
        body.namespace_id = namespaceId;
        if (options.shareId) {
          body.share_id = options.shareId;
          body.share_password = options.sharePassword;
        }

        const url = options.shareId
          ? `${baseURL}/api/v1/shares/${options.shareId}/wizard/${mode}`
          : `${baseURL}/api/v1/namespaces/${namespaceId}/wizard/${mode}`;

        // Create transport (WebSocket or SSE based on config)
        const transport = createStreamTransport({
          url,
          body: body as unknown as Record<string, unknown>,
          callback: async (data: string) => {
            const chatResponse: ChatResponse = JSON.parse(data);
            handleChatResponse(chatResponse, messageOperator, optionsRef.current);
          },
          token,
          useWebSocket,
          webSocketUrl: config.webSocketUrl ?? config.baseURL,
          webSocketPath: config.webSocketPath,
          onError: (error: string) => {
            options.onError?.(error);
            setIsLoading(false);
            setCurrentTransport(null);
          },
          onComplete: () => {
            setIsLoading(false);
            setCurrentTransport(null);
            options.onComplete?.();
          },
        });

        setCurrentTransport(transport);
        abortRef.current = () => transport.destroy();

        await transport.start();
      } catch (error) {
        setIsLoading(false);
        setCurrentTransport(null);
        options.onError?.(error instanceof Error ? error.message : String(error));
      }
    },
    [
      config,
      messageOperator,
      tools,
      context,
      mode,
      socket,
      options,
      setIsLoading,
      setCurrentTransport,
    ]
  );

  /**
   * Regenerate a response from a specific message
   */
  const regenerate = useCallback(
    async (messageId: string) => {
      const parentId = messageOperator.getParent(messageId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parentMessage = (conversation.mapping as any)[parentId];

      if (!parentMessage?.message?.content) {
        console.error('Cannot find parent user message to regenerate from');
        return;
      }

      const { extractOriginalMessageSettings } = await import('../chat/utils');
      const extracted = extractOriginalMessageSettings(parentMessage, {
        tools,
        context,
        lang: options.lang ?? 'English',
      });

      await ask({
        query: parentMessage.message.content,
        parentMessageId: parentId,
        enableThinking: extracted.originalEnableThinking,
      });
    },
    [conversation.mapping, messageOperator, tools, context, options.lang, ask]
  );

  /**
   * Edit a message and regenerate from that point
   */
  const edit = useCallback(
    async (targetMessageId: string, newContent: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (conversation.mapping as any)[targetMessageId];
      const parentId = message?.parent_id ?? '';

      const { extractOriginalMessageSettings } = await import('../chat/utils');
      const extracted = extractOriginalMessageSettings(message, {
        tools,
        context,
        lang: options.lang ?? 'English',
      });

      await ask({
        query: newContent,
        parentMessageId: parentId,
        enableThinking: extracted.originalEnableThinking,
      });
    },
    [conversation.mapping, tools, context, options.lang, ask]
  );

  return {
    ask,
    stop,
    regenerate,
    edit,
    isLoading,
  };
}

function handleChatResponse(
  chatResponse: ChatResponse,
  messageOperator: any,
  options: UseChatOptions
) {
  switch (chatResponse.response_type) {
    case 'bos':
      messageOperator.add(chatResponse);
      break;
    case 'delta':
      messageOperator.update(chatResponse);
      options.onConversationUpdate?.({} as any); // TODO: Get current conversation
      break;
    case 'eos':
      messageOperator.done();
      break;
    case 'done':
      // Stream complete
      break;
    case 'error':
      options.onError?.(chatResponse.error);
      break;
    default:
      console.error({ message: 'Unknown response type', chatResponse });
  }
}
