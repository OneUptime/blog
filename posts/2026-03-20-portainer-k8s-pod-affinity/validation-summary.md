# Validation Summary: How to Set Up Pod Affinity and Anti-Affinity via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes Deployments
- Kubernetes StatefulSets
- Pod affinity and anti-affinity
- Topology spread constraints

## Sources Consulted
- Kubernetes: Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes: Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes: Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes: StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Portainer: Create an application from a Manifest: https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer: Edit an application: https://docs.portainer.io/user/kubernetes/applications/edit

## Issues Found
- The introduction described affinity and anti-affinity only in terms of pods already running "on those nodes". I updated that wording to "in the relevant topology domain" because Kubernetes supports topology domains such as hostname and zone, not just a single node.
- The `affinity-colocation.yml` Deployment example omitted the required `.spec.selector` and matching pod-template labels. I added both so the Deployment is valid for `apps/v1`.
- The `topology-spread.yml` Deployment example omitted the required `.spec.selector`, matching pod-template labels, and a container definition. I added them so the manifest is valid and the spread constraint's `labelSelector` matches the workload's pod labels.
- The database `StatefulSet` example omitted required fields for a workable `apps/v1` StatefulSet: `serviceName`, `.spec.selector`, matching pod-template labels, and a container definition. I added a minimal headless `Service`, set `replicas: 3`, and completed the StatefulSet spec so the anti-affinity example reflects a valid workload definition.

## Review Notes
- Pod anti-affinity and topology spread constraints depend on nodes being labeled consistently for the chosen `topologyKey` values, such as `kubernetes.io/hostname` and `topology.kubernetes.io/zone`.
- Hard constraints such as `requiredDuringSchedulingIgnoredDuringExecution` and `whenUnsatisfiable: DoNotSchedule` can leave pods in `Pending` if the cluster does not have enough eligible nodes or topology domains.
