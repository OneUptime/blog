# Validation Summary: How to Use Durable Functions for Workflows

## Status
validated

## Post Type
Tutorial / Guide — covers advanced Azure Durable Functions patterns (saga, approval workflows, fan-out/fan-in) using the Node.js v4 programming model with the `durable-functions` v3.x SDK.

## Technologies Covered
- Azure Durable Functions (Node.js, v3.x of `durable-functions` SDK)
- Azure Functions v4 Node.js programming model (`@azure/functions`)
- TypeScript
- Azure Functions Core Tools (`func` CLI)
- Azure CLI (`az`)
- host.json configuration for the Durable Task extension

## Sources Consulted
- Azure Durable Functions Node.js (v3.x) SDK: https://github.com/Azure/azure-functions-durable-js
- `durable-functions` npm package types (RetryOptions, OrchestrationContext, OrchestrationHandler, ActivityHandler, Task, DurableClient)
- Azure Functions v4 Node.js programming model: https://learn.microsoft.com/azure/azure-functions/functions-node-upgrade-v4
- Durable Functions bindings reference (host.json schema): https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-bindings
- Azure Storage provider configuration for Durable Task: https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-azure-storage-provider
- Extended sessions limitations: https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-perf-and-scale
- Azure Functions Core Tools CLI reference: https://learn.microsoft.com/azure/azure-functions/functions-core-tools-reference
- Azure CLI `az functionapp` reference: https://learn.microsoft.com/cli/azure/functionapp

## Issues Found

1. **Incorrect property name on `RetryOptions`** — The post set `defaultRetryOptions.maxRetryInterval = 60000;` and `paymentRetryOptions.maxRetryInterval = 10000;`. The correct property in the `durable-functions` v3.x SDK is `maxRetryIntervalInMilliseconds`. Using `maxRetryInterval` would silently create an unused property and leave the retry interval cap at its default. Fixed both occurrences in the orchestrator code sample.

2. **`useAppLease` placed at wrong host.json level** — The post had `useAppLease: true` directly under `extensions.durableTask`. Per the Durable Task extension schema, `useAppLease` is an Azure Storage provider setting and must live under `extensions.durableTask.storageProvider`. Moved it inside `storageProvider`.

3. **`extendedSessionsEnabled` / `extendedSessionIdleTimeoutInSeconds` removed from host.json** — Extended sessions are only supported by the .NET in-process worker; they have no effect for the Node.js worker model used throughout this post. Removed both settings from the host.json sample to avoid suggesting they tune anything in a Node.js project.

## Review Notes
- The `host.json` `useGracefulShutdown` setting is correctly placed at the `durableTask` level.
- The `df.app.orchestration(name, handler)` and `df.app.activity(name, { handler })` registration shapes match the v3 SDK (orchestrations take the handler directly; activities take an options object).
- `context.df.Task.all` / `context.df.Task.any`, `callActivityWithRetry`, `callSubOrchestrator`, `createTimer`, `waitForExternalEvent`, `setCustomStatus`, and `currentUtcDateTime` are all current and correct for v3.
- `DurableClient` methods used (`startNew`, `getStatus`, `getStatusBy`, `raiseEvent`, `terminate`, `createCheckStatusResponse`) match the v3 API.
- Minor TypeScript quality observation (not an API correctness issue): in `start-saga.ts`, `body` is typed as `Record<string, unknown>` and then fields like `body.items` and `body.total` are passed into typed inputs without narrowing — a real implementation would need a typed interface or runtime validation. Left as-is to avoid changing the tutorial's structure.
- The `functionTimeout: "00:10:00"` value is valid; it matches the Consumption plan cap and is acceptable on Premium/Dedicated plans (which allow higher values).
