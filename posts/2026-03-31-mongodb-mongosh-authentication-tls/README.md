# How to Use mongosh with Authentication and TLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Authentication, TLS, Security

Description: Learn how to connect mongosh with SCRAM authentication, X.509 certificates, and TLS/SSL to secure your MongoDB connections in production.

---

Connecting to a production MongoDB deployment requires both authentication (proving who you are) and TLS (encrypting the connection). mongosh supports multiple authentication mechanisms and TLS configurations from the command line.

## SCRAM Authentication (Username and Password)

The most common method is SCRAM-SHA-256, MongoDB's default:

```bash
mongosh "mongodb://localhost:27017/admin" \
  --username myuser \
  --password mypassword \
  --authenticationDatabase admin
```

Or inline in the URI:

```bash
mongosh "mongodb://myuser:mypassword@localhost:27017/admin?authSource=admin"
```

## Connecting with TLS Enabled

When MongoDB is configured to require TLS, pass the `--tls` flag:

```bash
mongosh "mongodb://myuser:mypassword@localhost:27017/admin" \
  --tls \
  --authenticationDatabase admin
```

## Specifying a Custom CA Certificate

If your MongoDB server uses a self-signed or internal CA certificate:

```bash
mongosh "mongodb://myuser:mypassword@localhost:27017/admin" \
  --tls \
  --tlsCAFile /etc/ssl/certs/mongo-ca.pem \
  --authenticationDatabase admin
```

## Using Client Certificates (Mutual TLS)

For environments requiring mutual TLS (mTLS), provide both a CA cert and a client cert/key:

```bash
mongosh "mongodb://localhost:27017/admin" \
  --tls \
  --tlsCAFile /etc/ssl/certs/mongo-ca.pem \
  --tlsCertificateKeyFile /etc/ssl/client/client.pem \
  --authenticationMechanism MONGODB-X509 \
  --authenticationDatabase "\$external"
```

The client certificate's Subject (CN) must match an X.509 user created in MongoDB:

```javascript
db.getSiblingDB("$external").createUser({
  user: "CN=mongoclient,OU=Clients,O=MyOrg,C=US",
  roles: [{ role: "readWrite", db: "myapp" }]
})
```

## TLS with Certificate Password

If the client key file is password protected:

```bash
mongosh "mongodb://localhost:27017/admin" \
  --tls \
  --tlsCAFile /etc/ssl/certs/mongo-ca.pem \
  --tlsCertificateKeyFile /etc/ssl/client/client.pem \
  --tlsCertificateKeyFilePassword "keypassword"
```

## Allowing Invalid Certificates for Development

In development, you may need to bypass certificate validation (never use in production):

```bash
mongosh "mongodb://localhost:27017/admin" \
  --tls \
  --tlsAllowInvalidCertificates \
  --username dev \
  --password devpass
```

## Connecting to MongoDB Atlas with TLS

Atlas enforces TLS by default. The connection string already includes TLS parameters:

```bash
mongosh "mongodb+srv://myuser:mypassword@cluster0.abc12.mongodb.net/admin"
```

Atlas uses well-known CAs, so no custom `--tlsCAFile` is needed.

## Verifying the TLS Connection

After connecting, confirm TLS is active by checking the server's TLS configuration and connection security:

```javascript
db.adminCommand({ serverStatus: 1 }).security
// Shows TLS version info and connection counts

db.adminCommand({ getCmdLineOpts: 1 }).parsed.net.tls
// Shows the server's TLS startup configuration (requires getCmdLineOpts privilege)
```

## Summary

mongosh supports SCRAM password authentication, X.509 certificate authentication, and TLS encryption through straightforward command-line flags. Using `--tls` with a `--tlsCAFile` covers most production deployments, while `--tlsCertificateKeyFile` enables mTLS for the highest security requirements.

