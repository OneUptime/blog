# How to Set Up PostgreSQL for PCI DSS Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, PCI DSS, Compliance, Security, Audit

Description: A guide to configuring PostgreSQL for PCI DSS compliance, covering encryption, access control, auditing, and security hardening.

---

PCI DSS compliance requires specific security controls for databases handling cardholder data. This guide covers PostgreSQL configuration.

## PCI DSS Requirements Overview

| Requirement | PostgreSQL Implementation |
|-------------|--------------------------|
| Encryption | SSL/TLS, pgcrypto |
| Access Control | Roles, RLS |
| Auditing | pgaudit, logging |
| Network Security | Firewall, pg_hba.conf |
| Password Policy | SCRAM-SHA-256 |

## Encryption

### SSL/TLS Connections

```conf
# postgresql.conf
ssl = on
ssl_cert_file = '/etc/postgresql/server.crt'
ssl_key_file = '/etc/postgresql/server.key'
ssl_min_protocol_version = 'TLSv1.2'
```

### pg_hba.conf (Require SSL)

```conf
hostssl all all 0.0.0.0/0 scram-sha-256
```

### Column Encryption

```sql
CREATE EXTENSION pgcrypto;

-- Encrypt PAN (Primary Account Number)
INSERT INTO transactions (pan_encrypted)
VALUES (pgp_sym_encrypt('4111111111111111', 'encryption_key'));
```

## Access Control

### Least Privilege

```sql
-- Application role with minimal access
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_pass';
GRANT SELECT, INSERT ON transactions TO app_user;
REVOKE ALL ON sensitive_table FROM PUBLIC;
```

### Row-Level Security

```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_isolation ON transactions
    USING (merchant_id = current_setting('app.merchant_id')::INTEGER);
```

## Auditing with pgaudit

```sql
CREATE EXTENSION pgaudit;

-- Configure auditing
ALTER SYSTEM SET pgaudit.log = 'all';
ALTER SYSTEM SET pgaudit.log_catalog = off;
ALTER SYSTEM SET pgaudit.log_parameter = on;
```

## Logging Configuration

```conf
# postgresql.conf
log_connections = on
log_disconnections = on
log_statement = 'ddl'
log_min_duration_statement = 0  # Log all statements
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

## Password Policy

```conf
# Strong passwords
password_encryption = scram-sha-256
```

```sql
-- Enforce password complexity via application
-- PostgreSQL doesn't have built-in password policy
```

## Network Security

```conf
# pg_hba.conf - Restrict access
hostssl pci_db app_user 10.0.0.0/24 scram-sha-256
host all all 0.0.0.0/0 reject
```

## Security Checklist

- [ ] SSL/TLS enabled and required
- [ ] Strong authentication (SCRAM-SHA-256)
- [ ] Least privilege access
- [ ] Audit logging enabled
- [ ] Data encryption (at rest and in transit)
- [ ] Network restrictions
- [ ] Regular security updates
- [ ] Backup encryption

## Conclusion

PCI DSS compliance requires encryption, access control, auditing, and network security. Configure PostgreSQL with SSL, pgaudit, and strict access controls.
