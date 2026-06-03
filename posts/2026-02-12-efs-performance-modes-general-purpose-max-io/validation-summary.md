# Validation Summary: How to Configure EFS Performance Modes (General Purpose vs Max I/O)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Elastic File System (Amazon EFS)
- AWS CLI
- Amazon CloudWatch metrics and alarms
- AWS DataSync
- Linux EFS mounting
- fpsync

## Sources Consulted
- Amazon EFS performance specifications: https://docs.aws.amazon.com/efs/latest/ug/performance.html
- CloudWatch metrics for Amazon EFS: https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html
- Amazon EFS quotas: https://docs.aws.amazon.com/efs/latest/ug/limits.html
- AWS CLI `efs create-file-system` command reference: https://docs.aws.amazon.com/cli/latest/reference/efs/create-file-system.html
- AWS CLI `datasync create-task` command reference: https://docs.aws.amazon.com/cli/latest/reference/datasync/create-task.html

## Issues Found
- The post stated that General Purpose always supports up to 35,000 read and 7,000 write operations per second. AWS now documents General Purpose limits by throughput mode, so I updated the text to distinguish Bursting, Provisioned, and Elastic throughput limits.
- The post described Max I/O as practically unlimited and did not mention current AWS restrictions. I updated the description to match AWS documentation: Max I/O is a previous-generation performance type, scales to higher aggregate I/O with higher latency, and is not supported for One Zone file systems or file systems using Elastic throughput.
- The comparison table listed different maximum client counts for the two performance modes. AWS documents a per-file-system connection quota of 25,000, so I updated both columns to that quota.
- The CloudWatch loop requested `Average,Maximum` for `ClientConnections`, but AWS documents `Sum` as the valid statistic for that metric. I changed the command to use `Sum` for `ClientConnections` and kept `Average,Maximum` for the other listed metrics.
- The metric descriptions called `DataReadIOBytes`, `DataWriteIOBytes`, and `MetadataIOBytes` total bytes unconditionally. AWS defines these metrics as bytes associated with operations, with totals represented by the `Sum` statistic, so I adjusted the wording.
- The latency section included unsupported specific Max I/O latency ranges and outdated General Purpose ranges. I replaced those with AWS-published best-case General Purpose EFS Standard latency targets and a qualitative Max I/O statement.
- The Elastic throughput section called Elastic throughput a "third option" in a way that could be confused with performance mode. I clarified that it is a throughput mode option, not a performance mode.

## Review Notes
The AWS CLI examples use current options and values for EFS, CloudWatch, and DataSync. The AWS CLI was not installed locally in this workspace, so command validation was performed against the official AWS CLI command reference rather than local `--help` output.
