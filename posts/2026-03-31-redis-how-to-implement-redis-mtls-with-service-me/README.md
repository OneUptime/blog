# How to Implement Redis mTLS with Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, mTLS, Security, TLS, Certificate, Service Mesh, Kubernetes

Description: Step-by-step guide to securing Redis connections with mutual TLS (mTLS) using certificates, Redis TLS configuration, and service mesh integration.

---

## What Is mTLS for Redis?

Mutual TLS (mTLS) ensures both the client and server authenticate each other with certificates. For Redis, this means:

- Redis verifies client certificates before accepting connections
- Clients verify the Redis server certificate before sending data
- All data is encrypted in transit

## Generating Certificates with cfssl

Install cfssl for certificate generation:

```bash
# Install cfssl
go install github.com/cloudflare/cfssl/cmd/cfssl@latest
go install github.com/cloudflare/cfssl/cmd/cfssljson@latest

# Or use OpenSSL
```

## Generating CA and Certificates with OpenSSL

```bash
# Create a directory for certificates
mkdir -p /etc/redis/tls
cd /etc/redis/tls

# Generate CA private key
openssl genrsa -out ca.key 4096

# Generate CA certificate (self-signed, valid 10 years)
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -out ca.crt \
  -subj "/C=US/ST=California/L=San Francisco/O=MyOrg/CN=Redis-CA"

# Generate Redis server private key
openssl genrsa -out server.key 2048

# Generate server certificate signing request (CSR)
openssl req -new -key server.key -out server.csr \
  -subj "/C=US/ST=California/L=San Francisco/O=MyOrg/CN=redis.internal"

# Sign server certificate with CA
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365 -sha256

# Generate client private key
openssl genrsa -out client.key 2048

# Generate client CSR
openssl req -new -key client.key -out client.csr \
  -subj "/C=US/ST=California/L=San Francisco/O=MyOrg/CN=redis-client"

# Sign client certificate with CA
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out client.crt -days 365 -sha256

# Set proper permissions
chmod 600 *.key
chmod 644 *.crt
chown redis:redis *.key *.crt
```

## Configuring Redis for TLS

```text
# redis.conf
# Disable plaintext port (or keep it for internal trusted connections)
port 0

# Enable TLS port
tls-port 6380

# Server certificates
tls-cert-file /etc/redis/tls/server.crt
tls-key-file /etc/redis/tls/server.key

# CA certificate for verifying clients
tls-ca-cert-file /etc/redis/tls/ca.crt

# Require client certificates (mTLS)
tls-auth-clients yes

# TLS protocol versions and ciphers
tls-protocols "TLSv1.2 TLSv1.3"
tls-ciphers "ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"
tls-prefer-server-ciphers yes
```

## Testing mTLS Connection

```bash
# Connect with client certificate
redis-cli --tls \
  --cert /etc/redis/tls/client.crt \
  --key /etc/redis/tls/client.key \
  --cacert /etc/redis/tls/ca.crt \
  -p 6380 \
  PING

# Connection without client cert should fail
redis-cli --tls --cacert /etc/redis/tls/ca.crt -p 6380 PING
# Error: SSL_connect failed: error:...certificate required
```

## Node.js Client with mTLS

```javascript
const Redis = require('ioredis');
const fs = require('fs');

const redis = new Redis({
  port: 6380,
  host: 'redis.internal',
  tls: {
    cert: fs.readFileSync('/etc/redis/tls/client.crt'),
    key: fs.readFileSync('/etc/redis/tls/client.key'),
    ca: fs.readFileSync('/etc/redis/tls/ca.crt'),
    checkServerIdentity: (host, cert) => {
      // Custom verification if needed
      return undefined; // undefined means valid
    }
  }
});

redis.on('connect', () => console.log('mTLS connection established'));
redis.on('error', (err) => console.error('Redis TLS error:', err));

await redis.set('test-key', 'hello-mtls');
const value = await redis.get('test-key');
console.log(value); // hello-mtls
```

## Python Client with mTLS

```python
import redis
import ssl

context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
context.load_cert_chain('/etc/redis/tls/client.crt', '/etc/redis/tls/client.key')
context.load_verify_locations('/etc/redis/tls/ca.crt')
context.check_hostname = False  # Set True in production with proper DNS

r = redis.Redis(
    host='redis.internal',
    port=6380,
    ssl=True,
    ssl_context=context,
    decode_responses=True
)

r.ping()
print("mTLS connection successful")
```

## Kubernetes Secret for Certificates

```yaml
# redis-tls-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: redis-tls
  namespace: data-stores
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-server.crt>
  tls.key: <base64-encoded-server.key>
  ca.crt: <base64-encoded-ca.crt>
```

```bash
# Create secret from files
kubectl create secret generic redis-tls \
  --from-file=tls.crt=/etc/redis/tls/server.crt \
  --from-file=tls.key=/etc/redis/tls/server.key \
  --from-file=ca.crt=/etc/redis/tls/ca.crt \
  -n data-stores
```

## Redis Deployment with TLS Certificates Mounted

```yaml
# redis-tls-deployment.yaml
spec:
  template:
    spec:
      volumes:
        - name: redis-tls
          secret:
            secretName: redis-tls
      containers:
        - name: redis
          volumeMounts:
            - name: redis-tls
              mountPath: /etc/redis/tls
              readOnly: true
          command:
            - redis-server
            - --tls-port
            - "6380"
            - --port
            - "0"
            - --tls-cert-file
            - /etc/redis/tls/tls.crt
            - --tls-key-file
            - /etc/redis/tls/tls.key
            - --tls-ca-cert-file
            - /etc/redis/tls/ca.crt
            - --tls-auth-clients
            - "yes"
```

## Certificate Rotation

```bash
# Generate new certificates before expiry
openssl x509 -enddate -noout -in /etc/redis/tls/server.crt

# Update Kubernetes secret with new certs
kubectl create secret generic redis-tls \
  --from-file=tls.crt=new-server.crt \
  --from-file=tls.key=new-server.key \
  --from-file=ca.crt=ca.crt \
  -n data-stores \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart Redis to pick up new cert
kubectl rollout restart deployment/redis -n data-stores
```

## Summary

Redis mTLS requires generating a CA, server, and client certificates with OpenSSL, configuring Redis with tls-port and tls-auth-clients yes, and updating client applications to present their certificates. Store certificates in Kubernetes Secrets, mount them into pods, and plan for annual certificate rotation. mTLS ensures Redis connections are both encrypted and mutually authenticated, eliminating unauthorized access from within the cluster.
