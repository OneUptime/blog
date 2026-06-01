# Validation Summary: How to Use Schema Conversion Tool for Heterogeneous Migrations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Schema Conversion Tool
- AWS Database Migration Service
- Oracle Database 19c
- PostgreSQL 15
- SQL and PL/pgSQL
- JDBC drivers
- psql

## Sources Consulted
- AWS Schema Conversion Tool User Guide: Installing JDBC drivers for AWS SCT: https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Installing.JDBCDrivers.html
- AWS Schema Conversion Tool User Guide: Using and viewing assessment reports: https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_AssessmentReport.html
- AWS Schema Conversion Tool User Guide: Saving and applying converted schema: https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Converting.DW.html
- AWS Schema Conversion Tool User Guide: Migrating Oracle to PostgreSQL: https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Source.Oracle.ToPostgreSQL.html
- AWS Database Migration Service User Guide: Homogeneous data migrations: https://docs.aws.amazon.com/dms/latest/userguide/dm-migrating-data.html
- PostgreSQL 15 documentation: PL/pgSQL transaction management: https://www.postgresql.org/docs/15/plpgsql-transactions.html
- PostgreSQL 15 documentation: WITH queries and recursive CTEs: https://www.postgresql.org/docs/15/queries-with.html
- PostgreSQL 15 documentation: psql command-line options: https://www.postgresql.org/docs/15/app-psql.html
- Oracle Database 19c SQL Language Reference: Data Types: https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/Data-Types.html

## Issues Found
- The installation section said to place JDBC drivers in the SCT `drivers` directory. AWS documentation says to download the drivers and configure their file paths in **Settings > Global Settings > Drivers**, so the step was updated.
- The assessment section described a green/yellow/orange/red color-coded system. Current AWS SCT documentation describes automatically converted objects and action items by simple, medium-complexity, and complex categories, so the wording was updated to match.
- The Oracle-to-PostgreSQL example stated that Oracle `NUMBER` was converted to PostgreSQL `INTEGER`. The post's own mapping table and AWS SCT guidance support `NUMBER(p,s)` to `NUMERIC(p,s)` as the general mapping, so the example was changed to `NUMERIC`.
- The PostgreSQL function explanation said the explicit `COMMIT` was removed because PostgreSQL functions run inside a transaction by default. PostgreSQL documentation is more precise: transaction control is available in top-level `CALL` or `DO`, while functions rely on caller-managed transaction control. The sentence was updated.

## Review Notes
The remaining examples are representative and syntactically reasonable for the technologies discussed. Actual SCT output can vary based on project conversion settings, source object definitions, target engine, and extension-pack usage.
