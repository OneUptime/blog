# How to Implement mTLS over IPv6 in Service Meshes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: mTLS, IPv6, Service Mesh, TLS, Security, Istio, Linkerd

Description: A guide to implementing mutual TLS (mTLS) authentication over IPv6 in service meshes, covering certificate management, IPv6 SAN validation, and testing mTLS connections between IPv6 endpoints.

Mutual TLS (mTLS) provides cryptographic identity verification between services. When services communicate over IPv6 addresses, the TLS certificates must include the correct Subject Alternative Names (SANs) for IPv6. This guide covers mTLS over IPv6 in Istio, Linkerd, and standalone Envoy.

## IPv6 in TLS Certificates

TLS certificates for services accessed via IPv6 must include the IPv6 address as a SAN of type iPAddress:

```bash
# Generate a CA key and certificate

openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=Service Mesh CA"

# Generate service key and CSR with IPv6 SAN
cat > service-ext.cnf << 'EOF'
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name

[req_distinguished_name]

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = my-service.default.svc.cluster.local
DNS.2 = my-service.default
DNS.3 = my-service
IP.1 = 10.96.0.50           # IPv4 ClusterIP
IP.2 = fd00:abcd::50        # IPv6 ClusterIP
EOF

openssl genrsa -out service.key 2048
openssl req -new -key service.key -out service.csr \
  -subj "/CN=my-service.default.svc.cluster.local"

# Sign the certificate with IPv6 SAN
openssl x509 -req -days 365 \
  -in service.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -extfile service-ext.cnf -extensions v3_req \
  -out service.crt

# Verify the IPv6 SAN is present
openssl x509 -in service.crt -noout -text | grep -A 5 "Subject Alternative Name"
```

## Istio mTLS over IPv6

Istio uses SPIFFE identity in certificates (`spiffe://cluster.local/ns/default/sa/service`), not IP SANs. This means mTLS works automatically for IPv6 because identity is service-account based, not IP-based:

```yaml
# PeerAuthentication - enforce STRICT mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

```bash
# Verify mTLS is working (check no plaintext traffic)
kubectl exec <pod> -c istio-proxy -- \
  pilot-agent request GET /config_dump | \
  python3 -m json.tool | grep -A 5 "tls_context"

# Test that HTTP (non-mTLS) is rejected
kubectl run test-curl --image=curlimages/curl --restart=Never -- \
  curl -v http://my-service.default/   # Should be rejected with mTLS STRICT

# Verify SPIFFE identity in certificate
kubectl exec <pod> -c istio-proxy -- \
  openssl s_client \
  -connect [fd00:abcd::50]:80 \
  -showcerts 2>&1 | grep -A 2 "Subject Alternative Name"
```

## Linkerd mTLS over IPv6

Linkerd automatically issues SPIFFE/X.509 certificates and enforces mTLS:

```bash
# Check mTLS status for a deployment
linkerd viz edges deployment/my-app

# Output shows:
# SRC        DST      SRC_NS  DST_NS  SECURED
# frontend   my-app   default default √

# Inspect the certificate Linkerd issued (includes pod's IPv6 SAN)
kubectl exec $(kubectl get pod -l app=my-app -o name | head -1) \
  -c linkerd-proxy -- \
  openssl s_client -connect localhost:4143 -showcerts 2>&1 | \
  grep "Subject Alternative Name" -A 2
```

## Envoy mTLS Configuration with IPv6

```yaml
# Envoy TLS configuration with IPv6 SAN validation

static_resources:
  listeners:
    - name: inbound_listener
      address:
        socket_address:
          address: "::"
          port_value: 8080
          ipv4_compat: true
      filter_chains:
        - transport_socket:
            name: envoy.transport_sockets.tls
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
              require_client_certificate: true    # Enforce mTLS
              common_tls_context:
                tls_certificates:
                  - certificate_chain:
                      filename: /certs/server.crt
                    private_key:
                      filename: /certs/server.key
                validation_context:
                  trusted_ca:
                    filename: /certs/ca.crt
                  # Verify client certificate's SAN
                  match_typed_subject_alt_names:
                    - san_type: DNS
                      matcher:
                        prefix: "frontend"
          filters:
            - name: envoy.filters.network.http_connection_manager
              # ...

  clusters:
    - name: upstream
      type: STRICT_DNS
      dns_lookup_family: V6_ONLY
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
          common_tls_context:
            tls_certificates:
              - certificate_chain:
                  filename: /certs/client.crt
                private_key:
                  filename: /certs/client.key
            validation_context:
              trusted_ca:
                filename: /certs/ca.crt
              # Validate server cert has the expected IPv6 SAN
              match_typed_subject_alt_names:
                - san_type: IP_ADDRESS
                  matcher:
                    exact: "fd00:abcd::100"
```

## Testing mTLS over IPv6

```bash
# Test mTLS connection to an IPv6 endpoint
openssl s_client \
  -connect [fd00::10]:8443 \
  -cert client.crt \
  -key client.key \
  -CAfile ca.crt \
  -verify_ip fd00::10 \
  -brief

# Expected output: CONNECTION ESTABLISHED, Protocol: TLSv1.3

# Test without client cert (should fail for mTLS)
openssl s_client \
  -connect [fd00::10]:8443 \
  -CAfile ca.crt \
  -brief
# Expected: handshake failure

# Using curl with client cert over IPv6
curl --cert client.crt --key client.key \
  --cacert ca.crt \
  https://[fd00::10]:8443/

# Check certificate SAN matches IPv6 address
echo | openssl s_client -connect [fd00::10]:8443 2>&1 | \
  openssl x509 -noout -text | grep -A 3 "Subject Alternative Name"
```

## Certificate Rotation for IPv6 Services

```bash
# Istio auto-rotates certificates (default: 24h)
# Check certificate expiry for a pod
kubectl exec <pod> -c istio-proxy -- \
  openssl x509 -in /etc/certs/cert-chain.pem -noout -dates

# Force certificate rotation in Istio (modern Istio uses SDS, so workload
# certs live in proxy memory rather than Kubernetes secrets - restart the
# pod to make the proxy fetch a fresh cert from istiod)
kubectl rollout restart deployment/my-service -n default

# In Linkerd, cert rotation is automatic
# Check CA cert expiry
linkerd check --proxy
```

mTLS over IPv6 requires that certificates include IPv6 addresses as IP SANs when IP-based verification is used. SPIFFE-based identity (used by Istio and Linkerd) avoids this concern entirely, as identity is bound to service accounts rather than IP addresses, making mTLS over IPv6 as seamless as over IPv4.
