# Validation Summary: How to Validate Cilium Gateway API Support

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Gateway API
- HTTPRoute
- GatewayClass
- EndpointSlice
- kubectl
- jq
- curl
- Cilium CLI

## Sources Consulted
- Cilium Gateway API Support: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gateway-api/
- Cilium Gateway API troubleshooting: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/troubleshooting/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Kubernetes Gateway API troubleshooting and status conditions: https://gateway-api.sigs.k8s.io/concepts/troubleshooting/
- Kubernetes Gateway API implementer's guide: https://gateway-api.sigs.k8s.io/guides/implementers/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- kubectl reference documentation: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The Gateway provisioning command read `.status.conditions[0].status`, which assumes condition ordering. Gateway API conditions are keyed by `type`, so the command now selects the `Programmed` condition explicitly.
- The HTTPRoute validation command only checked `.status.parents[0]`, which can miss routes bound to multiple parents. It now iterates through all parent statuses and reports each parent reference.
- The HTTPS `curl` example connected to `https://myapp.example.com/` without ensuring that name resolved to the Gateway IP. It now uses `--resolve myapp.example.com:443:${GATEWAY_IP}` so curl sends the correct SNI and Host header while targeting the Gateway address.
- The backend connectivity check used `kubectl get endpoints`, but Kubernetes deprecated the Endpoints API in favor of EndpointSlices as of Kubernetes 1.33. The command now checks EndpointSlices with the `kubernetes.io/service-name` label.

## Review Notes
The Cilium CLI command `cilium connectivity test --test gateway-api` is valid because `--test` accepts regular expressions for matching connectivity tests. Cilium's Gateway API support requires the Gateway API CRDs, kube-proxy replacement, and L7 proxy support; the post assumes an already deployed and enabled Cilium Gateway API environment.
