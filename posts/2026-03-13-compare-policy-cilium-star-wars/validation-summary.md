# Validation Summary: Comparing CiliumNetworkPolicy to Other Policy Formats

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Kubernetes NetworkPolicy
- Calico NetworkPolicy and GlobalNetworkPolicy
- Cilium L7 policy for HTTP, gRPC, Kafka, and DNS
- Hubble observability
- Kubernetes kubectl commands

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy.html
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium gRPC security documentation: https://docs.cilium.io/en/stable/security/grpc.html
- Cilium Hubble documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium L7 visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico application layer policy with Istio documentation: https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico HTTP methods and paths policy documentation: https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico DNS/domain policy documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy

## Issues Found
- The introduction described `CiliumNetworkPolicy` as more portable than Calico's API. `CiliumNetworkPolicy` is Cilium-specific, so the wording was changed to say it uses Kubernetes-style label selectors and that standard `NetworkPolicy` remains the portable baseline.
- The Calico L7 description said HTTP L7 is "via Envoy sidecar" without mentioning Calico application layer policy sidecar enforcement. Updated the wording to reflect Calico's documented application layer policy and sidecar-based enforcement model.
- The feature matrix said Calico has no DNS-based policy. Calico Enterprise/Cloud supports domain-based egress policy, so the matrix now calls this out.
- The flowchart referred to "cross-cluster policy" when the recommended Calico resource was `GlobalNetworkPolicy`. Calico `GlobalNetworkPolicy` is cluster-scoped, not cross-cluster, so the decision point now says "Cluster-wide defaults?"
- The conclusion said `CiliumNetworkPolicy` subsumes standard `NetworkPolicy`. Cilium supports standard `NetworkPolicy` alongside `CiliumNetworkPolicy`, so the conclusion was corrected to avoid implying that Kubernetes NetworkPolicy resources are replaced by CNP.
- The Star Wars L7 curl example said the `curl -s` output returns `403 Forbidden`. The Cilium Star Wars demo shows `Access denied` as the response body, while Cilium L7 policy docs indicate an HTTP 403 is returned where possible. Updated the comment to `Access denied (HTTP 403)`.

## Review Notes
The post contains two back-to-back descriptions/introduction sections that appear to combine two related articles. This is editorial rather than technical, so it was left unchanged per the instruction to avoid restructuring.

`kubectl` was not installed in the local workspace, so CLI syntax was checked against official Kubernetes and Cilium documentation examples rather than local `kubectl --help` output.
