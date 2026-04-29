# How to Configure MongoDB TLS/SSL for IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TLS, SSL, IPv4, Encryption, Security, Database

Description: Enable TLS/SSL in MongoDB to encrypt connections between clients and servers over IPv4, generate or install certificates, and connect with TLS from application clients.

## Introduction

MongoDB TLS/SSL encrypts all data in transit between clients and the server. For replica sets, TLS also encrypts inter-node communication. MongoDB 4.2+ uses `tls` settings (replacing the deprecated `ssl` settings) in `mongod.conf`.

## Generating Certificates

```bash
# CA certificate

openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=MongoDB CA"

# Server certificate and key
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/CN=10.0.0.5"   # Use the server's IPv4 or hostname
openssl x509 -req -days 3650 -in server.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt

# Combine into PEM (MongoDB requires combined file)
cat server.crt server.key > /etc/mongodb/server.pem
chmod 600 /etc/mongodb/server.pem
chown mongodb:mongodb /etc/mongodb/server.pem

# Copy CA cert
cp ca.crt /etc/mongodb/ca.crt
chown mongodb:mongodb /etc/mongodb/ca.crt
```

## MongoDB TLS Configuration

```yaml
# /etc/mongod.conf

net:
  port: 27017
  bindIp: 127.0.0.1,10.0.0.5
  ipv6: false

  tls:
    mode: requireTLS           # Require TLS for all connections
    # mode: allowTLS           # Allow both TLS and non-TLS (transitional)
    certificateKeyFile: /etc/mongodb/server.pem
    CAFile: /etc/mongodb/ca.crt
    allowConnectionsWithoutCertificates: true   # Client cert not required
    # Set to false to require client certificates (mutual TLS)

security:
  authorization: enabled
```

```bash
sudo systemctl restart mongod

# Verify TLS is enabled
sudo grep -i "tls\|ssl" /var/log/mongodb/mongod.log | tail -5
```

## Connecting with TLS from Client

```bash
# mongosh with TLS
mongosh "mongodb://admin:password@10.0.0.5:27017/admin?tls=true&tlsCAFile=/etc/mongodb/ca.crt"

# With tlsAllowInvalidCertificates for self-signed (dev only!)
mongosh "mongodb://admin:password@10.0.0.5:27017/admin?tls=true&tlsAllowInvalidCertificates=true"

# Verify TLS is active
mongosh "mongodb://admin:password@10.0.0.5:27017/admin?tls=true&tlsCAFile=/etc/mongodb/ca.crt" \
  --eval "db.serverStatus().transportSecurity"
```

## Application Connection Strings

```bash
# Python (pymongo):
from pymongo import MongoClient
client = MongoClient(
    "mongodb://appuser:password@10.0.0.5:27017/appdb",
    tls=True,
    tlsCAFile="/etc/mongodb/ca.crt"
)

# Node.js:
mongoose.connect("mongodb://appuser:password@10.0.0.5:27017/appdb", {
  tls: true,
  tlsCAFile: "/etc/mongodb/ca.crt"
});
```

## Replica Set with TLS

```yaml
# /etc/mongod.conf - replica set with TLS
replication:
  replSetName: "rs0"

net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/mongodb/server.pem
    CAFile: /etc/mongodb/ca.crt
    clusterAuthX509:
      attributes: "OU=MongoDB,O=Company"
```

## Conclusion

MongoDB TLS requires a combined PEM file (certificate + key) and a CA certificate. Set `net.tls.mode: requireTLS` to enforce TLS for all connections. Clients must specify `tls=true` in their connection string and provide the CA file for certificate verification. For production, use certificates from a trusted CA rather than self-signed certificates.
