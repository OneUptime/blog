# Validation Summary: How to Test Kubernetes Webhooks Locally with kind and Port Forwarding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes admission webhooks
- kind
- Docker networking
- Kubernetes Services and EndpointSlices
- Go net/http webhook server
- OpenSSL TLS certificates
- cert-manager
- Air hot reloading
- Delve debugging
- ngrok

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Service and selectorless EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Docker Desktop host networking documentation: https://docs.docker.com/desktop/features/networking/networking-how-tos/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager SelfSigned issuer documentation: https://cert-manager.io/docs/configuration/selfsigned/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- Go net/http package documentation: https://pkg.go.dev/net/http
- Air project README: https://github.com/air-verse/air
- Delve documentation: https://github.com/go-delve/delve

## Issues Found
- The original title and opening described "port forwarding", but the working pattern is cluster-to-host networking through a selectorless Service and host/gateway IP. Updated the title, description, and opening wording to "host network access".
- The kind `extraPortMappings` example was incorrect for this use case and could bind the same host port used by the local webhook server. Removed it and clarified that `extraPortMappings` maps host traffic into kind nodes, not kind control-plane traffic back to the host.
- The Go sample imported `fmt` without using it, which would not compile. Removed the unused import.
- The Go sample did not register `admission.k8s.io/v1` with the runtime scheme before decoding `AdmissionReview` objects. Added `admissionv1.AddToScheme(scheme)`.
- The Go handler assumed `review.Request` was non-nil and reused the request object in the response. Added a nil check and return a response-only `AdmissionReview` with the original TypeMeta and response UID.
- The sample validation checked for empty pod containers, which Kubernetes already rejects. Changed the example to validate a custom `webhook-test=enabled` label so the webhook demonstrates its own behavior.
- The `go run main.go` instructions omitted Go module setup for the Kubernetes imports. Added `go mod init` and `go get` commands.
- The Service example used the deprecated `v1 Endpoints` API. Replaced it with a `discovery.k8s.io/v1 EndpointSlice` with matching service-name and managed-by labels.
- The Endpoint example implied `host.docker.internal` could be used directly in an IP field. Updated the instructions to resolve it from the kind control-plane node and use the resulting IP.
- The OpenSSL CA certificate generation relied on defaults and the server certificate lacked Subject Alternative Names, which modern TLS clients require. Added explicit CA constraints and a server certificate extension file with SANs for `webhook-service.default.svc` and `webhook-service.default.svc.cluster.local`.
- The test pod command did not include the new required label. Updated it to include `--labels webhook-test=enabled`.
- The cert-manager install command used old `v1.13.0`. Updated it to the current supported `v1.20.2` release and added waits for the webhook and cainjector deployments.
- The cert-manager example used a plain SelfSigned issuer for the serving certificate. Updated it to bootstrap a self-signed root CA and issue the webhook serving certificate from a CA issuer.
- The Air install command used the old `github.com/cosmtrek/air` module path. Updated it to `github.com/air-verse/air`.
- The invalid pod test used `containers: []`, which Kubernetes can reject independently of the webhook. Updated it to a syntactically valid pod missing the required label.
- The kind API server log command referenced a log file path that is not portable for kind. Updated it to use `kubectl -n kube-system logs kube-apiserver-webhook-dev-control-plane`.

## Review Notes
Local `go`, `kubectl`, and `kind` binaries were not installed in the review environment, so full execution of the tutorial was not possible. URL checks for the updated kind and cert-manager downloads succeeded, and the Kubernetes manifests and commands were reviewed against official documentation.
