# Validation Summary: How to Handle DMS CDC Latency Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Database Migration Service (AWS DMS)
- AWS DMS change data capture (CDC)
- Amazon CloudWatch metrics and alarms
- AWS CLI
- AWS DMS task settings and table mappings
- Oracle, MySQL, SQL Server, and relational database migration concepts

## Sources Consulted
- AWS DMS monitoring metrics: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Monitoring.html
- AWS DMS LOB support: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.LOBSupport.html
- AWS DMS target metadata task settings: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.TargetMetadata.html
- AWS DMS change processing tuning settings: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.ChangeProcessingTuning.html
- AWS DMS table transformation rules: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Transformations.html
- AWS DMS Oracle source and Binary Reader guidance: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html
- AWS DMS Oracle endpoint troubleshooting: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Troubleshooting_Latency_Source_Oracle.html
- AWS DMS OracleSettings API reference: https://docs.aws.amazon.com/dms/latest/APIReference/API_OracleSettings.html
- AWS DMS MySQL source prerequisites: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html
- AWS CLI modify-replication-config reference: https://docs.aws.amazon.com/cli/latest/reference/dms/modify-replication-config.html
- AWS CLI CloudWatch get-metric-data reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/cloudwatch/get-metric-data.html
- AWS CLI CloudWatch get-metric-statistics reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CloudFormation AWS::CloudWatch::Alarm reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-alarm.html

## Issues Found
- The AWS CLI date examples used BSD/macOS `date -v`, which fails in common Linux and AWS CLI environments. Changed them to GNU-compatible `date -d` examples and fixed quoting inside the `watch` command.
- JSON snippets contained `//` comments, which made them invalid JSON for DMS task settings and table mappings. Removed the comments from JSON blocks.
- The LOB section incorrectly implied limited LOB mode reads each LOB value individually. Updated the wording to identify full LOB mode as the piece-by-piece, slower mode and added required LOB-related task settings.
- The DMS Serverless capacity advice omitted state restrictions. Added a note that replication configuration can be modified only in modifiable states such as `CREATED`, `STOPPED`, or `FAILED`.
- The batch apply example placed `BatchApplyEnabled` under `ChangeProcessingTuning`, but AWS documents it under `TargetMetadata`. Moved it to the correct object, replaced non-batch tuning fields with documented batch tuning fields, and added the primary-key/unique-key requirement for batch updates and deletes.
- The Oracle source-log advice showed unrelated task settings as a way to increase parallel redo-log reads. Replaced it with documented Oracle Binary Reader endpoint settings and troubleshooting guidance.
- The MySQL source advice recommended `binlog_row_image=MINIMAL`, but AWS DMS requires `FULL` for MySQL-compatible CDC sources. Updated the recommendation to `FULL`.
- The CloudFormation alarm examples did not include DMS metric dimensions, making them unlikely to target the intended replication task. Added `ReplicationInstanceIdentifier` and `ReplicationTaskIdentifier` dimensions.

## Review Notes
The post is now technically valid as a practical DMS CDC latency guide. The example SQL for disabling triggers is PostgreSQL-style and should be adapted for other target engines in real migrations.
