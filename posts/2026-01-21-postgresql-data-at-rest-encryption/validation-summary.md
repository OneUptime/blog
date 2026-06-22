# Validation Summary: How to Encrypt PostgreSQL Data at Rest

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- pgcrypto
- LUKS and cryptsetup
- Linux crypttab
- AWS RDS for PostgreSQL
- Google Cloud SQL for PostgreSQL
- Azure Database for PostgreSQL
- Cloud key management services

## Sources Consulted
- PostgreSQL pgcrypto documentation: https://www.postgresql.org/docs/current/pgcrypto.html
- PostgreSQL system administration functions documentation: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL encryption options documentation: https://www.postgresql.org/docs/current/encryption-options.html
- cryptsetup manual page: https://man7.org/linux/man-pages/man8/cryptsetup.8.html
- cryptsetup luksFormat manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksFormat.8.html
- crypttab manual page: https://man7.org/linux/man-pages/man5/crypttab.5.html
- AWS CLI create-db-instance documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- Amazon RDS encryption documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- Google Cloud SQL for PostgreSQL CMEK documentation: https://docs.cloud.google.com/sql/docs/postgres/cmek
- Azure Database for PostgreSQL data encryption documentation: https://learn.microsoft.com/en-us/azure/postgresql/security/security-data-encryption
- EDB Transparent Data Encryption documentation: https://www.enterprisedb.com/docs/tde/latest/

## Issues Found
- The TDE row used "Enterprise", which could imply built-in PostgreSQL TDE. PostgreSQL does not provide native TDE in the official community distribution; TDE is available in PostgreSQL distributions such as EDB Postgres Advanced Server and EDB Postgres Extended Server. Changed the row label to "TDE (PostgreSQL distributions)".
- The LUKS mount example mounted directly to `/var/lib/postgresql/16/main` without ensuring the mount point exists or that PostgreSQL owns the mounted directory. Added `mkdir -p` and `chown postgres:postgres` so the command sequence is operational.
- The AWS RDS example omitted required `create-db-instance` options for an RDS DB instance, including DB instance class, allocated storage, and master user configuration. Added `--db-instance-class`, `--allocated-storage`, `--master-username`, and `--manage-master-user-password`.
- The cloud provider table described Azure as "TDE". Azure Database for PostgreSQL documentation describes encryption at rest using service-managed keys or customer-managed keys backed by Azure Key Vault, not Azure SQL TDE. Changed the provider row to "Azure Database for PostgreSQL" with "Storage encryption".

## Review Notes
- The pgcrypto examples are syntactically consistent with PostgreSQL's documented `pgp_sym_encrypt` and `pgp_sym_decrypt` functions for textual data.
- The crypttab example is valid, but production deployments should prefer stable device identifiers such as `UUID=` instead of raw device names like `/dev/sdb`.
- Storing encryption keys in session settings can be workable for examples, but production systems should avoid exposing long-lived secrets inside database sessions and should integrate with a dedicated key management flow.
