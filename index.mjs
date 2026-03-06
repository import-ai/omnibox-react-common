import {
  ToolType,
  extractOriginalMessageSettings,
  extractToolsAndContext,
  findFirstMessageWithMissingParent,
  prepareBody
} from "./chunk-G6OH3XQ2.mjs";

// src/types/chat.ts
var MessageStatus = /* @__PURE__ */ ((MessageStatus2) => {
  MessageStatus2["PENDING"] = "pending";
  MessageStatus2["STREAMING"] = "streaming";
  MessageStatus2["SUCCESS"] = "success";
  MessageStatus2["STOPPED"] = "stopped";
  MessageStatus2["INTERRUPTED"] = "interrupted";
  MessageStatus2["FAILED"] = "failed";
  return MessageStatus2;
})(MessageStatus || {});
var OpenAIMessageRole = /* @__PURE__ */ ((OpenAIMessageRole2) => {
  OpenAIMessageRole2["SYSTEM"] = "system";
  OpenAIMessageRole2["USER"] = "user";
  OpenAIMessageRole2["ASSISTANT"] = "assistant";
  OpenAIMessageRole2["TOOL"] = "tool";
  return OpenAIMessageRole2;
})(OpenAIMessageRole || {});
var ChatMode = /* @__PURE__ */ ((ChatMode2) => {
  ChatMode2["ASK"] = "ask";
  ChatMode2["WRITE"] = "write";
  return ChatMode2;
})(ChatMode || {});

// src/context/ChatContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from "react";

// src/chat/message-operator.ts
function add(source, delta) {
  return delta ? (source || "") + delta : source;
}
function getChildren(conversation, id, targetRole) {
  if (targetRole === "assistant" /* ASSISTANT */) {
    const currentNode = conversation.mapping[id];
    if (currentNode) {
      if (currentNode.message.role === "assistant" /* ASSISTANT */ && !currentNode.message.tool_calls) {
        return [id];
      }
      const targetChildren = [];
      for (const childId of currentNode.children || []) {
        targetChildren.push(...getChildren(conversation, childId, targetRole));
      }
      return targetChildren;
    }
  } else if (targetRole === "user" /* USER */) {
    const currentNode = conversation.mapping[id];
    if (currentNode) {
      return currentNode.children;
    }
    const children = [];
    for (const node of Object.values(conversation.mapping)) {
      if (node.parent_id === id) {
        children.push(node.id);
      }
    }
    return children;
  }
  return [];
}
function createMessageOperator(options) {
  const { conversation, setConversation } = options;
  return {
    update: (delta, id) => {
      setConversation((prev) => {
        const targetId = id ?? prev.current_node;
        if (!targetId) return prev;
        const message = prev.mapping[targetId];
        if (!message) {
          return prev;
        }
        const updatedMessage = {
          ...message,
          message: {
            ...message.message,
            content: add(message.message.content, delta.message.content),
            reasoning_content: add(
              message.message.reasoning_content,
              delta.message.reasoning_content
            ),
            ...delta.message.tool_calls?.length && {
              tool_calls: delta.message.tool_calls
            },
            ...delta.message.tool_call_id && {
              tool_call_id: delta.message.tool_call_id
            }
          },
          status: "streaming" /* STREAMING */,
          ...delta.attrs?.citations && {
            attrs: {
              ...message.attrs,
              citations: delta.attrs.citations
            }
          }
        };
        return {
          ...prev,
          mapping: { ...prev.mapping, [targetId]: updatedMessage }
        };
      });
    },
    add: (chatResponse) => {
      const message = {
        id: chatResponse.id,
        message: {
          role: chatResponse.role
        },
        status: "pending" /* PENDING */,
        parent_id: chatResponse.parentId,
        children: []
      };
      setConversation((prev) => {
        const newMapping = { ...prev.mapping, [message.id]: message };
        if (message.parent_id && prev.current_node !== void 0) {
          const parentMessage = prev.mapping[message.parent_id];
          if (parentMessage) {
            if (!parentMessage.children.includes(message.id)) {
              const updatedParent = {
                ...parentMessage,
                children: [...parentMessage.children, message.id]
              };
              newMapping[message.parent_id] = updatedParent;
            }
          }
        }
        return {
          ...prev,
          mapping: newMapping,
          current_node: message.id
        };
      });
      return chatResponse.id;
    },
    done: (id) => {
      setConversation((prev) => {
        const targetId = id ?? prev.current_node;
        if (!targetId) return prev;
        const message = prev.mapping[targetId];
        if (!message) return prev;
        return {
          ...prev,
          mapping: {
            ...prev.mapping,
            [targetId]: { ...message, status: "success" /* SUCCESS */ }
          }
        };
      });
    },
    activate: (id) => {
      setConversation((prev) => {
        let currentNode = id;
        let children = prev.mapping[currentNode]?.children ?? [];
        while (children.length > 0) {
          currentNode = children[children.length - 1];
          children = prev.mapping[currentNode]?.children ?? [];
        }
        return {
          ...prev,
          current_node: currentNode
        };
      });
    },
    getSiblings: (id) => {
      const currentNode = conversation.mapping[id];
      if (!currentNode) return [];
      if (currentNode.message.tool_calls) {
        return [id];
      }
      const currentRole = currentNode.message.role;
      if (currentRole === "user" /* USER */) {
        return getChildren(conversation, currentNode.parent_id, currentRole);
      }
      let parentNode = currentNode;
      while (parentNode.message.role !== "user" /* USER */) {
        parentNode = conversation.mapping[parentNode.parent_id];
      }
      return getChildren(conversation, parentNode.id, currentRole);
    },
    getParent: (id) => {
      let currentNode = conversation.mapping[id];
      if (!currentNode) return "";
      const targetRoles = currentNode.message.role === "assistant" /* ASSISTANT */ ? ["user" /* USER */] : ["assistant" /* ASSISTANT */, "system" /* SYSTEM */];
      while (!targetRoles.includes(currentNode.message.role)) {
        currentNode = conversation.mapping[currentNode.parent_id];
      }
      return currentNode.id;
    }
  };
}

