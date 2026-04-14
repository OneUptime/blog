# Validation Summary: How to Fix Dapr Sidecar Not Injecting on Kubernetes

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar injection, MutatingWebhookConfiguration, mTLS certificates)
- Kubernetes (annotations, namespaces, resource quotas, webhooks, kubectl)
- OpenSSL (certificate inspection)

## Sources Consulted
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr sidecar injector control plane service: https://docs.dapr.io/concepts/dapr-services/sidecar-injector/
- Dapr Kubernetes deployment guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr mTLS setup and configuration: https://docs.dapr.io/operations/security/mtls/
- Dapr common issues troubleshooting: https://docs.dapr.io/operations/troubleshooting/common_issues/
- Dapr sidecar injector Helm chart templates: https://github.com/dapr/dapr/tree/master/charts/dapr/charts/dapr_sidecar_injector/templates
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Local `kubectl run --help` output to verify `--annotations` flag support

## Issues Found
**Boolean vs. string annotation claim (Step 1):** The post originally stated that `dapr.io/enabled: true` (unquoted boolean) "won't trigger injection." This is inaccurate. Kubernetes annotations are typed as `map[string]string`, and kubectl's YAML parser (Go's `sigs.k8s.io/yaml`) automatically coerces a YAML boolean `true` to the string `"true"` when the target field is a string type. Both `true` and `"true"` result in the same stored annotation value. The recommendation to always quote annotation values is correct best practice (it avoids potential issues with Helm templates and other YAML processors that may not coerce consistently), but the absolute claim was misleading. Fixed the comments to accurately describe the behavior while preserving the recommendation.

## Review Notes
- The `kubectl run --annotations` flag was verified to exist via local `kubectl run --help`. It was added in kubectl v1.24+; users on very old kubectl versions would need to use `--overrides` or create a YAML manifest instead.
- The TLS certificate secret name `dapr-sidecar-injector-cert` is correct for default Dapr Helm installations, but the exact name can vary depending on the Helm chart version and custom configuration. Users should verify the actual secret name in their cluster with `kubectl get secrets -n dapr-system`.
- The suggestion to restart the sidecar injector deployment to "trigger certificate renewal" is slightly simplified. Restarting the injector causes it to pick up updated certificates, but certificate generation/rotation is managed by the Dapr Sentry service. For actual certificate renewal, users may also need to use `dapr mtls renew-certificate` or restart the Sentry service.
- The namespace labeling suggestion (`dapr.io/enabled=true`) is appropriately conditional ("if namespace-based injection is required") and describes a standard Kubernetes pattern for webhook namespace selectors. Dapr's default installation watches all namespaces, so this step only applies to custom configurations.
- The ResourceQuota YAML example is syntactically correct and uses valid field names for the Kubernetes v1 API.
