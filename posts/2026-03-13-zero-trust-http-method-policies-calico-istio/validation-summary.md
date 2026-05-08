# Validation Summary: Zero Trust HTTP Method Access Control with Calico and Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source network policy
- Calico application layer policy
- Istio service mesh
- Kubernetes
- Envoy sidecars
- Dikastes sidecars
- HTTP method and path policy matching

## Sources Consulted
- Calico documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: kubectl label reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The post referred to a `projectcalico.org/v3` `ApplicationPolicy` resource. Calico documents HTTP match criteria on `NetworkPolicy` and `GlobalNetworkPolicy`, not an `ApplicationPolicy` kind, so this was corrected.
- The policy example used a `Deny` rule with an `http` match clause. Calico's NetworkPolicy reference states that application layer policy match clauses are supported only on ingress rules and that rules containing application layer match clauses must use `Allow`. The example was changed to an allow-list policy and the text now explains that non-matching methods and paths are rejected by default-deny behavior.
- The post claimed Calico policies could reference HTTP headers in this Istio method-policy context. The Calico Open Source documentation reviewed for this post documents HTTP method and path matching, so the references to headers were removed.
- The prerequisites were outdated and underspecified. They now reflect the current documented requirements for Calico application layer policy with Istio: Kubernetes v1.29+, Istio v1.22+ with native sidecar support, and Dikastes template injection.
- The setup verification commands looked for Dikastes as a pod in `calico-system`. Current Calico documentation verifies Dikastes as a container injected into application workload pods, with CSI driver pods in `calico-system`. The commands were corrected accordingly.
- The architecture diagram used `/api/admin`, which did not match the example path `/api/v1/admin`. The diagram was updated to use the same path and to describe the denied request as default-deny.
- The conclusion contained a duplicated phrase and referenced headers. It was corrected to refer only to HTTP methods and paths.

## Review Notes
The policy is a minimal allow-list example. In a production guide, it would be useful to also show applying the policy with `calicoctl` or Kubernetes API tooling and to include the workload annotation `inject.istio.io/templates: sidecar,dikastes` in a deployment manifest, but those additions were outside the requested scope of technical corrections.
