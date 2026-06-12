# Validation Summary: How to Implement LangChain Tools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LangChain
- LangChain Classic agents
- LangChain Core tools
- LangChain Community tools
- LangChain OpenAI integration
- OpenAI tool calling
- Python
- Pydantic
- aiohttp
- DuckDuckGo search via ddgs
- Wikipedia Python package

## Sources Consulted
- LangChain Tools documentation: https://docs.langchain.com/oss/python/langchain/tools
- LangChain v1 migration guide: https://docs.langchain.com/oss/python/migrate/langchain-v1
- LangChain `StructuredTool.from_function` API reference: https://reference.langchain.com/python/langchain-core/tools/structured/StructuredTool/from_function
- LangChain `create_openai_tools_agent` API reference: https://reference.langchain.com/python/langchain-classic/agents/openai_tools/base/create_openai_tools_agent
- LangChain Core tools API reference: https://reference.langchain.com/python/langchain-core/tools
- LangChain Community `DuckDuckGoSearchRun` API reference: https://reference.langchain.com/python/langchain-community/tools/ddg_search/tool/DuckDuckGoSearchRun
- LangChain Classic Hub API reference: https://reference.langchain.com/python/langchain-classic/hub/pull
- OpenAI latest model guidance: https://developers.openai.com/api/docs/guides/latest-model.md
- OpenAI tools API documentation: https://developers.openai.com/api/docs/guides/tools
- Local runtime checks with current packages: `langchain==1.3.9`, `langchain-core==1.4.7`, `langchain-openai`, `langchain-community`, `langchain-classic`, `ddgs`, `wikipedia`, and `aiohttp`

## Issues Found
- The installation command used `duckduckgo-search`, but current `DuckDuckGoSearchRun` expects the `ddgs` package. Changed the dependency command to install `ddgs`.
- Current LangChain v1 no longer exposes `AgentExecutor`, `create_openai_tools_agent`, or `hub` from the old `langchain` import paths. Updated those examples to use `langchain_classic.agents` and `langchain_classic.hub`, and added `langchain-classic` to the installation command.
- The examples used the old `gpt-4-turbo-preview` model. Updated the model string to `gpt-5.5`, matching current OpenAI model guidance for tool-heavy agent workflows.
- The injected dependency example used `Annotated[object, "injected"]`, which is not hidden from the generated tool schema. Updated it to use `Annotated[object, InjectedToolArg]` and imported `InjectedToolArg`.
- The error-handling example used `@tool(handle_tool_error=True)`, but the current `@tool` decorator does not accept that keyword argument. Changed the example to create the tool with `@tool` and then set `safe_email_tool.handle_tool_error = True`.

## Review Notes
- LangChain's current v1 documentation recommends the newer `create_agent` and `ToolRuntime` patterns for new code. The post still uses LangChain Classic agent APIs because the examples are built around `create_openai_tools_agent`; those APIs remain available through `langchain-classic`.
- `langchain-community` emitted a runtime warning that it is being sunset in favor of standalone integration packages. The examples remain constructible with the current package set, but future updates should consider moving community integrations to their newer standalone packages when available.
- All Python code fences were parsed successfully with Python AST checks after edits. Targeted runtime checks verified tool construction, Pydantic schemas, injected-argument hiding, async `StructuredTool.from_function`, and `handle_tool_error` behavior.
