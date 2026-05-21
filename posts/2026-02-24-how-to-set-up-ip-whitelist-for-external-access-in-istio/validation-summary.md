# Validation Summary: How to Set Up IP Whitelist for External Access in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio ingress gateway
- Istio gateway network topology
- Kubernetes LoadBalancer Services
- AWS Network Load Balancer
- GKE LoadBalancer Services
- X-Forwarded-For and PROXY protocol client IP handling
- kubectl and istioctl

## Sources Consulted
- Istio Ingress Access Control: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio Configuring Gateway Network Topology: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Kubernetes Create an External Load Balancer: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- AWS Load Balancer Controller Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/

## Issues Found
- The post mixed `externalTrafficPolicy: Local` with `remoteIpBlocks`. Istio documents that `externalTrafficPolicy: Local` preserves the packet source address, which should be matched with `ipBlocks`; `remoteIpBlocks` is for X-Forwarded-For or PROXY protocol. Updated the explanation and examples to distinguish these modes.
- The post used an EnvoyFilter with `xff_num_trusted_hops` as the main XFF configuration. Istio documents `gatewayTopology.numTrustedProxies` through MeshConfig or the `proxy.istio.io/config` annotation for gateway topology. Replaced the EnvoyFilter example with an IstioOperator MeshConfig example and updated the surrounding text.
- The AWS NLB annotation used `service.beta.kubernetes.io/aws-load-balancer-type: "nlb"`, while the current AWS Load Balancer Controller documentation uses `external` with `aws-load-balancer-nlb-target-type`. Updated the snippet to current annotations.
- The common issues and summary repeated the incorrect `remoteIpBlocks` / `externalTrafficPolicy: Local` pairing. Updated them to match Istio's documented client IP handling.

## Review Notes
The AuthorizationPolicy examples for `remoteIpBlocks`, `hosts`, `requestPrincipals`, DENY behavior, CIDR notation, and the listed kubectl and istioctl commands are technically valid. In a future revision, the post could include a separate complete `ipBlocks` AuthorizationPolicy example for the `externalTrafficPolicy: Local` path.
