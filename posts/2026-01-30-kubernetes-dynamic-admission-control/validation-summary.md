# Validation Summary: How to Implement Kubernetes Dynamic Admission Control

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes dynamic admission control
- ValidatingAdmissionWebhook and MutatingAdmissionWebhook
- Kubernetes AdmissionReview API
- Go webhook servers
- cert-manager certificate management and CA injection
- kubectl and kind-based integration testing
- Prometheus metrics

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- cert-manager installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager CA Injector documentation: https://cert-manager.io/docs/concepts/ca-injector/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/
- Go package documentation for k8s.io/api/admission/v1: https://pkg.go.dev/k8s.io/api/admission/v1
- Go package documentation for k8s.io/apimachinery/pkg/api/resource: https://pkg.go.dev/k8s.io/apimachinery/pkg/api/resource

## Issues Found
- The cert-manager install command used `v1.14.0`, which is outdated relative to the current official cert-manager static manifest documentation. Updated both install commands to `v1.20.2`.
- The mutating webhook Go snippet used `resource.MustParse` but did not import `k8s.io/apimachinery/pkg/api/resource`, and it imported `fmt` without using it. Added the required import and removed the unused import so the snippet compiles.
- The mutating webhook server configuration referenced `/mutate`, but the Go server did not register that route. Added an `init` function in `mutate.go` to register `http.HandleFunc("/mutate", handleMutate)` when the mutating webhook file is included.
- The mutating webhook configuration used `objectSelector` with the annotation key `sidecar.example.com/inject`. Kubernetes object selectors match labels, not annotations, while the code checks annotations. Removed that selector from the mutating webhook configuration to avoid implying annotation-based selector behavior.

## Review Notes
The post is technically valid after the fixes. The webhook examples are educational and intentionally minimal; a production implementation should also add stricter AdmissionReview request validation, duplicate sidecar/volume handling, and broader test coverage for init containers and malformed requests.
