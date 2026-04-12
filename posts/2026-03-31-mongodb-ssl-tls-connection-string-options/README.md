# How to Use the ssl/tls Options in MongoDB Connection Strings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TLS, SSL, Security, Connection String

Description: Learn how to configure TLS/SSL options in MongoDB connection strings to encrypt data in transit and verify server and client certificates.

---

## TLS vs SSL in MongoDB

MongoDB deprecated the `ssl` parameter in favor of `tls` starting with driver versions aligned with MongoDB 4.2+. Both parameters enable the same encryption, but `tls` is the modern standard. This guide covers both for compatibility.

## Basic TLS Connection String

```text
mongodb://user:pass@host:27017/mydb?tls=true
```

For older drivers still using the `ssl` parameter:

```text
mongodb://user:pass@host:27017/mydb?ssl=true
```

## Full TLS Options Reference

```text
mongodb://host:27017/mydb
  ?tls=true
  &tlsCertificateKeyFile=/path/to/client.pem
  &tlsCertificateKeyFilePassword=keypassword
  &tlsCAFile=/path/to/ca.pem
  &tlsAllowInvalidCertificates=false
  &tlsAllowInvalidHostnames=false
```

## Node.js Driver with TLS

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://host:27017', {
  tls: true,
  // CA certificate to verify server identity
  tlsCAFile: '/etc/ssl/mongodb/ca.pem',
  // Client certificate for mutual TLS
  tlsCertificateKeyFile: '/etc/ssl/mongodb/client.pem',
  tlsCertificateKeyFilePassword: 'clientKeyPassword',
  // Never disable in production
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
});

await client.connect();
```

## PyMongo with TLS

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://host:27017",
    tls=True,
    tlsCAFile="/etc/ssl/mongodb/ca.pem",
    tlsCertificateKeyFile="/etc/ssl/mongodb/client.pem",
    tlsCertificateKeyFilePassword="clientKeyPassword",
    tlsAllowInvalidCertificates=False,
)
```

## Mutual TLS (mTLS) Connection String

For mutual TLS where both server and client present certificates:

```text
mongodb://host:27017/mydb?tls=true&tlsCertificateKeyFile=/path/client.pem&tlsCAFile=/path/ca.pem
```

## Testing TLS Without Certificate Validation (Development Only)

```javascript
// WARNING: Never use in production - disables certificate verification
const devClient = new MongoClient('mongodb://host:27017', {
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
});
```

## Verifying TLS Is Active

Connect via mongosh and check the connection info:

```bash
mongosh "mongodb://host:27017/mydb?tls=true&tlsCAFile=/path/ca.pem" \
  --eval "db.runCommand({ connectionStatus: 1 })"
```

Or use openssl to test the server directly:

```bash
openssl s_client -connect host:27017 -CAfile /path/to/ca.pem
```

## Atlas Always Requires TLS

MongoDB Atlas enforces TLS by default. The connection string from Atlas already includes the correct TLS settings:

```text
mongodb+srv://user:pass@cluster.mongodb.net/mydb?retryWrites=true&w=majority
```

When using SRV records with Atlas, TLS is always implied and does not need to be specified separately.

## Summary

Use `tls=true` (not `ssl=true`) in modern MongoDB connection strings. Always provide a CA file to verify server certificates, and use client certificates for mutual TLS in high-security environments. Never disable certificate validation in production deployments.
