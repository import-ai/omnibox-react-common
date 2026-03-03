/**
 * Message state management for chat conversations
 */

import {
  ChatBOSResponse,
  ChatDeltaResponse,
  MessageStatus,
  OpenAIMessageRole,
} from '../types/chat';
import { ConversationDetail, MessageDetail } from '../types/conversation';

function add(source?: string, delta?: string): string | undefined {
  return delta ? (source || '') + delta : source;
}

export interface MessageOperator {
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

function getChildren(
  conversation: ConversationDetail,
  id: string,
  targetRole: OpenAIMessageRole
): string[] {
  if (targetRole === OpenAIMessageRole.ASSISTANT) {
    const currentNode = conversation.mapping[id];
    if (currentNode) {
      if (
        currentNode.message.role === OpenAIMessageRole.ASSISTANT &&
        !currentNode.message.tool_calls
      ) {
        return [id];
      }
      const targetChildren: string[] = [];
      for (const childId of currentNode.children || []) {
        targetChildren.push(...getChildren(conversation, childId, targetRole));
      }
      return targetChildren;
    }
  } else if (targetRole === OpenAIMessageRole.USER) {
    const currentNode = conversation.mapping[id];
    if (currentNode) {
      return currentNode.children;
    }
    const children: string[] = [];
    for (const node of Object.values(conversation.mapping)) {
      if (node.parent_id === id) {
        children.push(node.id);
      }
    }
    return children;
  }
  return [];
}

export interface CreateMessageOperatorOptions {
  /**
   * The conversation state
   */
  conversation: ConversationDetail;
  /**
   * Callback to update the conversation state
   */
  setConversation: (updater: (prev: ConversationDetail) => ConversationDetail) => void;
}

/**
 * Create a message operator for managing message state
 * @param options - Configuration options
 * @returns MessageOperator instance
 */
export function createMessageOperator(
  options: CreateMessageOperatorOptions
): MessageOperator {
  const { conversation, setConversation } = options;

  return {
    update: (delta: ChatDeltaResponse, id?: string) => {
      setConversation((prev) => {
        const targetId = id ?? prev.current_node;
        if (!targetId) return prev;

        const message = prev.mapping[targetId];
        if (!message) {
          return prev;
        }

        const updatedMessage: MessageDetail = {
          ...message,
          message: {
            ...message.message,
            content: add(message.message.content, delta.message.content),
            reasoning_content: add(
              message.message.reasoning_content,
              delta.message.reasoning_content
            ),
            ...(delta.message.tool_calls?.length && {
              tool_calls: delta.message.tool_calls,
            }),
            ...(delta.message.tool_call_id && {
              tool_call_id: delta.message.tool_call_id,
            }),
          },
          status: MessageStatus.STREAMING,
          ...(delta.attrs?.citations && {
            attrs: {
              ...message.attrs,
              citations: delta.attrs.citations,
            },
          }),
        };

        return {
          ...prev,
          mapping: { ...prev.mapping, [targetId]: updatedMessage },
        };
      });
    },

    add: (chatResponse: ChatBOSResponse): string => {
      const message: MessageDetail = {
        id: chatResponse.id,
        message: {
          role: chatResponse.role,
        },
        status: MessageStatus.PENDING,
        parent_id: chatResponse.parentId,
        children: [],
      };

      setConversation((prev) => {
        const newMapping = { ...prev.mapping, [message.id]: message };

        if (message.parent_id && prev.current_node !== undefined) {
          const parentMessage = prev.mapping[message.parent_id];
          if (parentMessage) {
            if (!parentMessage.children.includes(message.id)) {
              const updatedParent = {
                ...parentMessage,
                children: [...parentMessage.children, message.id],
              };
              newMapping[message.parent_id] = updatedParent;
            }
          }
        }

        return {
          ...prev,
          mapping: newMapping,
          current_node: message.id,
        };
      });

      return chatResponse.id;
    },

    done: (id?: string) => {
      setConversation((prev) => {
        const targetId = id ?? prev.current_node;
        if (!targetId) return prev;

        const message = prev.mapping[targetId];
        if (!message) return prev;

        return {
          ...prev,
          mapping: {
            ...prev.mapping,
            [targetId]: { ...message, status: MessageStatus.SUCCESS },
          },
        };
      });
    },

    activate: (id: string) => {
      setConversation((prev) => {
        let currentNode = id;
        let children = prev.mapping[currentNode]?.children ?? [];

        while (children.length > 0) {
          currentNode = children[children.length - 1];
          children = prev.mapping[currentNode]?.children ?? [];
        }

        return {
          ...prev,
          current_node: currentNode,
        };
      });
    },

    getSiblings: (id: string): string[] => {
      const currentNode = conversation.mapping[id];
      if (!currentNode) return [];

      if (currentNode.message.tool_calls) {
        return [id];
      }

      const currentRole = currentNode.message.role;
      if (currentRole === OpenAIMessageRole.USER) {
        return getChildren(conversation, currentNode.parent_id, currentRole);
      }

      let parentNode = currentNode;
      while (parentNode.message.role !== OpenAIMessageRole.USER) {
        parentNode = conversation.mapping[parentNode.parent_id];
      }
      return getChildren(conversation, parentNode.id, currentRole);
    },

    getParent: (id: string): string => {
      let currentNode = conversation.mapping[id];
      if (!currentNode) return '';

      const targetRoles =
        currentNode.message.role === OpenAIMessageRole.ASSISTANT
          ? [OpenAIMessageRole.USER]
          : [OpenAIMessageRole.ASSISTANT, OpenAIMessageRole.SYSTEM];

      while (!targetRoles.includes(currentNode.message.role)) {
        currentNode = conversation.mapping[currentNode.parent_id];
      }

      return currentNode.id;
    },
  };
}

/**
 * Find the first message whose parent_id does not exist in the messages array
 * This is typically the root message of a conversation
 * @param messages - Array of messages
 * @returns The root message or undefined
 */
export function findFirstMessageWithMissingParent(
  messages: MessageDetail[]
): MessageDetail | undefined {
  const idSet = new Set(messages.map((msg) => msg.id));
  return messages.find((msg) => !idSet.has(msg.parent_id));
}
