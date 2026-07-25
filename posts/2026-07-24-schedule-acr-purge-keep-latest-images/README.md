# Keeping Only the Latest ACR Images with Scheduled acr purge Tasks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Azure Container Registry, ACR Tasks, Image Retention, Azure CLI, Container Operations

Description: Safely retain the newest ACR build tags with dry-run-tested acr purge filters, scheduled tasks, and explicit manifest safeguards.

---

Build pipelines can create hundreds of Azure Container Registry (ACR) tags while only a small recent set is useful. The `acr purge` container command can select tags by repository, regular expression, age, and last-modified time, then run on a recurring ACR Task timer.

The safe pattern is:

1. Match only disposable build tags.
2. Preview the exact result with `--dry-run`.
3. Decide separately whether to delete untagged manifests.
4. Schedule the already-reviewed command.
5. Monitor every timer-triggered run.

`acr purge` is currently a preview feature. Microsoft currently distributes it through the `mcr.microsoft.com/acr/acr-cli` image and exposes the `acr purge` alias in ACR Tasks. Preview behavior and parameters can change, so run `az acr run --registry contosoprod --cmd 'acr purge --help' /dev/null` and repeat the dry run after upgrades or policy changes.

## Understand what `--keep` means

The minimum normal purge command includes:

- `--filter`, in the form `repository-regex:tag-regex`;
- `--ago`, using a Go-style duration such as `14d`, `36h`, or `2d6h`;
- optionally, `--keep N`, which retains the newest `N` tags among those otherwise selected for deletion.

The newest tags are determined by tag last-modified time for each matching repository. `--keep` is not a global registry count.

This distinction matters:

```text
--ago 14d --keep 20
```

keeps all matching tags newer than 14 days, plus the latest 20 tags from the older deletion candidates. The repository can therefore retain more than 20 tags.

To make matching tags of all ages eligible for deletion while retaining the latest 20 deletion candidates, use:

```text
--ago 0d --keep 20
```

Microsoft's examples use `--ago 0d` to match tags of all ages. In a busy registry, an age buffer is often safer because it protects an image that was pushed moments before the task started. Choose the semantics deliberately rather than assuming `--keep` alone sets a repository limit.

## Design a narrow tagging policy

Suppose a pipeline writes immutable build tags such as:

```text
apps/payments:build-10421
apps/payments:build-10422
apps/payments:build-10423
apps/payments:prod
```

Only `build-*` tags should be disposable. Keep promotion aliases such as `prod`, release tags, signed artifacts, and rollback tags outside the filter.

Use an anchored expression:

```text
apps/payments:^build-[0-9]+$
```

Avoid a broad filter such as `apps/payments:.*` unless every tag in the repository truly follows the same retention rule. The filter grammar uses regular expressions, and its preview implementation can change between releases. Positive, anchored naming patterns are easier to audit than complex exclusions.

For several applications, use one filter per repository:

```bash
PURGE_CMD="acr purge \
  --filter 'apps/payments:^build-[0-9]+$' \
  --filter 'apps/orders:^build-[0-9]+$' \
  --ago 0d \
  --keep 20 \
  --dry-run"
```

Each repository retains its own latest 20 matching tags.

## Run a dry run on demand

Set the registry name and execute the command as an on-demand ACR Task:

```bash
ACR_NAME="contosoprod"

PURGE_CMD="acr purge \
  --filter 'apps/payments:^build-[0-9]+$' \
  --filter 'apps/orders:^build-[0-9]+$' \
  --ago 0d \
  --keep 20 \
  --dry-run"

az acr run \
  --registry "$ACR_NAME" \
  --cmd "$PURGE_CMD" \
  /dev/null
```

The `/dev/null` context tells ACR Tasks that the run has no source-code context. `acr purge` authenticates to the registry in which the task runs.

Review every proposed tag. Check specifically that:

- each repository is disposable;
- the expression excludes release and promotion tags;
- the retained count is correct per repository;
- locked production images are not part of the cleanup design;
- no downstream deployment still uses a candidate tag;
- no signature, software bill of materials, or other OCI referrer lifecycle assumption is violated.

Do not simply remove `--dry-run` because the command returned successfully. A successful dry run proves that the command ran, not that the selection matches your operational intent.

## Decide whether to reclaim manifest storage

By default, `acr purge` removes matching tag references. It does not remove the underlying manifests and layer data. This makes the first stage less destructive, but it might not materially reduce storage.

Adding `--untagged` also makes untagged manifests that satisfy the age filter eligible for deletion:

```bash
PURGE_CMD="acr purge \
  --filter 'apps/payments:^build-[0-9]+$' \
  --ago 0d \
  --keep 20 \
  --untagged \
  --dry-run"
```

In the current `acr-cli`, the same `--keep 20` value also retains the newest 20 eligible untagged manifests per repository during this combined cleanup. Use separate tag and manifest cleanup tasks when they need different keep counts.

This option deserves a separate approval. A manifest can be untagged and still be referenced by a deployment using its digest:

```text
contosoprod.azurecr.io/apps/payments@sha256:...
```

Deleting that manifest makes a future cache-miss pull fail. Microsoft explicitly warns not to purge untagged manifests when systems pull by digest. Running containers might continue, but a reschedule, scale-out, node replacement, or disaster recovery deployment can require a fresh pull.

