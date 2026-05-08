# Validation Summary: Validating Ingress in Cilium Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium Ingress
- Cilium Gateway API
- Kubernetes
- Kubernetes Ingress
- Envoy
- Hubble
- Helm

## Sources Consulted
- Cilium Kubernetes Ingress Support: https://docs.cilium.io/en/stable/network/servicemesh/ingress/
- Cilium Gateway API Support: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium CLI `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Monitoring and Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The introduction said Cilium Ingress supports header manipulation. Standard Kubernetes Ingress does not include header manipulation as a portable Ingress feature, so the sentence was narrowed to TLS termination, path-based routing, and Cilium policy integration.
- The custom workload claimed to validate ingress but only created a Deployment and Service. Added a `networking.k8s.io/v1` Ingress using `ingressClassName: cilium` and added commands to inspect the Ingress and send an external HTTP request to its assigned address.
- Commands executed inside the Cilium agent pod used `cilium endpoint list` and `cilium metrics list`. Current Cilium agent diagnostics use `cilium-dbg endpoint list` and `cilium-dbg metrics list`, so those commands were corrected.
- The endpoint count check implied Cilium agent endpoints should match all running pods. A single agent endpoint list is node-local, and cluster-wide `CiliumEndpoint` resources are only a sanity check against running pods. The wording and command were changed accordingly.
- The troubleshooting note for drop metrics referenced the wrong in-agent command. It now uses `cilium-dbg metrics list` from a Cilium agent pod.

## Review Notes
The post is now technically valid as a general validation guide. Future improvements could add a Gateway API-specific example with `Gateway` and `HTTPRoute` resources, since the introduction mentions Gateway API but the concrete custom workload uses Kubernetes Ingress.
