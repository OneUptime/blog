# Validation Summary: How to Create Kubernetes Aggregated API Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API aggregation
- Kubernetes APIService resources
- Kubernetes generic apiserver library
- Kubernetes REST storage interfaces
- Kubernetes delegated authentication and authorization
- Kubernetes RBAC
- kubectl
- Go
- PostgreSQL

## Sources Consulted
- Kubernetes documentation: Configure the Aggregation Layer - https://kubernetes.io/docs/tasks/extend-kubernetes/configure-aggregation-layer/
- Kubernetes documentation: Set up an Extension API Server - https://kubernetes.io/docs/tasks/extend-kubernetes/setup-extension-api-server/
- Kubernetes documentation: Extend the Kubernetes API with CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes kubectl reference: kubectl patch - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes task guide: Update API Objects in Place Using kubectl patch - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Go package documentation: k8s.io/apiserver/pkg/registry/rest - https://pkg.go.dev/k8s.io/apiserver/pkg/registry/rest
- Go package documentation: k8s.io/apiserver/pkg/server/options - https://pkg.go.dev/k8s.io/apiserver/pkg/server/options
- Go package documentation: k8s.io/apiserver/pkg/authentication/request/headerrequest - https://pkg.go.dev/k8s.io/apiserver/pkg/authentication/request/headerrequest
- Go package documentation: k8s.io/apiserver - https://pkg.go.dev/k8s.io/apiserver

## Issues Found
- Corrected the CRD comparison table to say CRDs support status and scale subresources, rather than describing CRD subresources only as generally "limited."
- Fixed the in-memory storage example by adding missing imports for internal list options, request namespace extraction, UID generation, UUID generation, and resource version parsing.
- Added `ConvertToTable` to the in-memory storage example because the current Kubernetes `rest.Lister` interface embeds table conversion support used by API endpoints and kubectl output.
- Removed an unused loop variable in the in-memory list implementation.
- Added delete validation handling to the in-memory delete implementation.
- Fixed the API server example imports by removing an unused `os` import and adding the missing `metav1` and `schema` imports used by the snippet.
- Added `NamespaceScoped` to the status subresource storage so the subresource declares the same scope as the parent resource.
- Corrected the APIService `insecureSkipTLSVerify` comment. The field controls TLS certificate verification and should stay false when using `caBundle`.
- Fixed the request-header authentication snippet so it assigns `RequestHeaderAuthenticationOptions` as a value, not a pointer.
- Updated the `headerrequest.New` call to match the current function signature, including UID headers and excluding certificate/allowed-name arguments handled by the serving layer.
- Fixed the PostgreSQL storage example by adding missing imports and helper implementations for watch fan-out and PostgreSQL unique-constraint detection.
- Added core REST methods to the PostgreSQL storage example so it can act as a drop-in storage backend for the tutorial resource.
- Renamed the Kubernetes API errors import in the PostgreSQL example to avoid conflict with the Go standard `errors` package.

## Review Notes
The examples remain tutorial-level snippets. A production aggregated API server should also include generated deepcopy/client/clientset code, OpenAPI generation, robust admission/defaulting/validation strategies, proper resource version and conflict handling, watch replay semantics, and certificate lifecycle automation.
