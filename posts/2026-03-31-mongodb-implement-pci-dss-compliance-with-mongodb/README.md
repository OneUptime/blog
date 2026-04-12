# How to Implement PCI DSS Compliance with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, PCI DSS, Compliance

Description: Configure MongoDB to meet PCI DSS requirements for cardholder data environments with encryption, network segmentation, access controls, and audit trails.

---

## PCI DSS and MongoDB

PCI DSS requires any system that stores, processes, or transmits cardholder data to implement specific security controls. For MongoDB deployments in the Cardholder Data Environment (CDE), this means network isolation, strong encryption, least-privilege access, vulnerability management, and comprehensive logging.

## Network Segmentation

MongoDB in a CDE must be isolated from untrusted networks. In `mongod.conf`:

```yaml
net:
  bindIp: 10.0.1.10  # Only listen on the private subnet IP
  port: 27017
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb.pem
    CAFile: /etc/ssl/ca.pem
```

AWS security group (only allow traffic from app servers):

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-mongodb \
  --protocol tcp \
  --port 27017 \
  --source-group sg-appservers
```

## Cardholder Data Must Not Be Stored Without Encryption

PCI DSS Requirement 3 prohibits storing sensitive authentication data (CVV, PIN) and requires PAN (card number) to be rendered unreadable. Never store CVV. Tokenize or encrypt PAN:

```javascript
const crypto = require('crypto')
const ENCRYPTION_KEY = Buffer.from(process.env.PAN_ENCRYPTION_KEY, 'hex')

function encryptPAN(pan) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(pan), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function maskPAN(pan) {
  // Only store masked version in non-sensitive fields for display
  return pan.replace(/\d(?=\d{4})/g, '*')
}

// Store in MongoDB
await db.collection('payment_methods').insertOne({
  customerId: userId,
  lastFour: pan.slice(-4),
  maskedPan: maskPAN(pan),
  encryptedPan: encryptPAN(pan),  // For processing only
  expiryMonth: month,
  expiryYear: year,
  // NEVER store: cvv, fullPan in plain text
})
```

## Access Control (PCI DSS Requirement 7 and 8)

```javascript
// Separate roles per PCI DSS principle of least privilege
db.createRole({
  role: "paymentReader",
  privileges: [{
    resource: { db: "payments", collection: "transactions" },
    actions: ["find"],
  }],
  roles: [],
})

db.createRole({
  role: "paymentWriter",
  privileges: [{
    resource: { db: "payments", collection: "transactions" },
    actions: ["find", "insert"],
  }],
  roles: [],
})

// Unique accounts for each application component
db.createUser({ user: "payment_service", pwd: passwordPrompt(), roles: ["paymentWriter"] })
db.createUser({ user: "reporting_service", pwd: passwordPrompt(), roles: ["paymentReader"] })
```

## Audit Logging (PCI DSS Requirement 10)

All access to cardholder data must be logged with timestamp, user, action, and data accessed:

```yaml
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/pci_audit.json
  filter: '{
    "atype": "authCheck",
    "param.ns": { "$regex": "^payments\\." },
    "param.command": { "$in": ["find", "insert", "update", "delete"] }
  }'
```

By default MongoDB only logs failed authorization checks. For PCI DSS you must also log successful access to cardholder data:

```javascript
db.adminCommand({ setParameter: 1, auditAuthorizationSuccess: true })
```

Retain audit logs for 12 months (3 months immediately accessible):

```bash
# Compress and archive logs older than 90 days
find /var/log/mongodb/archive/ -name "*.json" -mtime +90 -exec gzip {} \;
```

## Vulnerability Management

```bash
# Check MongoDB version against CVE database
mongosh --eval "db.adminCommand({buildInfo:1}).version"

# Update MongoDB regularly
apt-get update && apt-get install -y mongodb-org
```

## Summary

PCI DSS compliance in MongoDB requires: network isolation to restrict CDE access, TLS for all connections (Requirement 4), never storing CVV and encrypting PAN at the application level (Requirement 3), least-privilege user accounts per service (Requirements 7 and 8), comprehensive audit logging of all cardholder data access (Requirement 10), and regular patching. Use tokenization where possible to reduce the scope of your CDE entirely.
