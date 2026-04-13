# How to Configure Atlas Database Access and Network Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Security, Database Access, Network Access

Description: Configure MongoDB Atlas database users with appropriate roles and set up network access controls to secure your Atlas cluster against unauthorized access.

---

## Two Security Layers

Atlas uses two complementary security controls:
- **Database Access**: Who can connect and what they can do (authentication + authorization)
- **Network Access**: Which IP addresses or networks can reach the cluster (network firewall)

Both must allow a connection for it to succeed.

## Database Access - Users and Roles

### Built-In Roles

| Role | Description |
|---|---|
| `atlasAdmin` | Full access to all databases and Atlas features |
| `readWriteAnyDatabase` | Read and write to all databases |
| `readAnyDatabase` | Read-only access to all databases |
| `readWrite@<db>` | Read and write to a specific database |
| `read@<db>` | Read-only access to a specific database |
| `dbAdmin@<db>` | Admin operations on a specific database |

### Create a Database User (UI)

1. Go to **Security > Database Access**
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Set username and password
5. Select a role
6. Click **Add User**

### Create Users via Atlas CLI

```bash
# Application user with limited access
atlas dbusers create \
  --username appService \
  --password "$(openssl rand -base64 20)" \
  --role readWrite@appdb

# Read-only analytics user
atlas dbusers create \
  --username analyticsUser \
  --password "ReadOnlyPass123!" \
  --role read@appdb,read@logsdb

# Admin user
atlas dbusers create \
  --username adminUser \
  --password "AdminPass456!" \
  --role atlasAdmin
```

### Create Users via API

```bash
curl --user "publicKey:privateKey" --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/databaseUsers" \
  --header "Content-Type: application/json" \
  --data '{
    "databaseName": "admin",
    "roles": [
      { "databaseName": "appdb", "roleName": "readWrite" }
    ],
    "username": "appService",
    "password": "SecurePassword123!"
  }'
```

### Use SCRAM-SHA-256 Authentication

This is the default and recommended authentication mechanism:

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient(
  "mongodb+srv://appService:SecurePassword123!@cluster0.abc123.mongodb.net/appdb?authMechanism=SCRAM-SHA-256"
);
```

### Use X.509 Certificate Authentication

For production, use X.509 certificates instead of passwords:

```bash
# Create an X.509 user
atlas dbusers create \
  --username "CN=appService,OU=apps,O=mycompany" \
  --x509Type MANAGED \
  --role readWrite@appdb
```

Download the certificate from Atlas and connect:

```bash
mongosh "mongodb+srv://cluster0.abc123.mongodb.net/appdb" \
  --tls \
  --tlsCertificateKeyFile client.pem \
  --authenticationMechanism MONGODB-X509 \
  --authenticationDatabase '$external'
```

### Temporary Users with Expiry

Create users that automatically expire:

```bash
curl --user "publicKey:privateKey" --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/databaseUsers" \
  --header "Content-Type: application/json" \
  --data '{
    "databaseName": "admin",
    "roles": [{ "databaseName": "appdb", "roleName": "read" }],
    "username": "tempAnalyst",
    "password": "TempPass789!",
    "deleteAfterDate": "2024-02-01T00:00:00Z"
  }'
```

## Network Access - IP Access List

### Add a Specific IP

```bash
atlas accessLists create "203.0.113.10/32" \
  --comment "Production app server"
```

### Add a CIDR Block

```bash
atlas accessLists create "10.0.0.0/16" \
  --comment "Internal VPC CIDR"
```

### Allow All IPs (Development Only)

```bash
atlas accessLists create "0.0.0.0/0" \
  --comment "DEVELOPMENT ONLY - remove before production"
```

### Temporary IP Access

Allow an IP for a limited time (useful for emergency access):

```bash
curl --user "publicKey:privateKey" --digest \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/accessList" \
  --header "Content-Type: application/json" \
  --data '{
    "cidrBlock": "198.51.100.5/32",
    "comment": "Emergency access - expires in 1 hour",
    "deleteAfterDate": "2024-01-15T15:00:00Z"
  }'
```

### View Current Access List

```bash
atlas accessLists list
```

Output:

```text
CIDR           COMMENT                    CREATED AT
10.0.0.0/16    Internal VPC CIDR          2024-01-01T00:00:00Z
203.0.113.10   Production app server      2024-01-05T12:00:00Z
```

### Remove an IP

```bash
atlas accessLists delete "203.0.113.10/32"
```

## Best Practices

Follow the principle of least privilege:

```bash
# Application service: read/write to its own DB only
atlas dbusers create --username apiService --role readWrite@apidb

# Reporting service: read-only
atlas dbusers create --username reportService --role read@apidb

# Migration scripts: temporary full access
atlas dbusers create --username migrationUser \
  --role atlasAdmin \
  --deleteAfterDate "2024-01-16T00:00:00Z"
```

Use separate users for separate services so you can rotate credentials independently and audit access per service.

## Summary

Secure Atlas access by configuring database users with appropriate built-in roles (least privilege principle) and maintaining a strict IP access list. Create separate database users for each service or team, use SCRAM-SHA-256 for passwords or X.509 for certificate-based auth, limit network access to specific IP addresses or CIDR blocks, and use temporary users with expiry dates for one-off access needs.
