# Validation Summary: How to Build Custom Tool Creation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AI agent tool use
- Anthropic Messages API and TypeScript SDK
- TypeScript
- JSON Schema
- REST API integration with fetch
- Vitest
- Caching patterns

## Sources Consulted
- Anthropic Claude API tool use overview: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- Anthropic Claude API define tools documentation: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- Anthropic Claude API handle tool calls documentation: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- Anthropic Claude models overview: https://platform.claude.com/docs/en/about-claude/models/overview
- Anthropic TypeScript SDK documentation: https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript
- JSON Schema documentation: https://json-schema.org/specification and https://json-schema.org/understanding-json-schema/reference/array
- TypeScript `useUnknownInCatchVariables` documentation: https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html
- Vitest mocking globals documentation: https://vitest.dev/guide/mocking/globals
- Swagger API design best practices: https://swagger.io/resources/articles/best-practices-in-api-design/

## Issues Found
- The first TypeScript snippet referenced `JSONSchema` without defining or importing it. Added a minimal `type JSONSchema = Record<string, any>;` alias so the snippet is self-contained.
- The weather handler used `error.message` directly in a `catch` block. Updated it to narrow `error` with `instanceof Error`, matching strict TypeScript behavior where catch values may be `unknown`.
- The structured error handler's fallback branch used `error.message` without narrowing. Updated the fallback message to handle non-`Error` thrown values safely.
- The calculator tool advertised unit conversion and included a `convert` operation, but the handler did not implement conversion. Removed the unsupported operation and related schema fields so the tool definition matches the implementation.
- The percentage operation used two operands but did not validate that two operands were provided. Added a runtime check that returns a clear tool error.
- The Anthropic Messages API example used an older model ID and untyped message/content handling. Updated it to use current documented model ID `claude-opus-4-8`, type the message list, narrow `tool_use` blocks, and return `is_error` on failed tool execution.
- The Anthropic tool-use loop could spin forever if a non-calculator tool call appeared while `stop_reason` was `tool_use`. Added a break when no matching calculator tool call is present.
- The Vitest example assigned `global.fetch` directly. Updated it to use `vi.stubGlobal("fetch", ...)`, which is the documented Vitest helper for replacing globals.
- The composite workflow example indexed a workflow map without checking for an unknown workflow. Added a lookup check and clear error.
- The caching example called `this.fetchFreshData(args)` without declaring the method. Added a protected placeholder method for subclasses to implement.
- The Anthropic further-reading URL used an older documentation path. Updated it to the current Claude Platform tool-use documentation URL.

## Review Notes
The post remains a high-level tutorial rather than a complete runnable project. Some snippets still assume surrounding application code, credentials, package installation, and concrete API implementations, which is reasonable for this style of guide.
