# Validation Summary: How to Migrate to HTTP Method Policies with Calico and Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico application layer policy
- Istio service mesh
- Envoy sidecar proxies
- Dikastes sidecar
- Kubernetes
- kubectl and calicoctl
- HTTP method and path matching

## Sources Consulted
- Calico documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Istio documentation: NetworkPolicy - https://istio.io/latest/docs/setup/additional-setup/network-policy/

## Issues Found
- The post referred to a `projectcalico.org/v3` `ApplicationPolicy` resource. Calico documents HTTP method/path matching on `NetworkPolicy` and `GlobalNetworkPolicy` resources with application layer policy enabled, so the wording was corrected.
- The introduction and conclusion claimed Calico HTTP policy could match headers. Calico Open Source HTTP match criteria for this integration document methods and paths, so the references to headers were removed.
- The example used an HTTP `Deny` rule. Calico application-layer match criteria are restricted to ingress rules with action `Allow`; non-matching traffic is denied by Dikastes. The invalid `Deny` rule was removed and the default-deny behavior was explained.
- The prerequisites used an unsupported broad version claim (`Calico v3.26+`) and did not mention current Istio/Kubernetes native sidecar requirements clearly. The prerequisites were adjusted to Kubernetes v1.29+, Calico CNI, application layer policy, and Istio v1.22+.
- The setup verification commands looked for Dikastes in `calico-system`, but Dikastes is injected into application pods while Calico's CSI node driver runs in `calico-system`. The commands were corrected to verify Felix policy sync, the CSI node driver, and the application pod containers.
- The test commands checked `$?` after plain `curl`, but HTTP 403 does not make `curl` fail by default. The commands now use `curl -fsS` so denied HTTP responses produce a non-zero exit code.
- The architecture diagram implied the source-side Envoy performed the inbound policy check and that Dikastes pushed rules directly into Envoy. The diagram was corrected to show the backend Envoy sidecar performing an external authorization check through Dikastes.

## Review Notes
- The corrected policy remains a minimal example. In a production migration guide, readers may also need explicit egress allowances for Envoy to reach Istio control plane services when egress policy is restricted.
