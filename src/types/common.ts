/**
 * Common interfaces shared across the SDK
 */

export interface IBase {
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export type Permission =
  | 'no_access'
  | 'can_view'
  | 'can_comment'
  | 'can_edit'
  | 'full_access';

export type SpaceType = 'private' | 'teamspace';
export type ResourceType = 'doc' | 'file' | 'link' | 'folder';

export interface PathItem {
  id: string;
  name: string;
}

export interface ResourceMeta {
  id: string;
  name?: string;
  parent_id: string | null;
  resource_type: ResourceType;
  created_at?: string;
  updated_at?: string;
  attrs?: Record<string, any>;
  has_children?: boolean;
}

export interface ResourceSummary {
  id: string;
  name: string;
  resource_type: ResourceType;
  attrs: Record<string, any>;
  content: string;
  has_children: boolean;
  created_at: string;
  updated_at: string;
}

export type WizardLang = '简体中文' | 'English';
