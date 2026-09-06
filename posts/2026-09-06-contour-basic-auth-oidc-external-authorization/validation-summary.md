# Validation Summary: Add Basic Auth or OIDC to Contour with External Authorization

## Status
validated

## Post Type
Technical configuration guide.

## Technologies Covered
- Contour 1.33 HTTPProxy and ExtensionService
- Envoy v3 ext_authz and HTTP/2 gRPC
- Kubernetes Services, EndpointSlices, Secrets, and kubectl
- TLS, Basic Authentication, and htpasswd
- OIDC, OAuth Authorization Code flow, PKCE, and sessions
- JWT verification and JWKS

## Sources Consulted
- Contour client authorization: https://projectcontour.io/docs/1.33/config/client-authorization/
- Contour external authorization guide: https://projectcontour.io/docs/1.33/guides/external-authorization/
- Contour API reference: https://projectcontour.io/docs/1.33/config/api-reference/
- Contour v1.33.0 CRDs: https://raw.githubusercontent.com/projectcontour/contour/v1.33.0/examples/contour/01-crds.yaml
- Contour JWT verification: https://projectcontour.io/docs/1.33/config/jwt-verification/
- Contour upstream TLS: https://projectcontour.io/docs/1.33/config/upstream-tls/
- Contour access logging: https://projectcontour.io/docs/1.33/config/access-logging/
- Contour Envoy DaemonSet: https://raw.githubusercontent.com/projectcontour/contour/v1.33.0/examples/contour/03-envoy.yaml
- Envoy authorization API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/service/auth/v3/external_auth.proto
- OpenID Connect Core, token response validation and client authentication: https://openid.net/specs/openid-connect-core-1_0.html
- OAuth security best current practice: https://www.rfc-editor.org/rfc/rfc9700.html
- Apache htpasswd: https://httpd.apache.org/docs/2.4/programs/htpasswd.html
- kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl describe: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The OIDC lifecycle presented a shared client secret as necessary and omitted explicit ID token validation before session creation. Updated the existing code-exchange step to use the registered client authentication method, including private_key_jwt, and validate the returned ID token. Updated credential storage to include private keys. OIDC Core supports multiple authentication methods and requires token response validation.
- The JWT example discussed application authorization using the validated identity but did not forward the token. Added forwardJWT: true and explained the default token removal so the application can obtain the bearer token for its authorization decisions.

## Review Notes
- All three YAML blocks parsed and passed JSON Schema checks against the published v1.33.0 CRDs using the Draft 4 validator compatible with their OpenAPI boolean exclusive bounds. The JWT spec fragment was given an HTTPProxy envelope for this check only. Checked the subjectNames equality CEL constraint separately; other CEL rules and Contour runtime checks were not executed.
- Retained both subjectName and subjectNames: although the singular field is deprecated, the v1.33.0 CRD requires it and requires the first plural entry to equal it. Removing it would invalidate the example.
- Confirmed namespace binding, h2 TLS transport, CA Secret format, TLS termination and fallback-certificate restrictions, context, timeout, fail-closed behavior, and exact route authorization opt-out.
- Confirmed JWT verification properties, provider selection, and the documented default lack of JWKS certificate validation. Production deployments need the validation configuration discussed in the post.
- Confirmed ext_authz supports custom denial responses and request-header replacement/removal. The deployment-specific identity-header and outage tests remain necessary.
- kubectl commands use documented syntax. The logging example assumes the standard envoy DaemonSet/container in projectcontour and selects a pod; it does not aggregate every replica. Logging configuration determines available request correlation fields.
- Group-denial testing requires a checker with a configured group policy; htpasswd credentials alone do not define groups.
- Services, certificates, Secrets, and authentication workloads must exist. OIDC callback routing and session behavior depend on the chosen adapter. The JWT YAML is a spec fragment, not a standalone manifest.
- All six official documentation links in the post resolved to the intended resources. Contour claims were checked for version 1.33; the linked Envoy latest documentation is a moving reference.
- No live Kubernetes cluster or authentication provider was deployed. This was a documentation and schema review, not an end-to-end authentication test.
