/**
 * Hook for message operations with automatic state updates
 */

import { useCallback } from 'react';
import { useChatContext } from '../context/ChatContext';
import { ChatBOSResponse, ChatDeltaResponse } from '../types';

export function useMessageOperator() {
  const { messageOperator, conversation, setConversation } = useChatContext();

  const update = useCallback(
    (delta: ChatDeltaResponse, id?: string) => {
      messageOperator.update(delta, id);
    },
    [messageOperator]
  );

  const add = useCallback(
    (chatResponse: ChatBOSResponse) => {
      return messageOperator.add(chatResponse);
    },
    [messageOperator]
  );

  const done = useCallback(
    (id?: string) => {
      messageOperator.done(id);
    },
    [messageOperator]
  );

  const activate = useCallback(
    (id: string) => {
      messageOperator.activate(id);
    },
    [messageOperator]
  );

  const getSiblings = useCallback(
    (id: string) => {
      return messageOperator.getSiblings(id);
    },
    [messageOperator]
  );

  const getParent = useCallback(
    (id: string) => {
      return messageOperator.getParent(id);
    },
    [messageOperator]
  );

  return {
    update,
    add,
    done,
    activate,
    getSiblings,
    getParent,
    conversation,
    setConversation,
  };
}
