# Validation Summary: How to Set Up Cloud Data Fusion Replication for Database-to-BigQuery Sync

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Data Fusion
- Cloud Data Fusion Replication
- BigQuery
- Cloud Storage
- MySQL
- SQL Server
- Oracle
- Change Data Capture (CDC)

## Sources Consulted
- Google Cloud Data Fusion Replication overview: https://docs.cloud.google.com/data-fusion/docs/concepts/replication
- Google Cloud Data Fusion MySQL to BigQuery replication tutorial: https://docs.cloud.google.com/data-fusion/docs/tutorials/replicating-data/mysql-to-bigquery
- Google Cloud Data Fusion enable Replication: https://docs.cloud.google.com/data-fusion/docs/how-to/enable-replication
- Google Cloud Data Fusion Replication data types: https://docs.cloud.google.com/data-fusion/docs/reference/replication-data-types
- Google Cloud Data Fusion Replication schema changes: https://docs.cloud.google.com/data-fusion/docs/reference/replication-schema-changes
- Google Cloud Data Fusion Replication API reference: https://docs.cloud.google.com/data-fusion/docs/reference/replication-ref
- Cloud SQL for MySQL database flags: https://cloud.google.com/sql/docs/mysql/flags
- MySQL CDC source plugin documentation: https://github.com/data-integrations/database-delta-plugins/blob/develop/mysql-delta-plugins/docs/mysql-cdcSource.md
- CDAP BigQuery Replication Target reference: https://cdap.atlassian.net/wiki/spaces/DOCS/pages/963543163
- MySQL replication user documentation: https://dev.mysql.com/doc/refman/8.4/en/replication-howto-repuser.html
- MySQL CREATE USER documentation: https://dev.mysql.com/doc/refman/en/create-user.html

## Issues Found
- The post incorrectly listed PostgreSQL and Cloud SQL for PostgreSQL as supported Cloud Data Fusion Replication sources. Updated the source list to MySQL, SQL Server, and Oracle, and clarified Cloud SQL for MySQL as a MySQL source when CDC and networking requirements are met.
- The post stated Replication is Enterprise-only. Current Google documentation describes Replication as an accelerator for Cloud Data Fusion version 6.3.0 or later, so the prerequisites were updated accordingly.
- The MySQL CDC setup only checked `log_bin`. Added checks for `binlog_format` and `binlog_row_image`, and clarified that row-based binary logs with full row images are expected.
- The MySQL replication user example used the default authentication plugin. Updated it to use `mysql_native_password`, matching the MySQL CDC source plugin guidance for compatibility.
- The advanced setting was described as a final table name prefix. Corrected it to `Staging Table Prefix`, which applies to temporary staging tables.
- The metadata column list included `_op`, which is not listed by the BigQuery Replication Target reference. Replaced the list with the documented auxiliary columns and their usage conditions.

## Review Notes
The post remains a high-level UI walkthrough rather than a complete environment-specific deployment guide. Production setups should still verify source-specific prerequisites such as primary keys, JDBC driver upload for MySQL, SQL Server CDC setup, Oracle Datastream requirements, network routing, and IAM permissions for the chosen Cloud Data Fusion instance and target project.
