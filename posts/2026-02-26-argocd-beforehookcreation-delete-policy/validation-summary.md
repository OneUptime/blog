# Validation Summary: How to Use BeforeHookCreation Delete Policy in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD sync hooks and hook delete policies
- Kubernetes Jobs
- Kubernetes object naming and `generateName`
- Kubernetes Job lifecycle settings
- `kubectl` commands for Jobs, logs, JSONPath output, and patches

## Sources Consulted
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_hooks/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Kubernetes Object Names and IDs: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post said a statically named Job necessarily fails on the second sync without cleanup. Argo CD's documentation says named hooks are created once unless `BeforeHookCreation` or `generateName` is used, while Kubernetes immutable Job fields can cause update failures in some cases. Updated the wording to avoid the overbroad failure claim.
- The post implied Argo CD creates random names for `generateName` hooks. Kubernetes generates the unique suffix for resources using `metadata.generateName`. Updated that section accordingly.
- The post described hook logs and hook inspection as always available until the next sync. Kubernetes logs depend on the Job Pods and their log data still existing. Added that caveat in the relevant sections.
- The post said `BeforeHookCreation` guarantees exactly one hook instance per name at any time. During deletion there can briefly be zero, and successful hooks may be removed immediately when combined with `HookSucceeded`. Updated the wording to "at most one" and tied inspectability to the Job and Pods remaining available.
- The post did not mention that Argo CD assumes `BeforeHookCreation` when no deletion policy is specified. Added a short note after the explicit policy example so readers understand the current documented default while still seeing the explicit configuration.

## Review Notes
The Kubernetes Job manifests use the current `batch/v1` API and valid Job fields such as `backoffLimit`, `activeDeadlineSeconds`, `restartPolicy: Never`, and Pod `terminationGracePeriodSeconds`. The reviewed `kubectl get`, `describe`, `logs job/...`, JSONPath output, and JSON patch examples match documented command behavior. `kubectl` was not installed locally, so command validation used the official Kubernetes command references rather than local `--help` output.
