# Validation Summary: How to Use HookFailed Delete Policy in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync hooks and hook delete policies
- Kubernetes Jobs
- kubectl
- YAML configuration
- curl-based hook examples

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/resource_hooks/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes TTL-after-finished controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/

## Issues Found
- Fixed repeatable hook examples that used fixed `metadata.name` without `BeforeHookCreation`. Argo CD documentation states named hooks are only created once unless `BeforeHookCreation` or `generateName` is used, so the examples that are meant to create preserved hook history now use `generateName`.
- Corrected the non-critical hook section to avoid implying that an actual failed PostSync hook is acceptable to Argo CD sync status. Argo CD marks the sync failed when a PostSync hook fails; `HookFailed` only controls deletion of the failed hook resource.
- Added `curl -f` to the Grafana example so HTTP error responses cause the Job to fail and therefore exercise the `HookFailed` policy.
- Clarified that successful hook accumulation with only `HookFailed` occurs when using unique names or `generateName`.
- Clarified that `HookFailed, BeforeHookCreation` keeps only the most recent successful hook when using a fixed `metadata.name`.

## Review Notes
The Kubernetes manual cleanup command uses `--field-selector=status.successful=1`, which is supported for Jobs, and combines it with a label selector accepted by `kubectl delete`. Kubernetes also supports `.spec.ttlSecondsAfterFinished` for finished Job cleanup, but Argo CD documents that TTL-driven cleanup can make applications appear OutOfSync; using hook delete policies avoids that specific issue.
