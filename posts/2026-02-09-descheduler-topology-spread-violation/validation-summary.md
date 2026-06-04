# Validation Summary: How to Use Descheduler RemovePodsViolatingTopologySpreadConstraint

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes descheduler
- Pod topology spread constraints
- PodDisruptionBudgets
- kubectl
- YAML manifests

## Sources Consulted
- Kubernetes descheduler README and policy documentation: https://github.com/kubernetes-sigs/descheduler
- Kubernetes descheduler v0.28.0 README: https://raw.githubusercontent.com/kubernetes-sigs/descheduler/v0.28.0/README.md
- Kubernetes descheduler current RBAC and CronJob manifests: https://github.com/kubernetes-sigs/descheduler/tree/master/kubernetes
- Kubernetes Pod Topology Spread Constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget task documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The descheduler policy used `includeSoftConstraints`, which is not a valid `RemovePodsViolatingTopologySpreadConstraint` argument. Replaced it with the documented `constraints` list using `DoNotSchedule` and `ScheduleAnyway`.
- The hard-constraint example configured `constraints` as full topology spread constraint objects. The descheduler expects `whenUnsatisfiable` values, so the example now uses `constraints: [DoNotSchedule]`.
- The priority threshold was shown under `RemovePodsViolatingTopologySpreadConstraint`, but priority filtering is configured on the `DefaultEvictor`. Moved the example `priorityThreshold` under `DefaultEvictor`.
- The full descheduler manifest used an old image tag and incomplete current RBAC. Updated the image to `registry.k8s.io/descheduler/descheduler:v0.36.0` and aligned the permissions with current descheduler needs for events, namespaces, pods, evictions, PVCs, PDBs, and priority classes.
- The testing scenario changed a Deployment pod template with a `nodeSelector`, which would trigger rollout behavior rather than leaving already-running pods for descheduler to rebalance. Replaced it with a node-label topology change that can make existing pods imbalanced.
- Several `kubectl` commands omitted the `production` namespace even though the example Deployment is namespaced. Added `-n production` where needed and added a command to create the namespace idempotently.
- The validation commands inferred zones from node names or counted node names instead of topology domains. Updated them to read `topology.kubernetes.io/zone` from node labels.
- The StatefulSet section claimed the descheduler respects StatefulSet ordering. Reworded it to say StatefulSet-managed pods can be evicted if normal eviction checks pass and should be protected with PDBs and testing.
- The event-checking script searched for an overly specific scheduler message. Broadened the match to `topology spread` for Kubernetes scheduler events.

## Review Notes
The article is technically relevant and contains working implementation guidance after the corrections. The descheduler remains version-sensitive, so future updates should re-check the image tag and policy schema against the release branch used in production.
