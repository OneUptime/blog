# How to Configure Loki TLS Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, TLS, SSL, Encryption, Security, Certificates, mTLS

Description: A comprehensive guide to configuring TLS encryption for Grafana Loki, covering certificate generation, server configuration, client setup, and mutual TLS for secure log transport.

---

Encrypting log data in transit is crucial for security and compliance. Grafana Loki supports TLS encryption for both its HTTP and gRPC interfaces, protecting sensitive log data from eavesdropping and tampering. This guide covers complete TLS configuration including certificate generation, server setup, client configuration, and mutual TLS (mTLS).

## Prerequisites

Before starting, ensure you have:

- Grafana Loki 2.4 or later
- OpenSSL or similar tool for certificate generation
- Understanding of PKI and certificate concepts
- Access to configure clients (Promtail, Grafana, etc.)

## TLS Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TLS Encrypted Communication                   │
│                                                                  │
│  ┌──────────────┐         TLS          ┌──────────────┐         │
│  │   Promtail   │─────────────────────▶│              │         │
│  │   (Client)   │   Encrypted Logs     │              │         │
│  └──────────────┘                      │              │         │
│                                        │    Loki      │         │
│  ┌──────────────┐         TLS          │   Server     │         │
│  │   Grafana    │─────────────────────▶│              │         │
│  │   (Client)   │   Encrypted Queries  │              │         │
│  └──────────────┘                      │              │         │
│                                        └──────────────┘         │
│                                                                  │
│  Certificate Authority (CA)                                      │
│  ├── Server Certificate (loki.example.com)                      │
│  ├── Client Certificate (promtail)                              │
│  └── Client Certificate (grafana)                               │
└─────────────────────────────────────────────────────────────────┘
```

## Generating Certificates

### Create Certificate Authority (CA)

```bash
#!/bin/bash
# generate-ca.sh

# Create directory structure
mkdir -p certs/{ca,server,clients}
cd certs

# Generate CA private key
openssl genrsa -out ca/ca.key 4096

# Generate CA certificate
openssl req -new -x509 -days 3650 -key ca/ca.key -out ca/ca.crt \
    -subj "/C=US/ST=California/L=San Francisco/O=MyOrg/OU=Platform/CN=Loki CA"

# Verify CA certificate
openssl x509 -in ca/ca.crt -text -noout | head -20

echo "CA certificate generated: certs/ca/ca.crt"
```

### Generate Server Certificate

```bash
#!/bin/bash
# generate-server-cert.sh

cd certs

# Generate server private key
openssl genrsa -out server/loki.key 2048

# Create server certificate signing request (CSR) config
cat > server/loki-csr.conf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C = US
ST = California
L = San Francisco
O = MyOrg
OU = Platform
CN = loki.example.com

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = loki.example.com
DNS.2 = loki
DNS.3 = localhost
DNS.4 = *.loki.svc.cluster.local
IP.1 = 127.0.0.1
IP.2 = 10.0.0.10
EOF

# Generate CSR
openssl req -new -key server/loki.key -out server/loki.csr \
    -config server/loki-csr.conf

# Create certificate extension config
cat > server/loki-ext.conf << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = loki.example.com
DNS.2 = loki
DNS.3 = localhost
DNS.4 = *.loki.svc.cluster.local
IP.1 = 127.0.0.1
IP.2 = 10.0.0.10
EOF

# Sign the certificate with CA
openssl x509 -req -in server/loki.csr \
    -CA ca/ca.crt -CAkey ca/ca.key -CAcreateserial \
    -out server/loki.crt -days 365 \
    -extfile server/loki-ext.conf

# Verify server certificate
openssl verify -CAfile ca/ca.crt server/loki.crt

echo "Server certificate generated: certs/server/loki.crt"
```

### Generate Client Certificates (for mTLS)

```bash
#!/bin/bash
# generate-client-cert.sh

CLIENT_NAME=${1:-promtail}

cd certs

# Generate client private key
openssl genrsa -out clients/${CLIENT_NAME}.key 2048

# Generate CSR
openssl req -new -key clients/${CLIENT_NAME}.key -out clients/${CLIENT_NAME}.csr \
    -subj "/C=US/ST=California/L=San Francisco/O=MyOrg/OU=Platform/CN=${CLIENT_NAME}"

# Sign with CA
openssl x509 -req -in clients/${CLIENT_NAME}.csr \
    -CA ca/ca.crt -CAkey ca/ca.key -CAcreateserial \
    -out clients/${CLIENT_NAME}.crt -days 365

