# How to Implement Transparent Data Encryption in MongoDB Enterprise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Encryption, Enterprise

Description: Configure MongoDB Enterprise's Transparent Data Encryption to encrypt all data files at rest using KMIP, local key files, or cloud KMS integration.

---

## What Is Transparent Data Encryption

Transparent Data Encryption (TDE) encrypts MongoDB's data files and journal files on disk. It is called "transparent" because the encryption and decryption happen automatically at the storage layer - applications and most database operations are unaffected. TDE protects against physical media theft and unauthorized filesystem access.

TDE requires MongoDB Enterprise and uses the WiredTiger encryption-at-rest feature.

## Local Key File Configuration

The simplest TDE setup uses a locally managed encryption key:

```bash
# Generate a 32-byte master key (AES-256)
openssl rand -base64 32 > /etc/mongodb/mongodb-keyfile
chmod 400 /etc/mongodb/mongodb-keyfile
chown mongodb:mongodb /etc/mongodb/mongodb-keyfile
```

Enable in `mongod.conf`:

```yaml
storage:
  dbPath: /var/lib/mongodb
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4

security:
  enableEncryption: true
  encryptionKeyFile: /etc/mongodb/mongodb-keyfile
```

Restart MongoDB and verify encryption is active:

```bash
systemctl restart mongod

mongosh --eval "db.adminCommand({ serverStatus: 1 }).encryptionAtRest"
```

## KMIP Integration (Enterprise)

For production environments, use a KMIP-compliant key management server (Thales, Entrust, HashiCorp Vault) for centralized key management:

```yaml
security:
  enableEncryption: true
  kmip:
    serverName: kmip.example.com
    port: 5696
    clientCertificateFile: /etc/ssl/kmip-client.pem
    serverCAFile: /etc/ssl/kmip-ca.pem
```

Test connectivity:

```bash
mongod --enableEncryption \
  --kmipServerName kmip.example.com \
  --kmipPort 5696 \
  --kmipClientCertificateFile /etc/ssl/kmip-client.pem \
  --kmipServerCAFile /etc/ssl/kmip-ca.pem \
  --dbpath /var/lib/mongodb &
```

## AWS KMS Integration

MongoDB Enterprise can integrate with AWS KMS for key management:

```yaml
security:
  enableEncryption: true
  encryptionKeyFile: /etc/mongodb/local-master-key  # wraps the KMS-managed DEK
```

Use MongoDB Ops Manager or Atlas to configure AWS KMS key rotation and wrapping:

```bash
# Rotate the encryption key (MongoDB Enterprise Ops Manager)
mms-api PUT /api/public/v1.0/groups/{groupId}/backupConfigs/{clusterId} \
  -H 'Content-Type: application/json' \
  -d '{"encryptionEnabled": true, "awsKms": {"enabled": true, "keyArn": "arn:aws:kms:..."}}'
```

## Key Rotation

MongoDB Enterprise supports master key rotation when using KMIP. Rotate the master key by running the following on each replica set member in a rolling fashion:

```bash
# Rotate the KMIP master key (run on each member in turn)
mongod --enableEncryption \
       --kmipRotateMasterKey \
       --kmipServerName kmip.example.com \
       --kmipPort 5696 \
       --kmipClientCertificateFile /etc/ssl/kmip-client.pem \
       --kmipServerCAFile /etc/ssl/kmip-ca.pem

# Verify key rotation completed
mongosh --eval "db.adminCommand({ serverStatus: 1 }).encryptionAtRest"
```

Note: Local keyfile-based encryption does not support in-place master key rotation. To change the local key, you must perform an initial sync of each member with the new key.

## Verifying Encryption at Rest

```javascript
// Check that encryption is active
var status = db.adminCommand({ serverStatus: 1 })
print('Encryption enabled:', status.encryptionAtRest.encryptionEnabled)
print('Key ID:', status.encryptionAtRest.encryptionKeyId)
print('KMIP server:', status.encryptionAtRest.kmipServerName)
```

Verify that data files on disk are not readable in plaintext:

```bash
# This should produce binary output, not readable text
strings /var/lib/mongodb/collection-*.wt | grep -c "email@example.com"
# Should return 0 with encryption enabled
```

## Replica Set Considerations

Encryption at rest is configured per node. Each replica set member encrypts its own local storage independently, and members can use different keys. When adding a new member:

```bash
# New member: initialize with encryption before joining the replica set
mongod --enableEncryption \
       --encryptionKeyFile /etc/mongodb/mongodb-keyfile \
       --dbpath /var/lib/mongodb-new \
       --port 27018
```

## Summary

MongoDB Enterprise TDE encrypts all storage files transparently without application changes. Configure it via `mongod.conf` using either a local key file (for development), a KMIP server (for on-premises production), or AWS/GCP/Azure KMS (for cloud deployments). Combine TDE with TLS for data in transit and MongoDB's audit log to satisfy encryption requirements for SOC 2, HIPAA, PCI DSS, and similar compliance frameworks. Key rotation is supported without downtime on replica sets using MongoDB's rolling restart procedure.
