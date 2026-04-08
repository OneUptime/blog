# How to Use MongoDB Compass with TLS/SSL Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compass, TLS, SSL, Security

Description: Learn how to configure MongoDB Compass to connect securely using TLS/SSL certificates for encrypted connections to MongoDB servers.

---

## Why TLS/SSL for MongoDB Connections?

Without TLS, data traveling between Compass and MongoDB is transmitted in plaintext. Anyone with network access between the two can read queries and results. TLS encrypts the connection and, when using client certificates, also authenticates the client to the server.

## TLS Connection Modes in Compass

Compass supports four TLS modes:

- **Default (On)** - enables TLS, validates the server certificate against system trust store
- **System CA** - same as default but explicitly uses the OS certificate store
- **Server Validation** - validates server cert against a custom CA file
- **Full Certificate Validation** - validates server cert AND presents a client certificate

## Connecting to MongoDB Atlas (TLS On by Default)

Atlas requires TLS and Compass handles this automatically when using an Atlas connection string:

```text
mongodb+srv://username:password@cluster0.abc.mongodb.net/mydb?tls=true
```

No additional TLS configuration is required for Atlas.

## Connecting to a Self-Hosted MongoDB with TLS

### Server Certificate Validation Only

In Compass Advanced Connection Options, under TLS/SSL:

1. Set TLS/SSL to Required
2. Under Certificate Authority, upload your CA certificate file: `ca.pem`

Your MongoDB server must have been started with:

```bash
mongod \
  --tlsMode requireTLS \
  --tlsCertificateKeyFile /etc/ssl/mongodb.pem \
  --tlsCAFile /etc/ssl/ca.pem
```

### Mutual TLS (Client Certificate Authentication)

For mutual TLS, you also provide a client certificate:

1. Set TLS/SSL to Required
2. Upload Certificate Authority: `ca.pem`
3. Upload Client Certificate: `client.pem` (contains both cert and key)

If the client key is in a separate file:

```bash
# Combine cert and key into a single PEM file
cat client.crt client.key > client.pem
```

Your mongod must be configured to require client certificates:

```bash
mongod \
  --tlsMode requireTLS \
  --tlsCertificateKeyFile /etc/ssl/mongodb.pem \
  --tlsCAFile /etc/ssl/ca.pem
```

When `--tlsCAFile` is specified and `--tlsAllowConnectionsWithoutCertificates` is not set, mongod requires clients to present a valid certificate by default.

## Connection String with TLS Parameters

You can also configure TLS in the connection string directly:

```text
mongodb://user:pass@host:27017/mydb?tls=true&tlsCAFile=/path/to/ca.pem&tlsCertificateKeyFile=/path/to/client.pem
```

## Generating Self-Signed Certificates for Development

For local development and testing:

```bash
# Generate CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 1826 -key ca.key -out ca.crt -subj "/CN=MyCA"

# Generate server key and CSR
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr -subj "/CN=localhost"

# Sign server certificate with CA
openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt

# Combine server cert and key for mongod
cat server.crt server.key > server.pem
```

Start mongod with the self-signed cert:

```bash
mongod --tlsMode requireTLS \
  --tlsCertificateKeyFile ./server.pem \
  --tlsCAFile ./ca.crt
```

In Compass, set Certificate Authority to `ca.crt` and connect.

## Disabling Hostname Validation (Not for Production)

If using self-signed certs in development with a hostname mismatch:

Enable Allow Invalid Hostnames in the TLS/SSL section. Never use this in production - it defeats the purpose of TLS.

## Verifying the TLS Connection

After connecting, Compass shows a lock icon next to the connection name. Click the `i` icon on the connection to see TLS details including the server certificate information.

## Summary

Compass makes TLS configuration straightforward through its GUI. For Atlas, TLS works out of the box. For self-hosted MongoDB, upload the CA certificate for server validation or add a client certificate for mutual TLS. Keep certificates in a secure location and rotate them on a schedule - never commit PEM files to version control.
