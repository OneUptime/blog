# Validation Summary: How to Set Up Ingress Access Control in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ingress gateway
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Kubernetes Services and LoadBalancers
- AWS Network Load Balancer PROXY protocol
- JWT authentication

## Sources Consulted
- Istio Ingress Access Control: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Configuring Gateway Network Topology: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes well-known annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- The AWS NLB PROXY protocol annotation was shown on a Deployment pod template. Kubernetes documents `service.beta.kubernetes.io/aws-load-balancer-proxy-protocol` as a Service annotation, so the example was changed to annotate the gateway `Service`.
- The PROXY protocol example only configured the cloud load balancer side. Istio also needs gateway topology configuration to accept PROXY protocol, so the example now includes `gatewayTopology.proxyProtocol`.
- The `remoteIpBlocks` explanation implied X-Forwarded-For handling works just by changing the policy field. Istio requires `gatewayTopology.numTrustedProxies` for XFF-based client IP extraction, so the text now calls that out.
- The service-level policy checked `request.auth.claims[role]` without showing request authentication on the service workload. Istio requires request authentication for JWT-derived authorization attributes, so a matching `RequestAuthentication` was added for `order-service`.
- The downstream service claim check also depends on the original JWT still being present. Istio's `forwardOriginalToken` defaults to false, so the ingress `RequestAuthentication` now sets `forwardOriginalToken: true`.
- The testing command only read `.status.loadBalancer.ingress[0].ip`, but Kubernetes LoadBalancer Services can publish either an IP or a hostname. The command now falls back to `.hostname`.

## Review Notes
The examples use `selector` with the common ingress gateway label `istio: ingressgateway`, which is valid for the Istio APIs path. Newer Gateway API deployments can also attach policies with `targetRefs`; that is a useful future note but not required for this post.
