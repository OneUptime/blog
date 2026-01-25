# How to Fix "Error: DEPTH_ZERO_SELF_SIGNED_CERT"

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, SSL, TLS, Certificates, Security

Description: Resolve the DEPTH_ZERO_SELF_SIGNED_CERT error in Node.js when connecting to servers with self-signed certificates by properly configuring TLS options.

---

When your Node.js application tries to connect to a server using HTTPS and you see this error:

```
Error: DEPTH_ZERO_SELF_SIGNED_CERT
    at TLSSocket.onConnectSecure (_tls_wrap.js:1515:34)
```

It means the server is using a self-signed certificate that is not trusted by Node.js. This commonly happens in development environments, internal services, or when connecting to APIs with custom certificates.

## Understanding the Error

Node.js validates SSL/TLS certificates by default. When it encounters a self-signed certificate (one not signed by a trusted Certificate Authority), it rejects the connection because there is no way to verify the certificate's authenticity.

## The Wrong Fix: Disabling SSL Verification

You will see this "solution" everywhere, but it is dangerous:

```javascript
// DO NOT DO THIS IN PRODUCTION
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```

This disables ALL certificate verification for your entire application, making it vulnerable to man-in-the-middle attacks. Only use this as a last resort in isolated development environments.

## The Right Fixes

### Option 1: Add the Certificate to Node.js Trust Store

If you have access to the self-signed certificate, add it explicitly:

```javascript
const https = require('https');
const fs = require('fs');

// Load the self-signed certificate
const ca = fs.readFileSync('/path/to/self-signed-cert.pem');

const options = {
    hostname: 'internal-api.example.com',
    port: 443,
    path: '/data',
    method: 'GET',
    ca: ca  // Trust this certificate
};

const req = https.request(options, (res) => {
    console.log('statusCode:', res.statusCode);
    res.on('data', (d) => process.stdout.write(d));
});

req.on('error', (e) => console.error(e));
req.end();
```

### Option 2: Use NODE_EXTRA_CA_CERTS Environment Variable

Add the certificate to Node.js at startup:

```bash
NODE_EXTRA_CA_CERTS=/path/to/self-signed-cert.pem node app.js
```

Or in your startup script:

```json
{
  "scripts": {
    "start": "NODE_EXTRA_CA_CERTS=./certs/ca.pem node src/index.js"
  }
}
```

### Option 3: Configure HTTPS Agent

For libraries like axios or fetch:

```javascript
const https = require('https');
const fs = require('fs');
const axios = require('axios');

// Load certificate
const ca = fs.readFileSync('./certs/self-signed.pem');

// Create custom HTTPS agent
const httpsAgent = new https.Agent({
    ca: ca,
    rejectUnauthorized: true  // Still verify, just trust our cert
});

// Use with axios
const response = await axios.get('https://internal-api.example.com/data', {
    httpsAgent
});

// Use with native fetch (Node 18+)
const response = await fetch('https://internal-api.example.com/data', {
    agent: httpsAgent
});
```

### Option 4: Configure Database Clients

For database connections with self-signed certs:

```javascript
// PostgreSQL with pg
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    host: 'db.internal.example.com',
    port: 5432,
    database: 'mydb',
    user: 'user',
    password: 'password',
    ssl: {
        ca: fs.readFileSync('./certs/db-ca.pem'),
        rejectUnauthorized: true
    }
});

// MongoDB
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://db.internal.example.com:27017', {
    tls: true,
    tlsCAFile: './certs/mongo-ca.pem'
});

// MySQL
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'db.internal.example.com',
    user: 'user',
    password: 'password',
    database: 'mydb',
    ssl: {
        ca: fs.readFileSync('./certs/mysql-ca.pem')
    }
});
```

### Option 5: Redis with Self-Signed Cert

```javascript
const Redis = require('ioredis');
const fs = require('fs');

const redis = new Redis({
    host: 'redis.internal.example.com',
    port: 6379,
    tls: {
        ca: fs.readFileSync('./certs/redis-ca.pem'),
        rejectUnauthorized: true
    }
});
```

## Development-Only: Disable for Specific Requests

If you must disable verification, do it per-request, not globally:

```javascript
const https = require('https');
const axios = require('axios');

// Only for development/testing
const insecureAgent = new https.Agent({
    rejectUnauthorized: false
});

// Use only for specific requests
if (process.env.NODE_ENV === 'development') {
    const response = await axios.get('https://localhost:8443/api', {
        httpsAgent: insecureAgent
    });
}
```

## Extracting a Server's Certificate

If you need to get the certificate from a server:

```bash
# Using openssl
openssl s_client -connect internal-api.example.com:443 -showcerts </dev/null 2>/dev/null | openssl x509 -outform PEM > server-cert.pem

# For the full chain
openssl s_client -connect internal-api.example.com:443 -showcerts </dev/null 2>/dev/null | sed -n '/-----BEGIN/,/-----END/p' > chain.pem
```

Programmatically in Node.js:

```javascript
const tls = require('tls');

function getCertificate(host, port = 443) {
    return new Promise((resolve, reject) => {
        const socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {
            const cert = socket.getPeerCertificate();
            socket.end();
            resolve(cert);
        });

        socket.on('error', reject);
    });
}

// Usage
const cert = await getCertificate('internal-api.example.com');
console.log('Subject:', cert.subject);
console.log('Issuer:', cert.issuer);
console.log('Valid from:', cert.valid_from);
console.log('Valid to:', cert.valid_to);
```

## Creating Proper Self-Signed Certs for Development

Instead of disabling verification, create proper self-signed certificates:

```bash
# Generate CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 365 -key ca.key -out ca.crt -subj "/CN=My Dev CA"

# Generate server key and CSR
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=localhost"

# Sign with CA
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365

# Use server.key and server.crt on your server
# Add ca.crt to your Node.js client
```

With Subject Alternative Names (SAN) for multiple hostnames:

```bash
# Create config file san.cnf
cat > san.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = api.local
IP.1 = 127.0.0.1
EOF

# Generate cert with SANs
openssl req -new -key server.key -out server.csr -config san.cnf
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365 -extensions v3_req -extfile san.cnf
```

## Docker and Kubernetes

Add certificates in containers:

```dockerfile
# Dockerfile
FROM node:18-alpine

# Copy CA certificate
COPY certs/ca.pem /usr/local/share/ca-certificates/my-ca.crt
RUN update-ca-certificates

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["node", "src/index.js"]
```

In Kubernetes, use secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-certs
data:
  ca.pem: <base64-encoded-certificate>

---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            - name: NODE_EXTRA_CA_CERTS
              value: /certs/ca.pem
          volumeMounts:
            - name: certs
              mountPath: /certs
      volumes:
        - name: certs
          secret:
            secretName: tls-certs
```

## Summary

DEPTH_ZERO_SELF_SIGNED_CERT means Node.js does not trust the server's certificate. The proper fix is to provide the certificate to Node.js using the `ca` option in HTTPS agents, the `NODE_EXTRA_CA_CERTS` environment variable, or client-specific SSL configuration. Avoid disabling certificate verification entirely, as this removes an important security layer. For development, create proper self-signed certificates with a custom CA that you add to your trust store.
