# Validation Summary: Securing DNS, Port, and L7 Combined Rules in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- DNS-based network policy
- Layer 7 HTTP policy
- Hubble
- Helm

## Sources Consulted
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/latest/security/dns/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium policy enforcement modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Helm reference for `policyEnforcementMode`: https://docs.cilium.io/en/stable/helm-reference/
- Cilium CLI command reference for `cilium status`, `cilium config view`, and `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium daemon command reference for `cilium-dbg endpoint list`, `cilium-dbg identity list`, `cilium-dbg policy get`, and `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/
- Cilium troubleshooting documentation for Hubble Relay and policy debugging: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The policy enforcement check used `grep policy-enforcement`, but current Cilium configuration exposes the enforcement mode through the `enable-policy` configuration key. Changed both examples to `cilium config view | grep enable-policy`.
- The kube-dns `toEndpoints` selectors used unprefixed Cilium label keys. Official Cilium policy examples use the `k8s:` source prefix for Kubernetes labels, so the selectors were changed to `"k8s:io.kubernetes.pod.namespace"` and `"k8s:k8s-app"`.
- The text referred to policy enforcement "strict mode", but Cilium documents the supported policy enforcement modes as `default`, `always`, and `never`. Changed this wording to "always mode".
- The guide used daemon-local or deprecated-style commands such as `cilium policy get`, `cilium identity list`, `cilium endpoint list`, and `cilium monitor`. Replaced them with current Kubernetes CRD or Hubble commands: `kubectl get cnp,ccnp -A`, `kubectl get ciliumidentities`, `kubectl get ciliumendpoints -n production`, and `hubble observe --verdict DROPPED --namespace production --output json`.
- The troubleshooting command for endpoint labels used the old daemon CLI shape. Updated it to query the CiliumEndpoint CRD with `kubectl get ciliumendpoints -n production -o json | jq '.items[] | .status.identity.labels'`.

## Review Notes
The CiliumNetworkPolicy examples are structurally consistent with official Cilium DNS and HTTP L7 policy examples. DNS wildcard behavior is version-sensitive: `*.backend.local` matches one subdomain level and does not match `backend.local` itself, which may be worth calling out in a future content improvement.
