# Validation Summary: How to Use internalTrafficPolicy to Keep Traffic Node-Local

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Services
- Kubernetes internalTrafficPolicy
- Kubernetes DaemonSets
- Kubernetes EndpointSlices
- Kubernetes Topology Aware Routing
- kubectl
- Redis
- Memcached
- Fortio

## Sources Consulted
- Kubernetes Service Internal Traffic Policy documentation: https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Fortio Docker image documentation: https://hub.docker.com/r/fortio/fortio

## Issues Found
- Corrected the externalTrafficPolicy explanation to include ExternalIP traffic, matching the Kubernetes Service API reference.
- Reworded DaemonSet guarantees to say DaemonSets run pods on eligible nodes, because node selectors, scheduling, readiness, and failures can prevent a ready local endpoint from existing.
- Fixed test commands to use the `production` namespace, matching the Service and DaemonSet manifests in the post.
- Replaced Redis `process_id` checks with Redis `run_id` checks, because containerized Redis processes often share the same PID and `run_id` is the reliable instance identifier.
- Replaced an output-string-dependent BusyBox `nc` check with an exit-status-based check.
- Corrected the Topology Aware Hints section. Kubernetes does not use topology-aware hints when `internalTrafficPolicy: Local` is set on the same Service, so the claimed same-node to same-zone fallback was wrong.
- Fixed the Fortio benchmark pod command so it passes `server` to the Fortio entrypoint instead of trying to pass `sleep` as Fortio arguments.
- Fixed resource monitoring commands for the Memcached example by using the `kube-system` namespace and Memcached `stats` instead of Redis commands.
- Fixed debugging commands to use the namespace where the example Service and pods are created.

## Review Notes
The post is technically valid after correction. The stated latency numbers are plausible illustrative examples, but actual improvement depends heavily on CNI, node topology, workload placement, and baseline network latency.
