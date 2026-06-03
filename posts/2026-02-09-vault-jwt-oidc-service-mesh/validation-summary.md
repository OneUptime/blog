# Validation Summary: How to Implement Vault JWT/OIDC Auth for Service Mesh Integration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Vault JWT/OIDC auth
- Vault policies and audit devices
- Kubernetes service accounts and projected service account tokens
- Kubernetes OIDC issuer discovery
- Istio service mesh identity
- Linkerd service mesh identity
- Go Vault API client
- JWT/JWKS

## Sources Consulted
- HashiCorp Vault JWT/OIDC auth method API: https://developer.hashicorp.com/vault/api-docs/auth/jwt
- HashiCorp Vault Kubernetes OIDC auth guide: https://docs.hashicorp.com/vault/docs/auth/jwt/oidc-providers/kubernetes
- HashiCorp Vault audit enable command documentation: https://developer.hashicorp.com/vault/docs/commands/audit/enable
- Kubernetes projected volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes service accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Istio SPIRE / SPIFFE identity documentation: https://istio.io/latest/docs/ops/integrations/spire/
- Linkerd service account identity documentation: https://linkerd.io/2021/12/28/using-kubernetess-new-bound-service-account-tokens-for-secure-workload-identity/
- Linkerd authorization policy identity examples: https://linkerd.io/2.18/reference/authorization-policy/
- Go os.ReadFile documentation: https://pkg.go.dev/os#ReadFile
- HashiCorp Vault Go API package documentation: https://pkg.go.dev/github.com/hashicorp/vault/api

## Issues Found
- The post claimed service mesh control planes issue the JWTs used for Vault login and used SPIFFE/Linkerd mTLS identities as Vault JWT `bound_subject` values. The pod example mounts a Kubernetes projected service account JWT, whose subject is `system:serviceaccount:<namespace>:<serviceaccount>`, so I corrected the explanation and role examples to use Kubernetes service account subjects.
- The Istio example used an Istio Pilot JWKS URL for Vault JWT validation. I changed it to Kubernetes OIDC discovery, which matches the projected service account token authentication flow documented by Vault and Kubernetes.
- The Linkerd example used a non-authoritative Linkerd JWKS endpoint and Linkerd mTLS identity as a JWT subject. I changed it to the same Kubernetes OIDC discovery flow while noting that Linkerd mTLS identity is still based on the service account.
- The Vault role examples used `policies`, which Vault now documents as deprecated in favor of `token_policies`. I updated the examples to use `token_policies` and `token_ttl`.
- The Go examples used deprecated `io/ioutil.ReadFile`. I replaced it with `os.ReadFile` and added checks for nil Vault auth responses before setting the client token.
- The token rotation section described renewal, but the code re-authenticates with a fresh JWT and receives a new Vault token. I changed the wording to token refresh and rotation.
- The JWT inspection command used plain `base64 -d`, which can fail for base64url-encoded JWT payloads. I replaced it with a `jq` command that handles URL-safe JWT payload encoding.

## Review Notes
The updated post now focuses on Kubernetes projected service account JWTs for Vault authentication inside a service mesh. Native mesh mTLS identities from Istio and Linkerd are still relevant for service-to-service authentication, but they are not the JWT subjects Vault validates in the shown projected-token flow.
