# Validation Summary: How to Build Dapr Workflows with JavaScript SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow engine
- Dapr JavaScript SDK (`@dapr/dapr` npm package)
- Node.js
- Durable Task Framework (underlying engine)

## Sources Consulted
- Dapr JavaScript SDK source code and TypeScript definitions (dapr/js-sdk on GitHub)
- `@dapr/dapr` npm package v3.6.1 published type exports
- Dapr official documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr Workflow JS SDK examples in the dapr/js-sdk repository

## Issues Found

### Critical: Workflow functions used `async function` + `await` instead of generator functions + `yield`

**What was wrong:** All workflow orchestrator functions were defined as regular `async function` using `await` to call activities and create timers. The Dapr JS SDK's `TWorkflow` type requires workflows to be **generator functions** (`function*`) that use `yield` instead of `await`. This is fundamental to how the durable task framework replays workflow state — generators allow the runtime to control execution flow during replay.

**What was changed:**
1. `orderFulfillmentWorkflow`: Changed from `async function` to `function*`, all `await ctx.callActivity(...)` to `yield ctx.callActivity(...)`
2. `orderFulfillmentWithRetry`: Changed from `async function` to `function*`, all `await ctx.callActivity(...)` and `await ctx.createTimer(...)` to use `yield`
3. Updated concept description and summary text to reference "generator functions" and `yield` instead of `await`

**Why:** Using `await` with regular async functions would bypass the durable task framework's replay mechanism. The SDK relies on generator `yield` points to checkpoint and replay workflow state. Code using `await` would not function correctly with Dapr's workflow engine.

### Items verified as correct (no changes needed)
- Activity functions correctly use regular `async function` with `(ctx, input)` signature
- `WorkflowRuntime` and `DaprWorkflowClient` imports from `@dapr/dapr` are correct
- `new WorkflowRuntime()` constructor with no arguments is correct
- Method chaining on `registerWorkflow()` and `registerActivity()` is correct
- `workflowRuntime.start()` and `.stop()` are correct
- `new DaprWorkflowClient()` constructor with no arguments is correct
- `scheduleNewWorkflow(workflow, input, instanceId)` parameter order is correct
- `waitForWorkflowCompletion(instanceId, undefined, 30)` is correct (2nd param is `fetchPayloads` boolean, `undefined` uses default)
- `getWorkflowState(instanceId, true)` is correct
- `result.serializedOutput`, `state.runtimeStatus`, `state.createdAt`, `state.lastUpdatedAt` are all valid properties on `WorkflowState`
- `ctx.createTimer(new Date(...))` accepts a `Date` object — correct
- `npm install @dapr/dapr` is the correct installation command

## Review Notes
- The `ctx.createTimer()` method also accepts a plain number interpreted as seconds (e.g., `ctx.createTimer(5)` for a 5-second delay), which could be simpler than constructing a `Date` object. The current `Date`-based approach is correct but more verbose.
- The `DaprWorkflowClient` and `WorkflowRuntime` constructors accept optional `WorkflowClientOptions` for custom host/port configuration, which could be worth mentioning for non-default Dapr sidecar setups.
- Activity functions receive a `WorkflowActivityContext` as their first parameter, which provides `getWorkflowInstanceId()` and `getWorkflowActivityId()` methods — not demonstrated but not required for the tutorial scope.
