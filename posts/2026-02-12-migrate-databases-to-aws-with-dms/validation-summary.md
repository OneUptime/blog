# Validation Summary: How to Migrate Databases to AWS with DMS

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- AWS Database Migration Service (AWS DMS)
- AWS DMS replication instances, endpoints, and replication tasks
- Amazon RDS and Amazon Aurora MySQL
- AWS Schema Conversion Tool (AWS SCT)
- Python
- boto3
- CloudWatch monitoring

## Sources Consulted
- AWS DMS API Reference: CreateReplicationInstance - https://docs.aws.amazon.com/dms/latest/APIReference/API_CreateReplicationInstance.html
- boto3 DMS client reference: create_replication_instance - https://docs.aws.amazon.com/boto3/latest/reference/services/dms/client/create_replication_instance.html
- AWS CLI DMS create-endpoint reference - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/dms/create-endpoint.html
- AWS DMS API Reference: StartReplicationTask - https://docs.aws.amazon.com/dms/latest/APIReference/API_StartReplicationTask.html
- AWS DMS API Reference: ReplicationTaskStats - https://docs.aws.amazon.com/en_us/dms/latest/APIReference/API_ReplicationTaskStats.html
- AWS DMS API Reference: TableStatistics - https://docs.aws.amazon.com/dms/latest/APIReference/API_TableStatistics.html
- AWS DMS User Guide: Selection rules and actions - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Selections.html
- AWS DMS User Guide: Wildcards in table mapping - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Wildcards.html
- AWS DMS User Guide: Data validation task settings - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.DataValidation.html
- AWS DMS User Guide: Creating tasks for ongoing replication using AWS DMS - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html
- AWS DMS User Guide: Converting database schemas using DMS Schema Conversion - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_SchemaConversion.html

## Issues Found
- The replication instance example set both `AvailabilityZone` and `MultiAZ=True`, but AWS DMS does not allow `AvailabilityZone` when `MultiAZ` is true. Removed `AvailabilityZone` from the production example.
- The replication instance example pinned `EngineVersion='3.5.2'`. Removed the explicit version so DMS uses the default engine version, avoiding an unnecessarily stale version pin.
- The replication instance example used a non-realistic security group ID format. Replaced it with a valid placeholder-style security group ID.
- The MySQL source and Aurora MySQL target endpoint examples specified `DatabaseName`. AWS documentation warns not to explicitly specify `DatabaseName` for MySQL endpoints because it can force all task tables into a single database. Removed the parameter from both endpoint examples.
- Several examples used hard-coded illustrative DMS ARNs that would not match actual DMS endpoint, task, or replication instance ARN resource IDs. Updated the examples to use ARNs returned by the boto3 API responses.
- The migration task example used `json.dumps()` without importing `json`. Added `import json`.
- The monitoring example could report CDC as active even if a failed task had reached 100% full-load progress. Updated the logic to handle `failed` separately and only report CDC as active for a running task.
- The rollback guidance implied that reversing replication direction is always available. Revised it to state that reverse-direction replication requires a separate task and support from both databases and CDC prerequisites.

## Review Notes
The Python snippets were checked for syntax with `python3` after editing. The guide remains a high-level tutorial; production migrations should also document engine-specific CDC prerequisites such as MySQL binary logging settings, user grants, and source/target limitations.
