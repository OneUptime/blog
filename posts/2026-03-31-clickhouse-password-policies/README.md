# How to Configure ClickHouse Password Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, Password Policy, Authentication, Compliance

Description: Configure ClickHouse password policies to enforce strong passwords, set expiration rules, and use hashed password storage to meet security compliance requirements.

---

Password policies in ClickHouse control how user passwords are stored, what complexity they must meet, and when they expire. Proper password configuration is foundational to access security and often required for compliance frameworks like SOC 2, PCI DSS, and ISO 27001.

## Password Hashing Methods

ClickHouse supports multiple password storage methods. Always use a hashed method in production:

```sql
-- SHA-256 hash (common and well-supported)
CREATE USER analyst1 IDENTIFIED WITH sha256_password BY 'StrongPass!2026';

-- bcrypt (more resistant to brute-force attacks)
CREATE USER analyst2 IDENTIFIED WITH bcrypt_password BY 'AnotherPass!2026';

-- Double SHA-1 for MySQL compatibility protocol
CREATE USER mysql_app IDENTIFIED WITH double_sha1_password BY 'AppPass!2026';
```

Never use the plaintext `password` method in production.

## Storing Hashed Passwords in users.xml

```xml
<users>
  <analyst1>
    <password_sha256_hex>
      <!-- Generate with: echo -n 'StrongPass!2026' | sha256sum -->
      8348a239219f54fcb388bb212709db0b...
    </password_sha256_hex>
  </analyst1>
</users>
```

## Setting Password Expiration

ClickHouse supports password validity periods:

```sql
-- Password expires in 90 days
CREATE USER analyst1
    IDENTIFIED WITH sha256_password BY 'StrongPass!2026'
    VALID UNTIL '2026-06-30';

-- Update expiration on password change
ALTER USER analyst1
    IDENTIFIED WITH sha256_password BY 'NewStrongPass!2026'
    VALID UNTIL '2026-09-30';
```

## Querying User Password Status

```sql
SELECT
    name,
    auth_type,
    valid_until,
    dateDiff('day', now(), valid_until) AS days_until_expiry
FROM system.users
WHERE valid_until IS NOT NULL
ORDER BY days_until_expiry ASC;
```

## Alerting on Expiring Passwords

```sql
SELECT name, valid_until
FROM system.users
WHERE valid_until IS NOT NULL
    AND valid_until < now() + INTERVAL 14 DAY
ORDER BY valid_until ASC;
```

Run this as a scheduled check and notify the team when service accounts have passwords expiring within 14 days.

## Enforcing No-Password Restrictions

For service accounts that should only connect from specific IPs:

```sql
CREATE USER etl_service
    IDENTIFIED WITH sha256_password BY 'ServicePass!2026'
    HOST IP '10.0.1.0/24';
```

The `HOST IP` restriction means even a valid password won't work from an unauthorized IP, adding defense in depth.

## Disabling a User Without Deleting

```sql
-- Expire the password immediately to disable login
ALTER USER analyst1 VALID UNTIL '2020-01-01';

-- Or reset to a random password and don't share it
ALTER USER analyst1 IDENTIFIED WITH sha256_password BY 'DISABLED_RANDOM_xk9v3ms8';
```

## Generating Hashed Passwords for Config Files

When managing passwords via XML config files:

```bash
# Generate SHA-256 hash
echo -n 'StrongPass!2026' | sha256sum | awk '{print $1}'

# Generate double SHA-1 (for MySQL compat)
echo -n 'StrongPass!2026' | sha1sum | awk '{print $1}' | xxd -r -p | sha1sum | awk '{print $1}'
```

## Regular Password Audit

```sql
SELECT
    name,
    auth_type,
    valid_until,
    host_ip,
    CASE
        WHEN valid_until IS NULL THEN 'no_expiry'
        WHEN valid_until < now() THEN 'expired'
        WHEN valid_until < now() + INTERVAL 30 DAY THEN 'expiring_soon'
        ELSE 'valid'
    END AS password_status
FROM system.users
ORDER BY name;
```

## Summary

ClickHouse password policies protect your cluster through strong hashing (SHA-256 or bcrypt), password expiration rules, and IP-based access restrictions. Always hash passwords before storing them in config files, set expiration dates for human users and service accounts, and run regular audits to catch expired or near-expiry credentials before they cause access disruptions.
