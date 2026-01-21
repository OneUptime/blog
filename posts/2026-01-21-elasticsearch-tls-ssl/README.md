# How to Secure Elasticsearch with TLS/SSL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, TLS, SSL, Security, Encryption, HTTPS, Transport Layer

Description: A comprehensive guide to securing Elasticsearch with TLS/SSL encryption for both transport and HTTP layers, including certificate generation, configuration, and troubleshooting.

---

Securing Elasticsearch with TLS/SSL is essential for protecting data in transit between nodes, clients, and external services. This guide covers complete TLS configuration for both the transport layer (inter-node communication) and HTTP layer (client communication).

## Understanding Elasticsearch TLS Layers

Elasticsearch has two communication layers that need TLS:

- **Transport layer (port 9300)** - Node-to-node communication
- **HTTP layer (port 9200)** - Client-to-node communication (REST API)

## Prerequisites

Before configuring TLS, ensure you have:

- Elasticsearch 7.x or later installed
- `elasticsearch-certutil` tool (included with Elasticsearch)
- Root access to all cluster nodes

## Generating Certificates

### Option 1: Using elasticsearch-certutil (Recommended)

#### Generate Certificate Authority (CA)

```bash
# Generate CA certificate
/usr/share/elasticsearch/bin/elasticsearch-certutil ca \
  --out /etc/elasticsearch/certs/elastic-stack-ca.p12 \
  --pass ""

# Or with password
/usr/share/elasticsearch/bin/elasticsearch-certutil ca \
  --out /etc/elasticsearch/certs/elastic-stack-ca.p12 \
  --pass "ca-password"
```

#### Generate Node Certificates

For a single certificate for all nodes:

```bash
/usr/share/elasticsearch/bin/elasticsearch-certutil cert \
  --ca /etc/elasticsearch/certs/elastic-stack-ca.p12 \
  --out /etc/elasticsearch/certs/elastic-certificates.p12 \
  --pass ""
```

For per-node certificates (recommended for production):

```bash
# Create instances.yml
cat > /etc/elasticsearch/certs/instances.yml << 'EOF'
instances:
  - name: "node-1"
    ip:
      - "192.168.1.10"
    dns:
      - "node-1.example.com"
      - "localhost"
  - name: "node-2"
    ip:
      - "192.168.1.11"
    dns:
      - "node-2.example.com"
  - name: "node-3"
    ip:
      - "192.168.1.12"
    dns:
      - "node-3.example.com"
EOF

# Generate certificates for all instances
/usr/share/elasticsearch/bin/elasticsearch-certutil cert \
  --ca /etc/elasticsearch/certs/elastic-stack-ca.p12 \
  --in /etc/elasticsearch/certs/instances.yml \
  --out /etc/elasticsearch/certs/certs.zip \
  --pass ""

# Extract certificates
cd /etc/elasticsearch/certs
unzip certs.zip
```

### Option 2: Using OpenSSL

#### Create CA

```bash
# Create CA private key
openssl genrsa -out ca.key 4096

# Create CA certificate
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=Elasticsearch CA"
```

#### Create Node Certificate

```bash
# Create node private key
openssl genrsa -out node-1.key 4096

# Create certificate signing request
openssl req -new -key node-1.key -out node-1.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=node-1.example.com"

# Create SAN extension file
cat > node-1.ext << 'EOF'
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = node-1.example.com
DNS.2 = localhost
IP.1 = 192.168.1.10
IP.2 = 127.0.0.1
EOF

# Sign the certificate
openssl x509 -req -in node-1.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out node-1.crt -days 365 -extfile node-1.ext

# Convert to PKCS12 format
openssl pkcs12 -export -out node-1.p12 \
  -inkey node-1.key -in node-1.crt -certfile ca.crt \
  -password pass:changeme
```

## Configuring Transport Layer TLS

### Basic Transport TLS Configuration

Edit `elasticsearch.yml`:

```yaml
# Transport layer TLS
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: certs/elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: certs/elastic-certificates.p12
```

### With Password-Protected Certificates

```yaml
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: certs/elastic-certificates.p12
xpack.security.transport.ssl.keystore.password: ${KEYSTORE_PASSWORD}
xpack.security.transport.ssl.truststore.path: certs/elastic-certificates.p12
xpack.security.transport.ssl.truststore.password: ${TRUSTSTORE_PASSWORD}
```

Add passwords to the Elasticsearch keystore:

```bash
/usr/share/elasticsearch/bin/elasticsearch-keystore add \
  xpack.security.transport.ssl.keystore.secure_password

/usr/share/elasticsearch/bin/elasticsearch-keystore add \
  xpack.security.transport.ssl.truststore.secure_password
```

