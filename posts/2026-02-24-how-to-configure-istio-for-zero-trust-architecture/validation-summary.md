# Validation Summary: How to Configure Istio for Zero-Trust Architecture

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Service mesh
- Mutual TLS
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio RequestAuthentication
- Istio Telemetry API
- IstioOperator
- Kubernetes NetworkPolicy

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio ingress authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio NetworkPolicy setup: https://istio.io/latest/docs/setup/additional-setup/network-policy/
- Istio security FAQ for certificate lifetime: https://istio.io/latest/about/faq/security/
- Istio 1.5 upgrade notes for Citadel functionality moving into istiod: https://istio.io/latest/news/releases/1.5.x/announcing-1.5/upgrade-notes/

## Issues Found
- The control-plane lockdown example used an Istio `AuthorizationPolicy` against `istiod`. Istio authorization policies are enforced by the data plane and are not the right control for hardening control-plane network exposure. Replaced the example with Istio's built-in Kubernetes `NetworkPolicy` install option and the documented `ENABLE_DEBUG_ON_HTTP=false` hardening setting, and clarified the relevant control-plane ports.
- The certificate rotation section referred to Istio's old Citadel component. Updated it to refer to Istiod's certificate authority, which is current for modern Istio releases.
- The validation command `istioctl authn tls-check` is not present in the current Istio command reference. Replaced it with a current `istioctl proxy-config cluster ...` inspection command that checks for TLS transport socket configuration.

## Review Notes
- The post uses sidecar-mode assumptions. Istio ambient mode changes some operational details, but the sidecar-focused guidance remains valid when read in that context.
- The ingress gateway selector `istio: ingressgateway` is valid for common Istio gateway deployments, though some official examples also use `app: istio-ingressgateway`; readers should match the labels on their own gateway pods.
- The `istio-injection=enabled` namespace label remains valid, but revision-based injection labels are preferred for canary upgrades and multi-revision control planes.
