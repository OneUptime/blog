# Validation Summary: How to Monitor HTTP Method Policy Impact with Calico and Istio

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
- HTTP methods and paths

## Sources Consulted
- Calico Open Source documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico Open Source documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico Open Source documentation: Istio integration - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/istio-integration

## Issues Found
- The post described a `projectcalico.org/v3` `ApplicationPolicy` resource, but the documented resources are `NetworkPolicy` and `GlobalNetworkPolicy` with `http` match criteria. Updated the explanation to refer to the correct resource types.
- The sample policy used `action: Deny` with an `http` match. Calico's application layer policy restrictions require rules containing HTTP match criteria to use `action: Allow`, and HTTP match criteria are ingress-only. Removed the invalid HTTP deny rule and left denied traffic to be rejected because it does not match the allow rule.
- The post claimed HTTP headers could be referenced in these Calico HTTP method/path policies. The documented HTTP match fields are `methods` and `paths`, so the references to headers were removed.
- The setup command checked for `dikastes` pods in `calico-system`, but Dikastes is injected as a sidecar into application pods. Replaced that check with documented checks for the CSI node driver and Felix policy sync configuration.
- The setup section enabled namespace sidecar injection but did not show how the protected workload receives the Dikastes injection template. Added the documented pod template annotation through a deployment patch command.
- The prerequisites omitted `istioctl` and used a broad Calico version claim. Updated the prerequisites to focus on Calico application layer policy support and Istio v1.22+.
- The curl test commands reported `$?`, but curl exits successfully for HTTP error responses unless `--fail` is used. Added `--fail` so a 403 response produces a non-zero exit status.
- The architecture diagram used `/api/admin`, while the policy and test command used `/api/v1/admin`. Updated the diagram to match the policy path.
- The conclusion repeated "with Calico and Istio" and made an unsupported superlative claim. Reworded it to a narrower, technically supportable statement.

## Review Notes
The post is technically valid after the corrections. Future revisions could add a concrete command to verify that application pods were restarted and show both Envoy and Dikastes containers as ready.
