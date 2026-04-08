# How to Connect to MongoDB with TLS via Connection String

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TLS, Security, Connection, Certificate

Description: Learn how to connect to MongoDB with TLS encryption via connection string, including CA certificate, client certificates, and driver-specific configuration.

---

TLS (Transport Layer Security) encrypts data in transit between MongoDB clients and servers. Configuring TLS via the connection string is the most portable approach across drivers and tools.

## TLS Connection String Parameters

```text
mongodb://user:pass@host:27017/db?tls=true&tlsCAFile=/path/to/ca.pem
```

Key TLS parameters:

```text
tls=true                             enable TLS
tlsCAFile=<path>                     path to CA certificate (PEM)
tlsCertificateKeyFile=<path>         client certificate + key (PEM, for mutual TLS)
tlsCertificateKeyFilePassword=<pwd>  password for encrypted client key
tlsAllowInvalidCertificates=true     skip server cert validation (dev/test only)
tlsAllowInvalidHostnames=true        skip hostname verification (dev/test only)
tlsInsecure=true                     shorthand for both allow-invalid options
```

## Connecting via mongosh with TLS

```bash
# One-way TLS (server certificate only)
mongosh "mongodb://user:pass@host:27017/myDB?tls=true&tlsCAFile=/etc/ssl/mongo-ca.pem&authSource=admin"

# Mutual TLS (client certificate required)
mongosh "mongodb://user:pass@host:27017/myDB?tls=true&tlsCAFile=/etc/ssl/mongo-ca.pem&tlsCertificateKeyFile=/etc/ssl/client.pem&authSource=admin"
```

## Node.js with TLS

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(
  "mongodb://user:pass@host:27017/myDB?authSource=admin",
  {
    tls: true,
    tlsCAFile: "/etc/ssl/mongo-ca.pem",
    // For mutual TLS:
    tlsCertificateKeyFile: "/etc/ssl/client.pem"
  }
);

await client.connect();
console.log("TLS connection established");
```

Alternatively, pass all TLS options via the connection string:

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(
  "mongodb://user:pass@host:27017/myDB?tls=true&tlsCAFile=/etc/ssl/ca.pem&tlsCertificateKeyFile=/etc/ssl/client.pem&authSource=admin"
);

await client.connect();
```

## Python with PyMongo

```python
from pymongo import MongoClient

uri = (
  "mongodb://user:pass@host:27017/myDB"
  "?tls=true"
  "&tlsCAFile=/etc/ssl/mongo-ca.pem"
  "&authSource=admin"
)

client = MongoClient(uri)
client.admin.command("ping")
print("TLS connection established")
```

For mutual TLS:

```python
client = MongoClient(
    "mongodb://host:27017/myDB",
    tls=True,
    tlsCAFile="/etc/ssl/mongo-ca.pem",
    tlsCertificateKeyFile="/etc/ssl/client.pem",
    tlsCertificateKeyFilePassword="keypassword",
    authMechanism="MONGODB-X509"
)
```

## Java with the MongoDB Driver

```java
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClients;

MongoClientSettings settings = MongoClientSettings.builder()
    .applyConnectionString(
        new com.mongodb.ConnectionString(
            "mongodb://user:pass@host:27017/myDB?authSource=admin"
        )
    )
    .applyToSslSettings(builder ->
        builder.enabled(true)
               .invalidHostNameAllowed(false)
    )
    .build();

var client = MongoClients.create(settings);
```

## Generating a Self-Signed CA for Development

```bash
# Generate CA key and certificate
openssl genrsa -out mongo-ca.key 4096
openssl req -new -x509 -days 1826 -key mongo-ca.key -out mongo-ca.pem \
  -subj "/CN=MongoDB Dev CA/O=Dev"

# Generate server key and certificate signed by CA
openssl genrsa -out mongo-server.key 2048
openssl req -new -key mongo-server.key -out mongo-server.csr \
  -subj "/CN=localhost/O=Dev"
openssl x509 -req -days 730 -in mongo-server.csr \
  -CA mongo-ca.pem -CAkey mongo-ca.key -CAcreateserial \
  -out mongo-server.crt

# Combine cert and key for mongod
cat mongo-server.crt mongo-server.key > mongo-server.pem
```

## Verifying TLS is Active

```javascript
// Check current connection info including TLS status
db.adminCommand({ getLog: "global" }).log.filter(l => l.includes("SSL"))

// Or check server status for TLS details
db.serverStatus().transportSecurity
```

## Summary

Add `tls=true` and `tlsCAFile` to your MongoDB connection string to enable encrypted connections. For mutual TLS, also provide `tlsCertificateKeyFile`. Never use `tlsAllowInvalidCertificates=true` in production. Use driver-level TLS options when the URI format does not support file paths in your environment.