# Verify
openssl verify -CAfile ca/ca.crt clients/${CLIENT_NAME}.crt

echo "Client certificate generated: certs/clients/${CLIENT_NAME}.crt"
```

Generate certificates for all clients:

```bash
./generate-client-cert.sh promtail
./generate-client-cert.sh grafana
./generate-client-cert.sh fluentbit
```

## Configuring Loki with TLS

### Basic TLS Configuration

```yaml
# loki-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: info

  # HTTP TLS configuration
  http_tls_config:
    cert_file: /etc/loki/certs/loki.crt
    key_file: /etc/loki/certs/loki.key
    # Optional: CA for client certificate verification (mTLS)
    # client_ca_file: /etc/loki/certs/ca.crt
    # client_auth_type: RequireAndVerifyClientCert

  # gRPC TLS configuration
  grpc_tls_config:
    cert_file: /etc/loki/certs/loki.crt
    key_file: /etc/loki/certs/loki.key
    # Optional: CA for client certificate verification (mTLS)
    # client_ca_file: /etc/loki/certs/ca.crt
    # client_auth_type: RequireAndVerifyClientCert

common:
  instance_addr: 127.0.0.1
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
```

### Mutual TLS (mTLS) Configuration

```yaml
# loki-config-mtls.yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

  # HTTP mTLS configuration
  http_tls_config:
    cert_file: /etc/loki/certs/loki.crt
    key_file: /etc/loki/certs/loki.key
    client_ca_file: /etc/loki/certs/ca.crt
    client_auth_type: RequireAndVerifyClientCert

  # gRPC mTLS configuration
  grpc_tls_config:
    cert_file: /etc/loki/certs/loki.crt
    key_file: /etc/loki/certs/loki.key
    client_ca_file: /etc/loki/certs/ca.crt
    client_auth_type: RequireAndVerifyClientCert

# ... rest of configuration
```

### Docker Compose with TLS

```yaml
version: "3.8"

services:
  loki:
    image: grafana/loki:2.9.4
    container_name: loki
    ports:
      - "3100:3100"
      - "9096:9096"
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml:ro
      - ./certs/server/loki.crt:/etc/loki/certs/loki.crt:ro
      - ./certs/server/loki.key:/etc/loki/certs/loki.key:ro
      - ./certs/ca/ca.crt:/etc/loki/certs/ca.crt:ro
      - loki-data:/loki
    command: -config.file=/etc/loki/config.yaml
    networks:
      - loki-network

  promtail:
    image: grafana/promtail:2.9.4
    container_name: promtail
    volumes:
      - ./promtail-config.yaml:/etc/promtail/config.yaml:ro
      - ./certs/clients/promtail.crt:/etc/promtail/certs/promtail.crt:ro
      - ./certs/clients/promtail.key:/etc/promtail/certs/promtail.key:ro
      - ./certs/ca/ca.crt:/etc/promtail/certs/ca.crt:ro
      - /var/log:/var/log:ro
    command: -config.file=/etc/promtail/config.yaml
    networks:
      - loki-network
    depends_on:
      - loki

  grafana:
    image: grafana/grafana:10.3.1
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./grafana-provisioning:/etc/grafana/provisioning:ro
      - ./certs/clients/grafana.crt:/etc/grafana/certs/grafana.crt:ro
      - ./certs/clients/grafana.key:/etc/grafana/certs/grafana.key:ro
      - ./certs/ca/ca.crt:/etc/grafana/certs/ca.crt:ro
      - grafana-data:/var/lib/grafana
    networks:
      - loki-network
    depends_on:
      - loki

networks:
  loki-network:
    driver: bridge

volumes:
  loki-data:
  grafana-data:
```

## Configuring Clients with TLS

### Promtail TLS Configuration

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: https://loki:3100/loki/api/v1/push
    tls_config:
      # CA certificate to verify server
      ca_file: /etc/promtail/certs/ca.crt
      # Client certificate for mTLS
      cert_file: /etc/promtail/certs/promtail.crt
      key_file: /etc/promtail/certs/promtail.key
      # Server name for certificate validation
      server_name: loki.example.com
      # Set to true only for testing with self-signed certs
      insecure_skip_verify: false

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: syslog
          __path__: /var/log/syslog
```

### Promtail TLS with External Labels

