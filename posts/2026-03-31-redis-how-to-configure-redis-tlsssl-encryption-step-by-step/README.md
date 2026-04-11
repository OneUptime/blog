# How to Configure Redis TLS/SSL Encryption Step by Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, TLS, SSL, Security, Encryption, Configuration

Description: A step-by-step guide to enabling TLS/SSL encryption for Redis client connections and replication, including certificate generation and configuration.

---

## Why Use TLS for Redis?

Without TLS, Redis traffic is transmitted in plain text. Anyone with access to the network can intercept commands and responses, including sensitive data like passwords, tokens, and user records. TLS encrypts all Redis traffic in transit, protecting against eavesdropping and man-in-the-middle attacks.

Redis has built-in TLS support since version 6.0.

## Prerequisites

- Redis 6.0 or later compiled with TLS support (`redis-server --version` should show `tls=yes`)
- OpenSSL installed
- A certificate authority (CA), server certificate, and key

## Step 1 - Verify TLS Support

```bash
redis-server --version
```

Output should include:

```text
Redis server v=7.0.0 malloc=libc bits=64 build=abc123 (tls=yes)
```

If TLS is not compiled in, you need to recompile or install a TLS-enabled package.

## Step 2 - Generate Certificates

For development/testing, generate a self-signed CA and server certificates:

```bash
mkdir -p /etc/ssl/redis && cd /etc/ssl/redis

# Generate CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=Redis CA"

# Generate server key
openssl genrsa -out redis.key 2048

# Generate server certificate signing request
openssl req -new -key redis.key -out redis.csr \
  -subj "/CN=redis-server"

# Sign the server certificate with the CA
openssl x509 -req -days 365 -in redis.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out redis.crt

# Generate client key and certificate (for mutual TLS)
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr \
  -subj "/CN=redis-client"
openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out client.crt

# Set permissions
chmod 600 *.key
chmod 644 *.crt
chown redis:redis *.key *.crt
```

## Step 3 - Configure Redis for TLS

Edit `redis.conf`:

```text
# Disable the plain text port (optional but recommended)
port 0

# Enable TLS port
tls-port 6380

# Server certificate and key
tls-cert-file /etc/ssl/redis/redis.crt
tls-key-file /etc/ssl/redis/redis.key

# CA certificate to verify client certificates
tls-ca-cert-file /etc/ssl/redis/ca.crt

# Require client certificates (mutual TLS)
tls-auth-clients yes

# TLS protocol versions
tls-protocols "TLSv1.2 TLSv1.3"

# Cipher suites (TLS 1.2)
tls-ciphers "ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256"

# Cipher suites (TLS 1.3)
tls-ciphersuites "TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256"

# Prefer server cipher order
tls-prefer-server-ciphers yes
```

Restart Redis:

```bash
systemctl restart redis
```

## Step 4 - Test the TLS Connection

Connect with redis-cli using TLS:

```bash
redis-cli --tls \
  --cert /etc/ssl/redis/client.crt \
  --key /etc/ssl/redis/client.key \
  --cacert /etc/ssl/redis/ca.crt \
  -h 127.0.0.1 -p 6380 PING
```

Expected output: `PONG`

Without proper certificates, you will get:

```text
Could not connect to Redis at 127.0.0.1:6380: SSL_connect failed: ...
```

## Step 5 - Configure TLS for Replication

Enable TLS on replica connections too:

```text
# replica.conf
tls-replication yes
tls-cert-file /etc/ssl/redis/redis.crt
tls-key-file /etc/ssl/redis/redis.key
tls-ca-cert-file /etc/ssl/redis/ca.crt
```

## Step 6 - Configure TLS in Your Application

### Python (redis-py)

```python
import redis
import ssl

context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
context.load_cert_chain(
    certfile="/etc/ssl/redis/client.crt",
    keyfile="/etc/ssl/redis/client.key"
)
context.load_verify_locations(cafile="/etc/ssl/redis/ca.crt")

r = redis.Redis(
    host="127.0.0.1",
    port=6380,
    ssl=True,
    ssl_context=context
)
print(r.ping())
```

### Node.js (ioredis)

```javascript
const Redis = require("ioredis");
const fs = require("fs");

const redis = new Redis({
  host: "127.0.0.1",
  port: 6380,
  tls: {
    cert: fs.readFileSync("/etc/ssl/redis/client.crt"),
    key: fs.readFileSync("/etc/ssl/redis/client.key"),
    ca: fs.readFileSync("/etc/ssl/redis/ca.crt"),
  },
});

redis.ping().then(console.log);
```

## Step 7 - Skip Client Certificates (One-Way TLS)

If you want server-side TLS without requiring client certificates, set:

```text
tls-auth-clients no
```

Clients only verify the server certificate:

```bash
redis-cli --tls --cacert /etc/ssl/redis/ca.crt -p 6380 PING
```

## Monitoring TLS Status

Verify TLS is configured by checking the active TLS port:

```bash
redis-cli --tls --cacert /etc/ssl/redis/ca.crt -p 6380 CONFIG GET tls-port
```

Output:

```text
1) "tls-port"
2) "6380"
```

## Summary

Configuring Redis TLS involves generating server and client certificates, setting `tls-port` and certificate paths in `redis.conf`, and updating your application connection settings to use TLS. Use mutual TLS (`tls-auth-clients yes`) for maximum security in production. Always restrict the plain-text port or disable it entirely when TLS is enabled. Rotate certificates before they expire and test connections after any certificate update.
