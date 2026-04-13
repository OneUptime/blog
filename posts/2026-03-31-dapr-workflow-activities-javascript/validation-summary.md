# Validation Summary: How to Implement Workflow Activities in JavaScript

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
- Dapr JavaScript SDK source code and TypeScript type definitions (dapr/js-sdk on GitHub)
- Dapr official documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr Workflow JS SDK examples in the dapr/js-sdk repository
- Already-validated sibling post `2026-03-31-dapr-workflow-javascript-sdk` which covers the same SDK and was verified against `@dapr/dapr` v3.6.1 type exports

## Issues Found

### Critical: Workflow function used `async function` + `await` instead of generator function + `yield`

**What was wrong:** The `orderWorkflow` function was defined as a regular `async function` using `await` to call activities. The Dapr JS SDK's `TWorkflow` type requires workflows to be **generator functions** (`function*`) that use `yield` instead of `await`. This is fundamental to how the durable task framework replays workflow state — generators allow the runtime to control execution flow during replay. Using `await` with async functions would bypass the replay mechanism entirely and the workflow would not function correctly.

**What was changed:** Changed `async function orderWorkflow` to `function* orderWorkflow`, and all `await ctx.callActivity(...)` calls within the workflow to `yield ctx.callActivity(...)`. Updated the explanatory text and summary to describe workflows as generator functions.

### Minor: Unused `TWorkflowActivity` import

**What was wrong:** The import `const { DaprWorkflowClient, WorkflowRuntime, TWorkflowActivity } = require('@dapr/dapr')` included `TWorkflowActivity` which was never used in the code example.

**What was changed:** Removed the unused `TWorkflowActivity` from the import statement.

### Minor: Payment activity input missing `orderId`

**What was wrong:** The `processPaymentActivity` function destructures `{ orderId, amount, currency }` from its input, but the workflow passed only `payment` (which contained `amount` and `currency` but not `orderId`), so `orderId` would be `undefined` at runtime.

**What was changed:** Updated the workflow to spread the payment object and include `orderId`: `{ ...payment, orderId }`.

### Introductory text clarification

**What was wrong:** The introductory text stated activities are "plain async functions registered with the Dapr workflow runtime" without distinguishing between activities (async) and workflows (generators). The section heading text also described workflows using `ctx.callActivity()` without mentioning `yield`.

**What was changed:** Updated the intro to clarify that activities are async functions while workflows are generator functions using `yield`. Updated the section description to reference `yield ctx.callActivity()`.

## Review Notes
- The `WorkflowActivityContext` import in the "Defining an Activity" section is imported but not explicitly used as a type annotation (since this is plain JavaScript, not TypeScript). It is harmless but technically unnecessary. Left as-is since it serves a documentary purpose showing where the context type comes from.
- The `DaprWorkflowClient` and `WorkflowRuntime` constructors accept optional `WorkflowClientOptions` for custom host/port configuration, which could be worth mentioning for non-default Dapr sidecar setups.
- Activity functions receive a `WorkflowActivityContext` as their first parameter, which provides `getWorkflowInstanceId()` and `getWorkflowActivityId()` methods — not demonstrated but not required for the tutorial scope.
- The error handling section's `sendEmailActivity` correctly uses `async function` since it is an activity, not a workflow.
