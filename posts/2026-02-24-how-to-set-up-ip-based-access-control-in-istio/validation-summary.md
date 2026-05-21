# Validation Summary: How to Set Up IP-Based Access Control in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio ingress gateway
- Istio MeshConfig and IstioOperator
- Envoy proxy source IP handling
- X-Forwarded-For and PROXY protocol
- Kubernetes kubectl

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Gateway Network Topology documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio Ingress Access Control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The post implied that external load balancer traffic generally requires `remoteIpBlocks`. Updated the wording to distinguish HTTP/HTTPS load balancers and PROXY protocol, where `remoteIpBlocks` is appropriate, from network load balancers preserving packet source IP with `externalTrafficPolicy: Local`, where Istio documents `ipBlocks` as the correct field.
- The post described `remoteIpBlocks` as using only `X-Forwarded-For`. Updated it to also mention PROXY protocol, which Istio documents as another source for `remoteIpBlocks`.
- The verification section stated that access logs include the relevant fields without noting that Envoy access logs must be enabled. Updated the wording to make that prerequisite explicit.

## Review Notes
The AuthorizationPolicy examples use the current `security.istio.io/v1` API and valid source fields including `ipBlocks`, `remoteIpBlocks`, `notIpBlocks`, and `notRemoteIpBlocks`. Single IP addresses and CIDR ranges are supported by Istio for these fields. The `kubectl rollout restart deployment istio-ingressgateway -n istio-system` command is valid, assuming the deployment has the default Istio name.
