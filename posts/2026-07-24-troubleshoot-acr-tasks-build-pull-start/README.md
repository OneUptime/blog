# Troubleshooting ACR Tasks That Cannot Build, Pull, or Start

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, ACR Tasks, Containers, Troubleshooting, DevOps

Description: Diagnose ACR Tasks that stay queued, fail to pull a base image, cannot fetch source, or stop during a container build.

---

Azure Container Registry Tasks can build from a Dockerfile, run a multi-step YAML workflow, react to source commits, and rebuild when a base image changes. That convenience puts several systems in one execution path: the task definition, its trigger, source control, the build worker, registry authorization, and network policy.

The fastest way to troubleshoot a failed task is to identify the stage that failed. Do not begin by changing permissions or opening a firewall. First determine whether Azure created a run, whether the run obtained a worker, and which task step produced the first useful error.

## Start with the Run Record

Set the registry and task names once:

```bash
ACR_NAME="contosoprod"
TASK_NAME="build-api"
```

List recent runs for the task:

```bash
az acr task list-runs \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --output table
```

The status narrows the investigation:

- No new run means the trigger did not fire or the task is disabled.
- `Queued` for an unusual length of time points to worker capacity, an agent-pool problem, or a service issue.
- `Running` followed by `Failed` means the log should identify a source, login, pull, build, test, or push failure.
- `Canceled` can be a user action, automation action, or timeout-related cleanup.
- `Succeeded` with no expected image usually means the task did not tag or push the intended output.

Copy the run ID and inspect both its properties and log:

```bash
RUN_ID="ca1"

az acr task show-run \
  --registry "$ACR_NAME" \
  --run-id "$RUN_ID" \
  --output yaml

az acr task logs \
  --registry "$ACR_NAME" \
  --run-id "$RUN_ID"
```

For an automatically triggered run, logs are stored rather than streamed to the terminal that created the task. Always inspect the recorded run instead of assuming the trigger was silent.

## Confirm That the Task Can Start

Inspect the effective definition:

```bash
az acr task show \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --output yaml
```

Check the following fields:

- `status` should be enabled.
- The platform must match the images and commands the task runs.
- The context and Dockerfile or task YAML path must still exist.
- The task timeout must be long enough for the workload.
- An assigned agent pool must exist and be available.
- Source, base-image, and timer triggers should reflect the intended configuration.

Manually invoke the same task:

```bash
az acr task run \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME"
```

If the manual run succeeds but a scheduled, Git, or base-image-triggered run never appears, the build is healthy and the trigger is the problem. Inspect triggers without rebuilding the task:

```bash
az acr task show \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --query '{status:status,trigger:trigger}' \
  --output yaml

az acr task timer list \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --output table
```

Timer schedules use UTC. For source triggers, verify that the repository connection or personal access token remains valid and that the watched branch and path filters still match. Never print a source token in task output. Microsoft warns that command-line values and URIs can be captured in diagnostic tracing.

## Separate Registry Health from Task Health

Run the supported health check from the same administrative environment:

```bash
az acr check-health \
  --name "$ACR_NAME" \
  --ignore-errors \
  --yes
```

This checks the local Docker environment, DNS, registry endpoint connectivity, authentication, and related dependencies. It does not execute inside the ACR Tasks worker, but it quickly exposes a misspelled registry, a broken local client, or a general registry access issue.

Also check Azure Service Health when unrelated tasks begin failing at once. A single Dockerfile failure is normally an application problem; many previously healthy tasks failing before their first step can indicate a platform or network event.

## Diagnose Source Context Failures

A task must retrieve its build context before it can build. Typical log messages mention an invalid URL, an inaccessible branch, a missing Dockerfile, or authentication failure.

Check these points:

1. The context URL and branch still exist.
2. The token has the minimum repository access required.
3. The Dockerfile path is relative to the root of the downloaded context.
4. A `.dockerignore` file has not excluded a required file.
5. A remote context is reachable from the task worker, not only from a developer laptop.

Reproduce source and Dockerfile selection with a quick task:

```bash
az acr build \
  --registry "$ACR_NAME" \
  --image "diagnostics/api:test" \
  --file "services/api/Dockerfile" \
  "https://github.com/contoso/platform.git#main"
```

Use a disposable tag and delete it through your normal lifecycle process after testing. If this quick task fails before the build begins, focus on the context URL, branch, token, and path.

## Fix Base-Image Pull Authorization

A public base image and a private base image have different failure modes. For a private base image in another ACR, give the task a managed identity, authorize that identity on the source registry, and tell the task to use it for that login server.

Inspect the task identity:

