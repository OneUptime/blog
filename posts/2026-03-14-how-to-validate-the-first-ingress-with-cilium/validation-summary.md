# Validation Summary: Validating Cilium Ingress Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium Ingress Controller
- Kubernetes Ingress and IngressClass
- Kubernetes LoadBalancer Services
- Cilium Envoy proxy configuration
- kubectl
- curl
- Bash

## Sources Consulted
- Cilium Kubernetes Ingress Support: https://docs.cilium.io/en/stable/network/servicemesh/ingress/
- Cilium Service Mesh Troubleshooting: https://docs.cilium.io/en/stable/operations/troubleshooting_servicemesh/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The LoadBalancer check assumed the shared-mode Service name `cilium-ingress` in `kube-system`. Cilium dedicated mode creates per-Ingress services such as `cilium-ingress-<name>`, while shared mode uses `kube-system/cilium-ingress`. Updated the validation script to read the Ingress status first and only fall back to the shared-mode Service.
- The LoadBalancer check only handled `.status.loadBalancer.ingress[0].ip`. Kubernetes LoadBalancer status can also expose a hostname. Updated the examples to accept either an IP or hostname.
- The setup validation checked `enable-ingress-controller` but not `enable-envoy-config`. Cilium troubleshooting guidance recommends validating both runtime values for Ingress. Added an Envoy config check.
- The routing loop listed only Ingress names across all namespaces, which could select the wrong object when different namespaces contain Ingresses with the same name. Updated the loop to iterate namespace/name pairs.
- The routing loop used `jq` without listing it as a prerequisite. Removed the `jq` dependency by using kubectl JSONPath output.
- The TLS command omitted the namespace when fetching the Ingress. Added `-n <namespace>` so the command works for namespaced resources outside the current namespace.
- The verification command `cilium status | grep -i ingress` may not reliably show Ingress-specific output. Replaced it with `cilium status`, which is the documented Cilium status command.

## Review Notes
- The route-testing example validates the first rule and first path of each Ingress. That is acceptable for a quick smoke test, but a fuller validator should iterate every host/path pair in each Ingress.
- The TLS `curl --resolve` example applies when the LoadBalancer address is an IP. If the LoadBalancer address is a DNS hostname, use DNS for the Ingress host or curl's `--connect-to` option instead.
