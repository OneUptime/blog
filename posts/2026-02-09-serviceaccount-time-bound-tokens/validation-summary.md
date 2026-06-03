# Validation Summary: How to Implement ServiceAccount with Time-Bound Tokens

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes projected volumes
- Kubernetes TokenRequest API
- kubectl
- Go client-go
- Python requests
- JSON Web Tokens

## Sources Consulted
- Kubernetes projected volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes service account configuration documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes service account administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- client-go rest.Config documentation: https://pkg.go.dev/k8s.io/client-go/rest
- RFC 7515 JSON Web Signature: https://www.rfc-editor.org/rfc/rfc7515.html
- RFC 7519 JSON Web Token: https://www.rfc-editor.org/rfc/rfc7519.html

## Issues Found
- The projected token examples used `expirationSeconds: 300`, but Kubernetes projected service account tokens must be at least 600 seconds. Changed the 5-minute projected token example and recommendations to 10 minutes.
- The `kubectl create token` example requested a 5-minute token and described 24 hours as a typical maximum. Changed the temporary token example to 10 minutes and clarified that the API server may return a shorter or longer lifetime than requested.
- The first projected token example set `audience: api`, and later client examples used that token to call the Kubernetes API. A custom audience is only valid if accepted by the API server. Removed the custom audience for the Kubernetes API token examples so the default API server audience is used.
- The shell JWT decoder used regular Base64 decoding directly on the JWT payload. JWT segments are Base64URL-encoded and commonly omit padding. Updated the script to translate URL-safe characters and restore padding before decoding.
- The Go client-go example created a token manager but did not use it for Kubernetes client authentication, and it omitted the required `metav1` import. Replaced it with `rest.InClusterConfig()` plus `BearerTokenFile`, which client-go documents as periodically reread.
- Go snippets used deprecated `ioutil.ReadFile`. Updated them to `os.ReadFile`.

## Review Notes
The post is now technically accurate for current Kubernetes documentation. The Python example manually reloads the token file, which is appropriate for direct HTTP calls; production code should also check HTTP status codes before calling `response.json()`.
