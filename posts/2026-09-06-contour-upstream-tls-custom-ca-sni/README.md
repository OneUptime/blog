# Verify Contour Upstream TLS with a Custom CA and SNI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, TLS, Certificate Authority, Certificate Validation, Envoy, HTTPProxy, Kubernetes

Description: Encrypt Contour-to-backend traffic and verify the upstream certificate with a custom CA, SAN, and SNI name.

---

Setting an upstream protocol to TLS encrypts traffic from Envoy to a backend, but encryption without certificate validation can still connect to the wrong server. A production route should establish all three properties:

- the selected Service port actually speaks TLS;
- Envoy trusts only the intended CA bundle; and
- the upstream certificate contains the DNS name Contour expects.

In Contour HTTPProxy, `services[].validation` supplies the custom CA and accepted certificate DNS names. For an ordinary ClusterIP Service, that validation block does not itself set TLS SNI. A `Host` rewrite sets both the upstream HTTP authority and the SNI value. An ExternalName Service supplies its external DNS name as SNI when no Host rewrite overrides it.

## Issue the Backend Certificate for a Stable Name

Use a DNS Subject Alternative Name that represents the service, not a Pod IP. For example:

```text
ledger.payments.svc.cluster.local
```

The backend server certificate should include that exact DNS SAN. Do not rely on the Common Name fallback. Pods change, while the Service identity remains stable.

Place only the public CA chain in an Opaque Secret beside the HTTPProxy:

```bash
kubectl -n payments create secret generic ledger-upstream-ca \
  --from-file=ca.crt=./ledger-ca-chain.pem \
  --dry-run=client -o yaml
```

Review the output before applying it through your normal secret-management process. The Secret must not contain the CA private key. If an intermediate CA issued the server certificate, include the trust chain needed by your policy in PEM form.

## Configure Explicit TLS and Validation

The route below uses Service port 8443, establishes TLS, and validates the server identity:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: ledger
  namespace: payments
spec:
  virtualhost:
    fqdn: ledger.example.com
    tls:
      secretName: ledger-edge-tls
  routes:
  - services:
    - name: ledger
      port: 8443
      protocol: tls
      validation:
        caSecret: ledger-upstream-ca
        subjectName: ledger.payments.svc.cluster.local
        subjectNames:
        - ledger.payments.svc.cluster.local
      requestHeadersPolicy:
        set:
        - name: Host
          value: ledger.payments.svc.cluster.local
```

Contour 1.33 supports `protocol: tls` directly on an HTTPProxy service. A Service annotation is an alternative and is required for APIs such as Ingress that cannot set this field. When both are present, the per-service HTTPProxy protocol takes precedence.

`subjectName` is deprecated in favor of `subjectNames`, but the 1.33 schema still requires the compatibility relationship: if `subjectNames` is present, its first item must equal `subjectName`. Supplying both as shown works across that transition and allows additional accepted SANs when rotation requires them. These fields control SAN matching, not SNI selection.

Do not put the public client hostname in this field unless the backend certificate really uses it. The edge certificate for `ledger.example.com` and the upstream certificate are separate identities.

## Understand the Host and SNI Coupling

Certificate validation, TLS SNI, and the HTTP `Host` or HTTP/2 `:authority` are separate protocol concepts. Contour 1.33 nevertheless couples the last two for an HTTPProxy Service: a Host rewrite also supplies SNI. There is no separate per-Service SNI field.

If the backend requires a particular authority, set it explicitly on only that service:

```yaml
    - name: ledger
      port: 8443
      protocol: tls
      validation:
        caSecret: ledger-upstream-ca
        subjectName: ledger.internal.example
        subjectNames:
        - ledger.internal.example
      requestHeadersPolicy:
        set:
        - name: Host
          value: ledger.internal.example
