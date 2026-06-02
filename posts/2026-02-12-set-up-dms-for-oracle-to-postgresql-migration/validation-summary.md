# Validation Summary: How to Set Up DMS for Oracle to PostgreSQL Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Database Migration Service (DMS)
- AWS Schema Conversion Tool (SCT)
- AWS DMS Schema Conversion
- Oracle Database
- PostgreSQL and Aurora PostgreSQL
- AWS CLI
- SQL, PL/SQL, and PL/pgSQL

## Sources Consulted
- AWS DMS Oracle source endpoint documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html
- AWS DMS PostgreSQL target endpoint documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.PostgreSQL.html
- AWS DMS table mapping transformation rules: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Transformations.html
- AWS DMS task settings documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.html
- AWS CLI DMS describe-replication-tasks command reference: https://docs.aws.amazon.com/cli/latest/reference/dms/describe-replication-tasks.html
- AWS DMS monitoring documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Monitoring.html
- AWS DMS Schema Conversion Oracle to PostgreSQL settings: https://docs.aws.amazon.com/dms/latest/userguide/schema-conversion-oracle-postgresql.html
- AWS Schema Conversion Tool documentation: https://docs.aws.amazon.com/SchemaConversionTool/
- PostgreSQL PL/pgSQL transaction management documentation: https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL PL/pgSQL SELECT INTO STRICT documentation: https://www.postgresql.org/docs/current/plpgsql-statements.html
- PostgreSQL identity columns documentation: https://www.postgresql.org/docs/current/ddl-identity-columns.html
- PostgreSQL date/time functions documentation: https://www.postgresql.org/docs/current/functions-datetime.html

## Issues Found
- The PostgreSQL PL/pgSQL procedure included `COMMIT` inside a block with an `EXCEPTION` handler. PostgreSQL does not allow ending a transaction inside a block that has exception handlers, because that block forms a subtransaction. Removed the `COMMIT` and clarified that transaction control should happen in the caller.
- The sequence and date/time SQL examples used literal ellipses and standalone `WHERE` clauses that were not valid executable SQL. Replaced them with concrete column/value examples and complete `SELECT` statements.
- The Aurora PostgreSQL cluster command later connected to a `myapp` database without creating it. Added `--database-name myapp` to the cluster creation command.
- The Oracle DMS source endpoint mixed Binary Reader extra connection attributes with LogMiner privileges, and the privilege list was incomplete for a self-managed Oracle source using LogMiner. Replaced the Binary Reader attributes with the documented `--oracle-settings '{"AddSupplementalLogging": true}'` setting and expanded the grant block to include the documented base and LogMiner privileges plus table-level `SELECT` and `ALTER` examples.
- The PostgreSQL DMS target endpoint used lower-case extra connection attribute names. Replaced them with the documented `--postgre-sql-settings` JSON syntax using `MaxFileSize` and `ExecuteTimeout`.
- The table mapping section said the example performed data type transformations, but the JSON only transforms identifier case. Changed the wording to identifier transformations.
- The DMS ARN placeholders used endpoint, replication instance, and task identifiers where AWS DMS expects generated ARN resource IDs. Updated the examples to use placeholder ARN resource IDs that match the documented ARN format.
- The monitoring query labeled `ReplicationTaskStats.FreshStartDate` as CDC latency. `FreshStartDate` is a timestamp, not latency. Updated the query to show task status, full-load progress, loaded tables, and errored tables; CDC latency is still monitored with the CloudWatch metric shown next.
- The DMS data type mapping table incorrectly mapped larger integer `NUMBER(p,0)` values to `BIGINT`. AWS DMS maps Oracle `NUMBER(p,0)` with precision greater than 9 to a DMS numeric type, which maps to PostgreSQL `DECIMAL(p,0)` by default. Updated the mapping table accordingly.

## Review Notes
The post remains a high-level migration guide. In a production migration, readers should size LOB settings, choose LogMiner vs Binary Reader, and grant Oracle privileges based on whether the source is self-managed Oracle, Amazon RDS for Oracle, RAC, ASM, or Active Data Guard.
