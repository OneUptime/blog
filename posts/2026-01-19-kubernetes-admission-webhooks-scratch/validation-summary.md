# Validation Summary: How to Write Kubernetes Admission Webhooks from Scratch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes admission webhooks
- MutatingWebhookConfiguration and ValidatingWebhookConfiguration
- Go HTTP servers
- Kubernetes Go API types
- JSON Patch
- TLS certificates with OpenSSL
- kubectl
- cert-manager
- Docker

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Webhook Good Practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes API reference for admissionregistration.k8s.io/v1: https://kubernetes.io/docs/reference/kubernetes-api/extend-resources/
- Kubernetes Go API documentation: https://pkg.go.dev/k8s.io/api
- Go net/http package documentation: https://pkg.go.dev/net/http
- cert-manager CA Injector documentation: https://cert-manager.io/docs/concepts/ca-injector/
- RFC 6902 JSON Patch: https://www.rfc-editor.org/rfc/rfc6902

## Issues Found
- The mutating webhook snippet used `resource.MustParse` but did not import `k8s.io/apimachinery/pkg/api/resource`. Added the missing import so the code compiles.
- The unit test snippet also used `resource.MustParse` without importing the resource package. Added the missing import.
- The JSON Patch operation for adding `/spec/containers/{i}/resources/requests` could fail when the `resources` parent object was absent. Updated the mutation logic to add the full `resources` object first when both requests and limits are missing, matching JSON Patch parent-path requirements.
- The deployment manifest referenced the `webhook-system` namespace and `admission-webhook` service account without defining them in the shown manifests. Added minimal Namespace and ServiceAccount resources so the example can be applied as written.
- The cert-manager example did not connect the Certificate to the webhook configurations for CA bundle injection. Added `cert-manager.io/inject-ca-from: webhook-system/admission-webhook` annotations to both webhook configuration metadata blocks and clarified the `caBundle` comment.
- The injected sidecar and integration test pod did not satisfy the validating webhook policy shown later in the post. Updated the sidecar image, sidecar security context, and test pod fields so the mutation example is not rejected by the validation example.

## Review Notes
The examples are technically valid as a from-scratch tutorial, but production webhook servers should also validate request content type, handle nil or malformed AdmissionReview requests defensively, consider certificate rotation behavior, and keep mutation logic idempotent.
