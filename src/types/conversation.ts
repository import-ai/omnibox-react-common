/**
 * Conversation and message types
 */

import type { OpenAIMessage, MessageStatus, Citation } from './chat';
import type { ChatTool } from './tools';
import type { IBase } from './common';

export interface ConversationSummary extends IBase {
  id: string;
  title: string;
  user_content?: string;
  assistant_content?: string;
}

export interface ConversationMessageAttrs {
  citations?: Citation[];
  tools?: ChatTool[];
  enable_thinking?: boolean;
  lang?: '简体中文' | 'English';
}

export interface MessageDetail extends IBase {
  id: string;
  message: OpenAIMessage;
  status: MessageStatus;
  parent_id: string;
  children: string[];
  attrs?: ConversationMessageAttrs;
}

export interface ConversationDetail extends IBase {
  id: string;
  title?: string;
  mapping: Record<string, MessageDetail>;
  current_node?: string;
}
