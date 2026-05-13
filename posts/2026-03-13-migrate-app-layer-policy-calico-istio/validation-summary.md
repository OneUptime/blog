# Validation Summary: How to Migrate to Application-Layer Policy with Calico and Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Istio service mesh
- Kubernetes
- Calico Dikastes sidecar
- Envoy external authorization
- YAML configuration
- `kubectl`

## Sources Consulted
- Calico Open Source documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico Open Source documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico Open Source reference: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Istio integration - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/istio-integration

## Issues Found
- The post referred to a `projectcalico.org/v3` `ApplicationPolicy` resource. Current Calico documentation describes HTTP application-layer matches on Calico `NetworkPolicy` and `GlobalNetworkPolicy` resources, so the introduction was corrected.
- The post claimed Calico application-layer policy can match HTTP headers. Current Calico documentation for Istio application-layer policy documents HTTP method and path matching, so the header references were removed.
- The setup verification commands looked for Calico pods in `istio-system` and Dikastes pods in `calico-system`. Dikastes is injected as a workload sidecar, and the documented checks verify Policy Sync, injector templates, and workload pod containers. The commands were corrected accordingly.
- The prerequisites only mentioned Istio sidecar injection. Workloads also need Dikastes injection for application-layer policy enforcement, so the prerequisite was corrected.
- The architecture diagram used `/api/admin` while the policy and test command used `/api/v1/admin`. The diagram path was corrected.
- The conclusion repeated "with Calico and Istio" and included the unsupported header filtering claim. The conclusion was corrected while preserving the original message.

## Review Notes
- The `http` match syntax with `methods`, `paths`, `exact`, and `prefix` matches the current Calico `NetworkPolicy` reference and HTTP method/path examples.
- Current Calico documentation notes additional version caveats for new installations, including supported Istio and Kubernetes native sidecar requirements. The post now avoids a hard-coded Calico version claim and refers to a supported Istio version instead.
