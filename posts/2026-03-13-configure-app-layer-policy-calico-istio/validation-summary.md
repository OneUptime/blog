# Validation Summary: How to Configure Application-Layer Policy with Calico and Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico network policy
- Calico application layer policy
- Istio service mesh
- Kubernetes
- Envoy sidecars
- Dikastes sidecar

## Sources Consulted
- Calico documentation: Use HTTP methods and paths in policy rules - https://docs.tigera.io/calico/latest/network-policy/istio/http-methods
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Enforce Calico network policy for Istio service mesh - https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico documentation: Enforce Calico network policy using Istio tutorial - https://docs.tigera.io/calico/latest/network-policy/istio/enforce-policy-istio
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
- The introduction referred to a `projectcalico.org/v3` `ApplicationPolicy`, but Calico documents application layer matching on `NetworkPolicy` and `GlobalNetworkPolicy`. Changed this to `NetworkPolicy`.
- The post claimed Calico application-layer policy can match HTTP headers. The Calico `HTTPMatch` reference documents `methods` and `paths`, not header matching. Removed the header claim.
- The YAML example used an HTTP match clause on a `Deny` rule. Calico documents that rules containing application layer policy match clauses must use `Allow`. Removed the explicit HTTP `Deny` rule and left the denied request as an unmatched request.
- The setup verification commands looked for a standalone Dikastes pod in `calico-system`, but Calico documents Dikastes as a sidecar injected into application pods. Replaced this with a command that inspects the backend pod's container names.
- The Istio namespace label command omitted `--overwrite`, while Istio examples commonly include it to make the command repeatable. Added `--overwrite`.
- The conclusion repeated "with Calico and Istio" and repeated the unsupported header-filtering claim. Corrected both while preserving the original meaning.

## Review Notes
Calico's current documentation for the latest release calls out Istio 1.22+ and Kubernetes native sidecars for the current installation path, with older Istio versions covered as legacy. The post remains a compact configuration guide, but a future revision could add version-specific installation details if it expands beyond policy examples.
