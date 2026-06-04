# Validation Summary: How to Implement Custom Resource Defaulting with Mutating Webhooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes admission webhooks
- CustomResourceDefinitions
- MutatingWebhookConfiguration
- Go
- Kubebuilder
- controller-runtime
- kubectl
- JSON Patch

## Sources Consulted
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes Admission Webhook Good Practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Kubernetes CustomResourceDefinition defaulting documentation: https://kubernetes.io/docs/tasks/access-kubernetes-api/extend-api-custom-resource-definitions/#defaulting
- Kubebuilder webhook implementation documentation: https://master.book.kubebuilder.io/cronjob-tutorial/webhook-implementation.html
- controller-runtime admission package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/webhook/admission
- controller-runtime builder package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/builder

## Issues Found
- The basic webhook server used an empty runtime scheme to decode `admission.k8s.io/v1` `AdmissionReview` objects. Added `admissionv1.AddToScheme(scheme)` so `UniversalDeserializer()` can decode AdmissionReview requests.
- The first Go snippet imported `fmt` and `klog` without using them. Removed those imports so the snippet is syntactically valid Go.
- The Application example referenced `ResourceRequirements` without defining it. Added a small `ResourceRequirements` type matching the fields used by the examples.
- The Kubebuilder example imported `runtime` without using it and omitted the required `metav1` import. Updated the imports.
- The Kubebuilder defaulting example used an older receiver-style `Default()` method and did not wire a defaulter into the webhook builder. Updated it to use the current controller-runtime typed `admission.Defaulter[*Application]` interface and `WithDefaulter(...)`.
- The logging example used chained type assertions on `metadata.name`, which could panic if metadata was absent or had an unexpected shape. Replaced it with safe intermediate type assertions.

## Review Notes
The webhook configuration and JSON Patch examples are technically valid for `admissionregistration.k8s.io/v1`. Future improvements could mention Kubernetes' recommendation to prefer built-in CRD schema defaulting and validation when they are sufficient, and to use mutating webhooks only when logic needs runtime computation or external context.