// src/context/ChatContext.tsx
import { jsx } from "react/jsx-runtime";
var ChatContext = createContext(null);
function ChatProvider({
  children,
  config,
  initialConversation
}) {
  const [conversation, setConversation] = useState(
    initialConversation ?? {
      id: "",
      mapping: {}
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [tools, setTools] = useState([]);
  const [context, setContext] = useState([]);
  const [mode, setMode] = useState("ask" /* ASK */);
  const [socket, setSocket] = useState(null);
  const [currentTransport, setCurrentTransport] = useState(null);
  const messageOperator = React.useMemo(
    () => createMessageOperator({
      conversation,
      setConversation
    }),
    [conversation]
  );
  useEffect(() => {
    return () => {
      if (currentTransport) {
        currentTransport.destroy();
      }
    };
  }, [currentTransport]);
  const value = {
    config,
    conversation,
    setConversation,
    messageOperator,
    isLoading,
    setIsLoading,
    tools,
    setTools,
    context,
    setContext,
    mode,
    setMode,
    socket,
    setSocket,
    currentTransport,
    setCurrentTransport
  };
  return /* @__PURE__ */ jsx(ChatContext.Provider, { value, children });
}
function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}

// src/hooks/useChat.ts
import { useCallback, useRef } from "react";

// src/transport/sse.ts
function createSSETransport(options) {
  let isAborted = false;
  let reader = null;
  return {
    start: async () => {
      const { url, body, onMessage, onError, token, headers = {} } = options;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...token ? { Authorization: `Bearer ${token}` } : {},
            ...headers
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        if (!response.body) {
          throw new Error("Response body is not readable");
        }
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!isAborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          while (!isAborted) {
            const lineEnd = buffer.indexOf("\n");
            if (lineEnd === -1) break;
            const line = buffer.slice(0, lineEnd).trim();
            buffer = buffer.slice(lineEnd + 1);
            if (line.startsWith("data:")) {
              const data = line.slice(5).trim();
              await onMessage(data);
            }
          }
        }
      } catch (error) {
        if (onError && !isAborted) {
          onError(error instanceof Error ? error.message : String(error));
        }
        throw error;
      } finally {
        if (reader) {
          await reader.cancel();
        }
      }
    },
    destroy: () => {
      isAborted = true;
      if (reader) {
        reader.cancel().catch(() => {
        });
      }
    }
  };
}

