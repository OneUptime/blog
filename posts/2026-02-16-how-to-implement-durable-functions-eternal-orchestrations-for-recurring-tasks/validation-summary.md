# Validation Summary: How to Implement Durable Functions Eternal Orchestrations for Recurring Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Durable Functions
- Durable Functions eternal orchestrations
- JavaScript Durable Functions API
- Azure Functions timer triggers
- Durable timers and orchestration instance management

## Sources Consulted
- Microsoft Learn: Eternal Orchestrations in Durable Task - https://learn.microsoft.com/en-us/azure/durable-task/common/durable-task-eternal-orchestrations
- Microsoft Learn: Manage Orchestration Instances in Durable Functions and Durable Task SDKs - https://learn.microsoft.com/en-us/azure/durable-task/common/durable-task-instance-management
- Microsoft Learn: Orchestrator Function Code Constraints - https://learn.microsoft.com/en-us/azure/durable-task/common/durable-task-code-constraints
- Microsoft Learn: Azure Functions Error Handling and Retry Guidance - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-error-pages
- Microsoft Learn: durable-functions DurableClient API - https://learn.microsoft.com/en-us/javascript/api/durable-functions/durableclient
- Microsoft Learn: durable-functions OrchestrationRuntimeStatus API - https://learn.microsoft.com/en-us/javascript/api/durable-functions/orchestrationruntimestatus

## Issues Found
- The HTTP starter only treated `Running` as an already-active orchestration. I changed the singleton guard to allow a restart only for terminal statuses and to reject other active or transitional states such as `Pending`, `Running`, `ContinuedAsNew`, and `Suspended`.
- The resilient error-handling snippet used `df.orchestrator` without importing `durable-functions`. I added the missing `const df = require('durable-functions');` line so the snippet is self-contained.
- The comparison table said timer triggers have automatic retry per execution. I changed this to "Retry policy if configured" because Azure Functions retries are configured policies, not an unconditional timer-trigger behavior.
- The comparison table described eternal orchestration cost as "Runs continuously." I changed this to clarify that it runs once per cycle and uses durable storage checkpoints; durable timers do not continuously consume compute while waiting.
- The comparison table described timer triggers as having no state. I narrowed this to "No built-in orchestration state" to avoid implying a timer-triggered function cannot use external persistence.
- The comparison table described pause/resume for eternal orchestrations only as terminate/restart. I updated it to mention suspend/resume as well as terminate/restart, matching current instance management capabilities.

## Review Notes
The post uses the classic CommonJS `durable-functions` JavaScript programming model, which remains represented in Microsoft documentation. Microsoft also documents the newer Durable Task SDK APIs separately; the API names differ, so future updates should avoid mixing `durable-functions` examples with `@microsoft/durabletask-js` examples in the same code block.