```bash
az acr task identity show \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --output yaml
```

For a system-assigned identity, obtain its principal ID and grant pull access on the source registry:

```bash
TASK_PRINCIPAL_ID=$(az acr task show \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --query identity.principalId \
  --output tsv)

SOURCE_ACR_ID=$(az acr show \
  --name "contosobase" \
  --query id \
  --output tsv)

az role assignment create \
  --assignee-object-id "$TASK_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope "$SOURCE_ACR_ID" \
  --role "AcrPull"

az acr task credential add \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --login-server "contosobase.azurecr.io" \
  --use-identity "[system]"
```

`AcrPull` applies to registries using the older registry-wide RBAC mode. For a registry configured for RBAC Registry + ABAC Repository Permissions, use `Container Registry Repository Reader` and, where appropriate, a repository condition. Do not assign both models blindly. Check the source registry's role-assignment permissions mode first.

Role assignments can take a short time to propagate. Retry with backoff rather than recreating the identity.

If the task builds successfully but fails on its final push, inspect authorization on the destination registry and the repository name. A repository lock or an immutable tag can correctly reject an overwrite even when authentication succeeded.

## Check Network Isolation Explicitly

A `403`, timeout, DNS error, or connection refusal can be network policy rather than identity. Review:

- Public network access and IP firewall rules.
- Private endpoints and private DNS records.
- Dedicated data endpoints used for image-layer transfer.
- Firewall egress for the source repository and every base-image registry.
- The task's route when a dedicated agent pool is used.

Network-restricted registries need a deliberate design for ACR Tasks. Microsoft documents a `networkRuleBypassAllowedForTasks` registry policy that can let system-identity tasks bypass network rules when trusted-services access is enabled. As of July 2026, configuration of this property uses the `2025-06-01-preview` API. Treat it as a preview control, review its security implications, and do not enable it merely to make an error disappear.

For stricter routing, use a dedicated ACR Tasks agent pool connected to the required network. Agent pools and advanced private networking have tier, region, and quota requirements, so verify current availability before relying on them.

## Diagnose Build-Step Failures

Once the log reaches `docker build`, test the build itself:

- Pin a valid base-image digest or known tag.
- Confirm the requested architecture and OS are supported by the task platform.
- Check package-repository DNS and TLS from the worker's network path.
- Avoid interactive install commands.
- Ensure secrets are supplied through supported secret mechanisms, not `ARG` values that can leak into layers or logs.
- Increase the task timeout only after proving the build is making progress.

For a multi-step task, make the first failing step reproducible. Run the YAML directly:

```bash
az acr run \
  --registry "$ACR_NAME" \
  --file "acr-task.yaml" \
  .
```

Use step-level `retries` only for genuinely transient operations. A retry will not fix an invalid credential, a missing file, or an unsupported platform.

## A Practical Failure Map

| Symptom | First place to look | Likely causes |
|---|---|---|
| No run record | Task and trigger definition | Disabled task, wrong branch, expired source token, incorrect timer |
| Run remains queued | Run properties and Service Health | Worker or agent-pool capacity, service issue |
| Source download fails | First log lines | Bad URL, branch, token, or context path |
| Base image returns 401/403 | Task identity and source ACR roles | Missing reader role, wrong auth mode, wrong login server |
| Pull or source times out | Registry and agent-pool network path | Firewall, private DNS, blocked egress |
| Build exits nonzero | Dockerfile command and build log | Package failure, platform mismatch, missing file |
| Push is denied | Destination role and repository attributes | Missing writer role, tag lock, immutable repository |
| Run ends at a fixed duration | Task timeout and long step | Timeout too low or stalled dependency |

## Make the Next Failure Easier to Diagnose

Use a dedicated managed identity, least-privilege repository roles, digest-pinned production inputs, and descriptive step names. Keep credentials out of URLs and logs. Add alerts for repeated failed runs, and retain enough logs to compare the last successful and first failed execution.

Most importantly, preserve the order of diagnosis: run record, run log, trigger, identity, network, then build content. That order prevents a Dockerfile error from becoming an unnecessary firewall change.

## Official Documentation

- [ACR Tasks overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview)
- [Azure CLI reference for az acr task](https://learn.microsoft.com/en-us/cli/azure/acr/task?view=azure-cli-latest)
- [Check the health of an Azure container registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-check-health)
- [Cross-registry authentication in an ACR task](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-cross-registry-authentication)
- [Manage network bypass policy for tasks](https://learn.microsoft.com/en-us/azure/container-registry/manage-network-bypass-policy-for-tasks)
- [ACR roles and permissions overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
