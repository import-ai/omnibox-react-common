/**
 * @omnibox/ts-common - Omnibox TypeScript SDK
 *
 * This SDK provides common utilities for chat and streaming functionality
 * across web, iOS, and Android (React Native) platforms.
 *
 * @example
 * ```typescript
 * import { ChatClient, MemoryStorage, FetchHttpProvider } from '@omnibox/ts-common';
 *
 * const client = new ChatClient({
 *   baseURL: 'https://api.example.com',
 *   storage: new MemoryStorage(),
 * });
 *
 * const { transport, cleanup } = client.ask({
 *   conversationId: 'conv-123',
 *   query: 'Hello!',
 *   onConversationUpdate: (conv) => console.log(conv),
 * });
 *
 * await transport.start();
 * cleanup();
 * ```
 */

// Types
export * from './types';

// Platform abstractions
export * from './platform';

// Transport layer
export * from './transport';

// Chat functionality
export * from './chat';
