# How to Set Up Kerberos Authentication in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kerberos, Authentication, Security, Enterprise

Description: Learn how to configure Kerberos authentication in MongoDB Enterprise to integrate with Active Directory or MIT Kerberos for single sign-on and centralized identity management.

---

Kerberos authentication in MongoDB Enterprise allows users to authenticate using Kerberos tickets, integrating with existing identity systems like Active Directory or MIT Kerberos. This is common in enterprise environments where centralized authentication is required.

## Prerequisites

- MongoDB Enterprise 4.0 or later
- A working Kerberos KDC (e.g., Active Directory or MIT Kerberos)
- `cyrus-sasl-gssapi` installed on each MongoDB host
- MongoDB service principal registered in the KDC

## Create the MongoDB Service Principal

On the Kerberos KDC, create a service principal for each `mongod` host:

```bash
# On an Active Directory domain controller (PowerShell)
setspn -S mongodb/mongod1.example.com mongod1$

# For MIT Kerberos
kadmin.local
addprinc -randkey mongodb/mongod1.example.com@EXAMPLE.COM
ktadd -k /etc/mongodb.keytab mongodb/mongod1.example.com@EXAMPLE.COM
```

## Configure mongod for Kerberos

Edit `/etc/mongod.conf`:

```yaml
security:
  authorization: enabled

setParameter:
  authenticationMechanisms: GSSAPI
```

Set the keytab file path via environment variable before starting `mongod`:

```bash
export KRB5_KTNAME=/etc/mongodb.keytab
mongod --config /etc/mongod.conf
```

Or add it to the systemd service file:

```ini
# /etc/systemd/system/mongod.service.d/kerberos.conf
[Service]
Environment="KRB5_KTNAME=/etc/mongodb.keytab"
```

```bash
systemctl daemon-reload
systemctl restart mongod
```

## Create a MongoDB User Mapped to a Kerberos Principal

In MongoDB, the username must match the Kerberos principal name (including realm):

```javascript
use $external
db.createUser({
  user: "alice@EXAMPLE.COM",
  roles: [{ role: "readWrite", db: "myapp" }]
})
```

Kerberos users are created in the `$external` database, not a specific app database.

## Connect with Kerberos Authentication

On the client machine, obtain a Kerberos ticket:

```bash
kinit alice@EXAMPLE.COM
```

Connect to MongoDB using GSSAPI:

```bash
mongosh \
  --host mongod1.example.com \
  --authenticationMechanism GSSAPI \
  --authenticationDatabase '$external' \
  --username alice@EXAMPLE.COM
```

## Test with a Python Client

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://alice%40EXAMPLE.COM@mongod1.example.com:27017/",
    authMechanism="GSSAPI",
    authSource="$external"
)

db = client.myapp
print(db.list_collection_names())
```

## Verify Authentication

Check the MongoDB log for successful GSSAPI authentication:

```bash
grep "GSSAPI" /var/log/mongodb/mongod.log | tail -20
```

Successful authentication shows entries like:
```text
Successfully authenticated as principal alice@EXAMPLE.COM
```

## Troubleshoot Common Issues

**Clock skew**: Kerberos requires clocks to be within 5 minutes of each other.

```bash
# Sync time on all nodes
timedatectl set-ntp true
```

**Keytab permissions**: The keytab file must be readable only by the `mongod` user:

```bash
chown mongod:mongod /etc/mongodb.keytab
chmod 400 /etc/mongodb.keytab
```

**Wrong SPN**: Verify the service principal name matches the hostname MongoDB resolves to.

## Summary

Kerberos authentication in MongoDB Enterprise integrates with Active Directory or MIT Kerberos using GSSAPI. Register a service principal for each `mongod` host, configure `authenticationMechanisms: GSSAPI`, create users in the `$external` database, and connect using `kinit`-obtained tickets. Ensure clocks are synchronized and keytab files are properly secured.
