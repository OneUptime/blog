# Validation Summary: How to Encrypt Data at Rest and in Transit in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse TLS/SSL configuration
- ClickHouse inter-server HTTPS and secure native TCP
- ClickHouse encrypted disks and storage policies
- ClickHouse AES encryption functions
- ClickHouse encryption codecs
- OpenSSL certificate generation
- SQL hashing functions

## Sources Consulted
- ClickHouse TLS configuration guide: https://clickhouse.com/docs/guides/sre/tls/configuring-tls
- ClickHouse external disks and encrypted disk configuration: https://clickhouse.com/docs/operations/storing-data
- ClickHouse encryption functions: https://clickhouse.com/docs/sql-reference/functions/encryption-functions
- ClickHouse server settings and encryption codec configuration: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse CREATE TABLE codec documentation: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse system.disks documentation: https://clickhouse.com/docs/operations/system-tables/disks
- ClickHouse system.storage_policies documentation: https://clickhouse.com/docs/operations/system-tables/storage_policies
- ClickHouse other functions documentation for getServerPort/getSetting: https://clickhouse.com/docs/sql-reference/functions/other-functions

## Issues Found
- The generated server certificate did not include a subjectAltName, which is required for reliable hostname verification in modern TLS clients. Added a SAN to the CSR and copied extensions into the signed certificate.
- A TLS config comment described `disableProtocols` as disabling session tickets. Changed it to accurately describe disabling legacy protocols.
- The curl example used `-k`, which disables certificate verification. Replaced it with `--cacert` so the HTTPS example validates the CA.
- The encrypted disk example used a 32-byte key without specifying `AES_256_CTR`; ClickHouse encrypted disks default to `AES_128_CTR`. Added `AES_256_CTR` where 32-byte keys are shown.
- The encrypted disk comment incorrectly described `key_hex` as a key from a file. Changed it to a hex-encoded key and used a valid 64-character hex example for AES-256.
- Environment-variable XML examples used self-closing `from_env` tags. Changed them to explicit open/close tags matching ClickHouse documentation examples.
- Several AES-256-GCM examples used invalid key or IV lengths. Replaced them with 32-byte keys and 16-byte IVs consistent with ClickHouse encryption function documentation.
- The supported encryption modes list included unsupported CFB variants. Updated it to match the modes listed in current ClickHouse documentation.
- The `encryptPII` function used `generateUUIDv4()` as an IV. Changed the function to accept an IV argument so the caller can provide/store the correct IV used for decryption.
- Encryption codec key placeholders were not valid hex values. Replaced them with valid 128-bit and 256-bit hex examples.
- The hashing example showed fast salted SHA-256 for password verification. Changed the example to API tokens/high-entropy secrets and renamed the columns and verification query accordingly.
- The pseudonymization example used `sipHash64`, which is not appropriate as a secret-keyed pseudonymization example. Replaced it with SHA-256 over a secret pepper and user ID.
- The monitoring section used `getSetting('tcp_port_secure')` and `system.settings`, which are for session settings rather than server configuration. Replaced them with `getServerPort('tcp_port_secure')` and `system.server_settings`.
- The monitoring comment claimed the query checked TLS status for the current connection. Changed it to say it checks the configured secure native TCP port.

## Review Notes
The TLS examples are still demonstration-grade and use self-signed certificates; production deployments should use organization-managed PKI and operational key management. Encryption codecs are deterministic and ClickHouse documentation notes that indexed encrypted columns can still expose plaintext in index files and queried values can appear in query logs.
