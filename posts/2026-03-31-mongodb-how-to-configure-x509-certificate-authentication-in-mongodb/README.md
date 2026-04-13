# How to Configure x.509 Certificate Authentication in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Authentication, x509, TLS, Security

Description: Set up x.509 certificate-based authentication in MongoDB so clients and members authenticate using TLS certificates instead of passwords.

---

## Why Use x.509 Authentication

x.509 certificate authentication eliminates passwords entirely for client-to-server and member-to-member authentication. It is ideal for service-to-service communication in environments where certificate management is already established via a PKI (Public Key Infrastructure).

## Prerequisites

You need:
- A Certificate Authority (CA) certificate
- Server certificate for each mongod instance
- Client certificate for each application or user

## Step 1: Configure mongod with TLS and x.509

```yaml
# /etc/mongod.conf
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/server.pem
    CAFile: /etc/ssl/ca.pem
    allowInvalidHostnames: false

security:
  authorization: enabled
  clusterAuthMode: x509
```

Restart mongod after applying the configuration:

```bash
sudo systemctl restart mongod
```

## Step 2: Create a User Matching the Client Certificate Subject

The MongoDB username for x.509 clients must match the Subject field of the client certificate. Extract the subject:

```bash
openssl x509 -in client.pem -noout -subject -nameopt RFC2253
# Output: subject=CN=appClient,OU=Engineering,O=MyCompany,L=Austin,ST=TX,C=US
```

Create the MongoDB user with that exact subject as the username:

```javascript
use $external  // x.509 users are created in $external database

db.createUser({
  user: "CN=appClient,OU=Engineering,O=MyCompany,L=Austin,ST=TX,C=US",
  roles: [{ role: "readWrite", db: "myapp" }]
});
```

## Step 3: Connect Using the Client Certificate

```bash
mongosh \
  --tls \
  --tlsCertificateKeyFile /etc/ssl/client.pem \
  --tlsCAFile /etc/ssl/ca.pem \
  --authenticationMechanism MONGODB-X509 \
  --authenticationDatabase '$external' \
  --host mongo.example.com \
  --port 27017
```

Or with a connection string:

```text
mongodb://mongo.example.com:27017/?authMechanism=MONGODB-X509&authSource=%24external&tls=true&tlsCertificateKeyFile=/etc/ssl/client.pem&tlsCAFile=/etc/ssl/ca.pem
```

## Node.js Connection Example

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://mongo.example.com:27017", {
  tls: true,
  tlsCertificateKeyFile: "/etc/ssl/client.pem",
  tlsCAFile: "/etc/ssl/ca.pem",
  authMechanism: "MONGODB-X509",
  authSource: "$external"
});
```

## Intra-Cluster x.509 Authentication

For replica set members to authenticate each other using x.509, each member's certificate must have attributes matching the cluster membership pattern. Set `clusterAuthMode: x509` in all members' configs and use certificates from the same CA.

```yaml
security:
  clusterAuthMode: x509
```

## Summary

x.509 authentication in MongoDB replaces passwords with TLS certificates for clients and cluster members. Create users in the `$external` database with usernames matching the certificate Subject DN, configure `requireTLS` and `clusterAuthMode: x509` in `mongod.conf`, and pass the client certificate in connection strings with `authMechanism=MONGODB-X509`.
