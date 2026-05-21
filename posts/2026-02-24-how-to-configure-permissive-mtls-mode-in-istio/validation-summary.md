# Validation Summary: How to Configure Permissive mTLS Mode in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- PeerAuthentication
- Mutual TLS
- Prometheus metrics
- istioctl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio istioctl describe guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/

## Issues Found
- The post said the application always receives plain text from the sidecar. Istio's TLS configuration documentation says inbound traffic from sidecar to application is forwarded as-is, and application-level TLS can be passed through. Updated the explanation to distinguish Istio mTLS from application TLS.
- The port-level mTLS example was syntactically valid, but it did not mention that `portLevelMtls` keys refer to workload/container ports rather than Kubernetes Service ports. Added that clarification from the official PeerAuthentication documentation.
- The verification section said `kubectl get peerauthentication -n production` checks what mode a namespace is running. That command lists configured PeerAuthentication resources, but inherited mesh-level policy and effective workload policy require additional inspection such as `istioctl x describe pod`. Updated the wording.

## Review Notes
The examples use the current `security.istio.io/v1` PeerAuthentication API and valid `PERMISSIVE` / `STRICT` mode values. Auto mTLS, permissive-mode migration behavior, and the `connection_security_policy="mutual_tls"` metric label align with current Istio documentation. The Prometheus query for plaintext traffic uses `connection_security_policy="none"`, which is commonly emitted for plaintext destination-side request metrics, but the current standard metrics reference explicitly documents `mutual_tls` and `unknown` rather than exhaustively documenting every plaintext value.
