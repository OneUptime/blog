# How to Encrypt PostgreSQL Data at Rest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Encryption, Security, Data at Rest, TDE

Description: A guide to implementing data-at-rest encryption for PostgreSQL using various approaches from filesystem to column-level encryption.

---

Data-at-rest encryption protects data stored on disk from unauthorized access. This guide covers encryption approaches for PostgreSQL.

## Encryption Approaches

| Approach | Transparency | Performance | Coverage |
|----------|--------------|-------------|----------|
| Filesystem | Full | Good | All data |
| pgcrypto | None | Variable | Selected data |
| TDE (Enterprise) | Full | Good | All data |

## Filesystem Encryption

### LUKS (Linux)

```bash
# Create encrypted volume
sudo cryptsetup luksFormat /dev/sdb
sudo cryptsetup luksOpen /dev/sdb pg_encrypted

# Create filesystem
sudo mkfs.ext4 /dev/mapper/pg_encrypted

# Mount for PostgreSQL
sudo mount /dev/mapper/pg_encrypted /var/lib/postgresql/16/main
```

### Auto-unlock with Key File

```bash
# Create key file
sudo dd if=/dev/urandom of=/root/pg_keyfile bs=1024 count=4
sudo chmod 400 /root/pg_keyfile

# Add key to LUKS
sudo cryptsetup luksAddKey /dev/sdb /root/pg_keyfile

# Add to crypttab
echo "pg_encrypted /dev/sdb /root/pg_keyfile luks" | sudo tee -a /etc/crypttab
```

## pgcrypto Column Encryption

```sql
CREATE EXTENSION pgcrypto;

-- Encrypt sensitive data
INSERT INTO users (name, ssn_encrypted)
VALUES (
    'John Doe',
    pgp_sym_encrypt('123-45-6789', 'encryption_key')
);

-- Decrypt
SELECT name, pgp_sym_decrypt(ssn_encrypted, 'encryption_key') AS ssn
FROM users WHERE id = 1;
```

### Key Management

```sql
-- Use session variable for key
SET myapp.encryption_key = 'secret_key';

-- Function to get key
CREATE OR REPLACE FUNCTION get_key()
RETURNS TEXT AS $$
    SELECT current_setting('myapp.encryption_key');
$$ LANGUAGE SQL STABLE;

-- Use in queries
SELECT pgp_sym_decrypt(data, get_key()) FROM secrets;
```

## AWS RDS Encryption

```bash
# Create encrypted RDS instance
aws rds create-db-instance \
    --db-instance-identifier mydb \
    --engine postgres \
    --storage-encrypted \
    --kms-key-id alias/aws/rds
```

## Cloud Provider Options

| Provider | Feature | Key Management |
|----------|---------|----------------|
| AWS RDS | Storage encryption | KMS |
| GCP Cloud SQL | Encryption by default | Cloud KMS |
| Azure | TDE | Key Vault |

## Best Practices

1. **Use filesystem encryption** - Transparent, covers all data
2. **Manage keys securely** - HSM or key management service
3. **Encrypt backups** - Same protection for backups
4. **Rotate keys periodically** - Security best practice
5. **Document procedures** - Recovery requires keys

## Conclusion

Data-at-rest encryption is essential for security compliance. Use filesystem-level encryption for comprehensive protection, supplemented by column-level encryption for sensitive fields.
