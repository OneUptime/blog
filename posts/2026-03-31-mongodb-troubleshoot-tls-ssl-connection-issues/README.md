# How to Troubleshoot MongoDB TLS/SSL Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TLS, SSL, Security, Connection

Description: Learn how to diagnose and fix common MongoDB TLS/SSL connection errors including certificate validation failures and handshake timeouts.

---

## Overview

TLS/SSL connection issues in MongoDB can halt your application with cryptic errors. This guide walks through the most common failure modes and how to resolve each one systematically.

## Common Error Messages

Before diving into fixes, identify which error you are seeing:

```text
Error: SSL handshake failed
Error: certificate verify failed
Error: unable to get local issuer certificate
MongoServerSelectionError: SSL routines:ssl3_read_bytes:tlsv1 alert unknown ca
```

Each error points to a specific root cause.

## Diagnose with OpenSSL

Use `openssl s_client` to test the TLS handshake independently from your driver:

```bash
openssl s_client -connect your-mongo-host:27017 \
  -CAfile /etc/ssl/certs/ca-bundle.crt \
  -cert /path/to/client.pem \
  -key /path/to/client.key
```

If the handshake succeeds here but fails in your app, the issue is in your driver configuration.

## Fix 1 - Certificate Authority Not Trusted

This is the most frequent cause. Your MongoDB server presents a certificate signed by a CA that your client does not trust.

```bash
# Verify the certificate chain
openssl verify -CAfile /path/to/ca.pem /path/to/server.pem

# On Linux, add the CA to the system trust store
sudo cp /path/to/custom-ca.pem /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

In your connection string, explicitly pass the CA file:

```bash
mongosh "mongodb://host:27017/?tls=true&tlsCAFile=/path/to/ca.pem"
```

## Fix 2 - Mismatched Hostname

MongoDB validates that the hostname in the connection string matches the CN or SAN in the server certificate.

```bash
# Inspect the certificate SAN fields
openssl x509 -in /path/to/server.pem -noout -ext subjectAltName
```

If your app connects via an IP address but the cert lists a hostname, use `tlsAllowInvalidHostnames=true` temporarily during testing only - never in production.

## Fix 3 - Expired Certificate

```bash
# Check certificate expiry
openssl x509 -in /path/to/server.pem -noout -dates
```

Renew the certificate and reload MongoDB without downtime using `db.rotateCertificates()` (available since MongoDB 4.4) to load the new certificate without restarting the server.

## Fix 4 - TLS Version Mismatch

If your server requires TLS 1.2 or higher but the client or intermediary negotiates TLS 1.0:

```yaml
# mongod.conf
net:
  tls:
    mode: requireTLS
    disabledProtocols: TLS1_0,TLS1_1
    certificateKeyFile: /etc/ssl/mongodb.pem
    CAFile: /etc/ssl/ca.pem
```

## Fix 5 - Client Certificate Required

When `requireTLS` is combined with `net.tls.CAFile`, the server may require client certificates. Pass both the certificate and key:

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://host:27017", {
  tls: true,
  tlsCertificateKeyFile: "/path/to/client.pem",
  tlsCAFile: "/path/to/ca.pem",
});
```

## Monitoring TLS Errors

Use OneUptime or your observability platform to alert on TLS handshake failures before they affect users. Log the following MongoDB server log fields:

```json
{
  "c": "NETWORK",
  "id": 23017,
  "ctx": "listener",
  "msg": "Error accepting new connection",
  "attr": { "error": "SSL handshake failed" }
}
```

Set an alert when this log line appears more than 5 times per minute.

## Summary

MongoDB TLS/SSL issues fall into a predictable set of categories: untrusted CAs, hostname mismatches, expired certificates, protocol version mismatches, and missing client certificates. Use `openssl s_client` to isolate whether the problem is at the network/TLS layer or in your driver configuration, then apply the targeted fix for your specific error message.
