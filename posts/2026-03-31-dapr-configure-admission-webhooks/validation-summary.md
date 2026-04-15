# Validation Summary: How to Configure Dapr Admission Webhooks on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar injection via MutatingAdmissionWebhook)
- Kubernetes (MutatingWebhookConfiguration, admission controllers)
- kubectl CLI
- OpenSSL (certificate inspection)
- TLS certificates for webhook communication

## Sources Consulted
- Dapr Helm chart template for sidecar injector webhook config: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sidecar_injector/templates/dapr_sidecar_injector_webhook_config.yaml
- Dapr sidecar injector Helm values (default failurePolicy): https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sidecar_injector/values.yaml
- Dapr injector Go source (app.go, handler.go, annotations.go): https://github.com/dapr/dapr/tree/master/cmd/injector and https://github.com/dapr/dapr/tree/master/pkg/injector
- Kubernetes admission webhook documentation (timeoutSeconds defaults): https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#timeouts
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found
1. **Incorrect `timeoutSeconds` value (line 47):** The post stated `timeoutSeconds: 25` in the default webhook configuration YAML. The Dapr Helm chart does not set `timeoutSeconds` at all, so the Kubernetes API default applies. For `admissionregistration.k8s.io/v1`, the Kubernetes default is **10 seconds** (changed from 30 seconds in the older v1beta1 API). Fixed the value from `25` to `10`.

## Review Notes
- The TLS certificate section references a `dapr-sidecar-injector-cert` secret. This is accurate for Dapr <= 1.10, but in Dapr >= 1.11, certificate management was moved to the Sentry service (mTLS control plane). The injector now obtains TLS certificates dynamically from Sentry at startup rather than from a Kubernetes Secret. The advice to restart the deployment to regenerate certificates remains valid in both old and new versions, but the `kubectl get secret dapr-sidecar-injector-cert` command may not work on newer Dapr installations. A future update could note version-specific differences.
- The namespace `dapr-system` is the conventional default but is actually determined by `{{ .Release.Namespace }}` in the Helm chart. If Dapr is installed into a different namespace, commands would need adjustment. This is a minor caveat, not an error.
- All kubectl commands, JSON patch syntax, and openssl commands are syntactically correct.
- The `failurePolicy: Ignore` default and the recommendation to keep it in production are accurate and align with Dapr's official guidance.
