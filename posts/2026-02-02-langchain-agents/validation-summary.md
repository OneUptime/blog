# Validation Summary: How to Build Agents with LangChain

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LangChain (langchain, langchain-core, langchain-openai, langchain-community)
- LangChain Hub (`langchain.hub`)
- OpenAI ChatGPT API (`ChatOpenAI`, model `gpt-4`)
- Python 3 (type hints, async/await)
- Pydantic v2 (`BaseModel`, `Field`, `field_validator`)
- aiohttp (async HTTP client)
- `requests` (sync HTTP client)
- FastAPI (`StreamingResponse`, Server-Sent Events)
- pytz (timezone handling)
- LangChain callbacks (`BaseCallbackHandler`, `StreamingStdOutCallbackHandler`)
- LangChain memory (`ConversationBufferMemory`, `ConversationTokenBufferMemory`)
- Mermaid diagrams (for architecture illustrations)

## Sources Consulted
- LangChain `tool()` decorator source: https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/tools/convert.py
- LangChain `BaseTool` source: https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/tools/base.py
- LangChain `StructuredTool` source: https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/tools/structured.py
- LangChain agents reference (`create_tool_calling_agent`, `create_react_agent`, `AgentExecutor`)
- LangChain memory migration guide: https://github.com/langchain-ai/langchain/blob/master/docs/docs/versions/migrating_memory/index.mdx
- LangChain Hub (`hwchase17/react` prompt)
- aiohttp 3.x client reference: https://docs.aiohttp.org/en/stable/client_reference.html
- Pydantic v2 docs for `field_validator` and `Field` constraints (`min_length`, `ge`, `le`)

## Issues Found

1. **`@tool(handle_tool_error=True)` raises `TypeError` at runtime.**
   The `tool()` decorator in `langchain_core.tools.convert` does not accept a `handle_tool_error` keyword argument. The valid pattern is to decorate normally and then set the attribute on the resulting `BaseTool` instance (or use `StructuredTool.from_function(..., handle_tool_error=True)`).
   - **Fix applied:** Changed `@tool(handle_tool_error=True)` to `@tool`, then added `risky_operation.handle_tool_error = True` after the decorated function with a short comment explaining why. (`posts/2026-02-02-langchain-agents/README.md`, error_handling.py code block.)

## Review Notes
- `ConversationBufferMemory` and `ConversationTokenBufferMemory` are importable but were marked deprecated in `langchain` 0.3.1 (`LangChainDeprecationWarning`, removal targeted for 2.0). The recommended modern path is `RunnableWithMessageHistory` or LangGraph persistence. The code in the post still runs correctly; no change made because that would expand the post beyond a technical-correctness fix.
- `executor.astream_events(..., version="v1")` works but emits a deprecation warning; `version="v2"` is the current recommended value. Left as-is — runtime behavior is unchanged.
- `from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler` and `from langchain.callbacks.base import BaseCallbackHandler` still work via re-export shims in `langchain` 0.3. The canonical modern locations are under `langchain_core.callbacks`. Left as-is.
- `create_tool_calling_agent` and `create_react_agent` from `langchain.agents` exist in 0.3 and work as shown. In LangChain 1.0 these and the underlying `AgentExecutor` moved to `langchain-classic` and the new recommended factory is `langchain.agents.create_agent`. This is a forward-compatibility note, not an error.
- `eval(expression, {"__builtins__": {}}, {})` in the calculator tool is not a robust sandbox (Python `eval` with restricted globals can still be escaped in various ways); the post correctly warns the reader to use a proper math parser in production.
- `session.get(url, timeout=10)` (integer timeout) is supported by aiohttp 3.x for backward compatibility — not an error.
- `hub.pull("hwchase17/react")` requires the `langchainhub` package; the install section does not mention it explicitly. The official ReAct prompt exists at that hub path.
