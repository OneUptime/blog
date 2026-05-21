# Validation Summary: How to Set Up Zero-Trust Security Model with Istio Authorization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Mutual TLS
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio RequestAuthentication
- Prometheus
- Kiali

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Prometheus metrics documentation: https://istio.io/latest/docs/tasks/observability/metrics/querying-metrics/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The default-deny AuthorizationPolicy section incorrectly stated that `spec: {}` with no selector and no rules is an "allow all" policy. Istio documents this as an allow-nothing policy; `rules: - {}` is the allow-all form. I corrected the explanation and kept an explicit `rules: []` equivalent.
- The health check section implied that allowing kubelet IP ranges is enough when probe rewriting is disabled. With strict mTLS, kubelet probes do not present Istio certificates, so authorization rules alone do not solve the problem. I corrected the guidance to recommend command probes, probe rewriting, or a tightly scoped mTLS and authorization exception.
- The Istio control plane AuthorizationPolicy example was misleading because AuthorizationPolicy is enforced by mesh data-plane proxies for selected workloads, and a generic `principals: ["*"]` rule for `istiod` is not a reliable or necessary fix for sidecar control-plane communication. I removed that example and generalized the system-traffic guidance.

## Review Notes
The post uses current `security.istio.io/v1` APIs and the `istioctl dashboard kiali` and `istioctl experimental describe pod` commands are still documented. The examples assume sidecar-mode Istio and the default root namespace `istio-system`; deployments using ambient mode, a custom root namespace, waypoints, or multi-revision control planes may need adjusted policy attachment and rollout details.
