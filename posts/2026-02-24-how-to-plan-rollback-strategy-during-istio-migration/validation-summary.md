# Validation Summary: How to Plan Rollback Strategy During Istio Migration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection
- Istio mTLS and PeerAuthentication
- Istio traffic management resources
- Kubernetes kubectl commands
- Prometheus Operator PrometheusRule alerts
- Prometheus queries for Istio metrics

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio istioctl installation and uninstall documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The single-service rollback example used `sidecar.istio.io/inject` as a pod-template annotation. Istio now documents that annotation as deprecated in favor of the `sidecar.istio.io/inject` pod label, so the patch was changed to write under `spec.template.metadata.labels`.
- The full Istio rollback example only removed `istio-injection=enabled` labels and would miss namespaces enrolled through revision-based injection with `istio.io/rev`. The namespace loop now removes both `istio-injection` and `istio.io/rev` labels.

## Review Notes
The examples assume sidecar mode, not ambient mode. The Kubernetes Service backup and restore commands are directionally correct, but generated service YAML may include cluster-specific metadata, so future revisions could note that teams should review or sanitize saved manifests before applying them in production.
