# Validation Summary: How to Monitor Application-Layer Policy Impact with Calico and Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico NetworkPolicy
- Calico application-layer policy
- Istio service mesh
- Envoy sidecars
- Dikastes
- Kubernetes
- kubectl
- curl

## Sources Consulted
- Calico documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico documentation: Network policy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico documentation: Enforce Calico network policy using Istio tutorial - https://docs.tigera.io/calico/latest/network-policy/istio/enforce-policy-istio

## Issues Found
- The introduction referred to a `projectcalico.org/v3` `ApplicationPolicy` resource. Calico documents HTTP match criteria on `NetworkPolicy` and `GlobalNetworkPolicy`, so the wording was changed to `NetworkPolicy` with HTTP match criteria.
- The post claimed Calico-Istio application-layer policy could match HTTP headers. The Calico Open Source NetworkPolicy reference documents HTTP method and path matching for this integration, so the header references were removed.
- The sample policy used an `action: Deny` rule with an `http:` match. Calico documents that application-layer HTTP match clauses are supported only on ingress rules and must use `action: Allow`, so the invalid deny rule was removed and a note was added explaining unmatched requests are denied unless another policy allows them.
- The prerequisites listed `calicoctl` even though the post uses only `kubectl`, and they did not explicitly mention Dikastes injection on workloads. The prerequisites were updated to match the commands and integration requirements.
- The setup verification commands looked for Dikastes in `calico-system`, but Dikastes is injected into application pods and depends on the Istio sidecar injection templates and Calico CSI node driver. The commands were updated to verify the injection templates, CSI driver pods, and workload containers.
- The curl tests checked shell exit codes, which would not reliably distinguish an HTTP 403 from success because curl exits successfully for HTTP error responses unless configured otherwise. The commands now print HTTP status codes.
- The architecture diagram used `/api/admin` while the policy and test used `/api/v1/admin`; the diagram was corrected.
- The conclusion repeated "with Calico and Istio" and mentioned header filtering. The wording was corrected to match the documented method/path support.

## Review Notes
The current Calico documentation for latest Open Source releases lists Istio 1.22+ with Kubernetes native sidecars and Kubernetes 1.29+ as requirements for the current integration path. The post now avoids pinning an unsupported broad Calico version claim and refers to supported Calico-Istio integration versions.
