# Validation Summary: How to Configure HTTP Method Policies with Calico and Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico application layer policy
- Istio service mesh
- Kubernetes
- Envoy sidecars
- Dikastes sidecar
- HTTP methods and paths
- kubectl, calicoctl, and istioctl
- curl

## Sources Consulted
- Calico Open Source documentation: NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Enforce Calico network policy for Istio service mesh: https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico Open Source documentation: Use HTTP methods and paths in policy rules: https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico Open Source documentation: Enforce Calico network policy using Istio tutorial: https://docs.tigera.io/calico/latest/network-policy/istio/enforce-policy-istio

## Issues Found
- The introduction referred to a `projectcalico.org/v3` `ApplicationPolicy` resource. Calico's documented resources for this feature are `NetworkPolicy` and `GlobalNetworkPolicy` with HTTP match criteria, so the text was corrected.
- The post claimed Calico's Istio HTTP policy could match headers. The current Calico Open Source documentation for Istio HTTP method/path policy documents HTTP methods and paths, so the header claim was removed.
- The example policy used `action: Deny` with an `http:` match. Calico's NetworkPolicy reference states that application layer policy match clauses must use `action: Allow`, so the deny rule was removed and the example now relies on explicit allow-list behavior/default deny for unmatched HTTP requests.
- The prerequisites were too loose for current Calico-Istio integration. They now mention Istio 1.22+, Kubernetes 1.29+, `istioctl`, Dikastes injection templates, Envoy authorization, and workload annotation requirements.
- The verification commands looked for Dikastes in `calico-system`, but Dikastes is injected into application pods. The commands now check the Istio sidecar injector template, CSI driver, Felix policy sync setting, namespace injection label, and the workload container list.
- The test commands checked `curl`'s exit code. Since `curl` exits successfully for HTTP 403 unless `--fail` is used, the tests now print the HTTP status code and document the expected 200 and 403 responses.
- The architecture diagram used `/api/admin`, which did not match the policy/test path. It now uses `/api/v1/admin`.
- The conclusion repeated "with Calico and Istio" and referenced header filtering. It was corrected to align with the supported method/path filtering.

## Review Notes
The post is technically relevant and code-oriented. The corrected example remains a minimal illustration; a production deployment should ensure the backend workload is actually redeployed after namespace labeling and has the `inject.istio.io/templates: sidecar,dikastes` annotation on its pod template.