### Full Verification Mode

For highest security with hostname verification:

```yaml
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: full
xpack.security.transport.ssl.keystore.path: certs/node-1.p12
xpack.security.transport.ssl.truststore.path: certs/elastic-certificates.p12
```

## Configuring HTTP Layer TLS

### Basic HTTP TLS Configuration

```yaml
# HTTP layer TLS
xpack.security.http.ssl.enabled: true
xpack.security.http.ssl.keystore.path: certs/http.p12
xpack.security.http.ssl.truststore.path: certs/http.p12
```

### Generate HTTP Certificates

```bash
/usr/share/elasticsearch/bin/elasticsearch-certutil http

# Follow the prompts:
# - Generate CSR? No
# - Use existing CA? Yes
# - CA Path: /etc/elasticsearch/certs/elastic-stack-ca.p12
# - Validity: 365 days (or more for production)
# - Generate per-node certificates? Yes
# - Node names: node-1, node-2, node-3
# - IP addresses: include all relevant IPs
# - DNS names: include all relevant hostnames
```

This creates a zip file with:
- `elasticsearch/` - Node certificates
- `kibana/` - Certificates for Kibana configuration

### Complete HTTP Configuration

```yaml
xpack.security.http.ssl.enabled: true
xpack.security.http.ssl.keystore.path: certs/http.p12
xpack.security.http.ssl.verification_mode: certificate

# Client authentication (optional)
xpack.security.http.ssl.client_authentication: optional
```

## Complete elasticsearch.yml Example

```yaml
# Cluster configuration
cluster.name: secure-cluster
node.name: node-1
network.host: 0.0.0.0
discovery.seed_hosts: ["node-1", "node-2", "node-3"]
cluster.initial_master_nodes: ["node-1", "node-2", "node-3"]

# Enable X-Pack security
xpack.security.enabled: true

# Transport layer TLS (node-to-node)
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: full
xpack.security.transport.ssl.keystore.path: certs/node-1.p12
xpack.security.transport.ssl.truststore.path: certs/ca.p12

# HTTP layer TLS (client-to-node)
xpack.security.http.ssl.enabled: true
xpack.security.http.ssl.keystore.path: certs/http.p12
xpack.security.http.ssl.verification_mode: certificate
```

## Setting Up Built-in Users

After enabling security, set up passwords for built-in users:

```bash
# Auto-generate passwords
/usr/share/elasticsearch/bin/elasticsearch-setup-passwords auto

# Or set passwords interactively
/usr/share/elasticsearch/bin/elasticsearch-setup-passwords interactive
```

## Testing TLS Configuration

### Verify HTTPS Connection

```bash
# Basic connection test
curl -k -u elastic:password https://localhost:9200

# With CA certificate verification
curl --cacert /etc/elasticsearch/certs/ca.crt \
  -u elastic:password \
  https://node-1.example.com:9200

# Check cluster health
curl --cacert /etc/elasticsearch/certs/ca.crt \
  -u elastic:password \
  https://localhost:9200/_cluster/health?pretty
```

### Verify Certificate Details

```bash
# Check certificate expiration
openssl s_client -connect localhost:9200 </dev/null 2>/dev/null | \
  openssl x509 -noout -dates

# View full certificate info
openssl s_client -connect localhost:9200 </dev/null 2>/dev/null | \
  openssl x509 -noout -text
```

### Test Transport Layer

```bash
# Check node connectivity
curl --cacert /etc/elasticsearch/certs/ca.crt \
  -u elastic:password \
  https://localhost:9200/_nodes?pretty

# Verify all nodes joined
curl --cacert /etc/elasticsearch/certs/ca.crt \
  -u elastic:password \
  https://localhost:9200/_cat/nodes?v
```

## Configuring Clients

### Python Client

```python
from elasticsearch import Elasticsearch

es = Elasticsearch(
    ['https://node-1.example.com:9200'],
    basic_auth=('elastic', 'password'),
    ca_certs='/path/to/ca.crt',
    verify_certs=True
)

# Or with certificate authentication
es = Elasticsearch(
    ['https://node-1.example.com:9200'],
    client_cert='/path/to/client.crt',
    client_key='/path/to/client.key',
    ca_certs='/path/to/ca.crt'
)
```

### Node.js Client

```javascript
const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');

const client = new Client({
  node: 'https://node-1.example.com:9200',
  auth: {
    username: 'elastic',
    password: 'password'
  },
  tls: {
    ca: fs.readFileSync('/path/to/ca.crt'),
    rejectUnauthorized: true
  }
});
```

### Java Client

