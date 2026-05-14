# Validation Summary: How to Avoid Common Mistakes with Calico Networking Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- Kubernetes CNI
- Felix
- Typha
- BGP route reflectors
- kubectl
- calicoctl
- Prometheus metrics

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico component metrics monitoring: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico resource requests and limits: https://docs.tigera.io/calico/latest/reference/configure-resources
- Calico BGP peering and route reflector configuration: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post said setting `spec.typhaMetricsPort: 9093` enables Typha. In the Calico Installation API this field only enables Typha metrics. I changed the text to say operator installations include Typha and that `typhaMetricsPort` enables metrics; manifest-based installations must install and configure Typha explicitly.
- The post said the Calico operator deploys Typha only above 100 nodes. Current Calico documentation says operator installations always install Typha, so I removed the stale threshold claim.
- The Felix resource guidance referred generally to increasing resource limits in the Installation resource. Current operator guidance uses the `calicoNodeDaemonSet` settings, so I clarified that path.
- The route reflector `BGPPeer` example used `peerIP` with `nodeSelector: route-reflector == 'true'`, which configures selected route reflector nodes to peer with a single remote IP rather than configuring non-reflector nodes to peer with route reflectors. I replaced it with the documented `nodeSelector` plus `peerSelector` pattern and added the route reflector cluster ID annotation command.
- The Felix sync prevention example used `kubectl wait ... --for=condition=Ready`, which checks pod readiness but does not prove a new policy has reached the datastore-to-dataplane sync state. I replaced it with a Prometheus metric check for `felix_resync_state`, where value `3` means in sync.

## Review Notes
The namespace and labels used in the diagnostic commands can vary between operator-managed and manifest-based Calico installations. The examples are plausible for common operator deployments, but readers may need to adjust `calico-system` or labels for older manifest installs.
