# How to Configure Redis TLS Certificate and Key Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, TLS, Security, Configuration

Description: Configure Redis TLS with tls-cert-file, tls-key-file, and tls-ca-cert-file to encrypt client and replication traffic and enforce mutual authentication.

---

Redis supports TLS (Transport Layer Security) for encrypting connections between clients, replicas, and cluster nodes. Enabling TLS requires configuring certificate and key files and optionally a CA certificate for mutual authentication.

## Prerequisites

Generate or obtain a certificate and private key. For testing, create a self-signed certificate:

```bash
# Generate CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=Redis CA"

# Generate server key and certificate
openssl genrsa -out redis.key 2048
openssl req -new -key redis.key -out redis.csr \
  -subj "/CN=redis-server"
openssl x509 -req -days 365 -in redis.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial -out redis.crt
```

## Configuring TLS in redis.conf

```text
# redis.conf

# Enable TLS port (keep or replace standard port 6379)
tls-port 6380
port 0  # disable plaintext port (optional but recommended)

# Certificate and key files
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file  /etc/redis/tls/redis.key

# CA certificate for verifying client certificates
tls-ca-cert-file /etc/redis/tls/ca.crt

# Require clients to present a valid certificate (mutual TLS)
tls-auth-clients yes

# TLS version and cipher settings
tls-protocols "TLSv1.2 TLSv1.3"
tls-ciphers "DEFAULT:!aNULL:!eNULL:!EXPORT:!MD5:!RC4"
```

## Setting File Permissions

```bash
sudo mkdir -p /etc/redis/tls
sudo cp ca.crt redis.crt redis.key /etc/redis/tls/
sudo chown -R redis:redis /etc/redis/tls/
sudo chmod 600 /etc/redis/tls/redis.key
sudo chmod 644 /etc/redis/tls/redis.crt /etc/redis/tls/ca.crt
```

## Connecting with TLS

Test the connection with `redis-cli`:

```bash
redis-cli -p 6380 \
  --tls \
  --cert /etc/redis/tls/redis.crt \
  --key  /etc/redis/tls/redis.key \
  --cacert /etc/redis/tls/ca.crt \
  PING
```

In Python with `redis-py`:

```python
import redis
import ssl

r = redis.Redis(
    host='redis-server',
    port=6380,
    ssl=True,
    ssl_certfile='/etc/redis/tls/redis.crt',
    ssl_keyfile='/etc/redis/tls/redis.key',
    ssl_ca_certs='/etc/redis/tls/ca.crt',
    ssl_cert_reqs=ssl.CERT_REQUIRED
)
r.ping()
```

## Configuring TLS for Replication

Replicas also need TLS settings to connect to a TLS-enabled primary:

```text
# replica redis.conf
tls-replication yes
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file  /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
```

## Verifying TLS Configuration

Check that TLS is active:

```bash
redis-cli -p 6380 --tls \
  --cert /etc/redis/tls/redis.crt \
  --key /etc/redis/tls/redis.key \
  --cacert /etc/redis/tls/ca.crt \
  INFO server | grep tcp_port
```

```text
tcp_port:0
```

A successful connection confirms TLS is working. The `tcp_port:0` output confirms the plaintext port is disabled.

Test the certificate directly with OpenSSL:

```bash
openssl s_client -connect redis-server:6380 \
  -cert redis.crt -key redis.key -CAfile ca.crt
```

## Summary

Redis TLS requires three file paths: `tls-cert-file`, `tls-key-file`, and optionally `tls-ca-cert-file` for mutual authentication. Set `tls-port` and disable the plaintext port to enforce encrypted connections. Configure `tls-replication yes` on replicas and cluster nodes to encrypt inter-node traffic. Use `tls-auth-clients yes` to require client certificates in zero-trust environments.
