# How to Configure Cipher Suites in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, Cipher Suites, Security, Compliance

Description: How to configure and restrict TLS cipher suites in Istio for security compliance and hardening your service mesh encryption.

---

Cipher suites determine how encryption, key exchange, and authentication work during a TLS handshake. Not all cipher suites are created equal - some have known weaknesses, and compliance standards like PCI DSS and FIPS 140-2 require specific cipher suite configurations. Istio lets you control which cipher suites are available at the gateway level and for internal mesh traffic.

## What is a Cipher Suite

A cipher suite is a combination of algorithms used during a TLS connection:

- **Key exchange**: How client and server agree on encryption keys (ECDHE, RSA)
- **Authentication**: How the server (and optionally client) proves identity (RSA, ECDSA)
- **Bulk encryption**: How data is encrypted (AES-128-GCM, AES-256-GCM, CHACHA20-POLY1305)
- **MAC**: Message authentication code for integrity (SHA256, SHA384)

A typical cipher suite name looks like: `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384`

For TLS 1.3, the naming is simpler: `TLS_AES_256_GCM_SHA384` because TLS 1.3 only uses ECDHE for key exchange and removed older algorithms entirely.

## Default Cipher Suites in Istio

Istio uses Envoy's default cipher suite list, which is generally secure. You can check the current cipher suites on a gateway:

```bash
istioctl proxy-config listener istio-ingressgateway-xxxx -n istio-system -o json | \
  jq '.[].filterChains[].transportSocket.typedConfig.commonTlsContext.tlsParams.cipherSuites'
```

If the output is null or empty, Envoy uses its built-in defaults, which include a reasonable set of modern cipher suites.

## Configuring Cipher Suites on the Gateway

The most common place to restrict cipher suites is the ingress gateway, since it faces external clients. Configure them on the Gateway resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: tls-cert
        minProtocolVersion: TLSV1_2
        cipherSuites:
          - ECDHE-ECDSA-AES256-GCM-SHA384
          - ECDHE-RSA-AES256-GCM-SHA384
          - ECDHE-ECDSA-AES128-GCM-SHA256
          - ECDHE-RSA-AES128-GCM-SHA256
      hosts:
        - "app.example.com"
```

Note that cipher suites in the Gateway resource use the OpenSSL naming convention (with hyphens), not the IANA naming convention.

## Recommended Cipher Suites for TLS 1.2

For TLS 1.2 connections, stick to cipher suites that provide forward secrecy (ECDHE) and authenticated encryption (GCM or CHACHA20-POLY1305):

```yaml
cipherSuites:
  - ECDHE-ECDSA-AES256-GCM-SHA384
  - ECDHE-RSA-AES256-GCM-SHA384
  - ECDHE-ECDSA-CHACHA20-POLY1305
  - ECDHE-RSA-CHACHA20-POLY1305
  - ECDHE-ECDSA-AES128-GCM-SHA256
  - ECDHE-RSA-AES128-GCM-SHA256
```

Avoid these cipher suites:
- Anything with `RC4` - broken
- Anything with `DES` or `3DES` - weak
- Anything with `NULL` - no encryption
- Anything with `EXPORT` - deliberately weakened
- Anything with `CBC` mode without ECDHE - vulnerable to BEAST and POODLE variants
- Static RSA key exchange (no ECDHE prefix) - no forward secrecy

## TLS 1.3 Cipher Suites

TLS 1.3 has a fixed set of cipher suites that cannot be disabled individually through Istio's Gateway configuration. The TLS 1.3 cipher suites are:

- `TLS_AES_256_GCM_SHA384`
- `TLS_AES_128_GCM_SHA256`
- `TLS_CHACHA20_POLY1305_SHA256`

All three are considered secure. If you enforce TLS 1.3 minimum, you do not need to worry about cipher suite configuration as all options are strong.

## Configuring Cipher Suites Mesh-Wide

For sidecar-to-sidecar mTLS, you can configure cipher suites using the MeshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    meshMTLS:
      minProtocolVersion: TLSV1_2
```

For more granular control over cipher suites within the mesh, use an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: mesh-cipher-suites
  namespace: istio-system
spec:
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          listener_filters:
            - name: envoy.filters.listener.tls_inspector
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.listener.tls_inspector.v3.TlsInspector
    - applyTo: FILTER_CHAIN
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            transportProtocol: tls
      patch:
        operation: MERGE
        value:
          transport_socket:
            name: envoy.transport_sockets.tls
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
              common_tls_context:
                tls_params:
                  cipher_suites:
                    - ECDHE-ECDSA-AES256-GCM-SHA384
                    - ECDHE-RSA-AES256-GCM-SHA384
                    - ECDHE-ECDSA-AES128-GCM-SHA256
                    - ECDHE-RSA-AES128-GCM-SHA256
```

## FIPS 140-2 Compliant Configuration

If you need FIPS 140-2 compliance, use the FIPS-compliant Istio distribution (available from some vendors) and restrict cipher suites to FIPS-approved algorithms:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: fips-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: tls-cert
        minProtocolVersion: TLSV1_2
        cipherSuites:
          - ECDHE-ECDSA-AES256-GCM-SHA384
          - ECDHE-ECDSA-AES128-GCM-SHA256
          - ECDHE-RSA-AES256-GCM-SHA384
          - ECDHE-RSA-AES128-GCM-SHA256
      hosts:
        - "fips-app.example.com"
```

Note: CHACHA20-POLY1305 is NOT FIPS-approved, so exclude it from FIPS configurations.

## Testing Cipher Suite Configuration

After configuring cipher suites, verify with `openssl` or `nmap`:

```bash
# Test a specific cipher suite
openssl s_client -connect gateway-ip:443 \
  -servername app.example.com \
  -cipher ECDHE-RSA-AES256-GCM-SHA384

# Test that a weak cipher is rejected
openssl s_client -connect gateway-ip:443 \
  -servername app.example.com \
  -cipher RC4-SHA
```

For a comprehensive scan:

```bash
nmap --script ssl-enum-ciphers -p 443 gateway-ip
```

This will list all cipher suites the server accepts, grouped by TLS version.

## Monitoring Cipher Suite Usage

Track which cipher suites are being used in practice through Envoy stats:

```bash
kubectl exec istio-ingressgateway-xxxx -n istio-system -- \
  pilot-agent request GET stats | grep ssl.ciphers
```

This shows counters for each cipher suite used in connections. If you see any unexpected cipher suites, investigate the client making those connections.

## Performance Considerations

Cipher suite choice affects performance:

- **AES-GCM** is fast on processors with AES-NI instructions (most modern x86 and ARM processors)
- **CHACHA20-POLY1305** is faster on processors without AES-NI (some mobile devices, older ARM)
- **AES-256** is slightly slower than AES-128 but provides a larger security margin
- **ECDSA** certificates are faster for key exchange than RSA certificates

For most server-side deployments on modern hardware, `ECDHE-ECDSA-AES256-GCM-SHA384` or `ECDHE-ECDSA-AES128-GCM-SHA256` provide the best combination of security and performance. If you serve mobile clients, include CHACHA20-POLY1305 as an option so they get good performance too.

Picking the right cipher suites is about balancing security, compliance, and compatibility. Start with a restrictive set, test with your actual clients, and add cipher suites only if you find compatibility issues. It is much easier to add a cipher suite later than to remove one that clients have come to depend on.
