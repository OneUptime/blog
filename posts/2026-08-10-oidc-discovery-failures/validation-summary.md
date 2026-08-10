# Validation Summary: How to Debug OIDC Discovery Failures: Issuer URLs, `/.well-known/openid-configuration`, TLS, and DNS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenID Connect Discovery 1.0
- OpenID Connect Core 1.0
- OAuth 2.0 Authorization Server Metadata
- JavaScript WHATWG `URL` API
- HTTP, JSON, curl, and jq
- DNS, BIND `dig`, IPv4, and IPv6
- TLS, X.509 certificates, SNI, and OpenSSL
- JSON Web Keys, JSON Web Key Sets, JWT validation, and signing-key rotation
- Reverse proxies, forwarded headers, Kubernetes DNS, and NetworkPolicy

## Sources Consulted
- OpenID Connect Discovery 1.0 incorporating errata set 2 - https://openid.net/specs/openid-connect-discovery-1_0.html
- OpenID Connect Core 1.0 incorporating errata set 2 - https://openid.net/specs/openid-connect-core-1_0.html
- RFC 8414, OAuth 2.0 Authorization Server Metadata - https://datatracker.ietf.org/doc/html/rfc8414
- RFC 7517, JSON Web Key (JWK) - https://datatracker.ietf.org/doc/html/rfc7517
- RFC 8725, JSON Web Token Best Current Practices - https://datatracker.ietf.org/doc/html/rfc8725
- RFC 9111, HTTP Caching - https://datatracker.ietf.org/doc/html/rfc9111
- RFC 9525, Service Identity in TLS - https://datatracker.ietf.org/doc/html/rfc9525
- RFC 7239, Forwarded HTTP Extension - https://datatracker.ietf.org/doc/html/rfc7239
- WHATWG URL Standard - https://url.spec.whatwg.org/
- Node.js WHATWG URL API documentation - https://nodejs.org/api/url.html
- curl command-line manual - https://curl.se/docs/manpage.html
- OpenSSL `s_client` documentation - https://docs.openssl.org/3.6/man1/openssl-s_client/
- OpenSSL certificate verification options - https://docs.openssl.org/3.6/man1/openssl-verification-options/
- BIND 9 `dig` manual - https://bind9.readthedocs.io/en/latest/manpages.html
- jq manual - https://jqlang.org/manual/
- Kubernetes `kubectl exec` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes NetworkPolicy documentation - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Local help output from curl 8.7.1, OpenSSL 3.6.2, kubectl 1.34.1, jq 1.6, and BIND `dig` 9.10.6

## Issues Found
- The JavaScript constructor did not enforce all issuer restrictions stated by the post. The WHATWG parser accepted credentials, leading or trailing whitespace, and scheme forms without `//`; its `search` and `hash` getters also failed to distinguish absent components from empty `?` or `#` components. Added raw-string, absolute-HTTPS, hostname, userinfo, whitespace, query, and fragment checks while preserving the issuer string used for exact OIDC comparison.
- The DNS commands used `dig` without enabling the runtime search list, so they could not reveal the search-domain expansion named in the following paragraph. Added `+search +showsearch` to the A and AAAA lookups.
- The OpenSSL command supplied SNI but did not verify the expected hostname and, by default, continued after certificate verification errors. Added `-verify_hostname` and `-verify_return_error` so hostname or chain failures cause the diagnostic command to fail.
- The TLS checklist described a clock as being "far from UTC," which could incorrectly suggest a timezone-setting problem. Changed it to a materially skewed system clock, since certificate validity is checked against absolute current time.
- The jq pipelines could mask curl failures, and the standalone JWKS `test` command did not prevent the subsequent request when extraction failed. Enabled Bash `pipefail`, made jq validate the discovery object and JWKS shape with meaningful exit statuses, chained extraction to retrieval, restricted the extracted URI to HTTPS in curl, and terminated option parsing before the URI.
- The unknown-`kid` sentence classified every unknown key identifier as a cache or rotation issue and ambiguously assigned old-key retention to clients. Clarified that invalid tokens can also carry unknown key identifiers, that the verifier should perform a bounded JWKS refresh, and that the provider is responsible for publishing recently decommissioned signing keys during a bounded rotation overlap.

## Review Notes
- The OIDC issuer syntax, case-sensitive exact comparisons, path-appending discovery algorithm, HTTP 200 and `application/json` requirements, required metadata members, and ID Token `iss` validation match OpenID Connect Discovery and Core.
- The post correctly distinguishes OIDC's path-appending algorithm from RFC 8414's default `oauth-authorization-server` suffix and path-insertion algorithm.
- `curl --fail-with-body` is current but requires curl 7.76.0 or newer.
- `kubectl exec deploy/web` chooses a pod for the Deployment and the default or first container. For replica-specific or sidecar-specific failures, operators should target the exact pod and application container with `-c`.
- curl and OpenSSL can use a different CA store from an application runtime such as Java; the diagnostic should be given the application's production CA bundle when the defaults differ.
