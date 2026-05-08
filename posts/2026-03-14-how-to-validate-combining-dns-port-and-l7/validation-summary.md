# Validation Summary: Validating DNS, Port, and L7 Combined Rules in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- DNS-based policy with `toFQDNs`
- Cilium L7 HTTP policy
- Hubble CLI
- Cilium CLI
- `kubectl`
- Bash

## Sources Consulted
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Command Cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- The sample CiliumNetworkPolicy was placed in the `production` namespace and selected `app: api-gateway`, while the walkthrough creates test pods in `cilium-validate` with `app: client` and `app: server`. Changed the policy namespace and selector so the validation commands target the selected endpoint.
- The DNS `toEndpoints` selector used unprefixed Kubernetes labels for CoreDNS. Updated the selector to the documented Cilium label form, including `k8s:io.kubernetes.pod.namespace` and `k8s:k8s-app`.
- The endpoint inspection command used `cilium endpoint list`, which is an agent/debug CLI pattern rather than the Kubernetes Cilium CLI used by the rest of the post. Replaced it with `kubectl get ciliumendpoints -o json`, which Cilium documents for Kubernetes endpoint inspection.
- The allowed and unauthorized traffic tests targeted the local nginx `server` pod, which did not exercise the FQDN or HTTP L7 policy. Updated those commands to request matching and non-matching paths on a hostname covered by the `*.backend.local` policy.
- The automated script used `cilium endpoint list` and `cilium policy get`, which are not the documented Kubernetes Cilium CLI commands for this context. Replaced endpoint readiness with `kubectl wait` for the validation pods and policy counting with `kubectl get ciliumnetworkpolicies`.
- The final endpoint health command used `cilium endpoint health`, which is not the documented health command. Replaced it with `cilium-health status`.

## Review Notes
The examples assume `api.backend.local` resolves to a reachable test backend on TCP port 8080. In a future revision, the post could include explicit backend DNS setup so the validation environment is fully self-contained.