// src/transport/stream-transport.ts
function createStreamTransport(options) {
  const {
    url,
    body,
    callback,
    token,
    useWebSocket: useWebSocket2 = true,
    webSocketUrl,
    webSocketPath = "/socket.io",
    headers = {},
    onError,
    onComplete
  } = options;
  if (useWebSocket2) {
    return createSocketIOTransport({
      url,
      body,
      callback,
      token,
      webSocketUrl,
      webSocketPath,
      onError,
      onComplete
    });
  }
  return createSSETransport({
    url,
    body,
    onMessage: callback,
    onError,
    token,
    headers
  });
}
function createSocketIOTransport(options) {
  const { url, body, callback, token, webSocketUrl, webSocketPath, onError, onComplete } = options;
  let socket = null;
  let isAborted = false;
  let event = url.includes("/ask") ? "ask" : "write";
  if (body.share_id) {
    event = `share_${event}`;
  }
  return {
    start: async () => {
      const { io } = await import("socket.io-client");
      const wsUrl = webSocketUrl || url;
      const authToken = token || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null);
      socket = io(wsUrl, {
        path: webSocketPath,
        transports: ["websocket", "polling"],
        auth: authToken ? { token: `Bearer ${authToken}` } : void 0,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1e3
      });
      const messageHandler = async (data) => {
        if (!isAborted) {
          await callback(String(data));
        }
      };
      const errorHandler = (data) => {
        if (onError && !isAborted && typeof data === "object" && data !== null && "error" in data) {
          onError(String(data.error));
        }
      };
      const completeHandler = () => {
        cleanup();
        if (onComplete && !isAborted) {
          onComplete();
        }
      };
      const cleanup = () => {
        socket?.off("message", messageHandler);
        socket?.off("error", errorHandler);
        socket?.off("complete", completeHandler);
      };
      socket.on("message", messageHandler);
      socket.on("error", errorHandler);
      socket.on("complete", completeHandler);
      if (socket.connected) {
        socket.emit(event, body);
      } else {
        socket.once("connect", () => {
          socket?.emit(event, body);
        });
      }
    },
    destroy: () => {
      isAborted = true;
      socket?.disconnect();
      socket = null;
    }
  };
}
function createSSETransport2(options) {
  return createSSETransport({
    url: options.url,
    body: options.body,
    onMessage: options.callback,
    onError: options.onError,
    token: options.token,
    headers: options.headers
  });
}

