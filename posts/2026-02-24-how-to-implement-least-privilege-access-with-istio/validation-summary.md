# Validation Summary: How to Implement Least Privilege Access with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio workload identity and service accounts
- Istio health probe rewriting
- Kubernetes ServiceAccount and Deployment manifests
- Prometheus and Istio telemetry metrics

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio authorization dry-run task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Istio health checking of services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio security concepts and identity model: https://istio.io/latest/docs/concepts/security/
- Kubernetes ServiceAccount configuration: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Istio examples used `security.istio.io/v1beta1`. Updated them to the current stable `security.istio.io/v1` API used by Istio's current documentation.
- The mesh-wide deny-all explanation assumed `istio-system` always applies globally. Clarified that this is mesh-wide when `istio-system` is the Istio root namespace.
- The Kubernetes Deployment example omitted the required `spec.selector` and matching pod template labels. Added the minimal selector and labels.
- The health-check section incorrectly stated that Kubernetes probes generally go through the sidecar and require an AuthorizationPolicy rule. Reworded it to match Istio's default probe rewrite behavior through the sidecar agent on port 15020, with an allow policy only needed when probe rewriting is disabled or health endpoints are exposed through normal mesh traffic.
- The rollout section used a non-existent `audit-mode` annotation. Replaced it with Istio's documented `"istio.io/dry-run": "true"` annotation and renamed the step from audit mode to dry-run mode.
- The 403 monitoring language was too absolute. Changed it to say unexpected 403s often indicate a missing ALLOW rule.
- The maintenance alert used a non-standard `kube_customresource_authorizationpolicy_info` metric and attempted to infer unused AuthorizationPolicy rules from metrics that do not expose rule-level source and destination matches. Replaced it with a PromQL expression that alerts on unexpected authorization denials.

## Review Notes
The Prometheus queries assume standard Istio telemetry labels are enabled and available in the Prometheus instance. The post does not pin an Istio version; the reviewed content now aligns with the current Istio documentation available on 2026-05-21.
