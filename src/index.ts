/**
 * @omnibox/react-common - Omnibox React Common SDK
 *
 * This SDK provides React hooks and context for chat and streaming functionality.
 *
 * @example
 * ```tsx
 * import { ChatProvider, useChat } from '@omnibox/react-common';
 *
 * function App() {
 *   return (
 *     <ChatProvider config={{ baseURL: 'https://api.example.com' }}>
 *       <ChatComponent />
 *     </ChatProvider>
 *   );
 * }
 *
 * function ChatComponent() {
 *   const { ask, isLoading } = useChat({
 *     onConversationUpdate: (conv) => console.log(conv),
 *   });
 *
 *   return (
 *     <button onClick={() => ask({ query: 'Hello!' })}>
 *       {isLoading ? 'Loading...' : 'Send'}
 *     </button>
 *   );
 * }
 * ```
 */

// Types
export * from './types';

// React Context
export * from './context/ChatContext';

// React Hooks
export * from './hooks';

// Transport layer
export * from './transport/types';
export { createStreamTransport, createSSETransport } from './transport/stream-transport';

// Message operator (for advanced use cases)
export { createMessageOperator } from './chat/message-operator';
export type { MessageOperator, CreateMessageOperatorOptions } from './chat/message-operator';

// Utilities
export {
  prepareBody,
  extractToolsAndContext,
  extractOriginalMessageSettings,
  findFirstMessageWithMissingParent,
} from './chat/utils';
