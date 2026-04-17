# Validation Summary: How to Use Encrypted Disk in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (encrypted disk storage type)
- ClickHouse storage configuration and storage policies
- AES-CTR encryption (AES_128_CTR, AES_192_CTR, AES_256_CTR)
- ClickHouse S3 disk integration
- ClickHouse MergeTree table engine
- OpenSSL (for key generation)
- systemd (for environment variable injection)

## Sources Consulted
- ClickHouse docs: "Using Data Encryption" section at https://clickhouse.com/docs/en/operations/storing-data
- ClickHouse server configuration parameters: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings (for `from_env` attribute)
- ClickHouse system tables reference (system.disks, system.parts)

## Issues Found
No technical issues found.

All major claims verified against official ClickHouse documentation:
- Disk type `encrypted` wraps another disk — correct
- Supported algorithms `AES_128_CTR` / `AES_192_CTR` / `AES_256_CTR` with 16/24/32-byte keys — correct
- XML configuration tags (`type`, `disk`, `path`, `algorithm`, `key_hex`) — correct
- Multiple keys via `key_hex id="N"` and `current_key_id` for selecting the write key — correct
- Wrapping S3 disks (including `metadata_path` parameter) — correct
- Storage policy `storage_policy = 'encrypted_policy'` applied via table settings — correct
- `openssl rand -hex 32` produces 64 hex chars (32 bytes) suitable for AES_256_CTR — correct
- System tables `system.disks` and `system.parts` with referenced columns (`name`, `type`, `path`, `disk_name`, `bytes_on_disk`, `active`, `table`, `database`) — correct

## Review Notes
- The `from_env` attribute on `<key_hex>` is explicitly documented in ClickHouse's `encryption_codecs` (column-level codec) section. ClickHouse's XML config loader supports `from_env` generically across config tags, so this pattern works for the encrypted disk as well, but note that the encrypted-disk-specific docs do not call it out explicitly.
- The claim that "ClickHouse stores encrypted data and a small metadata header per file" reflects the actual implementation (files contain a header with algorithm and key ID) but is not explicitly stated on the public storing-data page. It is accurate in practice.
- Similarly, the guidance that `OPTIMIZE TABLE FINAL` re-writes parts with the current key is not explicitly documented on the storing-data page. It follows from the fact that merges read and rewrite parts using the current key, but readers should verify behavior on their specific ClickHouse version.
- HDFS support in ClickHouse is marked as unsupported/deprecated in newer versions; the post mentions HDFS only in passing as a disk type that can be wrapped, which is fine.
- Key backup and rotation guidance is sensible. Production deployments should strongly prefer a secrets manager over embedding keys in config, which the post already recommends.
