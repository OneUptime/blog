# Validation Summary: How to Configure AWX with External Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX and AWX Operator
- Kubernetes Secrets and custom resources
- PostgreSQL
- Amazon RDS for PostgreSQL
- AWS CLI
- SSL/TLS database connections

## Sources Consulted
- AWX Operator Database Configuration: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/database-configuration.html
- AWX Operator migration documentation: https://docs.ansible.com/projects/awx-operator/en/latest/migration/migration.html
- AWX Operator custom CA trust documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/trusting-a-custom-certificate-authority.html
- AWS CLI `rds create-db-instance` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- Amazon RDS SSL/TLS documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html
- Amazon RDS for PostgreSQL SSL documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html

## Issues Found
- The prerequisites stated that PostgreSQL 13 or higher was sufficient. Current AWX Operator documentation identifies PostgreSQL 15 as the tested default version, with newer versions likely only appropriate as external databases after testing. Updated the wording to match the current documented support posture.
- The AWX external PostgreSQL secret example omitted `target_session_attrs`, which the AWX Operator documentation includes for external and clustered database configurations. Added `target_session_attrs: "read-write"` to align the example with the official format.
- The SSL/TLS example used an unsupported `sslrootcert` key in the AWX PostgreSQL configuration secret and referenced the older `rds-ca-2019` certificate. Removed the unsupported secret key and changed the note to use the current AWS RDS regional or global certificate bundles with the AWX Operator `bundle_cacert_secret` setting.

## Review Notes
The remaining commands and configuration examples are broadly valid as illustrative deployment guidance. The database tuning values should still be treated as starting points and tested against the actual workload and database instance size.
