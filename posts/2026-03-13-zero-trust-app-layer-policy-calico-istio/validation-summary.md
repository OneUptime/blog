# Validation Summary: Zero Trust Application-Layer Security with Calico and Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico network policy
- Kubernetes
- Istio service mesh
- Envoy sidecars
- Dikastes
- HTTP application-layer policy

## Sources Consulted
- Calico documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Istio integration - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/istio-integration

## Issues Found
- The introduction referred to `ApplicationPolicy`, but the official Calico API uses `NetworkPolicy` and `GlobalNetworkPolicy` resources for these HTTP match rules. Updated the text to name the correct resources.
- The post claimed Calico policy could reference HTTP headers in this Calico/Istio example. The official Calico Open Source documentation for this policy path documents HTTP methods and paths. Removed the header references.
- The YAML used a `Deny` rule containing an `http` match. Calico documents that rules with application-layer HTTP match clauses must use `Allow`, and denied requests should be handled by default deny when no allow rule matches. Removed the invalid `Deny` HTTP rule and adjusted the explanation.
- The curl tests used `$?`, which checks the command exit code rather than the HTTP status. Since curl normally exits successfully for HTTP 403 unless `--fail` is used, changed the commands to print HTTP status codes directly.
- The architecture diagram showed `/api/admin` while the policy test used `/api/v1/admin`. Updated the diagram path for consistency.
- The conclusion repeated "with Calico and Istio" and referenced headers. Corrected the duplicated phrase and limited the claim to HTTP methods and paths.

## Review Notes
The latest Calico documentation notes additional version caveats for modern Istio integration, including Istio 1.22+ with Kubernetes native sidecar support and Kubernetes 1.29+ for that path. The post keeps the setup section intentionally brief, so those details may be worth expanding in a future revision.
