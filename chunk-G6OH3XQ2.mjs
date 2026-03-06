// src/types/tools.ts
var ToolType = /* @__PURE__ */ ((ToolType2) => {
  ToolType2["WEB_SEARCH"] = "web_search";
  ToolType2["PRIVATE_SEARCH"] = "private_search";
  ToolType2["REASONING"] = "reasoning";
  return ToolType2;
})(ToolType || {});

// src/chat/utils.ts
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

export {
  ToolType,
  extractToolsAndContext,
  extractOriginalMessageSettings,
  prepareBody,
  ask,
  createTransportFactory,
  findFirstMessageWithMissingParent
};
