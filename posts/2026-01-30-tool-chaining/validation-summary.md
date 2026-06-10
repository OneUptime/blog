# Validation Summary: How to Build Tool Chaining

## Status
validated

## Post Type
Tutorial / Guide — practical guide to designing and implementing tool chaining systems for AI agents, using TypeScript code samples throughout.

## Technologies Covered
- TypeScript (interfaces, generics, classes)
- JavaScript Map / Set / Promise APIs (Promise.race, Promise.all)
- JSON Schema (for tool input/output validation)
- Mermaid diagrams (architecture flowcharts)
- General AI agent / LLM tool-orchestration patterns (planner / executor / context manager, dependency graphs, retry & fallback, caching, parallel execution)

## Sources Consulted
- MDN — `JSON.stringify(value, replacer)`: confirms array replacers act as a *recursive property filter* applied at every level of the JSON tree (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- TypeScript Handbook — Class member visibility (`private` modifier prevents access from outside the declaring class) (https://www.typescriptlang.org/docs/handbook/2/classes.html#member-visibility)
- MDN — `Promise.race` / `Promise.all` semantics (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- OneUptime MCP server repository link referenced at the end of the post — confirmed plausible path (https://github.com/oneuptime/oneuptime)
- Local Node.js execution to verify the buggy cache-key behavior and the replacement stable-stringify implementation

## Issues Found

1. **`tools` was declared `private` but accessed externally.** In `ToolChainOrchestrator` the field was `private tools: Map<string, ChainableTool>`, yet later code in `ResilientToolExecutor.executeWithFallback` (`this.orchestrator.tools.get(...)`) and `ParallelToolExecutor.buildDependencyGraph` (`this.orchestrator.tools.get(...)`) reads it directly. Under TypeScript's `private` modifier this is a compile error. Fixed by removing the `private` modifier so the field is part of the orchestrator's public surface — matching how the rest of the post uses it.

2. **`orchestrator.executeSingleStep(step)` was called but never defined.** Section 6's `executeWithPartialFailureHandling` invokes `orchestrator.executeSingleStep(step)`, but no such method exists on `ToolChainOrchestrator`. Fixed by adding a public `executeSingleStep` method to the orchestrator that resolves the tool, builds the input, executes the tool, and stores the result in the shared context — extracting exactly the per-step logic already used inside `executeChain`.

3. **Buggy cache-key generation in `CachingToolExecutor`.** The original code used `JSON.stringify(params, Object.keys(params).sort())`. When the second argument to `JSON.stringify` is an array it is treated as a *property filter applied recursively at every level* of the JSON tree, not as a key-sorting hint. This silently drops any nested-object property whose name isn't in the top-level params keys, so two distinct nested params can produce identical cache keys. Verified locally: `JSON.stringify({ startDate: '…', filter: { service: 'api', env: 'prod' } }, ['filter', 'startDate'])` produces `{"filter":{},"startDate":"…"}` — the nested `service`/`env` values are lost. Replaced with a small recursive `stableStringify` helper that sorts keys at every level of nesting, producing a genuinely stable cache key.

## Review Notes

- The `executeGraph` method in `ParallelToolExecutor` keeps an `await Promise.race(executions)` immediately followed by `await Promise.all(executions)`. The `race` line is effectively dead code (the `all` that follows always supersedes it) and the in-line comment ("Wait for at least one to complete before checking for more ready tools") is misleading because no second readiness check happens before `Promise.all`. The code is still functionally correct — it executes ready tools in waves — so I left it alone, but a future revision could remove the `race` call and either embrace wave-based execution in the comments or rewrite the loop to schedule newly-ready tools as soon as any in-flight tool resolves.
- Several types referenced in code samples (`ExecutionPlan`, `ExecutionPlanStep`, `PlanStep`, `ChainResult`, `Incident`) are used without being defined in the post. This is consistent with the rest of the post's "type-as-illustration" style, so I followed the same convention when adding `executeSingleStep`. Readers building real implementations will need to define these themselves.
- In Section 6, `executeWithCheckpoints` casts `contextManager.snapshot() as any` because `ChainContextManager.snapshot()` returns `Map<string, unknown>` while `ChainContext.results` expects `Map<string, ToolOutput>`. Functionally fine for the illustrative sketch, but the snapshot/restore API and the chain context could be unified in a future refactor.
- The `executeWithFallback` method swallows errors from the primary tool with an empty `catch` block. That's intentional (the whole point is to fall through to the fallback), but a production implementation should at least log the swallowed error for observability — worth mentioning if the post is ever expanded.
