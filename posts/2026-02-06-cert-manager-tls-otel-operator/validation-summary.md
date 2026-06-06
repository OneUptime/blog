# Validation Summary: How to Configure cert-manager Issued TLS Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Operator
- OpenTelemetry Operator Helm chart
- cert-manager
- Kubernetes admission webhooks
- Kubernetes TLS Secrets and Certificates
- Helm
- Prometheus cert-manager metrics

## Sources Consulted
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator Helm chart `values.yaml`: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-operator/values.yaml
- OpenTelemetry Operator Helm chart cert-manager template: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-operator/templates/certmanager.yaml
- OpenTelemetry Operator Helm chart webhook template: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-operator/templates/admission-webhooks/operator-webhook-with-cert-manager.yaml
- OpenTelemetry Operator upstream manifest: https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Certificate API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager CA injector documentation: https://cert-manager.io/docs/concepts/ca-injector/
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/

## Issues Found
- The cert-manager Helm install command used the legacy `installCRDs=true` value. I updated it to the current documented OCI chart install path with `--set crds.enabled=true`.
- The opening explanation implied the Operator always manages its own self-signed certificates by default. I changed it to reflect the current Helm chart behavior: cert-manager is the default chart path, while Helm-generated self-signed certificates are used when cert-manager is disabled and `autoGenerateCert` is enabled.
- The post mixed Helm-managed certificate creation with a manually created Certificate. I clarified that the explicit `Certificate` manifest applies to upstream-manifest installations, while Helm users should let the chart create the Certificate from `admissionWebhooks.certManager.issuerRef`.
- The Helm values disabled `autoGenerateCert` under `certManager.enabled=true`, which is unnecessary because cert-manager takes precedence in the chart. I replaced that with the chart-supported `secretName`, `duration`, and `renewBefore` values.
- The manual webhook example used an outdated OpenTelemetryCollector v1alpha1 mutating webhook path/name and omitted required `admissionregistration.k8s.io/v1` webhook fields. I updated it to the current v1beta1 path/name and added `admissionReviewVersions`, `failurePolicy`, `rules`, and `sideEffects`.
- The validating webhook manual example only showed metadata and annotations. I added a minimal valid v1beta1 OpenTelemetryCollector validating webhook entry so the snippet is structurally valid.

## Review Notes
Helm and kubectl were not installed in the workspace, so I could not render the chart locally or run client-side schema validation. The reviewed snippets were checked against official documentation and upstream OpenTelemetry/cert-manager source manifests.
