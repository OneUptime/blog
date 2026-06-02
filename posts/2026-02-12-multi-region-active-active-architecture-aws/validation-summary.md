# Validation Summary: How to Set Up Multi-Region Active-Active Architecture on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Route 53 latency-based routing and health checks
- Elastic Load Balancing / Application Load Balancers
- Amazon DynamoDB Global Tables
- Amazon Aurora Global Database
- Amazon RDS / AWS CLI
- AWS CloudFormation
- Amazon EC2 Auto Scaling and launch templates
- Amazon CloudWatch metrics
- Python with boto3 and psycopg2

## Sources Consulted
- AWS Route 53 Developer Guide: latency alias records and health check behavior: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-latency-alias.html
- AWS CLI Reference: `route53 change-resource-record-sets`: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Elastic Load Balancing documentation: load balancer DNS TTL behavior: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
- Amazon DynamoDB Developer Guide: global tables consistency modes and conflict resolution: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html
- Amazon DynamoDB Developer Guide: global tables MREC behavior: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/multi-region-strong-consistency-gt.html
- Amazon DynamoDB Developer Guide: CloudWatch `ReplicationLatency` metric and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- Amazon Aurora User Guide: creating an Aurora global database with the AWS CLI: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-creating.html
- Amazon Aurora User Guide: adding a secondary Region to an Aurora global database: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-attaching.html
- Amazon Aurora User Guide: Aurora PostgreSQL global write forwarding: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-write-forwarding-apg.html
- AWS CLI Reference: `rds create-db-cluster`: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster.html
- AWS CloudFormation documentation for Auto Scaling groups and launch templates: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-autoscaling-autoscalinggroup.html and https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ec2-launchtemplate-launchtemplatedata.html

## Issues Found
- The opening claimed that active-active has no failover delay. Updated it to clarify that other regions are already serving traffic, but DNS caching and client retries can still add delay.
- The Route 53 section said to set a low TTL for ALB alias records. Updated it to clarify that ALB alias records do not set a separate Route 53 TTL and use the load balancer DNS TTL of 60 seconds; the low-TTL advice now applies to non-alias records.
- The DynamoDB Global Tables section described only eventual consistency and last-writer-wins without noting current consistency modes. Updated it to state that MREC is the default when no consistency mode is specified, and scoped last-writer-wins conflict resolution to the default MREC mode.
- The DynamoDB command sequence created a table and immediately added a replica. Added `aws dynamodb wait table-exists` so the example waits for the initial table before updating replicas.
- The Aurora Global Database section said Aurora provides one write region and up to five read replicas in other regions. Updated this to secondary read-only clusters, matching current Aurora global database terminology and limits.
- The Aurora CLI snippet created only DB clusters. Added `create-db-instance` commands for the primary and secondary clusters because AWS CLI-created Aurora clusters need DB instances before they are usable.
- The Aurora write-forwarding section implied true local multi-writer behavior and did not enable write forwarding in the secondary cluster command. Added `--enable-global-write-forwarding` and clarified that secondary writes are forwarded to the primary rather than committed locally.
- The Aurora Python example connected writes to a generic primary writer endpoint while describing write forwarding. Updated it to use a local writer/cluster endpoint so write forwarding can apply from secondary regions.
- The CloudFormation block was labeled as a deployable template even though it references resources and mappings outside the snippet. Relabeled it as a CloudFormation snippet that belongs in a complete stack.
- The session-management Python example used `time.time()` without importing `time`. Added the import.
- The region-affinity Python example used `os.environ` without importing `os`. Added the import.

## Review Notes
- Local checks: embedded Python snippets compiled successfully, Bash snippets passed `bash -n`, referenced OneUptime URLs returned HTTP 200, and `validation.json` was validated with `jq`.
- The AWS CLI is not installed in this workspace, so CLI syntax was verified against current official AWS CLI documentation rather than local `--help` output. No live AWS deployment was performed.
