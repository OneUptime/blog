# Validation Summary: How to Configure Node Affinity and Anti-Affinity in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduling
- Node affinity and node anti-affinity behavior
- Pod affinity and pod anti-affinity
- Topology spread constraints
- Kubernetes node labels
- kubectl commands
- Container images for TensorFlow, NGINX, Redis, Memcached, and PostgreSQL

## Sources Consulted
- Kubernetes: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes: Assign Pods to Nodes task - https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes/
- Kubernetes: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Docker Hub: postgres Official Image - https://hub.docker.com/_/postgres
- TensorFlow: Docker install documentation - https://www.tensorflow.org/install/docker

## Issues Found
- The "Spread Across Zones" pod anti-affinity example used required pod anti-affinity with `topologyKey: topology.kubernetes.io/zone`. Kubernetes documents that the `LimitPodHardAntiAffinityTopology` admission controller limits required pod anti-affinity to `kubernetes.io/hostname` by default, so this can be rejected on default clusters. Changed the example to use preferred pod anti-affinity for zone and node spreading.
- The StatefulSet HA example used required pod anti-affinity with `topologyKey: topology.kubernetes.io/zone`, which has the same default admission-controller caveat. Changed hard zone distribution to `topologySpreadConstraints` with `whenUnsatisfiable: DoNotSchedule`, and kept pod anti-affinity as a preferred node-level spread rule.
- The PostgreSQL examples used `postgresql:14`, which is not the standard Docker Official Image name. Changed the image references to `postgres:14`.

## Review Notes
- All YAML code blocks were parsed successfully after the fixes.
- `kubectl` is not installed in the local workspace, so command validation was performed against official Kubernetes documentation rather than local `kubectl --help` output.
- The `minDomains` topology spread example is correct for current Kubernetes. Kubernetes notes that before v1.30 the field depended on the `MinDomainsInPodTopologySpread` feature gate, enabled by default since v1.28.
