# How to Configure MySQL for GDPR Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, GDPR, Compliance, Security, Privacy

Description: Learn how to configure MySQL databases to meet GDPR requirements including data encryption, access controls, audit logging, and implementing the right to erasure.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

GDPR (General Data Protection Regulation) imposes strict requirements on how organizations collect, store, process, and protect personal data of EU residents. MySQL databases storing personal data must be configured with appropriate technical measures. This guide covers the key MySQL configurations and query patterns for GDPR compliance.

## Key GDPR Technical Requirements

- **Article 25** - Data protection by design and by default
- **Article 32** - Encryption, pseudonymization, and access controls
- **Article 17** - Right to erasure (right to be forgotten)
- **Article 20** - Right to data portability
- **Article 33** - Breach notification (requires audit logging)

## Encrypting Personal Data at Rest

```text
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring
default_table_encryption=ON
innodb_redo_log_encrypt=ON
innodb_undo_log_encrypt=ON
binlog_encryption=ON
```

Encrypt specific tables containing personal data:

```sql
-- Encrypt tables with personal identifiable information
ALTER TABLE users ENCRYPTION='Y';
ALTER TABLE user_profiles ENCRYPTION='Y';
ALTER TABLE order_history ENCRYPTION='Y';
```

## Enforcing TLS for Data in Transit

```text
[mysqld]
require_secure_transport=ON
tls_version=TLSv1.2,TLSv1.3
```

## Access Control and Least Privilege

```sql
-- Create a minimal-access service account
CREATE USER 'app_service'@'10.0.1.0/255.255.255.0'
  IDENTIFIED BY 'ServicePassword!' REQUIRE SSL;

-- Grant only what's needed
GRANT SELECT, INSERT ON myapp.users TO 'app_service'@'10.0.1.0/255.255.255.0';
GRANT SELECT, INSERT, UPDATE ON myapp.orders TO 'app_service'@'10.0.1.0/255.255.255.0';

-- DPO (Data Protection Officer) read-only access
CREATE USER 'dpo_audit'@'dpo-workstation'
  IDENTIFIED BY 'DPOPassword!' REQUIRE SSL;
GRANT SELECT ON myapp.* TO 'dpo_audit'@'dpo-workstation';
```

## Implementing the Right to Erasure (Article 17)

Create a stored procedure to handle erasure requests:

```sql
DELIMITER $$

CREATE PROCEDURE delete_user_data(IN p_user_id INT)
BEGIN
  -- Pseudonymize or delete personal data
  UPDATE users SET
    email = CONCAT('deleted_', id, '@removed.invalid'),
    full_name = 'Deleted User',
    phone = NULL,
    date_of_birth = NULL,
    address = NULL,
    gdpr_deleted = TRUE,
    gdpr_deleted_at = NOW()
  WHERE id = p_user_id;

  -- Remove from marketing lists
  DELETE FROM email_subscriptions WHERE user_id = p_user_id;
  DELETE FROM marketing_preferences WHERE user_id = p_user_id;

  -- Log the erasure request
  INSERT INTO gdpr_erasure_log (user_id, requested_at, processed_at)
  VALUES (p_user_id, NOW(), NOW());
END$$

DELIMITER ;
```

## Data Portability (Article 20)

Generate a portable JSON export of a user's data:

```sql
SELECT JSON_OBJECT(
  'user_id', u.id,
  'email', u.email,
  'name', u.full_name,
  'joined', u.created_at,
  'orders', (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT('order_id', o.id, 'total', o.total, 'date', o.created_at)
    )
    FROM orders o WHERE o.user_id = u.id
  )
) AS user_data_export
FROM users u
WHERE u.id = 42;
```

## Audit Logging for Breach Detection (Article 33)

```text
[mysqld]
plugin-load-add=audit_log.so
audit_log_format=JSON
audit_log_file=/var/log/mysql/gdpr-audit.json
audit_log_policy=ALL
```

## Pseudonymization

Store a pseudonymized identifier for analytics while keeping the mapping table encrypted:

```sql
-- Separate table mapping real IDs to pseudonymous tokens
CREATE TABLE id_pseudonymization (
  real_id INT NOT NULL,
  pseudo_id CHAR(36) NOT NULL DEFAULT (UUID()),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (real_id),
  UNIQUE KEY (pseudo_id)
) ENGINE=InnoDB ENCRYPTION='Y';
```

## Summary

MySQL GDPR compliance combines technical controls: encrypt personal data at rest with InnoDB tablespace encryption, enforce TLS with `require_secure_transport=ON`, implement least-privilege access controls, build stored procedures for erasure requests, and enable audit logging for breach notification readiness. Document your data flows, maintain an erasure log, and review configurations quarterly to remain compliant as your data processing activities change.
