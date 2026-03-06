"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/types/tools.ts
var ToolType;
var init_tools = __esm({
  "src/types/tools.ts"() {
    "use strict";
    ToolType = /* @__PURE__ */ ((ToolType3) => {
      ToolType3["WEB_SEARCH"] = "web_search";
      ToolType3["PRIVATE_SEARCH"] = "private_search";
      ToolType3["REASONING"] = "reasoning";
      return ToolType3;
    })(ToolType || {});
  }
});

// src/chat/utils.ts
var utils_exports = {};
__export(utils_exports, {
  ask: () => ask,
  createTransportFactory: () => createTransportFactory,
  extractOriginalMessageSettings: () => extractOriginalMessageSettings,
  extractToolsAndContext: () => extractToolsAndContext,
  findFirstMessageWithMissingParent: () => findFirstMessageWithMissingParent,
  prepareBody: () => prepareBody
});
function getPrivateSearchResources(context) {
  return context.map((item) => ({
    name: item.resource.name || "",
    id: item.resource.id,
    type: item.type
  }));
}
function extractToolsAndContext(chatTools) {
  const tools = [];
  const context = [];
  for (const tool of chatTools) {
    if (tool.name === "private_search" /* PRIVATE_SEARCH */) {
      tools.push("private_search" /* PRIVATE_SEARCH */);
      if ("resources" in tool && tool.resources) {
        for (const res of tool.resources) {
          context.push({
            type: res.type,
            resource: {
              id: res.id,
              name: res.name
            }
          });
        }
      }
    } else if (tool.name === "web_search" /* WEB_SEARCH */) {
      tools.push("web_search" /* WEB_SEARCH */);
    } else if (tool.name === "reasoning" /* REASONING */) {
      tools.push("reasoning" /* REASONING */);
    }
  }
  return { tools, context };
}
function extractOriginalMessageSettings(message, fallbacks) {
  let originalTools = fallbacks.tools;
  let originalContext = fallbacks.context;
  let originalLang = fallbacks.lang;
  let originalEnableThinking = fallbacks.enableThinking;
  if (message?.attrs?.tools) {
    const extracted = extractToolsAndContext(message.attrs.tools);
    originalTools = extracted.tools;
    originalContext = extracted.context;
  }
  if (message?.attrs?.lang) {
    originalLang = message.attrs.lang;
  }
  if (message?.attrs?.enable_thinking !== void 0) {
    originalEnableThinking = message.attrs.enable_thinking;
  }
  return {
    originalTools,
    originalContext,
    originalLang,
    originalEnableThinking
  };
}
function prepareBody(conversationId, query, tools, context, parent_message_id, lang, enable_thinking) {
  const body = {
    conversation_id: conversationId,
    query,
    enable_thinking: enable_thinking ?? false,
    lang
  };
  if (context.length > 0 && !tools.includes("private_search" /* PRIVATE_SEARCH */)) {
    tools = ["private_search" /* PRIVATE_SEARCH */, ...tools];
  }
  for (const tool of tools) {
    if (tool === "reasoning" /* REASONING */) {
      body.enable_thinking = true;
    } else if (tool === "private_search" /* PRIVATE_SEARCH */) {
      body.tools = body.tools || [];
      const searchTool = {
        name: "private_search" /* PRIVATE_SEARCH */,
        resources: getPrivateSearchResources(context)
      };
      body.tools.push(searchTool);
    } else if (tool === "web_search" /* WEB_SEARCH */) {
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
function ask(options) {
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
    onError
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
  return createTransport(chatReq, async (data) => {
    const chatResponse = JSON.parse(data);
    if (chatResponse.response_type === "bos") {
      messageOperator.add(chatResponse);
    } else if (chatResponse.response_type === "delta") {
      messageOperator.update(chatResponse);
    } else if (chatResponse.response_type === "eos") {
      messageOperator.done();
    } else if (chatResponse.response_type === "done") {
    } else if (chatResponse.response_type === "error") {
      if (onError) {
        onError(chatResponse.error);
      }
    } else {
      console.error({ message: "Unknown response type", chatResponse });
    }
  });
}
function createTransportFactory(baseCreateStreamTransport, namespaceId, shareId, sharePassword) {
  return (requestBody, callback) => {
    const body = {
      ...requestBody,
      namespace_id: namespaceId,
      share_id: shareId,
      share_password: sharePassword
    };
    return baseCreateStreamTransport("/namespaces/" + (namespaceId || "default") + "/chat", body, callback);
  };
}
function findFirstMessageWithMissingParent(messages) {
  const idSet = new Set(messages.map((msg) => msg.id));
  return messages.find((msg) => !idSet.has(msg.parent_id));
}
var init_utils = __esm({
  "src/chat/utils.ts"() {
    "use strict";
    init_tools();
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ChatMode: () => ChatMode,
  ChatProvider: () => ChatProvider,
  MessageStatus: () => MessageStatus,
  OpenAIMessageRole: () => OpenAIMessageRole,
  ToolType: () => ToolType,
  createMessageOperator: () => createMessageOperator,
  createSSETransport: () => createSSETransport2,
  createStreamTransport: () => createStreamTransport,
  extractOriginalMessageSettings: () => extractOriginalMessageSettings,
  extractToolsAndContext: () => extractToolsAndContext,
  findFirstMessageWithMissingParent: () => findFirstMessageWithMissingParent,
  prepareBody: () => prepareBody,
  useChat: () => useChat,
  useChatContext: () => useChatContext,
  useMessageOperator: () => useMessageOperator,
  useMessages: () => useMessages,
  useWebSocket: () => useWebSocket
});
module.exports = __toCommonJS(index_exports);

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

// src/types/index.ts
init_tools();

// src/context/ChatContext.tsx
var import_react = __toESM(require("react"));

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
var import_jsx_runtime = require("react/jsx-runtime");
var ChatContext = (0, import_react.createContext)(null);
function ChatProvider({
  children,
  config,
  initialConversation
}) {
  const [conversation, setConversation] = (0, import_react.useState)(
    initialConversation ?? {
      id: "",
      mapping: {}
    }
  );
  const [isLoading, setIsLoading] = (0, import_react.useState)(false);
  const [tools, setTools] = (0, import_react.useState)([]);
  const [context, setContext] = (0, import_react.useState)([]);
  const [mode, setMode] = (0, import_react.useState)("ask" /* ASK */);
  const [socket, setSocket] = (0, import_react.useState)(null);
  const [currentTransport, setCurrentTransport] = (0, import_react.useState)(null);
  const messageOperator = import_react.default.useMemo(
    () => createMessageOperator({
      conversation,
      setConversation
    }),
    [conversation]
  );
  (0, import_react.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatContext.Provider, { value, children });
}
function useChatContext() {
  const context = (0, import_react.useContext)(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}

// src/hooks/useChat.ts
var import_react2 = require("react");

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
  const abortRef = (0, import_react2.useRef)(null);
  const optionsRef = (0, import_react2.useRef)(options);
  optionsRef.current = options;
  const stop = (0, import_react2.useCallback)(() => {
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
  const ask2 = (0, import_react2.useCallback)(
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
        const { prepareBody: prepareBody2 } = await Promise.resolve().then(() => (init_utils(), utils_exports));
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
  const regenerate = (0, import_react2.useCallback)(
    async (messageId) => {
      const parentId = messageOperator.getParent(messageId);
      const parentMessage = conversation.mapping[parentId];
      if (!parentMessage?.message?.content) {
        console.error("Cannot find parent user message to regenerate from");
        return;
      }
      const { extractOriginalMessageSettings: extractOriginalMessageSettings2 } = await Promise.resolve().then(() => (init_utils(), utils_exports));
      const extracted = extractOriginalMessageSettings2(parentMessage, {
        tools,
        context,
        lang: options.lang ?? "English"
      });
      await ask2({
        query: parentMessage.message.content,
        parentMessageId: parentId,
        enableThinking: extracted.originalEnableThinking
      });
    },
    [conversation.mapping, messageOperator, tools, context, options.lang, ask2]
  );
  const edit = (0, import_react2.useCallback)(
    async (targetMessageId, newContent) => {
      const message = conversation.mapping[targetMessageId];
      const parentId = message?.parent_id ?? "";
      const { extractOriginalMessageSettings: extractOriginalMessageSettings2 } = await Promise.resolve().then(() => (init_utils(), utils_exports));
      const extracted = extractOriginalMessageSettings2(message, {
        tools,
        context,
        lang: options.lang ?? "English"
      });
      await ask2({
        query: newContent,
        parentMessageId: parentId,
        enableThinking: extracted.originalEnableThinking
      });
    },
    [conversation.mapping, tools, context, options.lang, ask2]
  );
  return {
    ask: ask2,
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
var import_react3 = require("react");
function useMessageOperator() {
  const { messageOperator, conversation, setConversation } = useChatContext();
  const update = (0, import_react3.useCallback)(
    (delta, id) => {
      messageOperator.update(delta, id);
    },
    [messageOperator]
  );
  const add2 = (0, import_react3.useCallback)(
    (chatResponse) => {
      return messageOperator.add(chatResponse);
    },
    [messageOperator]
  );
  const done = (0, import_react3.useCallback)(
    (id) => {
      messageOperator.done(id);
    },
    [messageOperator]
  );
  const activate = (0, import_react3.useCallback)(
    (id) => {
      messageOperator.activate(id);
    },
    [messageOperator]
  );
  const getSiblings = (0, import_react3.useCallback)(
    (id) => {
      return messageOperator.getSiblings(id);
    },
    [messageOperator]
  );
  const getParent = (0, import_react3.useCallback)(
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
var import_react4 = require("react");
function useMessages() {
  const { conversation } = useChatContext();
  const messages = (0, import_react4.useMemo)(() => {
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
  const visibleMessages = (0, import_react4.useMemo)(() => {
    return messages.filter(
      (message) => message.message.role !== "system" /* SYSTEM */
    );
  }, [messages]);
  const lastAssistantMessage = (0, import_react4.useMemo)(() => {
    return visibleMessages.filter((msg) => msg.message.role === "assistant" /* ASSISTANT */).pop();
  }, [visibleMessages]);
  return {
    messages,
    visibleMessages,
    lastAssistantMessage
  };
}

// src/hooks/useWebSocket.ts
var import_react5 = require("react");
function useWebSocket(options = {}) {
  const { config, socket, setSocket } = useChatContext();
  const optionsRef = (0, import_react5.useRef)(options);
  optionsRef.current = options;
  const connect = (0, import_react5.useCallback)(() => {
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
  const disconnect = (0, import_react5.useCallback)(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [socket, setSocket]);
  (0, import_react5.useEffect)(() => {
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

// src/index.ts
init_utils();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatMode,
  ChatProvider,
  MessageStatus,
  OpenAIMessageRole,
  ToolType,
  createMessageOperator,
  createSSETransport,
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
});
