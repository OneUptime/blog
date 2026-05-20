# Validation Summary: How to Handle Immutable Field Change Errors in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes Jobs
- Kubernetes Services
- PersistentVolumeClaims
- StatefulSets
- Deployments
- ConfigMaps and Secrets
- CustomResourceDefinitions

## Sources Consulted
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app delete-resource` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete-resource/
- Argo CD `argocd-cm` example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service ClusterIP allocation documentation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StatefulSets documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes API validation source for Jobs, Services, PVCs, Deployments, and StatefulSets: https://github.com/kubernetes/kubernetes/tree/master/pkg/apis

## Issues Found
- Corrected the Argo CD `Replace=true` explanation. `Replace=true` uses `kubectl replace/create`; it is not equivalent to delete and recreate and does not reliably resolve immutable field changes. The post now recommends `Force=true,Replace=true` when delete/create behavior is required.
- Corrected Job field mutability. `spec.completions` is mutable for Indexed Jobs when changed with `parallelism`, and `spec.backoffLimit` is not treated as immutable by current Kubernetes Job update validation.
- Corrected Service IP family wording to reflect Kubernetes dual-stack upgrade and downgrade rules instead of saying all `ipFamilies` and `ipFamilyPolicy` changes are always forbidden.
- Corrected Argo CD CLI resource syntax from `batch/Job/data-migration` to `batch:Job:data-migration`.
- Added the `apps` group to the `argocd app delete-resource` Deployment example.
- Corrected StatefulSet and Deployment examples to use `Force=true,Replace=true` where the goal is recreation after immutable selector or volume claim template changes.
- Removed the unsupported `resource.customizations.syncOptions.batch_Job` example and replaced it with a per-resource sync option annotation.
- Softened the `clusterIP` guidance to account for valid static ClusterIP assignment at Service creation time.

## Review Notes
The post is now technically accurate for current Argo CD and Kubernetes behavior. Future revisions could mention version-specific Kubernetes Job exceptions for suspended Jobs, where selected scheduling directives and, in Kubernetes v1.36 beta, pod resource fields may be mutable under specific conditions.
