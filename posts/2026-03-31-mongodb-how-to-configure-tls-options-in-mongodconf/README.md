# How to Configure TLS Options in mongod.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TLS, Security, Configuration, mongod.conf, Certificate

Description: Learn how to configure TLS encryption in mongod.conf to secure MongoDB connections with certificates and enforce encrypted client communication.

---

## Introduction

TLS (Transport Layer Security) encrypts all network traffic between MongoDB clients, replica set members, and mongos routers. Enabling TLS in `mongod.conf` is essential for any production deployment where MongoDB is accessible over a network. This guide covers certificate setup, TLS modes, and client connection configuration.

## Prerequisites

You need:
- A server certificate and private key (`server.pem`)
- A CA certificate file (`ca.pem`) for verifying client certificates
- Optionally, a client certificate for mutual TLS authentication

## Basic TLS Configuration

```yaml
net:
  port: 27017
  bindIp: 0.0.0.0
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/server.pem
    CAFile: /etc/ssl/mongodb/ca.pem
```

## TLS Modes

| Mode | Behavior |
|------|---------|
| disabled | No TLS |
| allowTLS | Both TLS and non-TLS connections accepted |
| preferTLS | Prefer TLS but allow non-TLS |
| requireTLS | TLS required for all connections |

Use `requireTLS` in production:

```yaml
net:
  tls:
    mode: requireTLS
```

## Certificate Key File with Password

If your private key is encrypted, provide the password:

```yaml
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/server.pem
    certificateKeyFilePassword: "your-password"
    CAFile: /etc/ssl/mongodb/ca.pem
```

## Allowing Connections Without Client Certificates

To require TLS encryption but not mutual TLS authentication:

```yaml
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/server.pem
    CAFile: /etc/ssl/mongodb/ca.pem
    allowConnectionsWithoutCertificates: true
```

## Connecting with TLS from mongosh

```bash
mongosh --host localhost --port 27017 \
  --tls \
  --tlsCAFile /etc/ssl/mongodb/ca.pem \
  --tlsCertificateKeyFile /etc/ssl/mongodb/client.pem
```

## Connecting with TLS from Node.js

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017/mydb", {
  tls: true,
  tlsCAFile: "/etc/ssl/mongodb/ca.pem",
  tlsCertificateKeyFile: "/etc/ssl/mongodb/client.pem"
});
```

## Disabling Certificate Validation (Development Only)

Never use in production:

```yaml
net:
  tls:
    mode: allowTLS
    certificateKeyFile: /etc/ssl/mongodb/server.pem
    allowInvalidCertificates: true
    allowInvalidHostnames: true
```

## Verifying TLS is Active

After restarting mongod, verify TLS is enabled:

```javascript
db.adminCommand({ serverStatus: 1 }).security.SSLServerSubjectName
```

## Summary

Configuring TLS in `mongod.conf` encrypts all MongoDB network traffic, protecting sensitive data in transit. Using `requireTLS` mode ensures no unencrypted connections are accepted. Combine with client certificate authentication for mutual TLS to verify both server and client identity in high-security environments.
