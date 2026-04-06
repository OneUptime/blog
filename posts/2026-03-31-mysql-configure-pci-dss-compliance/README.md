# How to Configure MySQL for PCI DSS Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, PCI DSS, Compliance, Hardening

Description: Learn how to configure MySQL to meet PCI DSS requirements including encryption, access controls, logging, and patch management for cardholder data environments.

---

PCI DSS (Payment Card Industry Data Security Standard) mandates strict controls for systems that store, process, or transmit cardholder data. MySQL databases in a cardholder data environment (CDE) must be configured to meet requirements across encryption, access control, logging, and vulnerability management. This guide covers the key MySQL configurations for PCI DSS compliance.

## PCI DSS Requirements Relevant to MySQL

Key requirements affecting MySQL deployments:

- **Req 2** - Do not use vendor defaults (change root password, remove test DB)
- **Req 3** - Protect stored cardholder data (encryption at rest)
- **Req 4** - Encrypt data in transit (TLS)
- **Req 7** - Restrict access by need to know (least privilege)
- **Req 8** - Identify and authenticate users (strong passwords)
- **Req 10** - Track and monitor all access (audit logging)

## Requirement 2: Remove Defaults

```sql
-- Remove anonymous users
DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'::1';

-- Remove test database
DROP DATABASE IF EXISTS test;

-- Disable remote root login
DROP USER IF EXISTS 'root'@'%';

-- Set strong root password
ALTER USER 'root'@'localhost' IDENTIFIED BY 'ComplexR00tP@ssw0rd!';
```

## Requirement 3: Encrypt Cardholder Data at Rest

```text
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring
default_table_encryption=ON
innodb_redo_log_encrypt=ON
innodb_undo_log_encrypt=ON
binlog_encryption=ON
```

Encrypt specific tables containing PANs:

```sql
ALTER TABLE card_transactions ENCRYPTION='Y';
ALTER TABLE payment_tokens ENCRYPTION='Y';
```

## Requirement 4: Enforce TLS for All Connections

```text
[mysqld]
ssl-ca=/etc/mysql/ssl/ca-cert.pem
ssl-cert=/etc/mysql/ssl/server-cert.pem
ssl-key=/etc/mysql/ssl/server-key.pem
tls_version=TLSv1.2,TLSv1.3
require_secure_transport=ON
```

`require_secure_transport=ON` forces all connections to use SSL:

```sql
SHOW VARIABLES LIKE 'require_secure_transport';
```

## Requirement 7: Implement Least Privilege

```sql
-- Create role-based access
CREATE ROLE 'payment_reader', 'payment_writer';

GRANT SELECT ON payments.card_transactions TO 'payment_reader';
GRANT SELECT, INSERT ON payments.card_transactions TO 'payment_writer';

-- Assign roles
CREATE USER 'reporting_svc'@'10.0.1.0/255.255.255.0'
  IDENTIFIED BY 'ServicePass!' REQUIRE SSL;
GRANT 'payment_reader' TO 'reporting_svc'@'10.0.1.0/255.255.255.0';
SET DEFAULT ROLE 'payment_reader' TO 'reporting_svc'@'10.0.1.0/255.255.255.0';
```

## Requirement 8: Strong Password Policy

```text
[mysqld]
validate_password.policy=STRONG
validate_password.length=12
validate_password.mixed_case_count=1
validate_password.number_count=1
validate_password.special_char_count=1
default_password_lifetime=90
```

```sql
-- Verify password policy
SHOW VARIABLES LIKE 'validate_password%';
```

## Requirement 10: Audit Logging

```text
[mysqld]
general_log=ON
general_log_file=/var/log/mysql/pci-general.log
log_error=/var/log/mysql/error.log
```

For more structured logging suitable for SIEM ingestion, use the Percona Audit Plugin:

```text
[mysqld]
plugin-load-add=audit_log.so
audit_log_format=JSON
audit_log_file=/var/log/mysql/audit.json
audit_log_policy=ALL
```

## Disabling Unnecessary Features

```text
[mysqld]
local_infile=OFF
skip_symbolic_links=ON
secure_file_priv=/var/lib/mysql-files
```

```sql
SHOW VARIABLES LIKE 'local_infile';
```

## Summary

MySQL PCI DSS compliance requires layered controls: remove defaults, enable at-rest encryption via keyring and tablespace encryption, enforce TLS with `require_secure_transport=ON`, implement least-privilege roles, enforce strong password policies, and enable comprehensive audit logging. Document all configurations and schedule quarterly reviews to maintain compliance as MySQL versions and PCI DSS requirements evolve.
