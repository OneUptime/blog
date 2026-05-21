# Validation Summary: How to Configure Istio with Calico CNI

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio
- Istio CNI
- Calico CNI
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy
- Kubernetes networking and iptables

## Sources Consulted
- Istio CNI installation documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio NetworkPolicy documentation: https://istio.io/latest/docs/setup/additional-setup/network-policy/
- Istio application requirements and control-plane ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security and mutual TLS documentation: https://istio.io/latest/docs/concepts/security/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico WireGuard encryption documentation: https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic

## Issues Found
- Clarified that Calico handles IP address management when Calico IPAM is used, since Calico CNI can be paired with different IPAM configuration.
- Clarified that Calico uses iptables for policy enforcement in the standard Linux dataplane, because Calico can also use the eBPF dataplane.
- Reworded the iptables interaction claim to avoid implying Calico only uses the filter table and Istio only uses the nat table in all configurations.
- Corrected the sidecar-to-istiod NetworkPolicy peer selector. The original YAML used separate `namespaceSelector` and `podSelector` list items, which are ORed by Kubernetes; the fixed YAML combines them in one peer so it selects `app=istiod` pods in the `istio-system` namespace.
- Reworded the Calico enforcement explanation because Kubernetes NetworkPolicy applies at pod scope, including sidecar containers, rather than being strictly ordered before the Istio sidecar in all cases.
- Replaced direct `kubectl exec ... iptables` troubleshooting commands with `kubectl debug ... --profile=netadmin -- iptables-save`, which is more reliable for inspecting rules in the pod network namespace.
- Reworded the WireGuard and Istio mTLS guidance. The original text said to use one or the other; the corrected text notes they protect different layers and may overlap depending on threat model and performance testing.

## Review Notes
- Istio can now generate NetworkPolicy resources for its own components with `values.global.networkPolicy.enabled=true`; the post's manual policies remain valid examples for clusters that manage policies themselves.
- Istio's CNI `values.cni.chained` option remains valid and is documented by Istio.
- The Istio control-plane ports listed in the post match the current Istio application requirements documentation.
