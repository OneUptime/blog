# How to Harden MongoDB Against Common Security Threats

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Hardening, Best Practice, Database

Description: A practical MongoDB security hardening checklist covering authentication, network access, TLS, auditing, and configuration to defend against common attack vectors.

---

MongoDB deployments are frequently targeted by ransomware, data exfiltration, and unauthorized access - often because authentication is disabled or the instance is exposed to the internet. This guide covers the most impactful hardening steps.

## 1. Enable Authentication

Never run MongoDB without authentication. Enable it in `mongod.conf`:

```yaml
security:
  authorization: enabled
```

Create a strong admin user before enabling auth:

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "VeryStrongRandomPass123!",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})
```

## 2. Bind to Specific Interfaces

Do not bind to `0.0.0.0` unless required. Bind only to the interfaces your applications use:

```yaml
net:
  bindIp: 127.0.0.1,10.0.1.10
  port: 27017
```

## 3. Enable TLS for All Connections

Encrypt all traffic - both from clients and between cluster members:

```yaml
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/server.pem
    CAFile: /etc/ssl/mongodb/ca.crt
```

## 4. Use Firewall Rules

Block the default MongoDB port (27017) from the public internet:

```bash
# Allow only from application servers
ufw allow from 10.0.1.0/24 to any port 27017
ufw deny 27017
```

Or using iptables:

```bash
iptables -A INPUT -p tcp --dport 27017 -s 10.0.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 27017 -j DROP
```

## 5. Disable the HTTP Interface and REST API

In MongoDB versions before 3.2, the HTTP status interface was enabled by default on port 28017. In MongoDB 3.2–3.4, it was deprecated and disabled by default. If you are running MongoDB 3.2–3.4, ensure these remain disabled:

```yaml
net:
  http:
    enabled: false
    JSONPEnabled: false
    RESTInterfaceEnabled: false
```

In MongoDB 3.6+, the HTTP interface and REST API were completely removed. These configuration options are no longer valid and should not be included in your `mongod.conf`.

## 6. Disable JavaScript Execution (If Not Needed)

The `$where` operator and `mapReduce` can execute arbitrary JavaScript. Disable it if you do not use these features:

```yaml
security:
  javascriptEnabled: false
```

## 7. Apply Least Privilege

Create separate users for each application and operation. Never use the admin user in application code:

```javascript
use myapp
db.createUser({
  user: "api-service",
  pwd: "ApiServicePass!",
  roles: [{ role: "readWrite", db: "myapp" }]
})
```

## 8. Enable Auditing (Enterprise)

Track who does what with MongoDB Enterprise auditing:

```yaml
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{ atype: { $in: ["authenticate", "createUser", "dropUser", "createCollection", "dropCollection"] } }'
```

## 9. Disable SCRAM-SHA-1 and Legacy Mechanisms

```yaml
setParameter:
  authenticationMechanisms: SCRAM-SHA-256
```

## 10. Keep MongoDB Updated

Security vulnerabilities are patched in minor releases:

```bash
# Check current version
mongod --version

# Update (Ubuntu/Debian)
apt-get update && apt-get install -y mongodb-org

# Update (RHEL/CentOS)
yum update mongodb-org
```

## 11. Protect the Configuration File

Restrict access to `mongod.conf`:

```bash
chmod 600 /etc/mongod.conf
chown mongod:mongod /etc/mongod.conf
```

## 12. Store Secrets Outside Configuration Files

Use environment variables or a secrets manager for passwords and key paths. Do not hardcode credentials in `mongod.conf` or application code.

```bash
export MONGO_PASSWORD=$(aws secretsmanager get-secret-value --secret-id mongo-admin-pass --query SecretString --output text)
```

## Summary

Hardening MongoDB requires enabling authentication, restricting network access with `bindIp` and firewall rules, enforcing TLS, applying least privilege, and keeping the software updated. Most real-world MongoDB breaches happen because authentication is disabled or the port is exposed to the internet - fixing those two issues eliminates the majority of risk.
