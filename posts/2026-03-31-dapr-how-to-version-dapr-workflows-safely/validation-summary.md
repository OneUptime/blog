# Validation Summary: How to Version Dapr Workflows Safely

## Status
validated

## Post Type
Tutorial / Best Practice Guide

## Technologies Covered
- Dapr Workflow SDK (.NET / C#)
- Dapr runtime (v1.17+ workflow versioning features)
- Kubernetes (kubectl for deployment operations)
- ASP.NET Core (minimal API routing)

## Sources Consulted
- [Dapr Workflow Versioning Documentation](https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-versioning/) — primary reference for `IsPatched` API and named workflow versioning
- [Dapr Workflow .NET SDK Documentation](https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-workflow/) — WorkflowContext API, CallActivityAsync, Workflow base class
- [DaprWorkflowClient Lifetime Management and Registration](https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-workflow/dotnet-workflowclient-usage/) — ScheduleNewWorkflowAsync API and DaprWorkflowClient usage
- [Dapr v1.17 Release Blog Post](https://blog.dapr.io/posts/2026/02/27/dapr-v1.17-is-now-available/) — confirmation of patch-based and name-based workflow versioning in v1.17
- [Workflow Versioning Proposal (dapr/dapr#9162)](https://github.com/dapr/dapr/issues/9162) — design background for workflow versioning feature

## Issues Found

### 1. Nonexistent `GetVersionAsync` API (Critical)
**What was wrong:** Strategy 1 used `context.GetVersionAsync("main", 1, CURRENT_VERSION)` which does not exist on `WorkflowContext` in the Dapr .NET SDK. The entire code example and explanation were built around this fabricated API.

**What was changed:** Replaced the entire Strategy 1 section with the correct `context.IsPatched("patch-name")` API. Rewrote the code example to demonstrate patch-based versioning where `IsPatched` conditionally adds new workflow steps. Updated the section heading from "Version Check with GetVersion" to "Patch-Based Versioning with IsPatched". Replaced the explanation paragraph to accurately describe how `IsPatched` records patch checks in workflow history and returns `true` for new instances / `false` for replaying instances.

**Why:** `IsPatched` is the actual first-class API introduced in Dapr v1.17 for conditionally branching workflow code. Using a nonexistent method would cause compilation errors.

### 2. Deprecated `DaprClient.StartWorkflowAsync` usage (Moderate)
**What was wrong:** Strategy 2's routing example used `DaprClient.StartWorkflowAsync(workflowComponent, workflowName, instanceId, input)` which is an older API marked as obsolete.

**What was changed:** Replaced with `DaprWorkflowClient.ScheduleNewWorkflowAsync(name, instanceId, input)` which is the current recommended API for starting workflow instances in the Dapr .NET SDK.

**Why:** The Dapr .NET SDK documentation recommends `DaprWorkflowClient` over `DaprClient` for workflow operations, and the v1.17 SDK overhaul removed DurableTask dependencies and updated the workflow client API.

### 3. Summary referenced nonexistent API (Minor)
**What was wrong:** The summary paragraph referenced `GetVersionAsync` as providing "a first-class mechanism for branching on version."

**What was changed:** Updated to reference `IsPatched` as providing "a first-class mechanism for conditionally branching within a single workflow class" and mentioned "named workflow versions" instead of "separate workflow class versions."

**Why:** Consistency with the corrected Strategy 1 content.

## Review Notes
- The conceptual explanation of why workflow versioning matters (deterministic replay, history divergence) is accurate and well-explained.
- Strategy 2 (deploying separate workflow classes) aligns with Dapr's "named workflow versioning" approach documented in v1.17.
- Strategy 3 (drain and redeploy) is presented as a general operational pattern; the specific `dapr invoke` command inside `kubectl exec` is illustrative and assumes a custom `/admin/workflow-count` endpoint exists in the application.
- The "Safe Change Types vs. Unsafe Changes" table is accurate for the general principles of deterministic replay in durable workflow engines.
- The post does not specify a minimum Dapr version. Readers should note that patch-based and name-based workflow versioning require Dapr v1.17 or later.
