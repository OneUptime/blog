# Validation Summary: How to Build Kubernetes Admission Webhooks in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Kubernetes admission webhooks
- Kubernetes AdmissionReview API
- ValidatingWebhookConfiguration and MutatingWebhookConfiguration
- JSON Patch and JSON Pointer
- TLS certificates with OpenSSL
- kubectl
- Docker multi-stage builds

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes admission/v1 API types: https://github.com/kubernetes/api/blob/master/admission/v1/types.go
- k8s.io/api/admission/v1 Go package documentation: https://pkg.go.dev/k8s.io/api/admission/v1
- k8s.io/client-go/kubernetes/scheme Go package documentation: https://pkg.go.dev/k8s.io/client-go/kubernetes/scheme
- RFC 6901 JSON Pointer: https://www.rfc-editor.org/rfc/rfc6901
- RFC 6902 JSON Patch: https://www.rfc-editor.org/rfc/rfc6902

## Issues Found
- The AdmissionReview decoder used an empty runtime scheme. I added `admissionv1.AddToScheme(runtimeScheme)` so the universal deserializer can recognize `admission.k8s.io/v1` AdmissionReview objects.
- The request parser did not guard against a decoded AdmissionReview with a nil `Request`, which would later panic when copying the UID into the response. I added a nil-request check and error.
- The validating webhook snippet imported `admissionv1` but did not use it. I removed the unused import so the Go file compiles.
- The initial `mutate.go` import block omitted `strings` and `k8s.io/apimachinery/pkg/api/resource`, then corrected them in a separate snippet. I moved the required imports into the main `mutate.go` block and removed the corrective follow-up snippet so the file is directly compilable.
- The mutating webhook snippet imported `admissionv1` but did not use it. I removed the unused import.
- The image tag validation treated any colon in an image reference as a tag separator, which misses untagged images from registries with ports such as `localhost:5000/nginx`. I replaced the check with logic that only treats a colon after the last slash as an explicit tag.
- The testing section said to test locally, but the shown workflow tests through Kubernetes resources after deployment. I corrected the wording.
- The deployment steps changed into `deploy/tls` and then continued using repo-root-relative paths. I added `cd ../..` after certificate generation and corrected the TLS secret apply path.

## Review Notes
- Go was not installed in the review environment, so I could not compile the snippets locally. The code was reviewed against Kubernetes and Go package documentation instead.
- `go 1.21` and Kubernetes module version `v0.29.0` are older than current releases, but they are still valid for a tutorial pinned to those versions.
- The validation logic is intentionally simple and would need more production hardening, especially around image reference parsing, logging, metrics, and configurable policies.
