# Validation Summary: How to Use the argocd.argoproj.io/hook-delete-policy Annotation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD resource hooks
- Kubernetes Jobs
- Kubernetes Job TTL cleanup
- kubectl
- jq

## Sources Consulted
- Argo CD documentation: Sync Phases and Waves, including hook lifecycle and cleanup: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD documentation: Resource Hooks, including named hooks, hook delete policies, and TTL caveat: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kubernetes documentation: Automatic Cleanup for Finished Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes documentation: kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The introduction said hook resources accumulate when no delete policy is specified. Argo CD currently assumes `BeforeHookCreation` when no delete policy is specified, so I changed this to describe accumulation with generated hook names or policies that intentionally preserve resources.
- The `BeforeHookCreation` pros said it works well with Jobs that need unique names per run. Argo CD documents `BeforeHookCreation` as meant for hooks with a fixed `metadata.name`, so I corrected that bullet.
- The `HookSucceeded` and `HookFailed` examples used fixed `metadata.name` values without `BeforeHookCreation`. Argo CD documents that named hooks are only created once unless `BeforeHookCreation` is used, so I changed those examples to use `generateName`.
- The maximum retention section said exactly one hook instance always exists. That is accurate for fixed-name hooks, so I added that scope.
- The smoke test recommendation did not mention the fixed-name hook recreation caveat. I added a note to combine `HookSucceeded` with `BeforeHookCreation` when using a fixed `metadata.name`.
- The TTL section omitted Argo CD's documented caveat that TTL-based deletion can make an Application appear OutOfSync. I added that warning.

## Review Notes
The remaining Kubernetes Job manifests, hook annotations, `ttlSecondsAfterFinished` usage, `kubectl logs` flags, and `jq` cleanup commands are technically sound for the concepts shown. The cleanup commands assume `jq` is installed and may delete many Jobs at once, so they should still be used carefully in a real namespace.
