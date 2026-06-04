# Validation Summary: How to Set Up Kubernetes Gateway API TCPRoute and UDPRoute for Layer-4 Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Gateway, TCPRoute, UDPRoute, ReferenceGrant
- Kubernetes Services, Deployments, StatefulSets, PodDisruptionBudget, NetworkPolicy
- Kong Ingress Controller
- CoreDNS
- PostgreSQL, Redis, MySQL
- kubectl, psql, dig, nslookup, iperf3, nc

## Sources Consulted
- Gateway API getting started guide: https://gateway-api.sigs.k8s.io/guides/getting-started/introduction/
- Gateway API TCP routing guide: https://gateway-api.sigs.k8s.io/guides/user-guides/tcp/
- Gateway API API reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Gateway API v1.5.0 release notes: https://github.com/kubernetes-sigs/gateway-api/releases/tag/v1.5.0
- Kubernetes Gateway API v1.5 release blog: https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/
- Kong Ingress Controller Gateway API documentation: https://developer.konghq.com/kubernetes-ingress-controller/gateway-api/
- Kong Ingress Controller TCP routing documentation: https://developer.konghq.com/kubernetes-ingress-controller/routing/tcp-by-port/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Pod disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/

## Issues Found
- The post did not mention that TCPRoute and UDPRoute are experimental Gateway API resources in the current v1.5 release channel. Added a caveat that the experimental CRDs and a supporting Gateway implementation are required.
- The Kong examples implied the Gateway listeners alone were enough for Kong. Added a Kong-specific note that the Gateway API experimental feature gate and matching stream listener/proxy Service ports must be enabled.
- The TCP traffic-splitting note described distribution as random. Changed it to weighted connection distribution, which matches the Gateway API backend weight semantics without over-specifying implementation behavior.
- The cross-namespace ReferenceGrant used `gateway.networking.k8s.io/v1beta1`. Updated it to the current stable `gateway.networking.k8s.io/v1` API version.
- The Kong Admin API port-forward command used a proxy Service name that is not the Admin API Service in current Kong examples. Changed it to reference the Admin API Service when enabled.
- The PodDisruptionBudget explanation claimed it prevents connection failures. Reworded it to say it helps keep pods available during voluntary disruptions and reduces failures.
- The iperf3 TCPRoute example created a route for port 5201 without adding a matching Gateway listener. Added a matching listener and attached the route with `sectionName`.
- The iperf3 UDP test attempted to use UDP through a TCPRoute. Added a UDP listener and UDPRoute, and kept TCP and UDP on the same Gateway address because iperf3 UDP tests still use a TCP control connection.
- The troubleshooting UDP command referenced `dns-service`, but the DNS Service defined earlier is `coredns-service`. Corrected the command.
- The network policy bullet said it restricted access to the gateway, while the example restricts access to the backend PostgreSQL pods. Reworded the bullet to cover gateways or backends.

## Review Notes
TCPRoute and UDPRoute remain experimental in Gateway API v1.5, so users should verify controller support and install the experimental CRD bundle. Kong-specific Service names and stream listener exposure can vary by installation method, so the Kong monitoring and listener setup remains implementation-dependent.
