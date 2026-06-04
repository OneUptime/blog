# Validation Summary: How to Configure Crossplane Webhook Configuration for Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane composite resources
- Kubernetes admission webhooks
- Kubernetes ValidatingWebhookConfiguration
- cert-manager Certificate and CA injection
- Go Kubernetes admission API types
- Prometheus metrics for Kubernetes admission webhooks

## Sources Consulted
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes AdmissionReview API reference: https://kubernetes.io/docs/reference/config-api/apiserver-admission.v1/
- Go package documentation for k8s.io/api/admission/v1: https://pkg.go.dev/k8s.io/api/admission/v1
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/
- cert-manager CA injector documentation: https://cert-manager.io/docs/concepts/ca-injector/
- Crossplane Composite Resource Definitions documentation: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane Composite Resources documentation: https://docs.crossplane.io/latest/composition/composite-resources/

## Issues Found
- The cert-manager install command used v1.13.0, which is end-of-life as of June 5, 2024. Updated it to v1.20.2, the current cert-manager static manifest version referenced by the official install docs on June 4, 2026.
- The post said Crossplane supports validating and mutating webhook types. Clarified that these are Kubernetes admission webhook types that can be used with Crossplane composite resource APIs.
- The Go webhook example imported `context` without using it, so the sample would not compile. Removed the unused import.
- The Go webhook response helpers accepted `uid string`, but `AdmissionResponse.UID` is `types.UID`. Updated the helper signatures and imported `k8s.io/apimachinery/pkg/types`.
- The Go webhook handler dereferenced `admissionReview.Request` without checking for nil. Added a guard that returns HTTP 400 for malformed AdmissionReview payloads.
- The Go webhook responses did not explicitly set `Content-Type: application/json`. Added the header to match Kubernetes admission webhook response guidance.
- The advanced region validation snippet referenced `instance.Spec.Parameters.Region`, but the `Parameters` type did not define `Region`. Added the field to the type.
- The Prometheus rejection alert used a non-standard `webhook_rejections_total` metric. Replaced it with Kubernetes' `apiserver_admission_webhook_rejection_count`.
- The Prometheus examples grouped by labels `webhook` and `result`, which do not match the Kubernetes API server admission webhook metric labels. Updated the examples to use `name`, `type`, and `operation`, and added `le` for histogram quantile aggregation.
- The summary said issues were caught at claim creation time, but the example validates composite resources directly. Changed this to resource creation time.

## Review Notes
The webhook configuration, cert-manager CA injection annotation, service reference, admissionReviewVersions, sideEffects, failurePolicy, and Kubernetes admission flow are consistent with the official documentation. In a production implementation, the webhook server should also include readiness checks, structured logging, timeout handling, and packaging details such as a Dockerfile and Go module dependencies.
