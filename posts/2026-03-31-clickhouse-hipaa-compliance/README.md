# How to Configure ClickHouse for HIPAA Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, HIPAA, Compliance, Security, PHI, Healthcare, Encryption

Description: Learn how to configure ClickHouse to meet HIPAA technical safeguard requirements for protecting electronic Protected Health Information stored in analytics databases.

---

HIPAA's Security Rule requires covered entities to implement technical safeguards for electronic Protected Health Information (ePHI). If your ClickHouse deployment stores or processes healthcare data, these configurations are required.

## HIPAA Technical Safeguards Mapped to ClickHouse

| HIPAA Requirement | ClickHouse Implementation |
| --- | --- |
| Access Control (164.312(a)(1)) | SQL RBAC, user authentication |
| Audit Controls (164.312(b)) | Query logging, system.query_log |
| Integrity Controls (164.312(c)(1)) | Replication, checksums |
| Transmission Security (164.312(e)(1)) | TLS for all connections |
| Encryption at Rest | Encrypted disk storage |

## Minimum Necessary Access (164.312(a)(1))

Grant access only to the PHI fields each role requires:

```sql
-- Clinical staff: access to treatment records only
CREATE ROLE clinical_staff;
GRANT SELECT(patient_id, diagnosis_code, treatment_date, provider_id)
ON health_db.patient_records TO clinical_staff;

-- Billing: access to billing fields only
CREATE ROLE billing_staff;
GRANT SELECT(patient_id, claim_id, procedure_code, amount)
ON health_db.billing_records TO billing_staff;

-- Researcher: de-identified data only
CREATE ROLE researcher;
GRANT SELECT ON health_db.deidentified_records TO researcher;
```

## Audit Controls (164.312(b))

ClickHouse logs all queries to `system.query_log`. Configure log retention:

```sql
-- Keep 7 years of audit logs (HIPAA requirement is 6 years)
ALTER TABLE system.query_log MODIFY TTL event_date + INTERVAL 7 YEAR;
```

Query audit logs for PHI access:

```sql
SELECT
    event_time,
    user,
    client_hostname,
    query_kind,
    tables,
    read_rows,
    query
FROM system.query_log
WHERE has(tables, 'health_db.patient_records')
  AND type = 'QueryFinish'
ORDER BY event_time DESC;
```

## Encryption at Rest

Configure encrypted storage for ePHI tables:

```text
<storage_configuration>
  <disks>
    <phi_encrypted>
      <type>encrypted</type>
      <disk>default</disk>
      <path>phi_data/</path>
      <algorithm>AES_128_CTR</algorithm>
      <key_hex>your_32_char_hex_encryption_key</key_hex>
    </phi_encrypted>
  </disks>
  <policies>
    <phi_policy>
      <volumes>
        <phi_volume>
          <disk>phi_encrypted</disk>
        </phi_volume>
      </volumes>
    </phi_policy>
  </policies>
</storage_configuration>
```

Create PHI tables using the encrypted storage policy:

```sql
CREATE TABLE health_db.patient_records (
    patient_id UUID,
    mrn String,
    diagnosis_code String,
    treatment_date Date,
    provider_id UInt32
) ENGINE = MergeTree()
ORDER BY (patient_id, treatment_date)
SETTINGS storage_policy = 'phi_policy';
```

## Transmission Security (164.312(e)(1))

Enforce TLS for all connections - disable plaintext ports:

```text
<https_port>8443</https_port>
<tcp_port_secure>9440</tcp_port_secure>
<interserver_https_port>9010</interserver_https_port>
<!-- Disable plaintext -->
<!-- <http_port>8123</http_port> -->
<!-- <tcp_port>9000</tcp_port> -->
<!-- <interserver_http_port>9009</interserver_http_port> -->
```

## Automatic Logoff

Set session timeouts to enforce HIPAA automatic logoff requirements:

```sql
CREATE SETTINGS PROFILE hipaa_session
SETTINGS idle_connection_timeout = 1800;  -- close idle connections after 30 minutes

ALTER USER clinical_user SETTINGS PROFILE hipaa_session;
```

## Backup and Disaster Recovery

Maintain encrypted backups:

```sql
BACKUP DATABASE health_db
TO S3('s3://hipaa-backups/clickhouse/', 'aws_key', 'aws_secret')
SETTINGS compression_method = 'lz4';
```

Enable S3 server-side encryption (SSE-KMS or SSE-S3) on the destination bucket to encrypt backup objects at rest. For password-protected backups, write to a ZIP archive on a file disk instead of S3.

## Business Associate Agreement

Before deploying ClickHouse in a hosted environment, ensure your cloud provider or colocation facility has signed a Business Associate Agreement (BAA). Document all systems that touch ePHI for your risk assessment.

## Summary

HIPAA compliance in ClickHouse requires column-level access control for minimum necessary access, comprehensive audit logging with long retention, encrypted storage for ePHI tables, TLS for all network connections, and documented policies for access reviews and breach notification. These controls satisfy the HIPAA Security Rule's technical safeguard requirements.
