# How to Configure Redis TLS/SSL for IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, TLS, SSL, IPv4, Security, Encryption

Description: Enable TLS encryption on Redis for IPv4 connections by generating certificates, configuring tls-port and tls-cert-file directives, and connecting clients with TLS options.

## Introduction

Redis supports TLS starting with version 6.0 when built with TLS support. Enabling TLS ensures that data in transit between Redis clients and the server is encrypted, preventing eavesdropping on your IPv4 network. This guide covers certificate generation, Redis TLS configuration, and connecting clients.

## Generating TLS Certificates

```bash
# Create a Certificate Authority (CA) and server certificate

# For production: use your organization's CA, or a public CA such as Let's Encrypt
# for publicly reachable IPs or DNS names

# Create the TLS directory first
sudo mkdir -p /etc/redis/tls

# Create CA key and certificate
sudo openssl genrsa -out /etc/redis/tls/ca.key 4096
sudo openssl req -new -x509 -days 3650 -key /etc/redis/tls/ca.key \
  -out /etc/redis/tls/ca.crt \
  -subj "/CN=Redis-CA/O=MyOrg"

# Create server key and CSR
sudo openssl genrsa -out /etc/redis/tls/redis.key 2048
sudo openssl req -new -key /etc/redis/tls/redis.key \
  -out /etc/redis/tls/redis.csr \
  -subj "/CN=10.0.0.5/O=MyOrg"

# Add a subjectAltName for the IPv4 address
sudo tee /etc/redis/tls/redis.ext > /dev/null <<'EOF'
[v3_req]
subjectAltName = IP:10.0.0.5
EOF

# Sign the server certificate with CA
sudo openssl x509 -req -days 365 \
  -in /etc/redis/tls/redis.csr \
  -CA /etc/redis/tls/ca.crt \
  -CAkey /etc/redis/tls/ca.key \
  -CAcreateserial \
  -out /etc/redis/tls/redis.crt \
  -extfile /etc/redis/tls/redis.ext \
  -extensions v3_req

# Set correct permissions
sudo chown redis:redis /etc/redis/tls/*.key /etc/redis/tls/*.crt
sudo chmod 600 /etc/redis/tls/*.key
sudo chmod 644 /etc/redis/tls/*.crt
```

## Redis TLS Configuration

```bash
# /etc/redis/redis.conf

# Bind to specific IPv4 address
bind 10.0.0.5 127.0.0.1

# Regular port (disable if you want TLS-only)
# port 6379
port 0   # Disable plaintext port for TLS-only mode

# TLS port
tls-port 6380

# TLS certificates
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt

# Require client certificates (mutual TLS)
# tls-auth-clients yes    # Clients must present a certificate
# tls-auth-clients no     # Server-only TLS (clients don't need cert)
tls-auth-clients no

# TLS protocol versions (disable old protocols)
tls-protocols "TLSv1.2 TLSv1.3"

# Cipher suites
tls-ciphers "ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256"
tls-ciphersuites "TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256"

# Prefer server ciphers
tls-prefer-server-ciphers yes

# Authentication (still required even with TLS)
requirepass your_strong_password
```

```bash
sudo systemctl restart redis-server
```

## Verifying TLS Is Active

```bash
# Check Redis is listening on TLS port
ss -tlnp | grep redis
# Should show: 10.0.0.5:6380

# Test TLS connection with openssl
openssl s_client -connect 10.0.0.5:6380 \
  -CAfile /etc/redis/tls/ca.crt \
  -verify_return_error \
  -verify_ip 10.0.0.5
# Look for: Verify return code: 0 (ok)

# Connect with redis-cli using TLS
redis-cli -h 10.0.0.5 -p 6380 \
  --tls \
  --cacert /etc/redis/tls/ca.crt \
  -a your_strong_password \
  ping
# Expected: PONG
```

## Client Connection Examples

```python
# Python (redis-py)
import redis

client = redis.Redis(
    host='10.0.0.5',
    port=6380,
    password='your_strong_password',
    ssl=True,
    ssl_ca_certs='/etc/redis/tls/ca.crt',
    # For mutual TLS:
    # ssl_certfile='/path/to/client.crt',
    # ssl_keyfile='/path/to/client.key',
)
client.ping()
```

```javascript
// Node.js (ioredis)
const Redis = require('ioredis');
const fs = require('fs');

const client = new Redis({
  host: '10.0.0.5',
  port: 6380,
  password: 'your_strong_password',
  tls: {
    ca: fs.readFileSync('/etc/redis/tls/ca.crt'),
    // For mutual TLS:
    // cert: fs.readFileSync('/path/to/client.crt'),
    // key: fs.readFileSync('/path/to/client.key'),
  },
});
```

## TLS for Redis Replication

When running a replica, TLS must be configured for replication traffic:

```bash
# /etc/redis/redis.conf (on replica)
bind 10.0.0.6 127.0.0.1
port 0
tls-port 6380
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt

# Replicate from master over TLS
replicaof 10.0.0.5 6380
tls-replication yes

# Master authentication
masterauth your_strong_password
requirepass your_strong_password
```

## TLS for Redis Cluster

```bash
# /etc/redis/redis.conf (cluster node)
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000

# Cluster bus also uses TLS
tls-cluster yes
tls-port 6380
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
```

## Firewall Rules

```bash
# Allow TLS Redis connections from application servers
sudo iptables -A INPUT -s 10.0.0.0/24 -p tcp --dport 6380 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6380 -j DROP
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP   # Block plaintext if disabled
```

## Conclusion

Redis TLS on IPv4 requires setting `tls-port`, `tls-cert-file`, `tls-key-file`, and `tls-ca-cert-file` in `redis.conf`. Set `port 0` to disable plaintext and force TLS-only connections. Use `tls-protocols "TLSv1.2 TLSv1.3"` to exclude older protocols. Test the connection with `openssl s_client` before updating application clients. For Sentinel and Cluster deployments, add `tls-replication yes` and `tls-cluster yes` to encrypt inter-node traffic as well.
