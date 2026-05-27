# Validation Summary: How to Set Up ArgoCD for GitOps Deployments on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- kubectl
- Kustomize
- Argo CD CLI
- Kubernetes YAML manifests

## Sources Consulted
- Argo CD Getting Started documentation: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/health/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization

## Issues Found
- The Argo CD installation command used plain `kubectl apply`. Updated it to include `--server-side --force-conflicts`, matching current Argo CD installation guidance for the official manifests and avoiding client-side apply annotation-size issues with large CRDs.
- The `kubectl wait` example used lowercase `ready`. Updated it to `Ready` to match Kubernetes condition naming used in the official `kubectl wait` reference.
- The CLI login command used the port-forwarded self-signed endpoint without `--insecure`. Added `--insecure`, matching Argo CD guidance for the default self-signed installation when using CLI commands through port-forwarding.
- The Kustomize base referenced `configmap.yaml` but the post did not include that manifest. Added a minimal `ConfigMap` example so the shown base can build as written.
- The sync-flow diagram implied Git webhooks and developer notifications are always present. Updated the wording to reflect Argo CD's polling or webhook behavior and that status is visible through UI, CLI, or configured notifications.
- The rollback example showed `argocd app rollback` directly after configuring automated sync. Updated the rollback section to prefer reverting Git for automated-sync applications, and to disable automated sync before using `argocd app rollback`, because Argo CD documents that rollback cannot be performed against applications with automated sync enabled.

## Review Notes
The examples are intentionally generic and use placeholder repository/image names. Local validation with `kubectl`, `argocd`, and `kustomize` was not possible because those CLIs are not installed in the review environment, so command and schema validation was performed against official documentation.
