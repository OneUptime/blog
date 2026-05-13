# Validation Summary: How to Debug Application-Layer Policy with Calico and Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico application layer policy
- Calico Dikastes sidecar
- Istio sidecar injection
- Kubernetes
- curl-based HTTP testing

## Sources Consulted
- Calico documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: GlobalNetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico documentation: Istio integration - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/istio-integration
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
- The post referred to a `projectcalico.org/v3` `ApplicationPolicy` resource. Calico documents HTTP application layer matching on `NetworkPolicy` and `GlobalNetworkPolicy`, not an `ApplicationPolicy` kind. Updated the wording to refer to the correct resources.
- The post said Calico policy can reference HTTP headers in this Istio integration. Current Calico Open Source documentation for Istio application layer policy documents HTTP methods and paths, so the header references were removed.
- The sample policy used `http` match criteria on an `action: Deny` rule. Calico's resource reference states that application layer policy match clauses are ingress-only and rules containing them must use `action: Allow`. Removed the invalid deny rule and left the policy as an allow-list, so non-matching DELETE/PUT admin requests are denied because no HTTP allow rule matches.
- The setup verification commands looked for Calico and Dikastes pods in control-plane namespaces. Current Calico documentation verifies Dikastes integration through the Istio sidecar injector template and by checking injected workload containers. Updated the commands accordingly and added a workload restart because Istio sidecar injection occurs when pods are created.
- The test commands used curl exit status to infer allow or deny behavior. curl returns success for HTTP error status codes unless configured otherwise, so the tests now print the HTTP status code.
- The architecture diagram used `/api/admin`, while the policy and test used `/api/v1/admin`. Updated the diagram for consistency.
- The conclusion contained duplicated wording and an overbroad "most fine-grained" claim. Tightened it to a technically supportable statement.

## Review Notes
- Calico's latest documentation lists specific Istio and Kubernetes version requirements for the current Dikastes integration. Future updates to this post should keep the prerequisite versions aligned with the Calico documentation for the Calico release being targeted.
