# How to Configure MongoDB Security for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Authentication, Authorization, Production

Description: Learn the essential MongoDB security configurations for production deployments including authentication, authorization, TLS, and network hardening.

---

## Security Checklist for Production

A secure MongoDB deployment requires multiple layers:
1. Authentication (who can connect)
2. Authorization (what they can do)
3. Encryption in transit (TLS)
4. Network restrictions
5. Auditing

## Enable Authentication

In `mongod.conf`, always enable authentication:

```yaml
security:
  authorization: enabled
```

## Create an Admin User First

Connect without authentication (only when auth is not yet enabled):

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: passwordPrompt(),  // never hardcode passwords
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "clusterAdmin", db: "admin" }
  ]
})
```

## Create Application-Specific Users

Apply the principle of least privilege:

```javascript
use myapp
db.createUser({
  user: "app_user",
  pwd: passwordPrompt(),
  roles: [
    { role: "readWrite", db: "myapp" }
  ]
})

// Read-only reporting user
db.createUser({
  user: "reporter",
  pwd: passwordPrompt(),
  roles: [
    { role: "read", db: "myapp" }
  ]
})
```

## Enable TLS/SSL

```yaml
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/server.pem
    CAFile: /etc/ssl/mongodb/ca.pem
    allowConnectionsWithoutCertificates: false
```

Connect with TLS:

```bash
mongosh \
  --tls \
  --host mongo.example.com \
  --tlsCertificateKeyFile /etc/ssl/client.pem \
  --tlsCAFile /etc/ssl/ca.pem
```

## Network Binding

Bind to specific interfaces only:

```yaml
net:
  bindIp: 127.0.0.1,10.0.1.5  # localhost + private IP only
  port: 27017
```

## Disable JavaScript Execution

If your application does not use server-side JavaScript:

```yaml
security:
  javascriptEnabled: false
```

## Replica Set Authentication (Keyfile)

Secure internal replica set communication:

```bash
openssl rand -base64 756 > /etc/mongodb/keyfile
chmod 400 /etc/mongodb/keyfile
chown mongodb:mongodb /etc/mongodb/keyfile
```

```yaml
security:
  keyFile: /etc/mongodb/keyfile
  authorization: enabled
```

## Enable Audit Logging (Enterprise/Atlas Only)

Audit logging is available only in MongoDB Enterprise and MongoDB Atlas.

```yaml
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{ atype: { $in: ["authenticate", "createUser", "dropUser", "authCheck"] } }'
```

## Connection String Security

Never hardcode credentials:

```bash
# Use environment variables
export MONGODB_URI="mongodb://app_user:${DB_PASSWORD}@mongo.example.com:27017/myapp?tls=true"
```

## Summary

Production MongoDB security requires authentication (`authorization: enabled`), TLS for encryption in transit, least-privilege users for each application role, and network binding to restrict access. Keyfile authentication secures intra-cluster communication. Audit logging records authentication events for compliance and incident response.