// src/hooks/useChat.ts
function useChat(options = {}) {
  const {
    config,
    conversation,
    messageOperator,
    isLoading,
    setIsLoading,
    tools,
    context,
    mode,
    socket,
    currentTransport,
    setCurrentTransport
  } = useChatContext();
  const abortRef = useRef(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    if (currentTransport) {
      currentTransport.destroy();
      setCurrentTransport(null);
    }
    setIsLoading(false);
  }, [currentTransport, setCurrentTransport, setIsLoading]);
  const ask = useCallback(
    async ({ query, parentMessageId, enableThinking }) => {
      const {
        namespaceId: configNamespaceId,
        baseURL,
        useWebSocket: useWebSocket2 = true,
        token
      } = config;
      const namespaceId = options.namespaceId ?? configNamespaceId ?? "default";
      const conversationId = "";
      if (!query.trim()) return;
      setIsLoading(true);
      try {
        const { prepareBody: prepareBody2 } = await import("./utils-3L3HUS3Z.mjs");
        const body = prepareBody2(
          conversationId,
          query,
          tools,
          context,
          parentMessageId,
          options.lang ?? "English",
          enableThinking
        );
        body.namespace_id = namespaceId;
        if (options.shareId) {
          body.share_id = options.shareId;
          body.share_password = options.sharePassword;
        }
        const url = options.shareId ? `${baseURL}/api/v1/shares/${options.shareId}/wizard/${mode}` : `${baseURL}/api/v1/namespaces/${namespaceId}/wizard/${mode}`;
        const transport = createStreamTransport({
          url,
          body,
          callback: async (data) => {
            const chatResponse = JSON.parse(data);
            handleChatResponse(chatResponse, messageOperator, optionsRef.current);
          },
          token,
          useWebSocket: useWebSocket2,
          webSocketUrl: config.webSocketUrl ?? config.baseURL,
          webSocketPath: config.webSocketPath,
          onError: (error) => {
            options.onError?.(error);
            setIsLoading(false);
            setCurrentTransport(null);
          },
          onComplete: () => {
            setIsLoading(false);
            setCurrentTransport(null);
            options.onComplete?.();
          }
        });
        setCurrentTransport(transport);
        abortRef.current = () => transport.destroy();
        await transport.start();
      } catch (error) {
        setIsLoading(false);
        setCurrentTransport(null);
        options.onError?.(error instanceof Error ? error.message : String(error));
      }
    },
    [
      config,
      messageOperator,
      tools,
      context,
      mode,
      socket,
      options,
      setIsLoading,
      setCurrentTransport
    ]
  );
  const regenerate = useCallback(
    async (messageId) => {
      const parentId = messageOperator.getParent(messageId);
      const parentMessage = conversation.mapping[parentId];
      if (!parentMessage?.message?.content) {
        console.error("Cannot find parent user message to regenerate from");
        return;
      }
      const { extractOriginalMessageSettings: extractOriginalMessageSettings2 } = await import("./utils-3L3HUS3Z.mjs");
      const extracted = extractOriginalMessageSettings2(parentMessage, {
        tools,
        context,
        lang: options.lang ?? "English"
      });
      await ask({
        query: parentMessage.message.content,
        parentMessageId: parentId,
        enableThinking: extracted.originalEnableThinking
      });
    },
    [conversation.mapping, messageOperator, tools, context, options.lang, ask]
  );
  const edit = useCallback(
    async (targetMessageId, newContent) => {
      const message = conversation.mapping[targetMessageId];
      const parentId = message?.parent_id ?? "";
      const { extractOriginalMessageSettings: extractOriginalMessageSettings2 } = await import("./utils-3L3HUS3Z.mjs");
      const extracted = extractOriginalMessageSettings2(message, {
        tools,
        context,
        lang: options.lang ?? "English"
      });
      await ask({
        query: newContent,
        parentMessageId: parentId,
        enableThinking: extracted.originalEnableThinking
      });
    },
    [conversation.mapping, tools, context, options.lang, ask]
  );
  return {
    ask,
    stop,
    regenerate,
    edit,
    isLoading
  };
}
function handleChatResponse(chatResponse, messageOperator, options) {
  switch (chatResponse.response_type) {
    case "bos":
      messageOperator.add(chatResponse);
      break;
    case "delta":
      messageOperator.update(chatResponse);
      options.onConversationUpdate?.({});
      break;
    case "eos":
      messageOperator.done();
      break;
    case "done":
      break;
    case "error":
      options.onError?.(chatResponse.error);
      break;
    default:
      console.error({ message: "Unknown response type", chatResponse });
  }
}