Use `--untagged-only` when the job should delete only dangling manifests and leave all tags untouched. This mode can operate without `--filter` and `--ago`, although supplying an age threshold is usually safer. Keep tag cleanup and manifest cleanup as separate tasks if they have different owners or risk tolerances.

## Create a schedule-only purge task

After approving the dry-run output, remove `--dry-run` and create a timer task:

```bash
ACR_NAME="contosoprod"

PURGE_CMD="acr purge \
  --filter 'apps/payments:^build-[0-9]+$' \
  --filter 'apps/orders:^build-[0-9]+$' \
  --ago 0d \
  --keep 20"

az acr task create \
  --name "keep-latest-builds" \
  --registry "$ACR_NAME" \
  --cmd "$PURGE_CMD" \
  --schedule "0 2 * * *" \
  --context /dev/null \
  --base-image-trigger-enabled false
```

The five-field cron expression means 02:00 UTC every day:

```text
minute hour day month day-of-week
0      2    *   *     *
```

ACR Task schedules use UTC, do not accept seconds or year fields, and can run as often as once per minute. Explicitly disabling the base-image trigger makes this task timer-only. Otherwise, ACR Tasks enables a base-image update trigger by default when a task is created.

If the reviewed policy includes manifest deletion, add `--untagged` to `PURGE_CMD` before creating the task. Keep the dry-run command in runbooks so operators can preview future filter changes.

## Test and inspect the scheduled task

Confirm its timer configuration:

```bash
az acr task show \
  --name "keep-latest-builds" \
  --registry "$ACR_NAME" \
  --output table

az acr task timer list \
  --name "keep-latest-builds" \
  --registry "$ACR_NAME" \
  --output table
```

Trigger one controlled run rather than waiting for the first scheduled window:

```bash
az acr task run \
  --name "keep-latest-builds" \
  --registry "$ACR_NAME"
```

Then inspect recent executions:

```bash
az acr task list-runs \
  --name "keep-latest-builds" \
  --registry "$ACR_NAME" \
  --output table

az acr task logs \
  --name "keep-latest-builds" \
  --registry "$ACR_NAME"
```

Timer runs appear with a `Timer` trigger. Alert on failed or unexpectedly long runs, and retain task logs according to your audit requirements.

## Handle large registries and timeouts

Microsoft documents a default timeout of 600 seconds for on-demand tasks and 3,600 seconds for scheduled tasks. A timeout can leave only part of a large selection deleted. For a large registry, increase the task timeout and reduce filter scope:

```bash
az acr task create \
  --name "keep-latest-builds" \
  --registry "$ACR_NAME" \
  --cmd "$PURGE_CMD" \
  --schedule "0 2 * * *" \
  --context /dev/null \
  --timeout 7200 \
  --base-image-trigger-enabled false
```

The command also supports `--concurrency`. Higher concurrency is not automatically better because ACR data-plane delete and authentication requests have SKU-dependent rate limits. If runs receive `429 Too Many Requests`, narrow the job, lower concurrency, or separate repositories across schedules.

Basic, Standard, and Premium registries provide the same core data-plane APIs, but their storage, throughput, and rate limits differ. This scheduled purge pattern does not require Premium-only retention policy or a Premium dedicated Tasks agent pool. A dedicated agent pool is a separate Premium feature.

## Account for locks and ABAC

`acr purge` does not delete a tag or repository whose `write-enabled` attribute is `false`. That is useful for production protection. Treat a skipped locked image as a policy decision, not something the cleanup task should automatically unlock.

For registries using RBAC plus ABAC repository permissions, current `acr purge` detects ABAC mode automatically, but ACR Tasks no longer has default data-plane access. For an on-demand `az acr run`, add `--source-acr-auth-id '[caller]'` and grant the required roles to the caller. For a scheduled task, add `--source-acr-auth-id '[system]'` or a user-assigned identity resource ID to `az acr task create`, then grant that managed identity:

- `Container Registry Repository Contributor`, with the assignment covering the repositories it may purge (use an ABAC condition for repository scoping);
- `Container Registry Repository Catalog Lister` at registry scope when it must enumerate repositories.

If a filter identifies one repository explicitly, the command can operate without catalog-list permission. If a broad filter reaches a repository the identity cannot purge, the command stops at the first unauthorized repository and reports completed, failed, and unprocessed repositories. Scope both the filter and the role assignment to the same repository set.

## Roll out retention safely

A production rollout should use stages:

1. Run a dry run and save its output.
2. Re-run it after a normal deployment cycle.
3. Schedule tag-only cleanup.
4. Observe rollbacks, scale-outs, and node replacements.
5. Add untagged-manifest cleanup only after digest consumers are inventoried.
6. Review filters whenever repository or tag naming changes.

Keep enough images to satisfy the real rollback window, not an arbitrary count. If the deployment team expects seven days of rollback but the pipeline publishes 50 builds per day, keeping 20 builds is less than half a day of history.

Finally, test restoration assumptions. A deleted manifest is not a backup strategy, and `acr purge` deletion is described as unrecoverable. Replication and cache are availability mechanisms, not substitutes for a retention policy that preserves required release artifacts.

## Official Documentation

- [Automatically purge images from Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge)
- [Run an ACR Task on a defined schedule](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-scheduled)
- [Azure CLI reference for az acr task](https://learn.microsoft.com/en-us/cli/azure/acr/task?view=azure-cli-latest)
- [Delete container images in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-delete)
- [Lock a container image in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-lock)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
