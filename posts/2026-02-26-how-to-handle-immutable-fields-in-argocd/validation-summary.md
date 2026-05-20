# Validation Summary: How to Handle Immutable Fields in ArgoCD

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes Jobs, StatefulSets, Deployments, Services, PersistentVolumeClaims, and CronJobs
- kubectl
- GitOps sync behavior

## Sources Consulted
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/resource_hooks/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Kubernetes StatefulSet deletion: https://kubernetes.io/docs/tasks/run-application/delete-stateful-set/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Persistent Volumes and PVC expansion: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClasses and volume expansion: https://kubernetes.io/docs/concepts/storage/storage-classes/
- kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The post said `Replace=true` deletes and recreates resources. Argo CD documents `Replace=true` as using `kubectl replace` or `kubectl create`, while delete/create behavior requires force with replace. Updated the explanation and warning.
- The force sync section used `argocd app sync --force` alone and described it as delete/create. Updated the section to use `Force=true,Replace=true` and the equivalent targeted CLI form `--force --replace`.
- The Job hook example mentioned a negative sync wave but did not include the sync-wave annotation, and it included `spec.selector: {}` even though the Job controller should generate selectors unless manual selectors are intentionally configured. Added `argocd.argoproj.io/sync-wave: "-1"` and removed the empty selector.
- The Job-specific CLI example used `--replace` alone for an immutable field case. Updated it to `--force --replace`.
- The StatefulSet section implied volume claim template size changes are the same as PVC expansion. Clarified that the immutable field is the template, while actual PVC expansion is handled separately.
- The StatefulSet automated example said to annotate the StatefulSet but showed an Application-level `Replace=true` snippet. Replaced it with a StatefulSet metadata annotation using `Force=true,Replace=true` and noted that it is a delete-and-create operation.
- The Service section implied ordinary Service type changes are generally immutable. Updated it to clarify that `ClusterIP`, `NodePort`, and `LoadBalancer` transitions are usually supported, while allocated fields such as `clusterIP` and `clusterIPs` are the immutable concern.
- The Service `ignoreDifferences` example omitted `RespectIgnoreDifferences=true`, which is needed for Argo CD to honor ignore differences during sync. Added the sync option.
- The PVC backup example wrote the backup archive inside the pod before deleting the PVC. Updated it to stream the archive to and from the local machine so the backup survives PVC deletion.

## Review Notes
The guide is broadly accurate after these corrections. Delete-and-create approaches remain operationally risky for stateful workloads, and the exact outage/data-retention behavior depends on owner references, deletion propagation, storage reclaim policy, and workload controllers.
