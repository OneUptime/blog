# Validation Summary: How to Implement Kubernetes Admission Webhooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes admission webhooks
- Kubernetes ValidatingWebhookConfiguration and MutatingWebhookConfiguration
- Go HTTP servers
- Kubernetes Go API packages
- TLS certificates and OpenSSL
- cert-manager
- kubectl
- kind
- Docker
- Prometheus client metrics

## Sources Consulted
- Kubernetes Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The Go webhook handlers used a universal deserializer with an empty runtime scheme. I added `admissionv1.AddToScheme(runtimeScheme)` so `admission.k8s.io/v1` AdmissionReview objects can be decoded correctly.
- The handlers assumed `admissionReview.Request` was always non-nil. I added a nil check so malformed requests return HTTP 400 instead of panicking.
- The handlers returned the original AdmissionReview with both request and response populated. I changed them to return a response AdmissionReview with the original API version/kind and copied UID, matching the Kubernetes webhook response contract.
- The namespace exclusions checked `pod.Namespace`. I changed them to check `request.Namespace`, which is the namespace field supplied in the AdmissionRequest for namespaced resources.
- The mutating handler comment said it was adding a timestamp annotation, but the value is a static mutation marker. I corrected the comment.
- The Deployment referenced `serviceAccountName: admission-webhook` without defining that ServiceAccount or needing Kubernetes API access. I removed the field so the sample Deployment can create pods in a default namespace without an extra manifest.
- The integration test applied the whole `deploy/` directory even though the webhook configuration examples contain `${CA_BUNDLE}` placeholders. I changed it to apply the server manifest first and use `envsubst` to inject the generated CA bundle into the webhook configuration manifests.
- The integration test used `kubectl run --limits`, which is not listed in the current kubectl run reference. I replaced it with a supported `--overrides` example that sets container resource limits.

## Review Notes
Local `go` and `kubectl` binaries were not available in the review environment, so I could not compile the Go snippets or run CLI help locally. Validation was performed by static review and cross-checking against official Kubernetes and cert-manager documentation.
