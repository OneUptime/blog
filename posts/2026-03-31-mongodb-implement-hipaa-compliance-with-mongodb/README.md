# How to Implement HIPAA Compliance with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, HIPAA, Compliance

Description: Configure MongoDB for HIPAA compliance with encryption at rest, TLS in transit, audit logging, access controls, and PHI handling best practices.

---

## HIPAA Requirements for MongoDB

HIPAA's Security Rule requires covered entities and business associates to implement technical safeguards for Protected Health Information (PHI). For MongoDB, this means: encryption at rest and in transit, access controls, audit logging, automatic logoff, and integrity controls. MongoDB Enterprise provides the most complete HIPAA-relevant features.

## Encryption at Rest

Enable WiredTiger encryption in `mongod.conf` (Enterprise only):

```yaml
security:
  enableEncryption: true
  encryptionKeyFile: /etc/mongodb/keyfile
```

For MongoDB Community on AWS, use EBS encryption:

```bash
aws ec2 create-volume \
  --size 100 \
  --volume-type gp3 \
  --encrypted \
  --kms-key-id arn:aws:kms:us-east-1:ACCOUNT:key/KEY_ID \
  --availability-zone us-east-1a
```

## TLS for Data in Transit

```yaml
# mongod.conf
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb.pem
    CAFile: /etc/ssl/ca.pem
    allowInvalidCertificates: false
    allowConnectionsWithoutCertificates: false
```

Connect with TLS enforced:

```bash
mongosh --tls \
  --tlsCertificateKeyFile /etc/ssl/client.pem \
  --tlsCAFile /etc/ssl/ca.pem \
  "mongodb://localhost:27017/healthcare"
```

## Role-Based Access Control

Create least-privilege roles for PHI access:

```javascript
// Create a read-only clinical role
db.createRole({
  role: "clinicianRead",
  privileges: [
    {
      resource: { db: "healthcare", collection: "patients" },
      actions: ["find"],
    },
    {
      resource: { db: "healthcare", collection: "appointments" },
      actions: ["find"],
    },
  ],
  roles: [],
})

// Create a treating physician role
db.createRole({
  role: "treatingPhysician",
  privileges: [
    {
      resource: { db: "healthcare", collection: "patients" },
      actions: ["find", "update"],
    },
    {
      resource: { db: "healthcare", collection: "medical_records" },
      actions: ["find", "insert", "update"],
    },
  ],
  roles: [],
})

db.createUser({
  user: "dr_smith",
  pwd: passwordPrompt(),
  roles: [{ role: "treatingPhysician", db: "healthcare" }],
})
```

## Audit Logging

```yaml
# mongod.conf - Enterprise
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{
    atype: {
      $in: ["authenticate", "authCheck", "logout", "createUser", "dropUser", "updateUser"]
    }
  }'
```

Monitor the audit log for unauthorized PHI access:

```bash
# Alert on access to patients collection outside business hours
cat /var/log/mongodb/audit.json | \
  python3 -c "
import sys, json
from datetime import datetime
for line in sys.stdin:
  doc = json.loads(line)
  if doc.get('param', {}).get('ns', '').endswith('.patients'):
    ts = datetime.fromisoformat(doc['ts']['$date'])
    if ts.hour < 7 or ts.hour > 20:
      print('After-hours PHI access:', doc['users'], doc['atype'], doc['ts'])
"
```

## PHI Field Encryption

Encrypt sensitive PHI fields at the application level:

```javascript
const { ClientEncryption } = require('mongodb-client-encryption')

// Encrypt SSN before storing
async function encryptField(value) {
  return encryption.encrypt(value, {
    algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
    keyId: dataKeyId,
  })
}

const record = {
  patientId: 'P001',
  name: 'John Doe',
  ssn: await encryptField('123-45-6789'),
  dob: await encryptField('1980-05-15'),
  diagnosis: 'hypertension',
}
await db.collection('patients').insertOne(record)
```

## Summary

HIPAA-compliant MongoDB deployments require encryption at rest (WiredTiger encryption or EBS/volume encryption), TLS for all connections, role-based access control scoped to the minimum necessary PHI, comprehensive audit logging with alerts for anomalous access patterns, and application-level encryption for highly sensitive fields like SSN and date of birth. Document your controls and maintain them as part of your HIPAA Security Rule implementation.
