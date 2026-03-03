# @omnibox/ts-common

Omnibox TypeScript SDK - Common utilities for chat and streaming functionality across web, iOS, and Android (React Native) platforms.

## Installation

```bash
npm install @omnibox/ts-common
# or
pnpm add @omnibox/ts-common
# or
yarn add @omnibox/ts-common
```

Optional peer dependency for WebSocket support:

```bash
npm install socket.io-client
```

## Features

- **Platform Agnostic**: Works on web, Node.js, and React Native
- **Flexible Storage**: Bring your own storage implementation (localStorage, AsyncStorage, etc.)
- **Multiple Transports**: Support for both WebSocket and Server-Sent Events (SSE)
- **Type Safe**: Full TypeScript support with comprehensive type definitions
- **Lightweight**: Tree-shakeable exports, only import what you need

## Quick Start

```typescript
import { ChatClient, MemoryStorage } from '@omnibox/ts-common';

const client = new ChatClient({
  baseURL: 'https://api.example.com',
  storage: new MemoryStorage(),
});

const { transport, cleanup } = client.ask({
  conversationId: 'conv-123',
  query: 'Hello, how can you help me?',
  onConversationUpdate: (conv) => {
    console.log('Conversation updated:', conv);
  },
});

await transport.start();

// Cleanup when done
cleanup();
```

## Usage Guide

### ChatClient

The main entry point for chat functionality:

```typescript
import { ChatClient, MemoryStorage } from '@omnibox/ts-common';

const client = new ChatClient({
  baseURL: 'https://api.example.com',
  storage: new MemoryStorage(),
  namespaceId: 'my-namespace', // optional
  preferWebSocket: true, // optional, defaults to true if webSocketProvider provided
  onError: (error) => console.error('Chat error:', error),
});
```

### Platform Abstractions

#### Storage Provider

Implement your own storage or use built-in implementations:

```typescript
import { StorageProvider, MemoryStorage } from '@omnibox/ts-common';

// Built-in memory storage (good for testing)
const storage = new MemoryStorage();

// Custom implementation example (React Native AsyncStorage)
const asyncStorage: StorageProvider = {
  getItem: async (key) => AsyncStorage.getItem(key),
  setItem: async (key, value) => AsyncStorage.setItem(key, value),
  removeItem: async (key) => AsyncStorage.removeItem(key),
};
```

#### HTTP Provider

The SDK provides a fetch-based HTTP provider by default:

```typescript
import { FetchHttpProvider } from '@omnibox/ts-common';

const http = new FetchHttpProvider({
  baseURL: 'https://api.example.com',
  defaultHeaders: { 'X-Custom-Header': 'value' },
});
```

#### WebSocket Provider

For WebSocket support, provide a WebSocket implementation:

```typescript
import { WebSocketProvider, WebSocketProviderOptions } from '@omnibox/ts-common';

// Example with socket.io-client
import { io, Socket } from 'socket.io-client';

class SocketIOProvider implements WebSocketProvider {
  private socket: Socket;

  constructor(options: WebSocketProviderOptions) {
    this.socket = io(options.url, {
      path: options.path,
      auth: { token: options.token },
      transports: options.transports,
    });
  }

  connect(): void { this.socket.connect(); }
  disconnect(): void { this.socket.disconnect(); }
  isConnected(): boolean { return this.socket.connected; }
  emit(event: string, data: any): void { this.socket.emit(event, data); }
  on(event: string, callback: (data: any) => void): void {
    this.socket.on(event, callback);
  }
  off(event: string, callback: (data: any) => void): void {
    this.socket.off(event, callback);
  }
  once(event: string, callback: (data: any) => void): void {
    this.socket.once(event, callback);
  }
}
```

### Message Operations

Manage conversation state with the message operator:

```typescript
import { createMessageOperator, ConversationDetail } from '@omnibox/ts-common';

const conversation: ConversationDetail = {
  id: 'conv-123',
  mapping: {},
  current_node: undefined,
};

const operator = createMessageOperator({
  conversation,
  setConversation: (updater) => {
    const newConv = updater(conversation);
    // Update your state (React setState, Vue reactive, etc.)
  },
});

// Use operator to manage messages
operator.add({
  response_type: 'bos',
  role: OpenAIMessageRole.ASSISTANT,
  id: 'msg-123',
  parentId: 'msg-122',
});

operator.update({
  response_type: 'delta',
  message: { content: 'Hello' },
});

operator.done();
```

### Streaming Transports

Create streaming transports for real-time chat:

```typescript
import {
  createStreamTransport,
  createSSETransport,
  MemoryStorage,
} from '@omnibox/ts-common';

const storage = new MemoryStorage();
storage.setItem('token', 'your-auth-token');

// Auto-select transport (WebSocket if provider available, else SSE)
const transport = createStreamTransport({
  url: 'https://api.example.com/chat',
  body: { query: 'Hello' },
  callback: (data) => console.log('Received:', data),
  storage,
});

// Or use SSE directly
const sseTransport = createSSETransport({
  url: 'https://api.example.com/chat',
  body: { query: 'Hello' },
  callback: (data) => console.log('Received:', data),
  token: 'your-auth-token',
});

// Start streaming
await transport.start();

// Stop streaming
transport.destroy();
```

### Tool Types

The SDK supports various chat tools:

```typescript
import { ToolType, prepareBody } from '@omnibox/ts-common';

const body = prepareBody(
  'conv-123',
  'Search for documents',
  [ToolType.PRIVATE_SEARCH, ToolType.WEB_SEARCH],
  [
    {
      type: 'resource',
      resource: { id: 'res-1', name: 'My Document' },
    },
  ],
  undefined, // parent_message_id
  'English',
  false // enable_thinking
);
```

## API Reference

### Types

- `ChatRequestBody` - Request body for chat requests
- `ChatResponse` - Union type for all chat responses
- `ConversationDetail` - Conversation structure with message mapping
- `MessageDetail` - Individual message structure
- `ChatTool` - Tool configuration (web search, private search, reasoning)
- `MessageStatus` - Enum for message states
- `OpenAIMessageRole` - Enum for message roles
- `ToolType` - Enum for available tools

### Classes

- `ChatClient` - Main chat client for conversations
- `MemoryStorage` - In-memory storage implementation
- `FetchHttpProvider` - Fetch-based HTTP client

### Functions

- `createMessageOperator()` - Create a message state manager
- `createStreamTransport()` - Create a streaming transport
- `createSSETransport()` - Create an SSE transport
- `createWebSocketTransport()` - Create a WebSocket transport
- `prepareBody()` - Prepare a chat request body
- `ask()` - Send a chat request with streaming response

## License

MIT
