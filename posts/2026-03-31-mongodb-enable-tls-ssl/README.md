# How to Enable TLS/SSL in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TLS, SSL, Security, Encryption, Operation

Description: Step-by-step guide to enabling TLS/SSL encryption for MongoDB connections, generating certificates, configuring mongod.conf, and connecting clients securely.

---

## Why TLS/SSL Matters for MongoDB

Without TLS, all data transmitted between your application and MongoDB travels in plain text. Anyone with network access between the client and server can read queries, results, and credentials. TLS encrypts the connection so that only the intended parties can read the data.

```mermaid
sequenceDiagram
    participant App
    participant MongoDB
    App->>MongoDB: ClientHello (TLS handshake)
    MongoDB-->>App: ServerHello + Certificate
    App->>App: Verify certificate against CA
    App->>MongoDB: ClientKeyExchange
    MongoDB-->>App: TLS handshake complete
    App->>MongoDB: Encrypted: db.collection.find()
    MongoDB-->>App: Encrypted: results
```

## Certificate Types

MongoDB TLS requires these certificate files:

- **CA certificate** - the Certificate Authority that signs server and client certificates
- **Server certificate + key** - presented by mongod to clients; must be signed by the CA
- **Client certificate** - optional; used for mutual TLS (mTLS) where the server also verifies the client

## Generating Certificates for Development

For testing and development, generate a self-signed CA and server certificate. Use a proper CA or Let's Encrypt in production.

Generate the CA key and certificate:

```bash
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/C=US/ST=State/L=City/O=MyOrg/CN=MyCA"
```

Generate the server key and certificate signing request (CSR):

```bash
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr \
  -subj "/C=US/ST=State/L=City/O=MyOrg/CN=mongodb.example.com"
```

Sign the server certificate with the CA:

```bash
openssl x509 -req -days 3650 -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt
```

Combine the server certificate and key into a single PEM file (required by MongoDB), set up the directory, and apply proper permissions:

```bash
sudo mkdir -p /etc/ssl/mongodb
sudo cp ca.crt /etc/ssl/mongodb/ca.crt
cat server.crt server.key | sudo tee /etc/ssl/mongodb/mongodb.pem > /dev/null
sudo chown -R mongodb:mongodb /etc/ssl/mongodb
sudo chmod 600 /etc/ssl/mongodb/mongodb.pem
sudo chmod 644 /etc/ssl/mongodb/ca.crt
```

## Configuring mongod.conf for TLS

Edit `/etc/mongod.conf` to enable TLS:

```yaml
net:
  port: 27017
  bindIp: 0.0.0.0
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/mongodb.pem
    CAFile: /etc/ssl/mongodb/ca.crt
    allowConnectionsWithoutCertificates: true   # set false for mutual TLS
    disabledProtocols: TLS1_0,TLS1_1           # disable old protocols
```

TLS mode options:
- `disabled` - no TLS
- `allowTLS` - accept both TLS and non-TLS connections
- `preferTLS` - use TLS if client offers it, otherwise allow non-TLS
- `requireTLS` - reject all non-TLS connections (recommended for production)

Restart MongoDB:

```bash
sudo systemctl restart mongod
```

## Connecting with mongosh over TLS

When using a self-signed certificate, provide the CA:

```bash
mongosh "mongodb://127.0.0.1:27017/?tls=true&tlsCAFile=/etc/ssl/mongodb/ca.crt"
```

With authentication:

```bash
mongosh "mongodb://appUser:password@127.0.0.1:27017/myapp?tls=true&tlsCAFile=/etc/ssl/mongodb/ca.crt&authSource=myapp"
```

## Mutual TLS (mTLS) - Client Certificate Verification

With mutual TLS, the server also verifies the client's certificate. This is the strongest form of TLS for MongoDB.

Generate a client certificate:

```bash
openssl genrsa -out client.key 4096
openssl req -new -key client.key -out client.csr \
  -subj "/C=US/ST=State/L=City/O=MyOrg/CN=myapp-client"
openssl x509 -req -days 3650 -in client.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out client.crt
cat client.crt client.key > client.pem
```

Update `mongod.conf` to require client certificates:

```yaml
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/mongodb.pem
    CAFile: /etc/ssl/mongodb/ca.crt
    allowConnectionsWithoutCertificates: false  # require client cert
```

Connect with the client certificate:

```bash
mongosh "mongodb://127.0.0.1:27017/?tls=true&tlsCAFile=/etc/ssl/mongodb/ca.crt&tlsCertificateKeyFile=/path/to/client.pem"
```

## Connecting from Node.js with TLS

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://127.0.0.1:27017/myapp", {
  tls: true,
  tlsCAFile: "/etc/ssl/mongodb/ca.crt",
  // for mutual TLS, also provide:
  // tlsCertificateKeyFile: "/path/to/client.pem"
});

async function main() {
  await client.connect();
  console.log("Connected with TLS");
  await client.close();
}

main().catch(console.error);
```

## Connecting from Python with TLS

```python
import pymongo

client = pymongo.MongoClient(
    "mongodb://127.0.0.1:27017/myapp",
    tls=True,
    tlsCAFile="/etc/ssl/mongodb/ca.crt",
    # For mutual TLS:
    # tlsCertificateKeyFile="/path/to/client.pem"
)

db = client["myapp"]
print(db.command("ping"))
```

## Verifying TLS is Active

From mongosh, check the server's TLS configuration:

```javascript
db.adminCommand({ getCmdLineOpts: 1 }).parsed.net.tls
```

Use `openssl s_client` to inspect the certificate presented by MongoDB:

```bash
openssl s_client -connect 127.0.0.1:27017 -CAfile /etc/ssl/mongodb/ca.crt
```

## Certificate Rotation

To rotate certificates without downtime, use the `allowTLS` mode temporarily:

1. Update the certificate files on disk.
2. Change `tls.mode` to `allowTLS` and restart - both old and new cert connections work.
3. Roll over all clients to use the new certificate.
4. Change `tls.mode` back to `requireTLS` and restart.

## Best Practices

- Use `requireTLS` in production; never leave `mode: disabled` on internet-facing instances.
- Disable TLS 1.0 and 1.1 with `disabledProtocols: TLS1_0,TLS1_1`.
- Rotate certificates before they expire and automate the process with certbot or your PKI system.
- Use mutual TLS for service-to-service connections for stronger authentication.
- Keep CA keys offline or in a hardware security module (HSM).
- Monitor certificate expiry and alert at least 30 days before expiration.

## Summary

Enabling TLS in MongoDB requires generating CA and server certificates, combining them into a PEM file, and configuring the `net.tls` section of `mongod.conf` with `mode: requireTLS`. All MongoDB clients must then connect with `tls=true` and provide the CA certificate for verification. For the highest security, enable mutual TLS so that both the server and client authenticate each other with certificates.
