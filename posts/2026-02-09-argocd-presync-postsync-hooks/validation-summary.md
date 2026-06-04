# Validation Summary: How to Use ArgoCD PreSync and PostSync resource hooks for deployment workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource hooks
- Kubernetes Jobs and Deployments
- Kubernetes CLI (`kubectl`)
- Argo CD CLI (`argocd`)
- Slack incoming webhooks
- GitOps deployment workflows

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/resource_hooks/
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes command and arguments documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks

## Issues Found
- The post described PostSync hooks as running after sync completion. Updated this to say PostSync hooks run after application resources apply successfully and reach a Healthy state, matching Argo CD hook phase semantics.
- The hook type list omitted current Argo CD delete hooks. Added PreDelete and PostDelete to the list of supported hook types.
- A database migration example used sync wave `"1"` while the comment said it ran in the first wave. Changed it to wave `"0"`, which is the first/default wave within the PreSync phase.
- The `migrate/migrate` example invoked the CLI through `sh -c`. Changed it to use Kubernetes `command` and `args` directly with `$(DATABASE_URL)` expansion, avoiding an unnecessary shell dependency in the CLI container.
- The Slack notification example used `https://api.slack.com/webhooks/YOUR_WEBHOOK`, which is not the incoming webhook endpoint format. Updated it to the documented `https://hooks.slack.com/services/...` format.
- The health-check PostSync example used `curlimages/curl` while also running `kubectl` and a local smoke-test script. Changed the image to a placeholder test-runner image that explicitly includes `kubectl`, `curl`, and the smoke tests.
- The monitoring commands used a label selector that did not match the hook manifests and an Argo CD instance label that may not match the configured tracking method. Replaced those commands with `kubectl get jobs -n demo` and `argocd app resources demo-app`.

## Review Notes
The examples remain illustrative and assume the referenced custom images, scripts, service accounts, Secrets, ConfigMaps, and RBAC permissions exist in the target cluster. Hooks are not run during selective sync, which could be worth mentioning in a future expansion.
