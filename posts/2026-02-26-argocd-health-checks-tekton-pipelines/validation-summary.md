# Validation Summary: How to Configure Health Checks for Tekton Pipelines in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD custom health checks
- Lua health scripts
- Kubernetes ConfigMaps and kubectl
- Tekton Pipelines
- Tekton PipelineRun, TaskRun, Pipeline, and Task resources
- Tekton Triggers EventListener resources

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD resource-overrides health command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_health/
- Tekton PipelineRun documentation: https://tekton.dev/docs/pipelines/pipelineruns/
- Tekton TaskRun documentation: https://tekton.dev/docs/pipelines/taskruns/
- Tekton Pipeline API reference: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton EventListener documentation: https://tekton.dev/docs/triggers/eventlisteners/
- Tekton Triggers API reference: https://tekton.dev/docs/triggers/triggers-api/

## Issues Found
- The post said the guide covered every Tekton resource type. It only covers common Tekton Pipeline and Trigger resources, so the wording was corrected to avoid overstating the scope.
- The PipelineRun health check treated an `Unknown` condition with reason `Cancelled` as already cancelled and `Degraded`. Tekton documents `Unknown` / `Cancelled` as cancellation requested but not finished; completed cancellation is represented by `False` / `Cancelled`. The Lua message and status were corrected to show cancellation in progress.
- The TaskRun section said each step in a pipeline becomes a TaskRun. Tekton TaskRuns execute Tasks; a PipelineRun normally creates TaskRuns for Pipeline tasks, and each TaskRun runs the Task's steps. The explanation was corrected.

## Review Notes
The ConfigMap key format, Lua return shape, Argo CD health statuses, Tekton `Succeeded` condition usage, `startTime` / `completionTime` fields, TaskRun step status access, EventListener readiness status, and sample `kubectl create -f -` command were checked against official documentation and are technically valid. The Pipeline and Task definition health checks are intentionally lightweight structural checks; Kubernetes and Tekton admission validation remains the authoritative validation path for full schema correctness.
