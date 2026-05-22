# Validation Summary: How to Configure Cross-Cluster Service Routing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Istio multi-cluster service discovery
- Istio traffic management APIs: VirtualService, DestinationRule, Gateway, Sidecar
- Kubernetes Services, Deployments, namespaces, and DNS
- kubectl and istioctl

## Sources Consulted
- Istio multi-cluster installation documentation: https://istio.io/latest/docs/setup/install/multicluster/
- Istio multi-primary multi-network documentation: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio multi-cluster traffic management documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/multicluster/
- Istio DNS behavior documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio DNS proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio traffic management API reference: https://istio.io/latest/docs/reference/config/networking/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The post said Istio's DNS auto-allocation handled normal Kubernetes Service resolution across clusters. That is misleading for sidecar mode: Kubernetes DNS provides records for Kubernetes Services, and Istio DNS proxying with address auto-allocation is a separate feature that is not enabled by default in sidecar mode. I changed the example to create a matching Service in the client cluster and clarified DNS proxying as an alternative.
- The post implied the sidecar proxy performs the application DNS lookup and returns endpoints. Istio documentation separates application DNS resolution from proxy routing behavior, so I changed the explanation to say the client cluster needs DNS resolution and Istio routes using its service registry.
- The post said Istio does not have a built-in cluster label for DestinationRule subsets. Istio documents `topology.istio.io/cluster` as a built-in label for per-cluster subsets, so I replaced the custom `cluster` label example with `topology.istio.io/cluster`.
- The Istio networking examples used `networking.istio.io/v1beta1`. The current Istio documentation uses the stable `networking.istio.io/v1` API for these resources, so I updated the examples to `v1`.

## Review Notes
The `kubectl exec ... deploy/sleep` examples assume a test client deployment named `sleep` already exists in the target namespace. The commands are valid with that prerequisite, but a future edit could include a short setup command for the test client to make the tutorial fully self-contained.
