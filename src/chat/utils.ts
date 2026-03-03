/**
 * Chat utility functions for preparing requests and extracting settings
 */

import { ChatResponse } from '../types/chat';
import {
  ChatRequestBody,
  ChatTool,
  PrivateSearch,
  PrivateSearchResource,
  ToolType,
  IResTypeContext,
} from '../types/tools';
import { MessageDetail } from '../types/conversation';
import { MessageOperator } from './message-operator';
import { StreamTransport } from '../transport/types';
import { WizardLang } from '../types/common';

function getPrivateSearchResources(
  context: IResTypeContext[]
): PrivateSearchResource[] {
  return context.map((item) => ({
    name: item.resource.name || '',
    id: item.resource.id,
    type: item.type,
  }));
}

/**
 * Convert ChatTool[] from backend to ToolType[] and IResTypeContext[] for UI
 */
export function extractToolsAndContext(
  chatTools: ChatTool[]
): {
  tools: ToolType[];
  context: IResTypeContext[];
} {
  const tools: ToolType[] = [];
  const context: IResTypeContext[] = [];

  for (const tool of chatTools) {
    if (tool.name === ToolType.PRIVATE_SEARCH) {
      tools.push(ToolType.PRIVATE_SEARCH);
      if ('resources' in tool && tool.resources) {
        for (const res of tool.resources) {
          context.push({
            type: res.type,
            resource: {
              id: res.id,
              name: res.name,
            },
          });
        }
      }
    } else if (tool.name === ToolType.WEB_SEARCH) {
      tools.push(ToolType.WEB_SEARCH);
    } else if (tool.name === ToolType.REASONING) {
      tools.push(ToolType.REASONING);
    }
  }

  return { tools, context };
}

/**
 * Extract original tools/settings from a message's attributes with fallback to current state
 */
export function extractOriginalMessageSettings(
  message: MessageDetail | undefined,
  fallbacks: {
    tools: ToolType[];
    context: IResTypeContext[];
    lang: WizardLang;
    enableThinking?: boolean;
  }
): {
  originalTools: ToolType[];
  originalContext: IResTypeContext[];
  originalLang: WizardLang;
  originalEnableThinking: boolean | undefined;
} {
  let originalTools = fallbacks.tools;
  let originalContext = fallbacks.context;
  let originalLang = fallbacks.lang;
  let originalEnableThinking: boolean | undefined = fallbacks.enableThinking;

  if (message?.attrs?.tools) {
    const extracted = extractToolsAndContext(message.attrs.tools);
    originalTools = extracted.tools;
    originalContext = extracted.context;
  }
  if (message?.attrs?.lang) {
    originalLang = message.attrs.lang;
  }
  if (message?.attrs?.enable_thinking !== undefined) {
    originalEnableThinking = message.attrs.enable_thinking;
  }

  return {
    originalTools,
    originalContext,
    originalLang,
    originalEnableThinking,
  };
}

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
export function prepareBody(
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  parent_message_id: string | undefined,
  lang: WizardLang | undefined,
  enable_thinking?: boolean
): ChatRequestBody {
  const body: ChatRequestBody = {
    conversation_id: conversationId,
    query,
    enable_thinking: enable_thinking ?? false,
    lang,
  };

  if (context.length > 0 && !tools.includes(ToolType.PRIVATE_SEARCH)) {
    tools = [ToolType.PRIVATE_SEARCH, ...tools];
  }

  for (const tool of tools) {
    if (tool === ToolType.REASONING) {
      body.enable_thinking = true;
    } else if (tool === ToolType.PRIVATE_SEARCH) {
      body.tools = body.tools || [];
      const searchTool: PrivateSearch = {
        name: ToolType.PRIVATE_SEARCH,
        resources: getPrivateSearchResources(context),
      };
      body.tools.push(searchTool);
    } else if (tool === ToolType.WEB_SEARCH) {
      body.tools = body.tools || [];
      body.tools.push({ name: tool });
    } else {
      throw new Error(`Unknown tool type: ${tool}`);
    }
  }

  if (parent_message_id) {
    body.parent_message_id = parent_message_id;
  }

  return body;
}

export interface AskOptions {
  /** The conversation ID */
  conversationId: string;
  /** The user query */
  query: string;
  /** Selected tool types */
  tools: ToolType[];
  /** Selected resources for private search */
  context: IResTypeContext[];
  /** Optional parent message ID for branching */
  parent_message_id?: string;
  /** Message operator for state management */
  messageOperator: MessageOperator;
  /** The API endpoint URL */
  url: string;
  /** Language preference */
  lang: WizardLang | undefined;
  /** Namespace ID */
  namespaceId?: string;
  /** Share ID (for public shares) */
  shareId?: string;
  /** Share password (if required) */
  sharePassword?: string;
  /** Whether to enable reasoning/thinking */
  enable_thinking?: boolean;
  /** Transport factory function */
  createTransport: (requestBody: ChatRequestBody, callback: (data: string) => Promise<void>) => StreamTransport;
  /** Error handler (replaces toast) */
  onError?: (error: string) => void;
}

/**
 * Send a chat request and handle streaming responses
 * @param options - Ask configuration options
 * @returns StreamTransport instance for controlling the stream
 */
export function ask(options: AskOptions): StreamTransport {
  const {
    conversationId,
    query,
    tools,
    context,
    parent_message_id,
    messageOperator,
    lang,
    namespaceId,
    shareId,
    sharePassword,
    enable_thinking,
    createTransport,
    onError,
  } = options;

  const chatReq = prepareBody(
    conversationId,
    query,
    tools,
    context,
    parent_message_id,
    lang,
    enable_thinking
  );

  chatReq.namespace_id = namespaceId;
  chatReq.share_id = shareId;
  chatReq.share_password = sharePassword;

  return createTransport(chatReq, async (data: string) => {
    const chatResponse: ChatResponse = JSON.parse(data);
    if (chatResponse.response_type === 'bos') {
      messageOperator.add(chatResponse);
    } else if (chatResponse.response_type === 'delta') {
      messageOperator.update(chatResponse);
    } else if (chatResponse.response_type === 'eos') {
      messageOperator.done();
    } else if (chatResponse.response_type === 'done') {
      // Stream complete
    } else if (chatResponse.response_type === 'error') {
      if (onError) {
        onError(chatResponse.error);
      }
    } else {
      console.error({ message: 'Unknown response type', chatResponse });
    }
  });
}

/**
 * Create a transport factory for use with ask()
 * @param baseCreateStreamTransport - Base transport creation function
 * @param namespaceId - Optional namespace ID
 * @param shareId - Optional share ID
 * @param sharePassword - Optional share password
 * @returns Transport factory function
 */
export function createTransportFactory(
  baseCreateStreamTransport: (url: string, body: Record<string, any>, callback: (data: string) => Promise<void>) => StreamTransport,
  namespaceId?: string,
  shareId?: string,
  sharePassword?: string
) {
  return (requestBody: ChatRequestBody, callback: (data: string) => Promise<void>): StreamTransport => {
    const body = {
      ...requestBody,
      namespace_id: namespaceId,
      share_id: shareId,
      share_password: sharePassword,
    };
    return baseCreateStreamTransport('/namespaces/' + (namespaceId || 'default') + '/chat', body, callback);
  };
}