```yaml
clients:
  - url: https://loki.example.com:3100/loki/api/v1/push
    tls_config:
      ca_file: /etc/promtail/certs/ca.crt
      cert_file: /etc/promtail/certs/promtail.crt
      key_file: /etc/promtail/certs/promtail.key
    external_labels:
      cluster: production
      region: us-east-1
```

### Grafana Data Source with TLS

```yaml
# grafana-provisioning/datasources/loki.yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: https://loki:3100
    jsonData:
      maxLines: 1000
      tlsAuth: true
      tlsAuthWithCACert: true
    secureJsonData:
      tlsCACert: |
        -----BEGIN CERTIFICATE-----
        ... CA certificate content ...
        -----END CERTIFICATE-----
      tlsClientCert: |
        -----BEGIN CERTIFICATE-----
        ... Client certificate content ...
        -----END CERTIFICATE-----
      tlsClientKey: |
        -----BEGIN RSA PRIVATE KEY-----
        ... Client key content ...
        -----END RSA PRIVATE KEY-----
```

### Fluent Bit TLS Configuration

```ini
# fluent-bit.conf
[SERVICE]
    Flush         1
    Log_Level     info

[INPUT]
    Name          tail
    Path          /var/log/*.log
    Tag           logs.*

[OUTPUT]
    Name          loki
    Match         *
    Host          loki.example.com
    Port          3100
    TLS           On
    TLS.Verify    On
    TLS.CA_File   /fluent-bit/certs/ca.crt
    TLS.CRT_File  /fluent-bit/certs/fluentbit.crt
    TLS.Key_File  /fluent-bit/certs/fluentbit.key
    Labels        job=fluentbit
```

### Vector TLS Configuration

```toml
# vector.toml
[sources.logs]
type = "file"
include = ["/var/log/**/*.log"]

[sinks.loki]
type = "loki"
inputs = ["logs"]
endpoint = "https://loki.example.com:3100"
labels = { job = "vector" }

[sinks.loki.tls]
ca_file = "/etc/vector/certs/ca.crt"
crt_file = "/etc/vector/certs/vector.crt"
key_file = "/etc/vector/certs/vector.key"
verify_certificate = true
verify_hostname = true
```

## Distributed Loki TLS Configuration

### Inter-Component TLS

For distributed Loki deployments, configure TLS between components:

```yaml
# loki-distributed-config.yaml
auth_enabled: true

server:
  http_listen_port: 3100
  grpc_listen_port: 9095
  http_tls_config:
    cert_file: /etc/loki/certs/server.crt
    key_file: /etc/loki/certs/server.key
    client_ca_file: /etc/loki/certs/ca.crt
  grpc_tls_config:
    cert_file: /etc/loki/certs/server.crt
    key_file: /etc/loki/certs/server.key
    client_ca_file: /etc/loki/certs/ca.crt

# Ingester client TLS (for distributors connecting to ingesters)
ingester_client:
  grpc_client_config:
    tls_enabled: true
    tls_cert_path: /etc/loki/certs/client.crt
    tls_key_path: /etc/loki/certs/client.key
    tls_ca_path: /etc/loki/certs/ca.crt
    tls_server_name: loki-ingester

# Query frontend client TLS
frontend:
  grpc_client_config:
    tls_enabled: true
    tls_cert_path: /etc/loki/certs/client.crt
    tls_key_path: /etc/loki/certs/client.key
    tls_ca_path: /etc/loki/certs/ca.crt

# Memberlist TLS for gossip
memberlist:
  bind_port: 7946
  tls_enabled: true
  tls_cert_path: /etc/loki/certs/memberlist.crt
  tls_key_path: /etc/loki/certs/memberlist.key
  tls_ca_path: /etc/loki/certs/ca.crt
```

## Kubernetes TLS Configuration

### Using cert-manager

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: loki-tls
  namespace: loki
spec:
  secretName: loki-tls-secret
  issuerRef:
    name: loki-ca-issuer
    kind: ClusterIssuer
  commonName: loki.loki.svc.cluster.local
  dnsNames:
    - loki.loki.svc.cluster.local
    - loki.loki.svc
    - loki
    - "*.loki-headless.loki.svc.cluster.local"
  duration: 8760h  # 1 year
  renewBefore: 720h  # 30 days
```

### Loki Helm Values with TLS

```yaml
# values.yaml
loki:
  server:
    http_tls_config:
      cert_file: /etc/loki/certs/tls.crt
      key_file: /etc/loki/certs/tls.key
      client_ca_file: /etc/loki/certs/ca.crt
    grpc_tls_config:
      cert_file: /etc/loki/certs/tls.crt
      key_file: /etc/loki/certs/tls.key
      client_ca_file: /etc/loki/certs/ca.crt