```

Contour treats `Host` specially for a TLS upstream. The rewrite affects both authority and SNI, so make the rewritten host acceptable to the application and include it in the validated certificate identity. Use a static trusted value; do not copy an arbitrary client header into `Host`.

For native gRPC over TLS, use `protocol: h2`, not `tls`, so Envoy negotiates HTTP/2 with the backend. The same `validation` block applies.

## Validate from Envoy's Network Position

A successful request from a laptop does not prove Envoy can reach the backend endpoints. For an ordinary ClusterIP Service, Contour discovers endpoint addresses through Kubernetes and Envoy connects directly to them; Envoy does not need to resolve the Service DNS name. First inspect the Service and ready endpoints:

```bash
kubectl -n payments get service ledger -o yaml
kubectl -n payments get endpointslice \
  -l kubernetes.io/service-name=ledger -o yaml
```

Then run a temporary diagnostic with the same effective network access as Envoy, accounting for both source egress and backend ingress policies, including Pod and namespace selectors, or exec a supported diagnostic tool already present in the environment:

```bash
openssl s_client \
  -connect ledger.payments.svc.cluster.local:8443 \
  -servername ledger.payments.svc.cluster.local \
  -verify_hostname ledger.payments.svc.cluster.local \
  -CAfile /path/to/ledger-ca-chain.pem \
  -verify_return_error </dev/null
```

This probes the Service address. Repeat with `-connect` set to each ready endpoint IP and its EndpointSlice port, retaining the same `-servername` and `-verify_hostname` values, to test the destinations Envoy actually uses. Verify the chain result, SAN, validity dates, and negotiated TLS version. For an HTTP/2 backend, add `-alpn h2` and check that ALPN selects `h2`. Never work around a name failure with `-verify_hostname` set to an unrelated value or by disabling verification.

## Read Contour and Envoy Evidence

Contour rejects a route when the CA Secret is missing or fails its type, key, or PEM-bundle checks. A valid HTTPProxy status does not guarantee that Envoy will accept the certificate contents or complete the upstream handshake:

```bash
kubectl -n payments describe httpproxy ledger
```

Once the HTTPProxy is valid, send a request and inspect Envoy's access log:

```bash
curl --fail --show-error https://ledger.example.com/healthz
kubectl -n projectcontour logs daemonset/envoy -c envoy --all-pods=true --since=5m
```

Adjust the namespace and workload name for your installation. Correlate the request by path, time, or request ID; the logged authority may be the rewritten upstream host. If access logs use a different destination, inspect that destination instead.

Common causes are:

| Evidence | Likely fault |
| --- | --- |
| HTTPProxy invalid, CA Secret missing | Wrong namespace, name, type, or `ca.crt` key |
| Envoy reports upstream certificate verification failure | Check the server chain, trusted CA bundle, certificate validity, and SAN; an unknown-CA alert received from the backend can instead indicate rejection of an mTLS client certificate |
| SAN match failure | None of the configured subject names appears in the server certificate |
| Connection reset or `UF` | Backend is plaintext, wrong port, network policy, or TLS handshake failure |
| HTTP 404 from backend | TLS worked, but the upstream HTTP authority or path is wrong |

Increase Envoy TLS debug logging only for a short, controlled period and avoid logging sensitive request data.

## Rotate the CA Without an Outage

For a CA transition, use an overlap:

1. add the new CA certificate to `ca.crt` while retaining the old CA;
2. wait for Envoy configuration to update;
3. deploy backend certificates signed by the new CA;
4. verify every endpoint serves the new chain; and
5. remove the old CA after all old certificates are gone.

If the backend DNS SAN changes too, temporarily list both names under `subjectNames`; its first entry must still equal the required singular `subjectName`. Separately choose a static Host and SNI value that the backend can serve throughout the overlap. Broad wildcards weaken identity checks and are not a substitute for a planned rotation.

## Conclusion

Secure upstream TLS requires more than toggling encryption. Select the TLS-speaking Service port, provide a CA-only Secret, validate the intended DNS SAN, and set the upstream Host when a ClusterIP backend needs SNI. Test from Envoy's network path and rotate CA trust with an overlap rather than disabling verification.

## Official Documentation

- [Contour 1.33 upstream TLS](https://projectcontour.io/docs/1.33/config/upstream-tls/)
- [Contour 1.33 request rewriting](https://projectcontour.io/docs/1.33/config/request-rewriting/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Envoy upstream TLS contexts](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/tls.proto)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