```java
import org.elasticsearch.client.RestClient;
import org.elasticsearch.client.RestHighLevelClient;
import org.apache.http.ssl.SSLContextBuilder;
import org.apache.http.ssl.SSLContexts;

SSLContext sslContext = SSLContexts.custom()
    .loadTrustMaterial(
        new File("/path/to/truststore.p12"),
        "password".toCharArray()
    )
    .build();

RestHighLevelClient client = new RestHighLevelClient(
    RestClient.builder(new HttpHost("node-1.example.com", 9200, "https"))
        .setHttpClientConfigCallback(httpClientBuilder ->
            httpClientBuilder.setSSLContext(sslContext)
        )
);
```

### cURL Alias

```bash
# Add to ~/.bashrc or ~/.zshrc
alias escurl='curl --cacert /etc/elasticsearch/certs/ca.crt -u elastic:password'

# Usage
escurl https://localhost:9200/_cluster/health?pretty
```

## Certificate Rotation

### Generate New Certificates

```bash
# Generate new certificates with the same CA
/usr/share/elasticsearch/bin/elasticsearch-certutil cert \
  --ca /etc/elasticsearch/certs/elastic-stack-ca.p12 \
  --out /etc/elasticsearch/certs/elastic-certificates-new.p12 \
  --pass ""
```

### Rolling Certificate Update

```bash
# For each node:

# 1. Copy new certificate
cp elastic-certificates-new.p12 /etc/elasticsearch/certs/elastic-certificates.p12

# 2. Restart Elasticsearch
systemctl restart elasticsearch

# 3. Verify node rejoins
curl --cacert ca.crt -u elastic:password \
  https://localhost:9200/_cat/nodes?v

# 4. Proceed to next node
```

### CA Rotation (More Complex)

```bash
# 1. Generate new CA
/usr/share/elasticsearch/bin/elasticsearch-certutil ca \
  --out /etc/elasticsearch/certs/elastic-stack-ca-new.p12

# 2. Generate new node certificates with new CA
# 3. Configure trust for both old and new CA temporarily
# 4. Roll out new certificates
# 5. Remove old CA from trust
```

## Troubleshooting

### Common Issues

#### Certificate Not Trusted

```
javax.net.ssl.SSLHandshakeException: PKIX path building failed
```

Solution: Ensure the CA certificate is in the truststore:

```bash
# Check truststore contents
keytool -list -v -keystore /etc/elasticsearch/certs/elastic-certificates.p12 \
  -storepass ""
```

#### Hostname Verification Failed

```
javax.net.ssl.SSLPeerUnverifiedException: Host name does not match
```

Solution: Ensure certificate includes correct SANs or use `verification_mode: certificate`:

```yaml
xpack.security.transport.ssl.verification_mode: certificate
```

#### Cannot Connect After Enabling TLS

```bash
# Check Elasticsearch logs
journalctl -u elasticsearch -f

# Common fixes:
# 1. Ensure all nodes have correct certificates
# 2. Check file permissions: chown elasticsearch:elasticsearch certs/*
# 3. Verify keystore passwords are correct
```

### Debugging TLS

```bash
# Enable SSL debugging
ES_JAVA_OPTS="-Djavax.net.debug=ssl" /usr/share/elasticsearch/bin/elasticsearch

# Check certificate chain
openssl s_client -connect localhost:9200 -showcerts

# Verify certificate matches key
openssl x509 -noout -modulus -in node.crt | openssl md5
openssl rsa -noout -modulus -in node.key | openssl md5
```

## Best Practices

### Certificate Management

1. **Use separate certificates per node** for production
2. **Set appropriate validity periods** - balance security and operational overhead
3. **Automate certificate rotation** with tools like cert-manager
4. **Monitor certificate expiration** with alerting
5. **Keep CA private key offline** after initial certificate generation

### Security Configuration

1. **Always use full verification mode** in production when possible
2. **Enable both transport and HTTP TLS**
3. **Use strong cipher suites**:

```yaml
xpack.security.transport.ssl.supported_protocols: ["TLSv1.3", "TLSv1.2"]
xpack.security.http.ssl.supported_protocols: ["TLSv1.3", "TLSv1.2"]
```

4. **Disable older TLS versions**:

```yaml
xpack.security.transport.ssl.supported_protocols: ["TLSv1.3"]
```

## Summary

Securing Elasticsearch with TLS involves:

1. **Generate certificates** using elasticsearch-certutil or OpenSSL
2. **Configure transport TLS** for inter-node communication
3. **Configure HTTP TLS** for client communication
4. **Set up authentication** with built-in users
5. **Configure clients** with appropriate certificates
6. **Plan certificate rotation** for ongoing maintenance

With proper TLS configuration, all data in transit is encrypted, protecting your Elasticsearch cluster from eavesdropping and man-in-the-middle attacks.
