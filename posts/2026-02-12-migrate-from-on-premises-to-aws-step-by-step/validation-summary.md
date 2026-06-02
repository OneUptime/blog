# Validation Summary: How to Migrate from On-Premises to AWS Step by Step

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS migration framework
- AWS Application Discovery Service
- AWS Migration Hub Strategy Recommendations
- AWS Organizations
- AWS Control Tower
- AWS Transit Gateway
- AWS Direct Connect
- AWS Site-to-Site VPN
- AWS Application Migration Service (MGN)
- AWS Database Migration Service (DMS)
- Amazon CloudWatch
- AWS Compute Optimizer
- Python
- boto3

## Sources Consulted
- AWS Prescriptive Guidance: Phases of a large migration: https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/phases.html
- AWS Prescriptive Guidance: About the migration strategies: https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html
- boto3 Application Discovery Service `start_data_collection_by_agent_ids`: https://docs.aws.amazon.com/boto3/latest/reference/services/discovery/client/start_data_collection_by_agent_ids.html
- boto3 Organizations `create_organizational_unit`: https://docs.aws.amazon.com/boto3/latest/reference/services/organizations/client/create_organizational_unit.html
- AWS Control Tower overview: https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html
- boto3 EC2 `create_transit_gateway`: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/create_transit_gateway.html
- boto3 MGN `describe_source_servers`: https://docs.aws.amazon.com/boto3/latest/reference/services/mgn/client/describe_source_servers.html
- AWS Application Migration Service cutover documentation: https://docs.aws.amazon.com/mgn/latest/ug/launch-cutover-gs.html
- boto3 DMS `describe_replication_tasks`: https://docs.aws.amazon.com/boto3/latest/reference/services/dms/client/describe_replication_tasks.html
- AWS DMS monitoring documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Monitoring.html
- boto3 CloudWatch `put_metric_alarm`: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/put_metric_alarm.html
- boto3 Compute Optimizer `get_ec2_instance_recommendations`: https://docs.aws.amazon.com/boto3/latest/reference/services/compute-optimizer/client/get_ec2_instance_recommendations.html
- AWS IAM Identity Center rename documentation: https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html

## Issues Found
- The post said AWS defines a six-phase migration framework, but AWS Prescriptive Guidance describes the large migration process as three phases: assess, mobilize, and migrate and modernize. Updated the sentence to describe the AWS three-phase framework and clarify that the post adds an operate-and-optimize phase.
- The DMS monitoring snippet attempted to read `CDCLatency` from `ReplicationTaskStats`, but the boto3 `describe_replication_tasks` response does not include that field. Updated the snippet to print fields that are returned by `ReplicationTaskStats` and added a note that CDC latency is available through the DMS CloudWatch metrics `CDCLatencySource` and `CDCLatencyTarget`.
- The cutover checklist required "zero CDC latency" for databases. Updated this to "acceptable CDC latency" because CDC latency is normally evaluated against workload-specific cutover tolerance rather than requiring an absolute zero value.
- The CloudWatch alarm example used an invalid-looking SNS ARN account ID with 9 digits. Updated it to a 12-digit example account ID.

## Review Notes
All Python code fences were parsed with Python `ast` after the fixes. The examples remain illustrative and still require real AWS resource IDs, account IDs, permissions, enabled services, and region configuration to run in an AWS account.
