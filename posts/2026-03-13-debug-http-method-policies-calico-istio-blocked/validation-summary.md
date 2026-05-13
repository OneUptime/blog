# Validation Summary: How to Debug HTTP Method Policies with Calico and Istio

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source network policy
- Calico Istio application layer policy
- Kubernetes
- Istio
- Envoy sidecars
- Dikastes
- HTTP methods and paths
- kubectl
- curl

## Sources Consulted
- Calico documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico documentation: Istio integration - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/istio-integration
- curl manual: HTTP failure behavior with `--fail` - https://curl.se/docs/manpage.html

## Issues Found
- The post referred to a `projectcalico.org/v3` `ApplicationPolicy`, but Calico documents HTTP match criteria on `NetworkPolicy` and `GlobalNetworkPolicy`, not an `ApplicationPolicy` kind. I changed the wording to reference Calico NetworkPolicy and GlobalNetworkPolicy HTTP match criteria.
- The post said Calico HTTP policies can reference headers. Current Calico Open Source documentation for Istio application layer policy documents HTTP methods and paths only. I removed the header references.
- The policy example used `action: Deny` together with an `http` match. Calico's NetworkPolicy reference says application layer policy match clauses are ingress-only and rules containing them must use `action: Allow`. I removed the invalid deny rule and described the blocked request as not explicitly allowed.
- The setup command looked for Dikastes pods in `calico-system`. Dikastes is injected as a sidecar into workload pods, while the Calico CSI driver runs in `calico-system`. I changed the checks to verify Istio pods, CSI driver pods, the Dikastes injector template, and injected workload container names.
- The `curl` examples checked `$?` after requests, but curl exits successfully for HTTP 403 unless `--fail` is used. I added `-f` with `-sS` so denied HTTP responses produce a non-zero exit code.
- The Mermaid diagram used `/api/admin`, while the policy and test used `/api/v1/admin`. I aligned the diagram path and changed the label from an explicit deny to a no-allow/default-deny result.
- The conclusion repeated "with Calico and Istio" and claimed header filtering. I corrected the duplicate wording and limited the statement to method and path filtering.

## Review Notes
The post is now technically consistent with current Calico documentation. Future improvements could mention the current Istio and Kubernetes version requirements for the latest native-sidecar based Calico integration, but I avoided expanding the article beyond the requested technical corrections.
