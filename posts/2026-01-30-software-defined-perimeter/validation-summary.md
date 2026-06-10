# Validation Summary: How to Implement Software Defined Perimeter

## Status
validated

## Post Type
Tutorial / Guide — conceptual overview of Software Defined Perimeter combined with practical Python implementation snippets and Kubernetes deployment manifests.

## Technologies Covered
- Software Defined Perimeter (SDP) architecture (Controller / Gateway / Client)
- Single Packet Authorization (SPA)
- Python standard library: `hashlib`, `hmac`, `json`, `socket`, `struct`, `asyncio`, `logging`, `dataclasses`, `datetime`
- `httpx` HTTP client
- PyJWT (`jwt`, `PyJWKClient`)
- `cryptography` library (`x509`, `hashes`, `serialization`, `rsa`)
- OIDC / OAuth 2.0 authorization code flow
- mTLS (mutual TLS)
- Kubernetes (`apps/v1` Deployment, Service, `topologySpreadConstraints`, `securityContext`, probes)
- Prometheus Operator CRDs (`ServiceMonitor`, `PrometheusRule`) — `monitoring.coreos.com/v1`
- Mermaid diagrams (flowchart, sequenceDiagram)

## Sources Consulted
- [Cryptography library X.509 Reference (latest)](https://cryptography.io/en/latest/x509/reference/)
- [Cryptography 42.0.2 X.509 Reference](https://cryptography.io/en/42.0.2/x509/reference/) — documents introduction of `not_valid_before_utc` / `not_valid_after_utc`
- [pyca/cryptography issue #13158](https://github.com/pyca/cryptography/issues/13158) — naive-datetime deprecation behavior
- ["It's Time For A Change: datetime.utcnow() Is Now Deprecated" — Miguel Grinberg](https://blog.miguelgrinberg.com/post/it-s-time-for-a-change-datetime-utcnow-is-now-deprecated) — Python 3.12 `datetime.utcnow()` deprecation
- [PyJWT documentation](https://pyjwt.readthedocs.io/) — `PyJWKClient.get_signing_key_from_jwt()` and `jwt.decode()` `options={"require": [...]}`
- [Kubernetes Pod Topology Spread Constraints docs](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Prometheus Operator CRD docs](https://prometheus-operator.dev/docs/operator/api/) — `ServiceMonitor` and `PrometheusRule`
- [FWKNOP project](https://www.cipherdyne.org/fwknop/) — default SPA port 62201 (UDP)
- [Cloud Security Alliance SDP Specification](https://cloudsecurityalliance.org/research/working-groups/software-defined-perimeter/) — three-component SDP architecture

## Issues Found

1. **Misleading docstring on `SPAPacket.create_packet`** — The original docstring claimed the return value was "Encrypted and signed SPA packet bytes," but the implementation only HMAC-signs the payload; there is no encryption. Updated the docstring to "HMAC-signed SPA packet bytes" to match the implementation. (The narrative in the surrounding text already correctly describes it as "cryptographically signed.")

2. **Deprecated `datetime.utcnow()` in `CertificateManager`** — `datetime.utcnow()` was deprecated in Python 3.12 and the pyca/cryptography library deprecates the naive-datetime form for certificate validity dates as of 42.0.0. Added `timezone` to the `datetime` import and changed both `not_valid_before(datetime.utcnow())` and `not_valid_after(datetime.utcnow() + timedelta(...))` to use `datetime.now(timezone.utc)`. The `CertificateBuilder.not_valid_before()` / `not_valid_after()` builder methods themselves are still the correct API — only the input value needed to become timezone-aware.

3. **Deprecated `datetime.utcnow()` in `AuditLogger`** — Same Python 3.12 deprecation issue. Added `timezone` to the `datetime` import and replaced all three `datetime.utcnow().isoformat()` calls (in `log_authentication`, `log_access_decision`, and `log_spa_validation`) with `datetime.now(timezone.utc).isoformat()`. ISO 8601 output now correctly includes a `+00:00` UTC offset, which is appropriate for audit log records.

## Review Notes

- **OIDC scope `groups`** is not part of the OpenID Connect Core 1.0 standard scope set (`openid`, `profile`, `email`, `address`, `phone`, `offline_access`). It is widely supported as a provider-specific scope by Keycloak, Okta, Auth0, and others. Left as-is because the post is showing a representative integration; readers using a different IdP should adjust the scope.
- **`acr_values: "urn:mfa"`** is illustrative rather than a registered ACR value. The OIDC spec leaves ACR values open-ended; production deployments should use the values their IdP actually publishes (e.g. `phr`, `phrh`, or vendor-specific URIs). Not changed because the post is showing the mechanism, not prescribing a specific value.
- **`query_string` construction in `get_authorization_url`** uses plain `f"{k}={v}"` rather than URL-encoding. For the literal values shown this happens to work, but production code should use `urllib.parse.urlencode(params)` to handle reserved characters in `state`, `nonce`, etc. Worth tightening in a follow-up but not a correctness bug for the example values.
- **Image tags `sdp/controller:v2.1.0` and `sdp/gateway:v2.1.0`** are placeholders — no public Docker image with that name exists. The post does not claim otherwise; it is clearly a template manifest.
- **Port 62201 as "Standard SPA port"** is accurate in the sense that it is the default UDP port used by FWKNOP, the most widely deployed open-source SPA implementation. There is no IANA-registered well-known port for SPA, so "standard" is a slight overreach but defensible.
- **`securityContext.capabilities.add: [NET_BIND_SERVICE]`** is included with a comment "Required for binding to low ports if needed," but the gateway in the manifest only binds 62201 (UDP) and 8443 (TCP), neither of which is below 1024. The capability is harmless but redundant for the ports shown. Left as-is since the comment correctly qualifies it as conditional.
- **`SPAValidator._seen_nonces` cleanup** is implemented in `cleanup_expired_nonces()` but never scheduled to run. In production it would need a periodic task; the example shows the building block but does not wire it up. Acceptable for a tutorial.
