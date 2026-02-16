# How to Fix 'Error: SELF_SIGNED_CERT_IN_CHAIN'

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, SSL, TLS, Certificates, Security

Description: Resolve the SELF_SIGNED_CERT_IN_CHAIN error in Node.js by properly adding custom CA certificates to the trust chain.

---

When you see this error in your Node.js application:

```
Error: self signed certificate in certificate chain
    at TLSSocket.onConnectSecure (_tls_wrap.js:1515:34)
```

It means the server's certificate chain includes a certificate that was signed by a Certificate Authority (CA) that Node.js does not trust. This typically happens with internal corporate CAs or development environments.

## Understanding the Error

Unlike DEPTH_ZERO_SELF_SIGNED_CERT (which means the server certificate itself is self-signed), SELF_SIGNED_CERT_IN_CHAIN means somewhere in the certificate chain, there is a CA certificate that is not in Node.js's trusted root store.

```
Server Certificate  <-- Signed by Intermediate CA
       |
Intermediate CA     <-- Signed by Root CA
       |
Root CA             <-- Self-signed (this is the one not trusted)
```

## Solution 1: Add the CA Certificate

The proper fix is to add the root CA certificate to your application:

```javascript
const https = require('https');
const fs = require('fs');

// Load your organization's root CA certificate
const ca = fs.readFileSync('/path/to/corporate-root-ca.pem');

const agent = new https.Agent({
    ca: ca  // Add to trusted CAs
});

// Use with fetch
const response = await fetch('https://internal-api.company.com/data', { agent });

// Use with axios
const axios = require('axios');
const instance = axios.create({
    httpsAgent: agent
});
const response = await instance.get('https://internal-api.company.com/data');
```

## Solution 2: NODE_EXTRA_CA_CERTS Environment Variable

Add the CA to all Node.js requests without code changes:

```bash
# Set the environment variable
export NODE_EXTRA_CA_CERTS=/path/to/corporate-root-ca.pem

# Run your application
node app.js
```

In your startup script:

```json
{
  "scripts": {
    "start": "NODE_EXTRA_CA_CERTS=./certs/corporate-ca.pem node src/index.js"
  }
}
```

## Solution 3: Add Full Certificate Chain

Sometimes you need to provide the complete chain:

```javascript
const https = require('https');
const fs = require('fs');

// Load all certificates in the chain
const ca = [
    fs.readFileSync('/path/to/root-ca.pem'),
    fs.readFileSync('/path/to/intermediate-ca.pem')
];

const agent = new https.Agent({ ca });
```

Or concatenate them in a single file:

```bash
cat intermediate-ca.pem root-ca.pem > ca-chain.pem
```

```javascript
const ca = fs.readFileSync('/path/to/ca-chain.pem');
const agent = new https.Agent({ ca });
```

## Getting the CA Certificate

If you do not have the CA certificate file, extract it from the server:

```bash
# Get all certificates in the chain
openssl s_client -connect internal-api.company.com:443 -showcerts < /dev/null 2>/dev/null | \
  sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p' > chain.pem

# Get just the root CA (last certificate in the chain)
openssl s_client -connect internal-api.company.com:443 -showcerts < /dev/null 2>/dev/null | \
  awk '/-----BEGIN CERTIFICATE-----/{cert=""} {cert=cert $0 "\n"} /-----END CERTIFICATE-----/{last=cert} END{print last}' > root-ca.pem
```

Programmatically extract in Node.js:

```javascript
const tls = require('tls');

function getCertificateChain(host, port = 443) {
    return new Promise((resolve, reject) => {
        const socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {
            const cert = socket.getPeerCertificate(true);  // true = return full chain
            const chain = [];

            let current = cert;
            while (current) {
                chain.push({
                    subject: current.subject,
                    issuer: current.issuer,
                    valid_from: current.valid_from,
                    valid_to: current.valid_to,
                    fingerprint: current.fingerprint,
                    raw: current.raw
                });
                current = current.issuerCertificate;

                // Stop if we reach a self-signed cert (root)
                if (current && current.fingerprint === chain[chain.length - 1].fingerprint) {
                    break;
                }
            }

            socket.end();
            resolve(chain);
        });

        socket.on('error', reject);
    });
}

// Usage
const chain = await getCertificateChain('internal-api.company.com');
console.log('Certificate chain:');
chain.forEach((cert, i) => {
    console.log(`${i + 1}. ${cert.subject.CN} (issued by ${cert.issuer.CN})`);
});
```

## Database Connections

For database clients with SSL:

```javascript
// PostgreSQL
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    host: 'db.company.com',
    ssl: {
        ca: fs.readFileSync('./certs/corporate-ca.pem'),
        rejectUnauthorized: true
    }
});

// MongoDB
const { MongoClient } = require('mongodb');

const client = new MongoClient(uri, {
    tls: true,
    tlsCAFile: './certs/corporate-ca.pem'
});

// MySQL
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'db.company.com',
    ssl: {
        ca: fs.readFileSync('./certs/corporate-ca.pem')
    }
});
```

## Docker Configuration

Add CA certificates to Docker containers:

```dockerfile
# Dockerfile
FROM node:18-alpine

# Copy CA certificate
COPY certs/corporate-ca.pem /usr/local/share/ca-certificates/corporate-ca.crt

# Update CA certificates
RUN apk add --no-cache ca-certificates && update-ca-certificates

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["node", "src/index.js"]
```

Or use environment variable:

```dockerfile
FROM node:18-alpine

COPY certs/corporate-ca.pem /app/certs/

ENV NODE_EXTRA_CA_CERTS=/app/certs/corporate-ca.pem

WORKDIR /app
COPY . .
RUN npm ci

CMD ["node", "src/index.js"]
```

## Windows Considerations

On Windows, you might need to add the CA to the system store:

```powershell
# Import to Windows certificate store (as Administrator)
certutil -addstore -f "ROOT" corporate-ca.pem
```

Or provide it explicitly in your Node.js application as shown above.

## Development vs Production

Keep development workarounds separate from production code:

```javascript
const https = require('https');
const fs = require('fs');

function createHttpsAgent() {
    const options = {};

    // In development with corporate proxy/CA
    if (process.env.CORPORATE_CA_PATH) {
        options.ca = fs.readFileSync(process.env.CORPORATE_CA_PATH);
    }

    // NEVER do this in production
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_SSL_VERIFY === 'true') {
        console.warn('WARNING: SSL verification disabled');
        options.rejectUnauthorized = false;
    }

    return new https.Agent(options);
}

const agent = createHttpsAgent();

module.exports = agent;
```

## Troubleshooting

Verify the certificate chain:

```bash
# Check what certificates are in a PEM file
openssl crl2pkcs7 -nocrl -certfile ca-chain.pem | openssl pkcs7 -print_certs -noout

# Verify the chain
openssl verify -CAfile root-ca.pem -untrusted intermediate-ca.pem server-cert.pem
```

Debug SSL in Node.js:

```bash
# Enable SSL debugging
NODE_DEBUG=tls node app.js
```

## Summary

SELF_SIGNED_CERT_IN_CHAIN means your certificate chain includes a CA that Node.js does not trust. The fix is to add that CA certificate using the `ca` option in HTTPS agents, the `NODE_EXTRA_CA_CERTS` environment variable, or client-specific SSL configuration. Extract the CA certificate from the server if you do not have it. Never disable certificate verification in production as a workaround.
