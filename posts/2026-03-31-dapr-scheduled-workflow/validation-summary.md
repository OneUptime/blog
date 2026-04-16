# Validation Summary: How to Implement Scheduled Workflow with Dapr

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Dapr (sidecar runtime)
- Dapr Jobs API (alpha)
- Dapr Workflow building block
- Dapr .NET SDK (`Dapr.Workflow`, `DaprWorkflowClient`)
- ASP.NET Core
- Cron / scheduling syntax

## Sources Consulted
- Dapr Jobs API reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Jobs overview: https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-overview/
- Dapr CLI reference: https://docs.dapr.io/reference/cli/
- `dapr scheduler` CLI: https://docs.dapr.io/reference/cli/dapr-scheduler/
- Dapr Workflow how-to: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr .NET SDK source: https://github.com/dapr/dotnet-sdk (`src/Dapr.Workflow/DaprWorkflowClient.cs`, `src/Dapr.Workflow/WorkflowState.cs`, `src/Dapr.Jobs/DaprJobsClient.cs`)

## Issues Found

1. **Fabricated `dapr job` CLI commands.** The post used `dapr job create`, `dapr job list`, and `dapr job delete`. None of these exist — the Dapr CLI has no `job` subcommand. Replaced with `curl` calls against the Jobs HTTP API and a `dapr scheduler list` reference for listing.

2. **Fabricated YAML manifest with `kind: Job` / `apiVersion: dapr.io/v1alpha1`.** Dapr has no such CRD. Jobs are created via HTTP/gRPC/SDK only. Replaced the YAML block with the documented `POST /v1.0-alpha1/jobs/<name>` HTTP API call.

3. **Wrong cron syntax.** The post used standard 5-field cron (`"0 6 * * *"`). Dapr uses systemd-style 6-field cron (`second minute hour day month weekday`). Changed to `"0 0 6 * * *"` and added a note about the `@daily`/`@every 1h30m` shortcuts.

4. **Wrong `repeats: 0` semantics.** The post claimed `repeats: 0` means "repeat forever". Per the Jobs API reference, omitting `repeats` runs the job indefinitely; `0` would mean zero triggers. Removed the `repeats` field and replaced the comment with accurate guidance.

5. **`[DaprWorkflow]` attribute does not exist.** The Dapr.Workflow .NET SDK registers workflows via `services.AddDaprWorkflow(opts => opts.RegisterWorkflow<T>())`, with no class-level attribute. Removed the attribute from the workflow class.

6. **Outdated workflow client API.** The post used `DaprClient.GetWorkflowAsync(...)` and `DaprClient.StartWorkflowAsync(...)`. The current API is `DaprWorkflowClient.GetWorkflowStateAsync(instanceId)` and `DaprWorkflowClient.ScheduleNewWorkflowAsync(name, instanceId, input)`. Updated the trigger handler to use these.

7. **Wrong `RuntimeStatus` comparison.** `WorkflowState.RuntimeStatus` is a `WorkflowRuntimeStatus` enum, not a string, so the `is "Running" or "Pending"` pattern match would not compile. Replaced with the SDK's convenience property `IsWorkflowRunning`.

8. **Job trigger route.** Dapr's scheduler delivers job triggers to the app at `POST /job/<jobName>` (singular). Updated the controller route from `/jobs/daily-report` to `/job/daily-report-job` to match the registered job name and added a sentence explaining the convention.

## Review Notes
- The Dapr Jobs API is currently in alpha (`v1.0-alpha1`); the post now flags this so readers understand the API surface may change. Production users are advised to use the SDK rather than the raw HTTP endpoint.
- The example assumes `_workflowClient` (a `DaprWorkflowClient`) is injected into the controller. The code stays focused on the workflow scheduling pattern and does not show the DI wiring; readers familiar with ASP.NET Core DI will recognize this.
- The `DaprJobsClient` (`Dapr.Jobs` package) is also marked experimental (`[Experimental("DAPR_JOBS")]`) and would be the production-grade alternative to the curl examples shown.
