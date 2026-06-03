# Validation Summary: How to Configure Webhook Namespace Selectors to Limit Scope

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes admission webhooks
- ValidatingWebhookConfiguration and MutatingWebhookConfiguration
- Kubernetes namespaceSelector and objectSelector label selectors
- kubectl namespace and label commands
- Go admission webhook metrics instrumentation
- Prometheus client_golang and PromQL

## Sources Consulted
- Kubernetes API reference: ValidatingWebhookConfiguration admissionregistration.k8s.io/v1, https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes documentation: Dynamic Admission Control, https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes documentation: Namespaces and automatic kubernetes.io/metadata.name labeling, https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes kubectl reference: kubectl label, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#label
- Prometheus Go client package documentation: promauto.NewCounterVec, https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promauto

## Issues Found
- The objectSelector explanation said the webhook only runs for pods with the matching label. Kubernetes evaluates objectSelector against both oldObject and newObject, and an UPDATE matches if either object matches. Updated the sentence to describe CREATE and UPDATE behavior accurately.
- The Go metrics example imported admissionv1 but did not use it, and referenced an undeclared review variable. Added a minimal AdmissionReview declaration, a nil Request guard, and a placeholder Webhook type so the snippet is technically coherent while preserving the original intent.

## Review Notes
- kubectl was not installed in the local environment, so kubectl command syntax was verified against the official Kubernetes command reference instead of local --help output.
- The examples use admissionregistration.k8s.io/v1, admissionReviewVersions, and sideEffects correctly for current Kubernetes webhook configurations.
