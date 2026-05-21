# Validation Summary: How to Set Up Workload-to-Workload Authorization in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio mutual TLS and workload identity
- Kubernetes service accounts
- Kubernetes kubectl
- Prometheus metrics

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio authorization concepts and mTLS dependency: https://istio.io/latest/docs/concepts/security/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio explicit DENY task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes service accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The prerequisites said mTLS could be PERMISSIVE or STRICT without qualification. Istio documentation says fields such as `source.principals` depend on mutual TLS and strongly recommends STRICT mode to avoid unexpected rejection or policy bypass with plaintext traffic in PERMISSIVE mode. Updated the prerequisite to recommend STRICT and describe PERMISSIVE as mainly for migration.
- The granular policy used `paths: ["/orders/*/status"]` for a middle path segment wildcard. Current Istio path templates use `{*}` for a single segment wildcard. Updated it to `paths: ["/orders/{*}/status"]`.
- The conclusion said unauthorized access is blocked at the network level. Istio authorization is enforced by the server-side Envoy proxy, so updated the wording to "Envoy proxy layer."

## Review Notes
The examples use `security.istio.io/v1`, which is current in Istio 1.30 documentation. The article is written for sidecar mode; in ambient mode, policy attachment and enforcement can differ, especially around waypoints and `targetRefs`.
