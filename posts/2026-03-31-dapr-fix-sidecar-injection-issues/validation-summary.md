# Validation Summary: How to Fix Dapr Sidecar Injection Issues on Kubernetes

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar injection, mTLS)
- Kubernetes (MutatingAdmissionWebhook, pods, namespaces, secrets)
- kubectl CLI
- OpenSSL (certificate inspection)

## Sources Consulted
- Dapr sidecar injector Helm chart values: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sidecar_injector/values.yaml
- Dapr sidecar injector webhook config template: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sidecar_injector/templates/dapr_sidecar_injector_webhook_config.yaml
- Dapr injector handler source (handler.go): https://github.com/dapr/dapr/blob/master/pkg/injector/service/handler.go — confirms `strings.EqualFold` for `dapr.io/enabled` check
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr GitHub issue #2783 (certificate renewal): https://github.com/dapr/dapr/issues/2783
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found

1. **Namespace label section was misleading about default behavior**: The post stated "By default, Dapr injects sidecars only into namespaces labeled with `dapr-enabled=true`..." which implies namespace labels are required by default. In reality, Dapr's default Helm chart sets `namespaceSelector: {}`, meaning no namespace label is required — the pod annotation `dapr.io/enabled: "true"` alone is sufficient. Fixed to clarify that namespace selectors are optional and only apply when explicitly configured via Helm values.

2. **`dapr.io/enabled` case sensitivity claim was incorrect**: The post stated the value must be `"true"` and `"True"` would not work. However, the Dapr injector source code uses `strings.EqualFold(value, "true")`, making the check case-insensitive. `"True"` and `"TRUE"` both work. `"1"` does not work. Fixed the annotation comment accordingly.

3. **`dapr.io/app-id` "must be lowercase" claim was unsupported**: The official Dapr docs do not mandate lowercase for app IDs. Changed to recommend valid DNS names, which is the practical constraint for service discovery.

4. **`dapr.io/app-port` "must be a string" claim was overstated**: Kubernetes annotation values are always strings at the API level. Writing `app-port: 8080` without quotes works because Kubernetes handles the conversion. Changed to recommend quoting as YAML best practice rather than a strict requirement.

5. **TLS certificate regeneration claim was incorrect**: The post stated that restarting the sidecar injector deployment "regenerates" TLS certificates. In fact, a restart only re-reads the existing certificate from the mounted secret. Certificate renewal requires `dapr mtls renew-certificate` (or a Helm upgrade). Added the renewal command before the restart.

6. **"API server audit logs" comment was incorrect**: `kubectl logs` shows container stdout/stderr, not Kubernetes audit logs. Audit logs are a separate system configured via API server flags. Changed the comment to say "container logs."

## Review Notes
- The `base64 -d` flag in the TLS check command works on GNU/Linux but not on older macOS (which uses `base64 -D`). This is a minor portability concern but not incorrect for the target audience (Kubernetes operators typically on Linux).
- The API server logs command (`kubectl logs -n kube-system -l component=kube-apiserver`) only works on self-managed clusters (e.g., kubeadm). On managed Kubernetes services (GKE, EKS, AKS), API server logs are accessed through the cloud provider's logging service. A note about this could be helpful in a future update.
- The TLS certificate check command using `grep` and `awk` on YAML output is functional but fragile. A more robust alternative would use `kubectl get secret ... -o jsonpath='{.data.tls\.crt}'`. This is a style preference and not incorrect.
