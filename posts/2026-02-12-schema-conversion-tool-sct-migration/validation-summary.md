# Validation Summary: How to Use Schema Conversion Tool (SCT) for Database Migration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Schema Conversion Tool (AWS SCT)
- AWS SCT CLI
- AWS Database Migration Service (AWS DMS)
- DMS Schema Conversion
- Oracle Database
- PostgreSQL and Aurora PostgreSQL
- Amazon Redshift
- JDBC drivers
- SQL and PL/pgSQL

## Sources Consulted
- AWS Schema Conversion Tool User Guide: What is AWS SCT? https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Welcome.html
- AWS Schema Conversion Tool User Guide: CLI Reference. https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Reference.html
- AWS Database Blog: Convert database schemas and application SQL using the AWS Schema Conversion Tool CLI. https://aws.amazon.com/blogs/database/convert-database-schemas-and-application-sql-using-the-aws-schema-conversion-tool-cli/
- AWS Database Migration Service User Guide: Migrating your source schema to your target database using AWS SCT. https://docs.aws.amazon.com/dms/latest/userguide/CHAP_GettingStarted.SCT.html
- AWS Database Migration Service User Guide: DMS Schema Conversion. https://docs.aws.amazon.com/dms/latest/userguide/CHAP_SchemaConversion.html
- AWS Database Blog: Migrate date functions from Oracle to Amazon RDS for PostgreSQL. https://aws.amazon.com/blogs/database/migrate-date-functions-from-oracle-to-amazon-rds-for-postgresql/
- Oracle Database SQL Language Reference: Data Types. https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/Data-Types.html
- PostgreSQL Documentation: Date/Time Types. https://www.postgresql.org/docs/current/datatype-datetime.html

## Issues Found
- The SCT CLI snippets used non-existent or incorrect command names and option syntax such as `ConnectSourceDatabase`, `ConnectTargetDatabase`, `CreateMigrationAssessmentReport`, `ConvertSchema`, `ApplyToTarget /targetDatabase`, and `SaveAsSQL`. I replaced these with documented SCT CLI scenario commands: `SetGlobalSettings`, `CreateProject`, `AddSource`, `AddTarget`, `AddServerMapping`, `CreateReport`, `SaveReportPDF`, `Convert`, `ApplyToTarget`, and `SaveTargetSQL`, using `.scts` command termination with `/`.
- The automation example referenced `/opt/aws-schema-conversion-tool/bin/sct-cli` and heredoc input to a pseudo CLI. I updated it to write an `.scts` scenario and execute it with `RunSCTBatch.sh --pathtoscts`, matching the official SCT CLI script-mode workflow.
- The PostgreSQL conversion example mapped Oracle `DATE DEFAULT SYSDATE` to PostgreSQL `DATE DEFAULT CURRENT_DATE`. Oracle `DATE` stores date and time, while PostgreSQL `DATE` stores only the date. I changed the converted column to `TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP` and updated the explanatory text.
- The object list said SCT converts each listed object type for each migration. Some object types depend on the source and target engine capabilities, so I changed the wording to say SCT converts or flags action items for those objects.
- The post described Oracle package conversion as being broken into functions and procedures in a schema mirroring the package name. That is too specific and can be misleading. I narrowed it to state that SCT converts package procedures and functions into PostgreSQL functions or procedures, with package-level state and references needing manual review.
- The article did not mention current AWS guidance that DMS Schema Conversion is recommended for supported OLTP schema conversions, while SCT remains useful for desktop and broader SCT-specific conversion scenarios. I added a short note without restructuring the post.

## Review Notes
The post is technically relevant and remains useful as an SCT-focused guide. The CLI examples are now closer to documented SCT scenario syntax, but real migrations still need environment-specific tree paths, driver paths, credentials handling, and target schema names.
