# Validation Summary: How to Set Up Service-Level Firewall Rules with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Istio Telemetry API and Envoy access logs
- Istio CLI (`istioctl`)
- Kiali
- Kubernetes ServiceAccount and Deployment resources
- `kubectl`

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Kiali visualization task: https://istio.io/latest/docs/tasks/observability/kiali/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `istioctl analyze` diagnostic documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/

## Issues Found
- The `apps/v1` Deployment example omitted `spec.selector` and matching pod template labels. In Kubernetes `apps/v1`, the selector is required and must match the pod template labels, so the snippet would not be valid as written. Added `spec.selector.matchLabels` and `template.metadata.labels` for `app: order-service`.
- The Kiali section stated that missing graph edges indicate blocked communication paths. Istio's Kiali documentation describes the graph as telemetry for traffic observed over a time period, so a missing edge can also mean no traffic was generated or selected in the time range. Updated the wording to say Kiali shows observed connections and that test requests/access logs should confirm blocked paths.
- The access log command searched for a JSON field (`response_code":403`) even though the post's Telemetry example only enables the default Envoy access log provider and does not configure JSON encoding. Updated the text and command to match the default text access log format by grepping for `403` and RBAC response details.

## Review Notes
The Istio security API examples use current `security.istio.io/v1` resources and valid AuthorizationPolicy fields (`principals`, `methods`, `paths`, and `ports`). The hard-coded ingress gateway service account principal is plausible for a common Istio ingress gateway install, but users should verify the actual service account name in their cluster.
