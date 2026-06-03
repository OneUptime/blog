# Validation Summary: How to Create an RDS Oracle Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon RDS for Oracle
- AWS CLI
- Oracle Database 19c
- Oracle Database licensing models
- RDS option groups
- Oracle SQL and SQL*Plus
- Amazon CloudWatch Logs

## Sources Consulted
- Amazon RDS for Oracle documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Oracle.html
- RDS for Oracle licensing options: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Oracle.Concepts.Licensing.html
- Oracle cloud licensing policy: https://www.oracle.com/a/ocom/docs/cloud-licensing.pdf
- AWS CLI `create-db-instance` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- RDS for Oracle character sets: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.OracleCharacterSets.html
- RDS for Oracle database log files and CloudWatch Logs export: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Concepts.Oracle.html
- RDS for Oracle users and privileges: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Oracle.Concepts.Privileges.html
- RDS for Oracle tablespaces: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.CommonDBATasks.TablespacesAndDatafiles.html
- RDS for Oracle Native Network Encryption option settings: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Oracle.Options.NNE.Options.html
- RDS for Oracle Transparent Data Encryption option: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.Options.AdvSecurity.html
- Amazon RDS for Oracle 19c release notes: https://docs.aws.amazon.com/AmazonRDS/latest/OracleReleaseNotes/oracle-version-19-0.html
- Oracle Database 19c `CREATE USER` reference: https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/CREATE-USER.html

## Issues Found
- The BYOL licensing explanation incorrectly generalized Enterprise Edition processor-license counting to all Oracle editions. Updated it to distinguish Enterprise Edition vCPU-to-processor counting from Standard Edition Two socket-style counting, and added the Multi-AZ BYOL standby licensing requirement.
- The post-creation SQL claimed to create an application tablespace but only called `rdsadmin.rdsadmin_util.create_directory('DATA_PUMP_DIR')`, which creates or attempts to create an Oracle directory rather than a tablespace. Replaced it with a `CREATE TABLESPACE` statement and assigned the application user to that tablespace.
- The cost section gave a precise hourly price that can change over time. Reworded it to describe the cost level and direct readers to the AWS pricing page for the current hourly rate.

## Review Notes
The AWS CLI command uses valid RDS options, including `--enable-cloudwatch-logs-exports`, `--storage-throughput`, `--iops`, and the Oracle engine/license-model values. The specific Oracle engine version shown is listed in AWS release notes, but readers should still confirm regional availability with `aws rds describe-db-engine-versions` before running the command.
