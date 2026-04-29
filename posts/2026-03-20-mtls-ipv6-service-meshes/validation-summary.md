# Validation Summary: How to Implement mTLS over IPv6 in Service Meshes

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- mTLS (mutual TLS)
- IPv6 addressing in TLS certificates (iPAddress SAN)
- OpenSSL (cert generation, `s_client`)
- Istio (PeerAuthentication, pilot-agent, SDS, SPIFFE identity)
- Linkerd (linkerd-proxy, `linkerd viz edges`, `linkerd check`)
- Envoy (DownstreamTlsContext / UpstreamTlsContext, `match_typed_subject_alt_names`, `dns_lookup_family`, `ipv4_compat`)
- Kubernetes (`kubectl exec`, `kubectl rollout restart`, `kubectl run`)
- curl with client certs

## Sources Consulted
- OpenSSL verification options: https://docs.openssl.org/master/man1/openssl-verification-options/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio v1 APIs (1.22 GA) blog: https://istio.io/latest/blog/2024/v1-apis/
- Istio security architecture / SDS: https://istio.io/latest/docs/concepts/security/
- Envoy TLS common.proto (SubjectAltNameMatcher): https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/common.proto
- Envoy address.proto (`ipv4_compat`): https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/address.proto
- Linkerd validating mTLS traffic: https://linkerd.io/2-edge/tasks/validating-your-traffic/
- Linkerd identity / SPIFFE pipeline (Linkerd 2.14+)
- RFC 5280 (X.509 SAN iPAddress encoding)

## Issues Found
1. **Invalid IPv6 placeholder addresses.** The post used `fd00:svc::50`, `[fd00::svc-ip]:80`, and `fd00::backend` as IPv6 addresses. IPv6 segments are 16-bit hex groups (0-9, a-f), so `svc`, `svc-ip`, and `backend` are syntactically invalid (non-hex characters / hyphens). Replaced with valid hex placeholders: `fd00:abcd::50`, `[fd00:abcd::50]:80`, and `fd00:abcd::100` respectively.

2. **`openssl s_client -verify_hostname` used for an IP.** `-verify_hostname` checks DNS-name SANs; it does not verify IP-type SANs. Replaced `-verify_hostname fd00::10` with `-verify_ip fd00::10`, which is the correct flag for verifying an IPv4/IPv6 iPAddress SAN.

3. **Outdated Istio cert rotation instructions.** The post recommended `kubectl delete secret istio.my-service-account -n default` to force workload cert rotation. That was the legacy Citadel/secret-volume model. Modern Istio (post 1.5, certainly by 1.20+) uses SDS — workload certs are issued by istiod and held in Envoy's memory, not in Kubernetes secrets. Replaced with `kubectl rollout restart deployment/my-service -n default`, which causes the proxy to come back up and request a fresh cert via SDS, plus a clarifying comment.

## Review Notes
- `apiVersion: security.istio.io/v1beta1` for `PeerAuthentication` still works, but `security.istio.io/v1` became GA in Istio 1.22 (2024) and is the preferred version going forward. Left unchanged because v1beta1 is still valid and widely used in real deployments — readers on older clusters benefit from the broader compatibility.
- The post says "Linkerd automatically issues SPIFFE/X.509 certificates" — in Linkerd 2.14+ the proxy identities are emitted in SPIFFE URI form (`spiffe://<trust-domain>/ns/<ns>/sa/<sa>`), so this is accurate for current Linkerd versions.
- Envoy `san_type` enum used (`DNS`, `IP_ADDRESS`) matches the v3 API (`SubjectAltNameMatcher.SanType`: `EMAIL`, `DNS`, `URI`, `IP_ADDRESS`, `OTHER_NAME`).
- Envoy `ipv4_compat: true` on a socket bound to `::` is valid for accepting both native IPv6 and IPv4-mapped (`::ffff:<v4>`) connections.
- Linkerd `linkerd viz edges deployment/my-app` works; the more conventional form is `linkerd viz edges deployment` (resource type without name) optionally scoped via `-n <ns>`. Left as-is since the resource/name form is still accepted.
- Istio default workload cert TTL is 24h via `defaultWorkloadCertTTL`, matching the post's claim.
