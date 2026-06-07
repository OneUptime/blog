# Validation Summary: How to Configure Tekton PipelineRuns

## Status
validated

## Post Type
Tutorial / Hands-on Guide

## Technologies Covered
- Tekton Pipelines (tekton.dev/v1 API)
- Tekton CLI (`tkn`)
- Kubernetes (Pods, PVCs, ConfigMaps, Secrets, ServiceAccounts, Affinity/Tolerations)
- YAML configuration
- Mermaid diagrams
- Kaniko, git-clone, slack-notify catalog tasks (referenced)

## Sources Consulted
- Tekton PipelineRuns reference: https://tekton.dev/docs/pipelines/pipelineruns/
- Tekton Pipelines reference: https://tekton.dev/docs/pipelines/pipelines/
- Tekton TaskRuns / cancellation: https://tekton.dev/docs/pipelines/taskruns/
- Tekton additional configs / feature flags: https://tekton.dev/docs/pipelines/additional-configs/
- Tekton Workspaces: https://tekton.dev/docs/pipelines/workspaces/
- Tekton Matrix: https://tekton.dev/docs/pipelines/matrix/
- Tekton CLI releases: https://github.com/tektoncd/cli/releases
- Tekton CLI Homebrew formula: https://formulae.brew.sh/formula/tektoncd-cli
- `tkn taskrun logs` command reference: https://github.com/tektoncd/cli/blob/main/docs/cmd/tkn_taskrun_logs.md

## Issues Found

1. **Outdated `tkn` CLI version (v0.35.0).** The Linux install snippet pinned an old release. Updated the download URL and tarball name to **v0.45.0**, the current stable release as of mid-2026. The URL pattern itself was already correct.

2. **"Task-Level Timeout Override" section showed compute resources, not timeouts.** The section header, intro, and YAML comment all said "timeout," but the example actually set `computeResources`. In Tekton v1, `PipelineRun.spec.taskRunSpecs[]` supports `computeResources`, `serviceAccountName`, `podTemplate`, `stepSpecs`, `sidecarSpecs`, and `metadata` — but per-task timeouts are defined on the **Pipeline** (`PipelineTask.timeout`), not overridden here. Renamed the section to "Task-Level Resource Override," realigned the intro and YAML comment, and added a one-line note pointing readers to `PipelineTask.timeout` for actual per-task timeouts.

3. **Misleading comment on `keep-pod-on-cancel`.** The cleanup-policies snippet labelled `keep-pod-on-cancel: "false"` as "Keep last 5 successful and 3 failed runs," but that flag has nothing to do with run retention — it controls whether the pod from a cancelled TaskRun is preserved for debugging. There is no "keep last N runs" knob in the `feature-flags` ConfigMap; retention is handled by the separate Tekton Pruner component. Replaced the misleading comment with an accurate description of `keep-pod-on-cancel` and added a clarifying comment above the labelled PipelineRun explaining how retention is actually managed.

## Review Notes

- The `tekton.dev/v1` API usage throughout is correct (GA since 2023). All field names checked against the v1 schema — `taskRunTemplate.serviceAccountName`, `timeouts.{pipeline,tasks,finally}`, `workspaces[].volumeClaimTemplate`, `matrix.params`, `$(tasks.status)` in `finally`, Pipeline-level `results[]`, etc. all match the documented spec.
- PipelineRun status reason values listed ("Succeeded, Failed, Running, Cancelled, PipelineRunPending") are accurate. The reason for cancellation is indeed `Cancelled`, not `PipelineRunCancelled` (a common confusion since `PipelineRunCancelled` appears in `spec.status`, not in the condition reason).
- `tkn taskrun logs --all` is a valid flag, though its precise meaning is "include logs from Tekton's injected init steps" rather than literally "all containers." The blog uses it loosely under "Get detailed task logs," which is acceptable phrasing and was not changed.
- `computeResources` in `taskRunSpecs[]` is currently gated behind the `enable-api-fields: alpha` feature flag on some Tekton versions; readers may need to enable alpha fields to use the resource override example. Not flagged inline since the rest of the post does not call out alpha-gated features individually.
- The matrix builds example, finally tasks with `$(tasks.status)`, workspace types, and registry credential annotation (`tekton.dev/docker-0`) are all consistent with current Tekton documentation.
