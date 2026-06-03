# Validation Summary: How to Build a Webhook Server That Handles Multiple Admission Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes admission webhooks
- Kubernetes ValidatingWebhookConfiguration and MutatingWebhookConfiguration
- Go
- JSON Patch
- kubectl

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes kube-apiserver Admission v1 API reference: https://kubernetes.io/docs/reference/config-api/apiserver-admission.v1/
- Kubernetes Deployment v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Go package documentation for k8s.io/api/admission/v1: https://pkg.go.dev/k8s.io/api/admission/v1

## Issues Found
- The AdmissionRequest summary described oldObject as only for UPDATE operations. Kubernetes documents oldObject as populated for DELETE and UPDATE requests, so the comment was corrected.
- The webhook server deserializer used a runtime scheme that did not register admission.k8s.io/v1 AdmissionReview types. Added admissionv1.AddToScheme and used utilruntime.Must, with apps/v1 also registered for the later Deployment example.
- The ConfigMap mutator always returned a patch for /metadata/labels/managed-by. That patch can fail when metadata.labels is absent, and it unnecessarily patches when the label already exists. Updated the example to add /metadata/labels when needed, add the label key when the labels map exists, and return without a patch when the label is already present.
- The configuration section said separate webhook configuration resources are needed for each webhook. Kubernetes configuration objects can contain multiple webhooks of the same type, so the wording was narrowed to require the appropriate validating or mutating configuration resources.
- The Deployment validator called undefined handleCreate and handleDelete methods in the snippet. Replaced those branches with simple allow responses to keep the operation-routing example syntactically complete.
- The Deployment validator ignored JSON unmarshal errors and dereferenced optional replicas pointers directly. Added error handling and a helper that applies Kubernetes' default Deployment replica count of 1 when replicas is omitted.

## Review Notes
kubectl was not installed in the workspace, so command verification was performed against the official Kubernetes kubectl reference instead of local --help output. The post does not pin a Kubernetes version; the reviewed APIs are current in Kubernetes admissionregistration.k8s.io/v1 and admission.k8s.io/v1 documentation as of 2026-06-03.
