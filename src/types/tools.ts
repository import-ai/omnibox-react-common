/**
 * Tool types for chat functionality
 */

export enum ToolType {
  WEB_SEARCH = 'web_search',
  PRIVATE_SEARCH = 'private_search',
  REASONING = 'reasoning',
}

export type ChatActionType = 'stop' | 'disabled';

export type PrivateSearchResourceType = 'resource' | 'folder';

export interface PrivateSearchResource {
  name: string;
  id: string;
  type: PrivateSearchResourceType;
}

export interface IChatTool {
  name: ToolType;
}

export interface WebSearch extends IChatTool {
  name: ToolType.WEB_SEARCH;
}

export interface PrivateSearch extends IChatTool {
  name: ToolType.PRIVATE_SEARCH;
  resources?: PrivateSearchResource[];
}

export interface Reasoning extends IChatTool {
  name: ToolType.REASONING;
}

export type ChatTool = WebSearch | PrivateSearch | Reasoning;

export interface ChatRequestBody {
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

export interface IResTypeContext {
  type: PrivateSearchResourceType;
  resource: {
    id: string;
    name?: string;
  };
}
