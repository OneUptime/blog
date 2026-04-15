# Validation Summary: How to Use Dapr with Argo CD for GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Argo CD (GitOps continuous delivery for Kubernetes)
- Kubernetes
- Bitnami Sealed Secrets / kubeseal
- Helm
- kubectl

## Sources Consulted
- [Argo CD Diff Customization Documentation](https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/) — verified `ignoreDifferences`, `jsonPointers`, and `jqPathExpressions` usage
- [Argo CD `argocd app sync` Command Reference](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/) — verified `--force` and `--replace` flags
- [Argo CD Sync Options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/) — verified sync policy fields and options
- [Argo CD Application Specification Reference](https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/) — verified Application CRD structure and `argoproj.io/v1alpha1` API version
- [Sealed Secrets GitHub Repository (bitnami-labs/sealed-secrets)](https://github.com/bitnami-labs/sealed-secrets) — verified kubeseal CLI flags (`-o`/`--format`, `--controller-namespace`)
- RFC 6901 (JSON Pointer) — verified `~1` escape sequence for `/` in JSON Pointer paths

## Issues Found
No technical issues found.

## Review Notes
- The "Health Checks for Dapr Applications" section title is slightly misleading — the content demonstrates `ignoreDifferences` configuration for Dapr Component CRDs, not health check configuration. However, this is an editorial/stylistic observation rather than a technical error, and the YAML itself is correct.
- The Sealed Secrets section omits the `helm repo add` step before `helm install`, but this is a minor omission in a post that is focused on the Dapr + Argo CD integration, not a Sealed Secrets tutorial.
- `jsonPointers` is still fully supported alongside `jqPathExpressions` in Argo CD. Neither is deprecated.
- The `argocd app sync --force --replace` command is technically correct but is a very aggressive sync strategy (deletes and recreates resources). The post could note this as a caveat, but the command itself is valid.
