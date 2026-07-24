# Rebuilding Images Automatically When an ACR Base Image Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Azure Container Registry, ACR Tasks, Container Builds, Base Images, DevOps Automation

Description: Configure ACR Tasks to discover base-image dependencies and rebuild application images whenever a tracked base tag moves.

---

Updating a base image does not patch application images that were already built from it. Each dependent image must be rebuilt so its manifest references the new operating system or framework layers.

Azure Container Registry (ACR) Tasks can discover base-image dependencies during a build and create an update trigger. When a tracked base tag changes, ACR Tasks runs the dependent application build again.

The reliable workflow is:

1. Give the base image a stable update-channel tag.
2. Create a persistent ACR build task.
3. Run it once so ACR can discover dependencies.
4. Publish a new manifest under the same base tag.
5. Validate the automatically triggered application build.

Automatic rebuilding is not automatic production deployment. Treat the new application image as another release candidate that still needs tests, scans, signing, promotion, and rollout controls.

## Use a stable tag for the base channel

The application Dockerfile must reference a tag that is updated in place:

```dockerfile
ARG REGISTRY_NAME
FROM ${REGISTRY_NAME}/platform/node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

CMD ["node", "server.js"]
```

`platform/node:20-alpine` is a stable update channel. A platform team can republish it with operating system fixes while preserving the channel name.

This will not produce an update trigger:

```dockerfile
FROM contoso.azurecr.io/platform/node:20.11.0
```

followed by publishing only:

```text
platform/node:20.11.1
```

The Dockerfile still points to `20.11.0`, so the tracked tag did not change. Microsoft explicitly requires a stable base tag for this trigger model.

Use mutable stable tags for base inputs and unique tags for application outputs. A Git commit alone is not a unique output identifier because a base update can rebuild the same commit with different content.

## Create a same-registry build task

Assume the base image and application output are in one ACR:

```bash
ACR_NAME="contoso"
TASK_NAME="payments-base-rebuild"
GIT_CONTEXT="https://github.com/contoso/payments.git#main"
GIT_PAT="<retrieve-from-secure-secret-store>"
```

Create the task:

```bash
az acr task create \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --image "apps/payments:{{.Run.ID}}" \
  --context "$GIT_CONTEXT" \
  --file Dockerfile \
  --git-access-token "$GIT_PAT" \
  --arg "REGISTRY_NAME=$ACR_NAME.azurecr.io" \
  --base-image-trigger-enabled true \
  --base-image-trigger-type Runtime \
  --commit-trigger-enabled true
```

The base-image trigger is enabled by default, but setting it explicitly documents the task's purpose. The default trigger type is `Runtime`.

This task has two independent triggers:

- a commit to the configured source branch;
- an update to a discovered runtime base image.

Set `--commit-trigger-enabled false` if source commits are built elsewhere and this task should react only to base updates.

The Git token is used to configure and access the source trigger. Grant only the documented repository scopes, rotate it, and do not embed it in the repository URL. Microsoft warns that values passed on task command lines or in URIs can appear in ACR diagnostic tracing, so treat task creation as a sensitive administrative operation.

## Run the task once to discover dependencies

Creating the task is not enough. ACR Tasks learns the dependency graph from a completed build:

```bash
az acr task run \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME"
```

Inspect the run output for the discovered runtime dependency. Then list task runs:

```bash
az acr task list-runs \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --output table
```

The first run should show `Manual` as its trigger. If it fails before dependency discovery, fix the build and run it again. A task that has never successfully built the image cannot reliably track its base.

Inspect task configuration as well:

```bash
az acr task show \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --output jsonc
```

Confirm the base image trigger is enabled and the task itself has `Enabled` status.

## Publish an updated base image

The platform team can use an ACR quick build to update the stable tag:

```bash
az acr build \
  --registry "$ACR_NAME" \
  --image "platform/node:20-alpine" \
  --file Dockerfile.base \
  .
```

When the new base manifest is pushed, ACR should immediately trigger the dependent application task because the base is in an Azure container registry.

List runs again:

```bash
az acr task list-runs \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --output table
```

The new run should show `Image Update` as the trigger. View its stored log:

```bash
RUN_ID=$(az acr task list-runs \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --query "[0].runId" \
  --output tsv)

az acr task logs \
  --registry "$ACR_NAME" \
  --run-id "$RUN_ID"
```

Manually triggered logs stream to the console and are stored. Automatically triggered logs are stored, so monitoring must query run status and logs rather than waiting for an interactive session.

## Know which base registries are tracked

Microsoft documents dependency detection for Dockerfile base images in:

- the ACR where the task runs;
- another private ACR, in the same or a different region;
- a public Docker Hub repository;
- a public Microsoft Container Registry repository.

Notification timing depends on location:

- An ACR base update triggers the task immediately.
- A public Docker Hub or Microsoft Container Registry base is checked at a random interval between 10 and 60 minutes.

Do not use the immediate ACR behavior as the latency expectation for a public base. For reliability and supply-chain control, Microsoft recommends copying public base content into a private registry and referencing the managed copy.

An arbitrary private third-party registry is not listed as a supported base-update source. If the base lives elsewhere, mirror it into ACR or trigger rebuilds from that registry's event system.

## Authenticate to a base in another ACR

When the base is in a separate private ACR, give the application task a managed identity.

Create the task with a system-assigned identity:

```bash
APP_ACR="contosoapps"
BASE_ACR="contosobases"
TASK_NAME="payments-base-rebuild"

az acr task create \
  --registry "$APP_ACR" \
  --name "$TASK_NAME" \
  --image "apps/payments:{{.Run.ID}}" \
  --context "$GIT_CONTEXT" \
  --file Dockerfile \
  --git-access-token "$GIT_PAT" \
  --arg "REGISTRY_NAME=$BASE_ACR.azurecr.io" \
  --assign-identity '[system]' \
  --base-image-trigger-enabled true
```

