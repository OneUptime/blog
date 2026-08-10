# How to Debug OIDC Discovery Failures: Issuer URLs, `/.well-known/openid-configuration`, TLS, and DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenID Connect, OIDC, Discovery, TLS, DNS, Troubleshooting

Description: Diagnose OIDC discovery failures from issuer URL construction through DNS, TLS, HTTP, JSON metadata, issuer validation, and JWKS access.

---

OIDC discovery is more than downloading JSON. A client starts with a trusted issuer identifier, constructs its `/.well-known/openid-configuration` URL, resolves and connects to the host, validates TLS, receives JSON metadata, and verifies that the returned `issuer` is identical to the configured issuer. A failure at any layer may surface as the same generic message: "Unable to obtain configuration."

Debug from the configured issuer outward. Do not "fix" discovery by disabling TLS validation, accepting a different returned issuer, or following metadata from an untrusted hostname. Those checks establish the trust boundary for every authorization endpoint, token endpoint, and signing key the client will use.

## Start with the Exact Issuer String

An OIDC Issuer Identifier is a case-sensitive HTTPS URL with scheme, host, optional port, and optional path. It has no query or fragment. These are different issuer strings:

```text
https://id.example.com
https://id.example.com/
https://ID.example.com
https://id.example.com/tenant-a
https://id.example.com/tenant-b
```

URI libraries may consider some forms equivalent for navigation, but OIDC uses exact string comparisons at critical points. Copy the documented issuer value rather than reconstructing it from an authorization endpoint, admin-console URL, vanity hostname, or browser redirect.

Log the configured issuer as a JSON string so trailing slashes and invisible whitespace are visible:

```javascript
console.log(JSON.stringify({ configuredIssuer }));
```

Reject issuer configuration with embedded credentials, a query, or a fragment. For dynamic tenant input, use an allowlist or trusted tenant-to-issuer mapping; arbitrary issuer discovery can become server-side request forgery.

## Construct the OIDC Discovery URL Correctly

OIDC Discovery forms the URL by removing a terminating slash from an issuer and appending `/.well-known/openid-configuration`.

For a host issuer:

```text
issuer:    https://id.example.com
discovery: https://id.example.com/.well-known/openid-configuration
```

For a path-based issuer:

```text
issuer:    https://id.example.com/tenant-a
discovery: https://id.example.com/tenant-a/.well-known/openid-configuration
```

That second rule is easy to get wrong. The OIDC document is under the issuer path. Do not move the path after `.well-known` and do not substitute the OAuth authorization-server metadata suffix unless the implementation and provider explicitly use that separate specification.

A minimal constructor is:

```javascript
function oidcDiscoveryUrl(issuer) {
  const parsed = new URL(issuer);
  if (parsed.protocol !== "https:" || parsed.search || parsed.hash) {
    throw new Error("OIDC issuer must be HTTPS without query or fragment");
  }
  return `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
}
```

Production code should use a maintained OIDC library, especially for URL edge cases and metadata validation.

## Test from the Failing Runtime

A URL working in a laptop browser proves little about a pod, VM, private subnet, corporate proxy, or serverless runtime. Test from the same network namespace, DNS configuration, trust store, proxy environment, and egress policy as the application.

```bash
ISSUER='https://id.example.com/tenant-a'
DISCOVERY="${ISSUER%/}/.well-known/openid-configuration"

curl --fail-with-body --silent --show-error \
  --dump-header /dev/stderr \
  --connect-timeout 5 --max-time 15 \
  "$DISCOVERY"
```

Keep the URL quoted. Do not add `--insecure`; a successful insecure request only demonstrates that bypassing an important security check changes the symptom.

The response required by OIDC Discovery is HTTP 200 JSON with `Content-Type: application/json`. Common HTTP-layer causes include:

- 301 or 302 to a different public hostname;
- 401 because an ingress mistakenly protects the well-known endpoint;
- 403 from a WAF, IP allowlist, or egress proxy;
- 404 from a missing tenant/realm path or ingress rewrite;
- 502 or 504 from an unhealthy upstream;
- HTML from a login page, error page, or captive proxy; and
- JSON truncated by an intermediary.

Some libraries follow redirects and some reject them. Even when a redirect is followed, the resulting metadata issuer still has to match the configured issuer exactly. Configure the canonical issuer directly instead of depending on a hostname-changing redirect.

## Separate DNS from TCP and TLS

Resolve both IPv4 and IPv6 from the workload:

```bash
dig +short A id.example.com
dig +short AAAA id.example.com
```

Check for split-horizon differences, stale records, search-domain expansion, an unexpected private address, or an IPv6 record on a network without working IPv6 egress. Containers can use different DNS servers and policies from their host.

Then inspect TLS with the correct Server Name Indication value:

```bash
openssl s_client \
  -connect id.example.com:443 \
  -servername id.example.com \
  -showcerts </dev/null
