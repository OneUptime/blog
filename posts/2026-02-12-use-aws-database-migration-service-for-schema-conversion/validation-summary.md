# Validation Summary: How to Use AWS Database Migration Service for Schema Conversion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Database Migration Service (AWS DMS)
- AWS Schema Conversion Tool (AWS SCT)
- DMS Schema Conversion
- AWS CLI for DMS
- Oracle, PostgreSQL, SQL Server, and MySQL database migration concepts
- JDBC drivers
- SQL, PL/SQL, and PL/pgSQL

## Sources Consulted
- AWS SCT installation documentation: https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Installing.html
- AWS SCT JDBC driver documentation: https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Installing.JDBCDrivers.html
- AWS SCT CLI reference: https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Reference.html
- AWS SCT schema conversion documentation: https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Converting.Convert.html
- AWS SCT applying converted schemas documentation: https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_UserInterface.ApplyingConversion.html
- AWS DMS Schema Conversion documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_SchemaConversion.html
- AWS DMS replication instance documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.html
- AWS DMS replication instance sizing documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.Types.html
- AWS DMS transformation rules documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Transformations.html
- AWS DMS task settings documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.html
- AWS DMS data validation task settings documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.DataValidation.html
- AWS CLI DMS create-endpoint command reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/dms/create-endpoint.html
- AWS CLI DMS test-connection command reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/dms/test-connection.html
- AWS CLI DMS describe-replication-tasks command reference: https://docs.aws.amazon.com/cli/v1/reference/dms/describe-replication-tasks.html

## Issues Found
- The post said AWS SCT runs on macOS. Current AWS SCT installation documentation lists Microsoft Windows, Fedora Linux, and Ubuntu Linux on 64-bit operating systems, so the platform sentence was corrected.
- The JDBC driver setup implied placing drivers in fixed SCT driver directories, including a macOS path. AWS documentation says to download compatible JDBC drivers and configure their file paths in Settings > Global Settings > Drivers, so the setup instructions were updated.
- The SCT CLI example used non-existent `sct-cli --create-project`, `--connect-source`, `--connect-target`, and `--export-converted-schema` commands. AWS SCT CLI uses `AWSSchemaConversionToolBatch.jar`, `.scts` scenario files, and `RunSCTBatch.cmd` or `RunSCTBatch.sh`, so the automation example was replaced with the documented workflow.
- The DMS validation settings included `RecordSuspendEnabled`, which is not a documented validation task setting. It was removed. The surrounding sentence was also changed from "row-level validation" to "data validation" because current AWS DMS versions can use group-level validation for supported migration paths.

## Review Notes
The DMS AWS CLI examples, table mapping structure, transformation rule actions, remaining validation settings, CDC terminology, and monitoring metrics are consistent with AWS documentation. Some JDBC driver versions in AWS documentation are minimum supported versions; teams should still verify the latest compatible driver for their specific source and target engine before running a migration.