// src/hooks/useMessageOperator.ts
import { useCallback as useCallback2 } from "react";
function useMessageOperator() {
  const { messageOperator, conversation, setConversation } = useChatContext();
  const update = useCallback2(
    (delta, id) => {
      messageOperator.update(delta, id);
    },
    [messageOperator]
  );
  const add2 = useCallback2(
    (chatResponse) => {
      return messageOperator.add(chatResponse);
    },
    [messageOperator]
  );
  const done = useCallback2(
    (id) => {
      messageOperator.done(id);
    },
    [messageOperator]
  );
  const activate = useCallback2(
    (id) => {
      messageOperator.activate(id);
    },
    [messageOperator]
  );
  const getSiblings = useCallback2(
    (id) => {
      return messageOperator.getSiblings(id);
    },
    [messageOperator]
  );
  const getParent = useCallback2(
    (id) => {
      return messageOperator.getParent(id);
    },
    [messageOperator]
  );
  return {
    update,
    add: add2,
    done,
    activate,
    getSiblings,
    getParent,
    conversation,
    setConversation
  };
}

// src/hooks/useMessages.ts
import { useMemo } from "react";
function useMessages() {
  const { conversation } = useChatContext();
  const messages = useMemo(() => {
    const result = [];
    let currentNode = conversation.current_node;
    while (currentNode) {
      const message = conversation.mapping[currentNode];
      if (!message) {
        break;
      }
      result.unshift(message);
      currentNode = message.parent_id;
    }
    return result;
  }, [conversation]);
  const visibleMessages = useMemo(() => {
    return messages.filter(
      (message) => message.message.role !== "system" /* SYSTEM */
    );
  }, [messages]);
  const lastAssistantMessage = useMemo(() => {
    return visibleMessages.filter((msg) => msg.message.role === "assistant" /* ASSISTANT */).pop();
  }, [visibleMessages]);
  return {
    messages,
    visibleMessages,
    lastAssistantMessage
  };
}

// src/hooks/useWebSocket.ts
import { useEffect as useEffect2, useRef as useRef2, useCallback as useCallback3 } from "react";
function useWebSocket(options = {}) {
  const { config, socket, setSocket } = useChatContext();
  const optionsRef = useRef2(options);
  optionsRef.current = options;
  const connect = useCallback3(() => {
    const currentSocket = socket;
    if (currentSocket?.connected) return;
    const { webSocketUrl, webSocketPath, token } = config;
    import("socket.io-client").then(({ io }) => {
      const newSocket = io(webSocketUrl ?? config.baseURL, {
        path: webSocketPath ?? "/api/v1/socket.io",
        transports: ["websocket", "polling"],
        auth: token ? { token: `Bearer ${token}` } : void 0,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1e3
      });
      newSocket.on("connect", () => {
        optionsRef.current.onConnect?.();
      });
      newSocket.on("disconnect", (reason) => {
        optionsRef.current.onDisconnect?.(reason);
      });
      newSocket.on("connect_error", (error) => {
        optionsRef.current.onError?.(error);
      });
      setSocket(newSocket);
    });
  }, [config, socket, setSocket]);
  const disconnect = useCallback3(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [socket, setSocket]);
  useEffect2(() => {
    if (options.autoConnect) {
      connect();
    }
    return () => {
      if (options.autoConnect) {
        disconnect();
      }
    };
  }, [options.autoConnect, connect, disconnect]);
  return {
    socket,
    isConnected: socket?.connected ?? false,
    connect,
    disconnect
  };
}
export {
  ChatMode,
  ChatProvider,
  MessageStatus,
  OpenAIMessageRole,
  ToolType,
  createMessageOperator,
  createSSETransport2 as createSSETransport,
  createStreamTransport,
  extractOriginalMessageSettings,
  extractToolsAndContext,
  findFirstMessageWithMissingParent,
  prepareBody,
  useChat,
  useChatContext,
  useMessageOperator,
  useMessages,
  useWebSocket
};
