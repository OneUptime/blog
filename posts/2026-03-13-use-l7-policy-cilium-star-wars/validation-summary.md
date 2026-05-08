# Validation Summary: Use L7 Policy in the Cilium Star Wars Demo

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- Layer 7 HTTP network policy
- Hubble
- kubectl
- Cilium CLI

## Sources Consulted
- Cilium Star Wars Demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium System Requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Official Cilium Star Wars demo manifests: https://raw.githubusercontent.com/cilium/cilium/1.19.3/examples/minikube/http-sw-app.yaml
- Official Cilium Star Wars L3/L4/L7 policy manifest: https://raw.githubusercontent.com/cilium/cilium/1.19.3/examples/minikube/sw_l3_l4_l7_policy.yaml

## Issues Found
- The prerequisite listed `kernel 4.19.57+`, which is not the current general Cilium system requirement. Updated it to `kernel 5.10+ or an equivalent distribution-supported kernel` to align with current Cilium documentation.
- The denied TIE fighter L7 request was described as returning `403 Access denied or connection hang`. Cilium documents L7 HTTP policy violations as returning an application-layer HTTP 403 response when possible, while the connection timeout applies to the L3/L4-denied X-wing request. Updated the expected result to `Access denied (HTTP 403)`.
- The extended policy used `/v1/status` as though it were part of the Star Wars demo. The official demo documentation and manifests demonstrate `/v1/request-landing` and `/v1/exhaust-port`; `/v1/status` is not documented as a guaranteed demo endpoint. Clarified that `/v1/status` is an example endpoint and should be replaced with one the application actually exposes.

## Review Notes
The main CiliumNetworkPolicy examples, `kubectl exec` traffic tests, Hubble port-forward workflow, and Hubble observations are consistent with official Cilium documentation. Cilium HTTP `path` and `method` values are regex matches, so exact-looking paths behave as exact matches when they contain no regex metacharacters.