Get the task principal and base registry resource ID:

```bash
TASK_PRINCIPAL_ID=$(az acr task show \
  --registry "$APP_ACR" \
  --name "$TASK_NAME" \
  --query identity.principalId \
  --output tsv)

BASE_ACR_ID=$(az acr show \
  --name "$BASE_ACR" \
  --query id \
  --output tsv)
```

For a registry using standard RBAC, grant `AcrPull`:

```bash
az role assignment create \
  --assignee-object-id "$TASK_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "AcrPull" \
  --scope "$BASE_ACR_ID"
```

For an ABAC-enabled base registry, assign `Container Registry Repository Reader`, optionally constrained to the base repository.

Tell the task to use its identity for that login server:

```bash
az acr task credential add \
  --registry "$APP_ACR" \
  --name "$TASK_NAME" \
  --login-server "$BASE_ACR.azurecr.io" \
  --use-identity '[system]'
```

Wait for role-assignment propagation, then run the task manually once. That first successful run is still required for dependency discovery.

## Configure ABAC-enabled task registries explicitly

An ACR configured for **RBAC Registry + ABAC Repository Permissions** changes task authentication. New and existing ACR Tasks no longer receive default data-plane access to the source registry.

Create the task with an explicit identity:

```bash
az acr task create \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --image "apps/payments:{{.Run.ID}}" \
  --context "$GIT_CONTEXT" \
  --file Dockerfile \
  --git-access-token "$GIT_PAT" \
  --arg "REGISTRY_NAME=$ACR_NAME.azurecr.io" \
  --source-acr-auth-id '[system]' \
  --base-image-trigger-enabled true
```

Then grant that managed identity appropriate ABAC-compatible data-plane roles. It needs read access to the base repository and write access to the application output repository. `Container Registry Repository Writer` provides read and write capability; use ABAC conditions when the identity should access only specific repositories.

For ABAC-enabled quick builds such as the base-image command shown earlier, current Microsoft guidance requires the caller identity:

```bash
az acr build \
  --registry "$ACR_NAME" \
  --image "platform/node:20-alpine" \
  --file Dockerfile.base \
  --source-acr-auth-id '[caller]' \
  .
```

The caller must already have the required ABAC-compatible role. The older `--auth-mode` option is deprecated for controlling task access to ABAC-enabled registries.

## Handle multi-stage Dockerfiles deliberately

The current CLI exposes two base trigger types:

- `Runtime`, the default, tracks runtime dependencies;
- `All`, tracks all dependent images in a multi-stage Dockerfile.

For a Dockerfile with separate build and runtime stages, decide whether a build-toolchain image update should rebuild the result:

```bash
az acr task update \
  --registry "$ACR_NAME" \
  --name "$TASK_NAME" \
  --base-image-trigger-type All
```

Test this with a non-production base update and inspect the discovered dependency output. If only runtime updates matter, keep `Runtime` to avoid unnecessary rebuilds.

## Make the rebuilt output releasable

Tag outputs with `{{.Run.ID}}`, not only the Git commit:

```text
contoso.azurecr.io/apps/payments:ca42
```

The run ID distinguishes two builds of the same source commit against different base manifests. Record:

- source commit;
- ACR Task run ID;
- base image digest;
- application image digest;
- test and scan results;
- signature and provenance;
- promotion decision.

Use a multi-step ACR Task YAML or a downstream pipeline to test before promotion. Do not update a production alias inside an untested single-step rebuild. A base patch can change runtime behavior even when application source is unchanged.

Alert on failed `Image Update` runs. A green base build followed by a failed dependent build means applications have not incorporated the patch.

## Troubleshoot a missing trigger

If no rebuild appears:

1. Confirm the task is enabled.
2. Confirm the base-image trigger is enabled.
3. Confirm at least one manual application build succeeded.
4. Inspect that run's discovered dependencies.
5. Confirm the Dockerfile references the same stable tag that was updated.
6. Confirm the base location is supported.
7. For cross-registry bases, validate the task credential and pull role.
8. For ABAC mode, validate `--source-acr-auth-id` and repository roles.
9. Allow 10 to 60 minutes for public Docker Hub or MCR bases.
10. Inspect task run logs and role-assignment propagation.

Publishing a new version tag is the most common design error. The trigger follows an existing stable tag; it does not infer that `20.11.1` supersedes `20.11.0`.

## Service-tier and availability caveats

The core `az acr task` commands and base-image triggers are documented as GA. Dedicated Tasks agent pools are a separate Premium-only feature and are documented independently, with preview and regional caveats. The workflow above uses the default task infrastructure and does not require a dedicated agent pool.

Current Microsoft documentation also notes that ACR Task runs are temporarily paused for Azure free-credit subscriptions. If a task does not start in that account type, verify subscription eligibility rather than treating the trigger definition as broken.

Build capacity, registry throughput, networking features, and rate limits vary by SKU. Test both the trigger and the full build time under production conditions.

With a stable base channel, an initial discovery run, correct identity configuration, and unique application outputs, a base-image patch becomes a traceable rebuild event instead of a manual inventory exercise.

## Official Documentation

- [About base image updates for ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-base-images)
- [Automate container image builds with ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview)
- [Trigger a build when a base image changes in the same registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tutorial-base-image-update)
- [Trigger a build when a base image changes in another private registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tutorial-private-base-image-update)
- [Azure CLI reference for az acr task](https://learn.microsoft.com/en-us/cli/azure/acr/task?view=azure-cli-latest)
- [Effects of ABAC repository permissions on ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