extraVolumes:
  - name: tls-certs
    secret:
      secretName: loki-tls-secret

extraVolumeMounts:
  - name: tls-certs
    mountPath: /etc/loki/certs
    readOnly: true
```

## Testing TLS Configuration

### Verify Server Certificate

```bash
# Check certificate details
openssl s_client -connect loki.example.com:3100 -showcerts

# Verify certificate chain
openssl s_client -connect loki.example.com:3100 -CAfile ca.crt

# Check certificate expiration
openssl s_client -connect loki.example.com:3100 2>/dev/null | \
    openssl x509 -noout -dates
```

### Test TLS Connection

```bash
# Test with curl
curl --cacert certs/ca/ca.crt \
     --cert certs/clients/promtail.crt \
     --key certs/clients/promtail.key \
     https://loki.example.com:3100/ready

# Test push endpoint
curl --cacert certs/ca/ca.crt \
     --cert certs/clients/promtail.crt \
     --key certs/clients/promtail.key \
     -X POST https://loki.example.com:3100/loki/api/v1/push \
     -H "Content-Type: application/json" \
     -d '{"streams":[{"stream":{"job":"test"},"values":[["'$(date +%s)'000000000","test log"]]}]}'
```

### Debug TLS Issues

```bash
# Verbose SSL debugging
openssl s_client -connect loki.example.com:3100 -debug -state

# Check cipher suites
openssl s_client -connect loki.example.com:3100 -cipher 'HIGH:!aNULL:!MD5'

# Test specific TLS version
openssl s_client -connect loki.example.com:3100 -tls1_2
openssl s_client -connect loki.example.com:3100 -tls1_3
```

## Certificate Rotation

### Automated Rotation Script

```bash
#!/bin/bash
# rotate-certificates.sh

CERT_DIR="/etc/loki/certs"
CA_CERT="${CERT_DIR}/ca.crt"
CA_KEY="${CERT_DIR}/ca.key"

# Generate new server certificate
openssl genrsa -out ${CERT_DIR}/loki-new.key 2048

openssl req -new -key ${CERT_DIR}/loki-new.key \
    -out ${CERT_DIR}/loki-new.csr \
    -subj "/CN=loki.example.com"

openssl x509 -req -in ${CERT_DIR}/loki-new.csr \
    -CA ${CA_CERT} -CAkey ${CA_KEY} -CAcreateserial \
    -out ${CERT_DIR}/loki-new.crt -days 365

# Atomic swap
mv ${CERT_DIR}/loki.crt ${CERT_DIR}/loki-old.crt
mv ${CERT_DIR}/loki.key ${CERT_DIR}/loki-old.key
mv ${CERT_DIR}/loki-new.crt ${CERT_DIR}/loki.crt
mv ${CERT_DIR}/loki-new.key ${CERT_DIR}/loki.key

# Signal Loki to reload (if supported) or restart
# For Docker:
docker restart loki

# Cleanup
rm -f ${CERT_DIR}/loki-new.csr ${CERT_DIR}/*.srl

echo "Certificates rotated successfully"
```

## Best Practices

1. **Use Strong Key Sizes**: RSA 2048-bit minimum, prefer 4096-bit for CA
2. **Short Certificate Lifetimes**: Use 90-365 day certificates for servers
3. **Automate Rotation**: Use cert-manager or similar for automated rotation
4. **Monitor Expiration**: Alert on certificates expiring within 30 days
5. **Secure Private Keys**: Restrict file permissions (600) on key files
6. **Use SANs**: Include all hostnames and IPs in Subject Alternative Names
7. **Implement mTLS**: Use mutual TLS for high-security environments
8. **Regular Audits**: Review certificate configurations periodically

## Conclusion

TLS encryption is essential for protecting log data in transit. By properly configuring Loki and its clients with TLS, you ensure that sensitive log information cannot be intercepted or tampered with during transmission. Implementing mutual TLS provides additional security by verifying both client and server identities.

Key takeaways:
- Generate proper CA and certificate chains
- Configure Loki server with TLS for HTTP and gRPC
- Enable mTLS for high-security environments
- Configure all clients with proper TLS settings
- Use cert-manager for Kubernetes deployments
- Implement automated certificate rotation
- Monitor certificate expiration
- Test TLS configuration thoroughly
