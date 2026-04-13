# How to Enable TLS/SSL Encryption for MongoDB Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TLS, Security, Encryption, Operation

Description: Enable TLS encryption for all MongoDB client and intra-cluster connections to protect data in transit from interception.

---

## Why TLS for MongoDB

Without TLS, MongoDB traffic travels in plaintext over the network. Any observer with network access can read query results, credentials, and data. TLS encrypts the connection, authenticates the server (preventing MITM attacks), and optionally authenticates the client.

## Generating Certificates for Testing

For production, use certificates from your CA. For testing:

```bash
# Generate CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=MongoDB-CA/O=MyOrg"

# Generate server key and certificate signing request
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr \
  -subj "/CN=mongo.example.com/O=MyOrg"

# Sign with CA
openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt

# Combine key and cert into PEM file (required by MongoDB)
cat server.key server.crt > server.pem
```

## Configure mongod.conf for TLS

```yaml
net:
  port: 27017
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/server.pem
    CAFile: /etc/ssl/mongodb/ca.crt
```

TLS modes:
- `disabled` - no TLS
- `allowTLS` - accepts both TLS and non-TLS connections
- `preferTLS` - uses TLS if client supports it
- `requireTLS` - rejects all non-TLS connections (recommended for production)

Restart after configuration:

```bash
sudo systemctl restart mongod
```

## Connecting with TLS from mongosh

```bash
mongosh \
  --host mongo.example.com \
  --port 27017 \
  --tls \
  --tlsCAFile /etc/ssl/mongodb/ca.crt \
  --username admin \
  --authenticationDatabase admin
```

## Connecting from Node.js

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://mongo.example.com:27017", {
  tls: true,
  tlsCAFile: "/etc/ssl/mongodb/ca.crt",
  // For mutual TLS (client certificate):
  // tlsCertificateKeyFile: "/etc/ssl/mongodb/client.pem"
  auth: {
    username: "appUser",
    password: process.env.MONGO_PASSWORD
  }
});
```

## Connection String with TLS Parameters

```text
mongodb://user:password@mongo.example.com:27017/mydb?tls=true&tlsCAFile=/path/to/ca.crt
```

## Verifying TLS is Active

Check TLS version statistics via server status:

```javascript
db.serverStatus().transportSecurity
```

This returns counts of connections by TLS version (e.g., TLS 1.2, TLS 1.3).

Use `openssl s_client` for network-level verification:

```bash
openssl s_client -connect mongo.example.com:27017 -CAfile /etc/ssl/mongodb/ca.crt
```

## Summary

Enable MongoDB TLS by placing PEM certificates on each server, setting `net.tls.mode: requireTLS` and the certificate paths in `mongod.conf`, then restarting. Update all client connection strings with `tls=true` and the CA file path. Use `requireTLS` in production to ensure no unencrypted connections are accepted.