```

Look for:

- certificate names that do not cover the issuer host;
- a missing intermediate certificate;
- an expired or not-yet-valid certificate;
- an application clock far from UTC;
- a corporate TLS-inspection issuer absent from the workload trust store;
- an old protocol/cipher policy mismatch; and
- an ingress serving its default certificate because SNI or routing is wrong.

Use the production trust store. Adding a private CA is appropriate when that CA is an intentional trust anchor; turning verification off is not.

## Validate the Metadata, Not Just Its Syntax

Pretty-printing the document is useful:

```bash
curl --fail --silent --show-error "$DISCOVERY" | jq .
```

At minimum, inspect:

```json
{
  "issuer": "https://id.example.com/tenant-a",
  "authorization_endpoint": "https://id.example.com/tenant-a/authorize",
  "token_endpoint": "https://id.example.com/tenant-a/token",
  "jwks_uri": "https://id.example.com/tenant-a/keys",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"]
}
```

The returned `issuer` must be identical to the issuer used to construct the discovery request, and it must later equal the ID token's `iss`. Do not normalize a slash, lowercase a path, or replace an internal issuer with a public one after the comparison fails.

Also reject metadata that lacks required members, uses endpoints your client cannot safely reach, or advertises no acceptable signing algorithm. Endpoint URLs are metadata received from a trusted issuer connection, but clients should still enforce the library's HTTPS and policy requirements.

## Test JWKS and Endpoints Separately

Discovery can succeed while token validation fails because `jwks_uri` is unreachable. Extract and test it from the same runtime:

```bash
JWKS_URI="$(curl --fail --silent --show-error "$DISCOVERY" | jq -r '.jwks_uri')"
test -n "$JWKS_URI" && test "$JWKS_URI" != null
curl --fail-with-body --silent --show-error "$JWKS_URI" | jq .
```

The JWKS response should be valid JSON with a `keys` array. An unknown `kid` is a key-cache or rotation problem, not necessarily a discovery failure. Keep metadata and JWKS caches distinct, respect HTTP cache behavior where supported, retain known-good keys for a bounded overlap, and refresh on an unknown key without creating an unbounded fetch loop.

Likewise, a successful well-known request does not prove that the token endpoint is reachable through firewall rules or that browser-facing authorization endpoints have the right public hostname. Test each endpoint through the actor that uses it: server-to-server endpoints from the backend, and browser redirects through the public route.

## Watch for Proxy and Kubernetes Split-Brain

Identity providers behind proxies commonly produce metadata for the wrong scheme or host when forwarded headers or public base-URL settings are incorrect. The backend might fetch an internal service URL while the provider returns `issuer: http://idp:8080`, or it might fetch the public issuer while metadata advertises internal token and JWKS endpoints.

Configure one canonical external issuer and make proxies preserve the original scheme and authority through trusted forwarded-header handling. If the application must reach public endpoints from inside the cluster, provide working hairpin or split-horizon DNS rather than rewriting issuer strings inside the client.

In Kubernetes, check the application's namespace and pod, not only the ingress controller:

```bash
kubectl exec -n app deploy/web -- getent hosts id.example.com
kubectl exec -n app deploy/web -- \
  curl --fail-with-body --silent --show-error "$DISCOVERY"
```

NetworkPolicy, service-mesh egress policy, DNS capture, sidecar trust bundles, and proxy variables can make the application path differ from an administrator's shell.

## Classify the Error Before Changing Configuration

Use this order:

1. **Issuer input:** exact documented HTTPS identifier, no query/fragment or whitespace.
2. **URL construction:** correct path-aware OIDC suffix.
3. **DNS:** expected A/AAAA results in the failing runtime.
4. **TCP/TLS:** reachable port, correct SNI, valid name, chain, lifetime, and trust anchor.
5. **HTTP:** 200 without an unexpected redirect, proxy block, authentication, or HTML body.
6. **JSON:** parseable object and correct content type.
7. **Metadata:** returned `issuer` identical to configured issuer and required capabilities present.
8. **Downstream URLs:** reachable JWKS/token endpoints with coherent public identities.
9. **Cache:** stale failure or metadata not pinned indefinitely after configuration changes.

Log DNS/TLS/HTTP stage, status, endpoint hostname, configured issuer, returned issuer, elapsed time, and a correlation ID. Redact tokens, client secrets, cookies, and authorization codes.

Discovery's strictness is a security feature. Fix the canonical URL, network path, certificate, proxy, or metadata at its source; never turn a trust mismatch into a successful login by skipping the check.

## Sources

- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 8414 — OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)
- [RFC 9525 — Service Identity in TLS](https://datatracker.ietf.org/doc/html/rfc9525)
