# Validation Summary: How to Handle ArgoCD Failover Scenarios

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Redis Sentinel / Redis HA
- Kubernetes CronJobs
- Kubernetes PodDisruptionBudgets
- Kubernetes Lease objects

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Disaster Recovery documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD `argocd admin import` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_import/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD official install and HA manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml and https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
- Kubernetes Lease documentation: https://kubernetes.io/docs/concepts/architecture/leases/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes disruption documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found
- The preparation guidance said to set replicas greater than 1 for all components. Argo CD documents special handling for Redis HA and notes that components such as Redis and Dex are not scaled the same way as stateless components, so the text now calls out stateless components and Redis HA manifests separately.
- The non-HA Redis runbook included deletion of a PVC named `redis-data-argocd-redis-0`. The official non-HA manifest runs Redis as a Deployment without that PVC, so the PVC deletion step was removed.
- The Redis recovery log command referenced `deployment/argocd-application-controller`, but the official manifests deploy the application controller as a StatefulSet. The command now uses `statefulset/argocd-application-controller`.
- The Redis HA verification commands used Sentinel master group `mymaster` and unauthenticated `redis-cli` calls. The official Argo CD HA manifest configures the Sentinel master group as `argocd` and Redis auth via the `AUTH` environment variable, so the commands now use `argocd` and authenticated `redis-cli` invocations.
- The node failure runbook used `xargs` without guarding against empty input. The command now uses `xargs -r` so it does not run `kubectl delete` when no pods match.
- The zone outage PDB patch only set `minAvailable`. Kubernetes PDBs can specify only one of `minAvailable` or `maxUnavailable`, so the patch now removes `maxUnavailable` while setting `minAvailable`.
- The complete cluster loss impact said there would be "no monitoring". That overstates the Argo CD failure impact because external monitoring systems may continue running. It now says there is no Argo CD UI/API, automated syncs, or self-healing.
- The Redis outage explanation said every request would hit Git and Kubernetes APIs directly. Argo CD documentation describes Redis as a disposable cache and the controller maintains its own Kubernetes cache, so the wording was softened to say more requests may fall back to Git and Kubernetes APIs.

## Review Notes
The automation CronJob assumes the named `argocd-failover-tester` service account and its RBAC already exist. In a future post revision, adding the minimal ServiceAccount, Role, and RoleBinding would make that example fully self-contained.
