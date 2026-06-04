# Validation Summary: How to Use Descheduler RemoveDuplicates Strategy to Rebalance Pods

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes Descheduler
- Descheduler RemoveDuplicates strategy
- Descheduler DefaultEvictor
- Kubernetes RBAC
- Kubernetes Deployments and CronJobs
- Pod Topology Spread Constraints

## Sources Consulted
- Kubernetes Descheduler README and release-specific documentation: https://github.com/kubernetes-sigs/descheduler and https://github.com/kubernetes-sigs/descheduler/blob/release-1.28/README.md
- Kubernetes Descheduler v0.28.1 RBAC, CronJob, and Deployment manifests: https://github.com/kubernetes-sigs/descheduler/tree/release-1.28/kubernetes
- Kubernetes Descheduler RemoveDuplicates source for v0.28: https://github.com/kubernetes-sigs/descheduler/blob/release-1.28/pkg/framework/plugins/removeduplicates/removeduplicates.go
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod Topology Spread Constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post described RemoveDuplicates as matching only by controller. Updated the explanation to match the v0.28 implementation: duplicate pods share the same owner namespace/kind/name and at least one container image.
- The post listed Deployment directly as a RemoveDuplicates owner kind. Updated this to ReplicaSet, ReplicationController, StatefulSet, and Job, with a note that Deployment pods are included through their ReplicaSet owner.
- The basic policy placed `excludeNodeTaints` under `RemoveDuplicates`, but that is not a valid RemoveDuplicates argument. Removed it and used `DefaultEvictor.nodeFit` for rescheduling feasibility checks.
- The advanced policy placed `labelSelector`, `priorityThreshold`, and `nodeFit` under `RemoveDuplicates`, but these are `DefaultEvictor` settings in descheduler v0.28. Moved them to `DefaultEvictor` and left namespace filtering under `RemoveDuplicates`.
- The RBAC example was missing permissions used by the official v0.28 manifests, including namespaces, priority classes, events in `events.k8s.io`, and leases. Updated the RBAC snippet and aligned the service account name with the workload manifests.
- The CronJob log command selected `app=descheduler`, but the CronJob pod template had no matching label. Added the label to the pod template.
- The test workflow claimed that removing `nodeSelector` from a Deployment would leave existing pods on the same node. Kubernetes starts a rollout when `.spec.template` changes, so the post now explains that this specific change creates a new ReplicaSet and that a real descheduler test should start from an existing duplicate-pod condition.
- The examples pinned `registry.k8s.io/descheduler/descheduler:v0.28.0`; updated them to the v0.28 patch release used by the official release-1.28 examples, `v0.28.1`.
- The conclusion said RemoveDuplicates ensures resilience and distribution. Reworded it to "helps" because descheduler eviction relies on scheduler placement and cluster constraints.

## Review Notes
The post is validated against descheduler v0.28.1, which maps to Kubernetes v1.28 in the descheduler compatibility matrix. Newer clusters should use the descheduler release branch matching their Kubernetes minor version and re-check policy fields against that branch.
