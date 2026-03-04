/**
 * Hook for managing messages in a conversation
 */

import { useMemo } from 'react';
import { useChatContext } from '../context/ChatContext';
import { MessageDetail, OpenAIMessageRole } from '../types';

export function useMessages() {
  const { conversation } = useChatContext();

  const messages = useMemo((): MessageDetail[] => {
    const result: MessageDetail[] = [];
    let currentNode: string | undefined = conversation.current_node;
    while (currentNode) {
      const message = conversation.mapping[currentNode];
      if (!message) {
        break;
      }
      result.unshift(message);
      currentNode = message.parent_id;
    }
    return result;
  }, [conversation]);

  const visibleMessages = useMemo(() => {
    return messages.filter(
      (message) => message.message.role !== OpenAIMessageRole.SYSTEM
    );
  }, [messages]);

  const lastAssistantMessage = useMemo(() => {
    return visibleMessages
      .filter((msg) => msg.message.role === OpenAIMessageRole.ASSISTANT)
      .pop();
  }, [visibleMessages]);

  return {
    messages,
    visibleMessages,
    lastAssistantMessage,
  };
}
