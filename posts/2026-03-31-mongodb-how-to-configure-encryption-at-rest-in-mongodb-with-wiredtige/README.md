# How to Configure Encryption at Rest in MongoDB with WiredTiger

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Encryption at Rest, WiredTiger, MongoDB Enterprise

Description: Learn how to configure encryption at rest in MongoDB Enterprise using WiredTiger's native encryption to protect data stored on disk.

---

## What Is Encryption at Rest?

Encryption at rest protects data stored on disk from unauthorized access if physical media is stolen or decommissioned. MongoDB Enterprise provides native encryption at rest through the WiredTiger storage engine using AES-256-CBC encryption.

## Requirements

- MongoDB Enterprise 3.2+
- WiredTiger storage engine (default in MongoDB 3.2+)
- A Key Management Interoperability Protocol (KMIP) server or a local keyfile

## Option 1: Local Key Management (Development/Testing)

Generate a keyfile for local key management:

```bash
# Generate a 32-byte random key
openssl rand -base64 32 > /etc/mongodb/keyfile
chmod 600 /etc/mongodb/keyfile
chown mongodb:mongodb /etc/mongodb/keyfile
```

Configure `mongod.conf` to enable encryption with the local key:

```yaml
storage:
  dbPath: /var/lib/mongodb
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2

security:
  enableEncryption: true
  encryptionKeyFile: /etc/mongodb/keyfile
```

Start with local keyfile:

```bash
mongod --enableEncryption \
       --encryptionKeyFile /etc/mongodb/keyfile \
       --dbpath /var/lib/mongodb \
       --logpath /var/log/mongodb/mongod.log
```

## Option 2: KMIP Server (Production)

For production, use a KMIP-compliant key management server (HashiCorp Vault, Thales, AWS CloudHSM):

```yaml
# mongod.conf
storage:
  dbPath: /var/lib/mongodb
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8

security:
  enableEncryption: true
  kmip:
    serverName: kmip.company.internal
    port: 5696
    clientCertificateFile: /etc/mongodb/kmip-client.pem
    serverCAFile: /etc/mongodb/kmip-ca.pem
    keyIdentifier: "mongodb-encryption-key-2026"
```

Restart MongoDB after updating the configuration:

```bash
systemctl restart mongod
```

## Verifying Encryption Is Active

Check that encryption is enabled in the server logs:

```bash
grep -i encrypt /var/log/mongodb/mongod.log
# Expected: "Encryption at rest is enabled"
```

Check via administrative command:

```javascript
db.adminCommand({ getCmdLineOpts: 1 })
// Look for enableEncryption: true in the parsed section
```

## Key Rotation

Rotate the encryption key without data re-encryption (MongoDB Enterprise 3.4+):

```bash
# MongoDB wraps data keys with the master key
# Rotating the master key re-wraps data keys without decrypting all data
mongod --enableEncryption \
       --kmipRotateMasterKey \
       --kmipServerName kmip.company.internal \
       --kmipServerCAFile /etc/mongodb/kmip-ca.pem \
       --kmipClientCertificateFile /etc/mongodb/kmip-client.pem
```

## Encryption and Backup Considerations

Encrypted data files are only decryptable with the correct key. Ensure your backup strategy accounts for key availability:

```bash
# mongodump works on live data (not encrypted files directly)
mongodump --uri="mongodb://admin:password@localhost:27017" \
          --out /backup/dump_2026_03_31

# The dump files are NOT encrypted - encrypt the backup storage separately
tar czf - /backup/dump_2026_03_31 | openssl enc -aes-256-cbc -pbkdf2 -k "$BACKUP_KEY" \
  > /secure-backup/dump_2026_03_31.tar.gz.enc
```

## Encrypted Storage Engine Data Files

When encryption is enabled, MongoDB encrypts:
- Collection data files
- Index files
- Journal files
- Temporary files used during builds

It does NOT encrypt:
- mongod.conf (config file)
- Log files
- Network traffic (use TLS for that)

## Combining with TLS

Encryption at rest and TLS in transit complement each other:

```yaml
# Complete security configuration
security:
  enableEncryption: true
  kmip:
    serverName: kmip.company.internal
    port: 5696
    clientCertificateFile: /etc/mongodb/kmip-client.pem
    serverCAFile: /etc/mongodb/kmip-ca.pem

net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/mongodb/server.pem
    CAFile: /etc/mongodb/ca.pem
```

## Summary

Configure MongoDB encryption at rest using the WiredTiger native encryption feature in MongoDB Enterprise by setting `security.enableEncryption: true` and configuring either a local keyfile for development or a KMIP server for production. Encryption at rest protects data files, indexes, and journal files from physical access. Combine with TLS for in-transit encryption, use KMIP for enterprise key management with rotation support, and ensure backup storage is also encrypted since dump files are not inherently encrypted.
