# Add Basic Auth or OIDC to Contour with External Authorization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, External Authorization, Basic Authentication, OIDC, TLS, Envoy, Kubernetes

Description: Protect a Contour virtual host with a fail-closed Envoy authorization service for Basic Auth or an OIDC login flow.

---

Contour does not implement a user database or an interactive OIDC login flow inside HTTPProxy. It delegates the authorization decision to a service that implements Envoy's v3 external authorization gRPC API.

That distinction matters. An `ExtensionService` tells Contour how Envoy reaches the checker. The checker itself validates an htpasswd credential, runs an OIDC redirect and callback flow, verifies a session, or asks an identity provider. Do not point an `ExtensionService` at an arbitrary web login endpoint and expect the protocols to match.

## Choose the Authentication Pattern

Use one of these patterns deliberately:

- Basic Auth: suitable for a small operational endpoint when credentials are managed securely. Contour's separate `contour-authserver` project includes an htpasswd implementation.
- Interactive OIDC: use an authorization service or adapter that implements Envoy v3 ext_authz and owns redirects, callback state, sessions, and token refresh.
- Bearer JWT API: Contour 1.33 can validate JWT issuer, audience, signature, and time claims directly. This is not an interactive OIDC browser session and does not perform authorization based on arbitrary application roles by itself.

The rest of this guide uses external authorization because it supports the first two patterns behind one Contour integration point.

## Register a TLS-Protected Extension Service

The authorization backend should use HTTP/2 gRPC and TLS. The `ExtensionService` must be in the same namespace as the Service it binds:

```yaml
apiVersion: projectcontour.io/v1alpha1
kind: ExtensionService
metadata:
  name: edge-auth
  namespace: platform-auth
spec:
  protocol: h2
  services:
  - name: edge-auth
    port: 9443
  validation:
    caSecret: edge-auth-ca
    subjectName: edge-auth.platform-auth.svc.cluster.local
    subjectNames:
    - edge-auth.platform-auth.svc.cluster.local
```

`edge-auth-ca` is an Opaque Secret in `platform-auth` with a PEM CA bundle under `ca.crt`. The authorization server certificate needs a matching DNS SAN. This validation protects the credentials and session material Envoy sends to the checker.

Inspect both the Service and extension status:

```bash
kubectl -n platform-auth get service,endpointslice
kubectl -n platform-auth get extensionservice edge-auth -o yaml
```

If you use `contour-authserver` for Basic Auth, follow its versioned deployment guide and store htpasswd data in a Secret. Generate hashes without putting a cleartext password on the shell command line or into Git. The command `htpasswd -b` shown in many demos exposes the password to process inspection and shell history.

## Bind Authorization to a TLS Virtual Host

Per-virtual-host external authorization in Contour 1.33 requires TLS termination and cannot be used with the fallback certificate feature. Reference the extension by namespace and name:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: admin
  namespace: admin-app
spec:
  virtualhost:
    fqdn: admin.example.com
    tls:
      secretName: admin-example-com-tls
    authorization:
      extensionRef:
        name: edge-auth
        namespace: platform-auth
      responseTimeout: 2s
      failOpen: false
      authPolicy:
        context:
          application: admin
  routes:
  - conditions:
    - exact: /healthz
    authPolicy:
      disabled: true
    services:
    - name: admin
      port: 8080
  - conditions:
    - prefix: /
    services:
    - name: admin
      port: 8080
```

The context values are trusted static metadata sent with authorization checks. They are not client claims. Here they let one shared checker apply the policy for `admin`.

`failOpen: false` keeps application traffic blocked when the authorization service is unavailable. Fail-open behavior can be useful during a carefully controlled migration, but it turns an auth outage into an access-control bypass. The exact match keeps the exception from covering an adjacent path such as `/healthz-admin`; ensure the endpoint exposes no sensitive state.

## Design an OIDC Flow That Fits ext_authz

For a browser request, the external authorization component normally needs to:

1. validate a signed, integrity-protected session cookie;
2. return an allow decision and identity headers when the session is valid;
3. return a redirect to the identity provider when it is absent;
4. bind callback state and nonce to the browser session;
5. exchange the authorization code using the registered client authentication method, such as a server-side client secret or `private_key_jwt`, and validate the returned ID token before creating a session; and
6. refresh or revoke sessions according to policy.

Confirm that the selected product implements Envoy's v3 external authorization gRPC API directly, or deploy a documented adapter. A product exposing only an NGINX `auth_request` endpoint is not automatically compatible.

Use Authorization Code flow with PKCE when supported, exact callback URIs, a narrow issuer and audience, and short-lived sessions. Store any OIDC client secret or private key in a Kubernetes Secret and grant only the auth workload access. Never send refresh tokens to the protected application unless it explicitly owns them.

Identity headers returned by the checker must replace untrusted client headers. Test that a client cannot inject `X-User`, `X-Email`, or group values by sending them directly. The auth service should return only the minimum headers the application needs.

## Consider Native JWT Verification for APIs

If clients already send bearer access tokens and no browser redirect is needed, native JWT verification may be smaller:

```yaml
spec:
  virtualhost:
    fqdn: api.example.com
    tls:
      secretName: api-example-com-tls
    jwtProviders:
    - name: workforce
      issuer: https://id.example.com/
      audiences:
      - orders-api
      forwardJWT: true
      remoteJWKS:
        uri: https://id.example.com/.well-known/jwks.json
        timeout: 2s
        cacheDuration: 10m
  routes:
  - conditions:
    - prefix: /
    jwtVerificationPolicy:
      require: workforce
    services:
    - name: api
      port: 8080
```

This checks token validity properties documented by Contour. Application authorization still needs to decide whether the validated identity may perform a particular action. `forwardJWT: true` preserves the bearer token for that purpose; by default, Contour removes it before forwarding the request. Also review upstream TLS validation for the JWKS endpoint; Contour's documented default does not validate that server certificate unless `remoteJWKS.validation` is configured.

## Verify Positive, Negative, and Failure Cases

Test at least these cases before rollout:

- no credential returns a challenge or OIDC redirect;
- a valid credential reaches the application;
- an invalid or expired credential is denied;
- a user without the required group is denied by the checker;
- direct identity-header injection does not work;
- `/healthz` is public but every adjacent path is protected; and
- scaling the auth service to zero denies protected traffic.

Inspect resource status and correlate request IDs:

```bash
kubectl -n platform-auth describe extensionservice edge-auth
kubectl -n admin-app describe httpproxy admin
kubectl -n projectcontour logs daemonset/envoy -c envoy --since=10m |
  grep 'admin.example.com'
```

Monitor auth-check latency, denial rate, redirect loops, upstream connection failures, and the auth service's certificate expiry. Exclude credentials, cookies, authorization codes, and tokens from logs.

## Conclusion

Contour external authorization is a protocol bridge, not the identity provider. Deploy a trustworthy Envoy v3 ext_authz service, protect its gRPC connection with TLS, bind it to a TLS-terminating virtual host, and fail closed. Let that service own Basic Auth or the full OIDC session lifecycle, while the application retains fine-grained authorization responsibility.

## Official Documentation

- [Contour 1.33 external authorization guide](https://projectcontour.io/docs/1.33/guides/external-authorization/)
- [Contour 1.33 client authorization](https://projectcontour.io/docs/1.33/config/client-authorization/)
- [Contour 1.33 JWT verification](https://projectcontour.io/docs/1.33/config/jwt-verification/)
- [Contour 1.33 ExtensionService API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Envoy external authorization API](https://www.envoyproxy.io/docs/envoy/latest/api-v3/service/auth/v3/external_auth.proto)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
