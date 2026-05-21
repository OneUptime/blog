# Validation Summary: How to Remove Workloads from an Ambient Mesh

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Istio ambient mode
- Istio ztunnel and waypoint proxies
- Istio PeerAuthentication and AuthorizationPolicy
- Kubernetes namespaces, pods, deployments, and labels
- Prometheus promtool and PromQL

## Sources Consulted
- Istio ambient mode: Add workloads to the mesh: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio ambient data plane architecture: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio waypoint proxy usage and cleanup: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient cleanup guide: https://istio.io/latest/docs/ambient/getting-started/cleanup/
- Istio resource label reference: https://istio.io/latest/docs/reference/config/labels/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Prometheus promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/

## Issues Found
- The Deployment manifest for the individual workload example was missing the required `spec.selector` field for an `apps/v1` Deployment. Added `spec.selector.matchLabels.app: legacy-service` to match the pod template labels.
- The PeerAuthentication guidance implied that changing a namespace policy to PERMISSIVE would cover all communication involving a removed workload. Clarified that PeerAuthentication is destination-side, so the PERMISSIVE policy must cover the destinations the removed workload needs to reach.
- The waypoint deletion examples used `istioctl waypoint delete -n my-app`, which deletes only the default waypoint name. Changed these examples to `istioctl waypoint delete --all -n my-app` when the text says to remove waypoint proxies in the namespace.
- The bulk removal example used `istioctl waypoint delete --all -A`, but the `waypoint delete` command does not support `-A` / `--all-namespaces`. Replaced it with a loop that finds Gateway resources using `spec.gatewayClassName=="istio-waypoint"` and deletes each waypoint by namespace and name.
- The mixed-state table said non-mesh to STRICT meshed traffic is "Connection refused." Updated this to "Denied" because Istio documents STRICT mode as requiring an mTLS tunnel and denying traffic that bypasses the mesh; the exact client error can vary.

## Review Notes
The post is technically relevant and accurate after the fixes above. The examples assume current Istio ambient behavior where `istio.io/dataplane-mode` supports `ambient` and `none`, and where waypoints are represented by Gateway resources using the `istio-waypoint` GatewayClass.
