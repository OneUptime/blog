# Validation Summary: How to Use Dapr Workflow with JavaScript SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow
- Dapr JavaScript SDK (`@dapr/dapr`)
- Node.js
- JavaScript (async generators)

## Sources Consulted
- Dapr JS SDK Workflow documentation: https://docs.dapr.io/developing-applications/sdks/js/js-workflow/
- Dapr Workflow patterns (fan-out/fan-in): https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/
- Dapr JS SDK source — DaprWorkflowClient: https://github.com/dapr/js-sdk/blob/main/src/workflow/client/DaprWorkflowClient.ts
- Dapr JS SDK source — WorkflowContext: https://github.com/dapr/js-sdk/blob/main/src/workflow/runtime/WorkflowContext.ts
- Dapr JS SDK source — TWorkflow type: https://github.com/dapr/js-sdk/blob/main/src/types/workflow/Workflow.type.ts

## Issues Found

1. **Workflows defined as regular async functions instead of async generators (critical)**
   - **What was wrong:** `orderProcessingWorkflow` and `parallelWorkflow` were defined as regular `async function` declarations. The Dapr JS SDK requires workflows to be async generator functions (`async function*`), as the `TWorkflow` type signature is `(context: WorkflowContext, input: any) => Generator<Task<any>, any, any>`.
   - **What was changed:** Converted both workflow functions to `async function*` generator expressions.
   - **Why:** Dapr workflows use `yield` to suspend execution at each activity call, enabling the runtime to replay and persist workflow state. Regular async functions with `await` bypass this mechanism entirely.

2. **`await` used instead of `yield` for activity calls (critical)**
   - **What was wrong:** All `ctx.callActivity()` calls inside workflows used `await` (e.g., `await ctx.callActivity(validateOrderActivity, orderId)`).
   - **What was changed:** Replaced `await` with `yield` for all `ctx.callActivity()` and `ctx.whenAll()` calls inside workflow functions.
   - **Why:** The Dapr workflow runtime relies on generator `yield` semantics to intercept activity calls, manage replay, and persist state. Using `await` would not integrate with the durable execution engine.

3. **`ActivityContext` import does not exist (moderate)**
   - **What was wrong:** The activities section imported `ActivityContext` from `@dapr/dapr`, which is not an exported type.
   - **What was changed:** Changed to `WorkflowActivityContext`, which is the correct export name.
   - **Why:** The Dapr JS SDK exports `WorkflowActivityContext` as the context type for activity functions.

4. **`ctx.when_all()` should be `ctx.whenAll()` (moderate)**
   - **What was wrong:** The parallel execution example used `ctx.when_all(tasks)` with Python-style snake_case naming.
   - **What was changed:** Changed to `ctx.whenAll(tasks)`, the correct camelCase method name per the WorkflowContext API.
   - **Why:** The JavaScript SDK follows JavaScript naming conventions (camelCase). The snake_case `when_all` is the Python SDK's API.

5. **Incorrect description of parallel API (minor)**
   - **What was wrong:** The text said "Run activities in parallel using `Promise.all`" but the actual mechanism is `ctx.whenAll`, not JavaScript's native `Promise.all`.
   - **What was changed:** Updated text to "Run activities in parallel using `ctx.whenAll`".
   - **Why:** Dapr workflow tasks are not standard Promises — they are `Task` objects managed by the workflow runtime. `Promise.all` would not work; `ctx.whenAll` is the correct Dapr API for fan-out/fan-in.

## Review Notes
- The `console.log` calls inside workflow functions will execute on every replay of the workflow, not just the initial execution. This is a common pitfall with durable workflow frameworks. The post could mention this caveat, but it is not technically incorrect.
- The `scheduleNewWorkflow(orderProcessingWorkflow, "order-999")` call passes `"order-999"` as the `input` parameter (second argument). Per the API signature `scheduleNewWorkflow(workflow, input?, instanceId?, startAt?)`, this is correct — the workflow receives it as the `orderId` parameter.
- The `waitForWorkflowCompletion(instanceId, undefined, 30)` call passes `undefined` for `fetchPayloads` (which defaults to `true`), so behavior is correct. Using `undefined` to skip optional parameters is a valid JavaScript pattern.
- The `WorkflowRuntime`, `DaprWorkflowClient`, registration, and scheduling APIs are all correctly used.
