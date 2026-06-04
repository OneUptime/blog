# Validation Summary: How to Implement Bound ServiceAccount Tokens for Improved Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes ServiceAccounts
- TokenRequest API
- Projected volumes
- kube-apiserver configuration
- kubectl
- Go client-go
- Python requests
- Bash
- JWT

## Sources Consulted
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Projected Volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes Configure Service Accounts for Pods task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Managing Service Accounts reference: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- client-go rest package documentation: https://pkg.go.dev/k8s.io/client-go/rest
- client-go transport package documentation: https://pkg.go.dev/k8s.io/client-go/transport

## Issues Found
- The post stated that legacy Secret-based tokens were the default before Kubernetes 1.21 and that modern Kubernetes 1.21+ uses bound tokens by default. Updated both references to Kubernetes 1.22, matching the documented stable/default projected token behavior for tokens mounted into Pods.
- The post implied every ServiceAccount automatically received a persistent token secret without a version caveat. Added that this auto-generation behavior applied in Kubernetes versions prior to 1.24.
- The post described bound tokens as cryptographically bound directly to the Pod. Adjusted the wording to say the signed token includes object binding claims that the API server validates.
- The high-security projected token example used `expirationSeconds: 300`, which is invalid because Kubernetes requires service account token projection expiration to be at least 600 seconds. Updated the example and explanatory text to 600 seconds / 10 minutes.
- The kubelet rotation explanation omitted the documented 24-hour rotation condition. Added that kubelet rotates when the token is older than 80% of TTL or older than 24 hours.
- The Go example had missing `context` and `metav1` imports, an unused `transport` import, and an unused custom token source. Updated the snippet so it compiles and reflects client-go's in-cluster token reload behavior.
- The post claimed Kubernetes Go client libraries read the token file fresh on each request. Updated this to the documented behavior that the token file is periodically reloaded.
- The JWT payload decoding examples used plain `base64 -d`, which can fail for base64url-encoded JWT payloads. Updated both snippets to convert base64url to standard base64 and add padding before decoding.

## Review Notes
The examples remain illustrative and use placeholder service account names, namespaces, images, and API server endpoints. `kubectl` was not installed in the local environment, so CLI details were verified against the official Kubernetes command reference instead of local `kubectl --help` output.
