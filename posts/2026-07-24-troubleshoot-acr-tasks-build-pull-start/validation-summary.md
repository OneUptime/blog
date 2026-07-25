# Validation Summary: Troubleshooting ACR Tasks That Cannot Build, Pull, or Start

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Microsoft Azure
- Azure Container Registry
- ACR Tasks and multi-step task YAML
- Azure CLI
- Docker and container image builds
- Managed identities
- Azure RBAC and ABAC repository permissions
- Azure networking, private endpoints, and ACR Tasks agent pools

## Sources Consulted
- [ACR Tasks overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview)
- [Azure CLI reference for `az acr task`](https://learn.microsoft.com/en-us/cli/azure/acr/task?view=azure-cli-latest)
- [Azure CLI reference for ACR task credentials](https://learn.microsoft.com/en-us/cli/azure/acr/task/credential?view=azure-cli-latest)
- [Azure CLI reference for ACR task identities](https://learn.microsoft.com/en-us/cli/azure/acr/task/identity?view=azure-cli-latest)
- [Azure CLI reference for ACR task timers](https://learn.microsoft.com/en-us/cli/azure/acr/task/timer?view=azure-cli-latest)
- [Azure CLI reference for `az acr build`, `az acr run`, and `az acr check-health`](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest)
- [ACR task run status REST API reference](https://learn.microsoft.com/en-us/rest/api/container-registry-tasks/task-runs/get?view=rest-container-registry-tasks-2025-03-01-preview)
- [View and manage ACR task run logs](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-logs)
- [Schedule ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-scheduled)
- [Check the health of an Azure container registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-check-health)
- [Cross-registry authentication in an ACR task](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-cross-registry-authentication)
- [ACR RBAC and ABAC repository permissions](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [ACR roles and permissions overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Manage network bypass policy for ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/manage-network-bypass-policy-for-tasks)
- [Use a dedicated ACR Tasks agent pool](https://learn.microsoft.com/en-us/azure/container-registry/tasks-agent-pools)
- [ACR Tasks YAML reference](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-reference-yaml)
- [Troubleshoot ACR push errors and write locks](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-container-registry/troubleshoot-push-error-operation-disallowed-timeout)

## Issues Found
- The run-status guidance treated timeout-related cleanup as a possible meaning of `Canceled`. ACR defines `Timeout` as a separate run status, so the post now distinguishes normal explicit cancellation from an expired run timeout.
- The source-trigger guidance referred to path filters. ACR source triggers support repository events and a watched branch, while the context URL can select a subfolder; they do not expose a source path-filter setting. The guidance now tells readers to verify the branch and source-context subfolder.
- The push-failure guidance used “immutable tag” and “immutable repository” terminology. ACR rejects pushes when the repository or image/tag has `writeEnabled` set to `false`, so the post now uses write-lock terminology that matches the service model.
- The `az acr run` example omitted the ABAC-specific authentication requirement for a quick run that reads images or artifacts from the same registry. The post now explains when to add `--source-acr-auth-id "[caller]"` and require the corresponding repository role.
- The agent-pool guidance did not identify the feature as preview or state its current platform constraints. It now notes that ACR Tasks agent pools require Premium, currently support Linux nodes only, and are available only in listed regions.

## Review Notes
- All Azure CLI command names, required flags, JMESPath queries, shell syntax, task credential syntax, and multi-step `retries` guidance were checked and are current as of the validation date.
- The ABAC-specific `--source-acr-auth-id` options are documented by the current Azure CLI. Users whose older CLI release does not recognize the option need to upgrade.
- `networkRuleBypassAllowedForTasks` is correctly documented with the `2025-06-01-preview` API version. Because this is a preview API surface, its version and behavior should be rechecked during future reviews.
- Microsoft currently notes that ACR task runs are temporarily paused for Azure free-credit subscriptions. This is a service-policy caveat rather than an error in the troubleshooting flow and may change independently of the post.
