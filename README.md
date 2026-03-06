# @omnibox/react-common

Omnibox React Common SDK - React hooks and context for chat and streaming functionality.

## Installation

```bash
npm install @omnibox/react-common
# or
pnpm add @omnibox/react-common
# or
yarn add @omnibox/react-common
```

## Quick Start

```tsx
import { ChatProvider, useChat } from '@omnibox/react-common';

function App() {
  return (
    <ChatProvider config={{ baseURL: 'https://api.example.com' }}>
      <ChatComponent />
    </ChatProvider>
  );
}

function ChatComponent() {
  const { ask, stop, isLoading } = useChat({
    onConversationUpdate: (conv) => console.log(conv),
    onError: (err) => console.error(err),
  });

  return (
    <button onClick={() => ask({ query: 'Hello!' })}>
      {isLoading ? 'Loading...' : 'Send'}
    </button>
  );
}
```

## API Reference

### ChatProvider

Wrap your app with `ChatProvider` to provide chat context:

```tsx
<ChatProvider
  config={{
    baseURL: 'https://api.example.com',
    namespaceId: 'default',
    token: 'your-auth-token',
    useWebSocket: true,
  }}
>
  {children}
</ChatProvider>
```

### useChat

Main hook for sending messages and managing the chat stream:

```tsx
const { ask, stop, regenerate, edit, isLoading } = useChat({
  namespaceId: 'optional-override',
  onConversationUpdate: (conv) => {},
  onError: (error) => {},
  onComplete: () => {},
});

// Send a message
ask({ query: 'Hello', enableThinking: true });

// Stop streaming
stop();

// Regenerate from a message
regenerate(messageId);

// Edit a message
edit(messageId, 'new content');
```

### useMessageOperator

Hook for message operations:

```tsx
const {
  update,
  add,
  done,
  activate,
  getSiblings,
  getParent,
  conversation,
  setConversation
} = useMessageOperator();
```

### useMessages

Hook for accessing messages:

```tsx
const { messages, visibleMessages, lastAssistantMessage } = useMessages();
```

### useWebSocket

Hook for managing WebSocket connection:

```tsx
const { socket, isConnected, connect, disconnect } = useWebSocket({
  autoConnect: true,
  onConnect: () => console.log('Connected'),
  onDisconnect: (reason) => console.log('Disconnected:', reason),
});
```

## Types

All TypeScript types are exported:

```tsx
import {
  ConversationDetail,
  MessageDetail,
  ChatRequestBody,
  ToolType,
  ChatMode,
  MessageStatus,
  OpenAIMessageRole,
} from '@omnibox/react-common';
```

## License

Apache-2.0
