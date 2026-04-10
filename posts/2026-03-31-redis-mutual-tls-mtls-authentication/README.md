# How to Set Up Redis Mutual TLS (mTLS) Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, TLS, Authentication, Certificate

Description: Learn how to configure Redis mutual TLS so both the server and clients authenticate each other with certificates, preventing unauthorized connections.

---

Mutual TLS (mTLS) goes beyond standard TLS by requiring both the Redis server and each client to present valid certificates. This ensures that only trusted clients can connect, even if an attacker obtains the server address.

## Generate Certificates

Start by creating a self-signed CA and certificates for both server and client:

```bash
# Create CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=Redis-CA"

# Server certificate
openssl genrsa -out redis-server.key 2048
openssl req -new -key redis-server.key -out redis-server.csr \
  -subj "/CN=redis-server"
openssl x509 -req -days 365 -in redis-server.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out redis-server.crt

# Client certificate
openssl genrsa -out redis-client.key 2048
openssl req -new -key redis-client.key -out redis-client.csr \
  -subj "/CN=redis-client"
openssl x509 -req -days 365 -in redis-client.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out redis-client.crt
```

## Configure Redis Server for mTLS

Edit `/etc/redis/redis.conf` to enable TLS and require client certificates:

```text
port 0
tls-port 6380
tls-cert-file /etc/redis/tls/redis-server.crt
tls-key-file /etc/redis/tls/redis-server.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-auth-clients yes
```

The `tls-auth-clients yes` directive is what enforces mutual authentication - clients without a valid certificate signed by your CA are rejected.

Restart Redis after applying changes:

```bash
sudo systemctl restart redis
```

## Connect with redis-cli Using Client Certificate

```bash
redis-cli -h 127.0.0.1 -p 6380 \
  --tls \
  --cert /etc/redis/tls/redis-client.crt \
  --key /etc/redis/tls/redis-client.key \
  --cacert /etc/redis/tls/ca.crt \
  PING
```

## Connect from Python

```python
import redis
import ssl

context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
context.load_verify_locations("/etc/redis/tls/ca.crt")
context.load_cert_chain(
    certfile="/etc/redis/tls/redis-client.crt",
    keyfile="/etc/redis/tls/redis-client.key"
)
context.check_hostname = False

r = redis.Redis(
    host="127.0.0.1",
    port=6380,
    ssl=True,
    ssl_context=context
)
print(r.ping())
```

## Test That mTLS Is Enforced

Try connecting without a client certificate - Redis should refuse:

```bash
redis-cli -h 127.0.0.1 -p 6380 --tls --cacert /etc/redis/tls/ca.crt PING
# Expected: Error: SSL_connect failed: ...
```

## Rotate Client Certificates Without Downtime

Update certificates using `tls-ca-cert-file` to point to a bundle containing both old and new CA certificates during the transition window, then remove the old CA once all clients are updated.

## Summary

Redis mTLS requires both server and client to present valid certificates, providing strong bidirectional authentication. Configure `tls-auth-clients yes` in `redis.conf` alongside the CA, server cert, and key. Clients must supply their own certificate and key when connecting, and connections without a valid cert are rejected.
