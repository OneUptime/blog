# Validation Summary: How to Set Up Multi-Region Deployments for Disaster Recovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS
- AWS CDK v2
- Amazon Aurora
- Amazon Aurora Global Database
- Amazon DynamoDB Global Tables
- Amazon S3 Cross-Region Replication
- Amazon Route 53
- AWS CLI
- Elastic Load Balancing
- EC2 Auto Scaling

## Sources Consulted
- AWS disaster recovery strategies whitepaper: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
- Amazon Aurora Global Database documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
- Amazon Aurora Global Database failover documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
- AWS CLI `failover-global-cluster` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/failover-global-cluster.html
- AWS CloudFormation `AWS::RDS::GlobalCluster` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-globalcluster.html
- AWS CDK `aws_rds.DatabaseCluster` reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.DatabaseCluster.html
- AWS CDK `aws_rds.ClusterInstance` reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ClusterInstance.html
- AWS CDK `aws_dynamodb.Table` reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html
- AWS CDK `PointInTimeRecoverySpecification` reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.PointInTimeRecoverySpecification.html
- Amazon DynamoDB Global Tables documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables_HowItWorks.html
- Amazon S3 replication configuration documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-add-config.html
- Amazon S3 replication permissions documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/setting-repl-config-perm-overview.html
- Amazon Route 53 health check and alias documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-simple-configs.html
- OneUptime linked blog URLs, checked with HTTP HEAD requests.

## Issues Found
- The primary Aurora CDK example used the older `instances` and `instanceProps` pattern. Updated it to the current `writer` and `readers` `ClusterInstance.provisioned()` pattern and added the missing EC2 import.
- The DR-region Aurora example created an independent `DatabaseCluster` while describing it as a read replica. Replaced it with an Aurora Global Database secondary cluster using `globalClusterIdentifier` and a minimal DB instance.
- The active-active section overstated that no failover is needed. Updated it to say no cold start or database promotion is needed and that users route to the nearest healthy Region.
- The Aurora Global Database replication claim was absolute. Updated it to AWS's documented wording that replication lag is typically under one second.
- The Aurora Global Database setup used `primaryCluster.clusterIdentifier` as `sourceDbClusterIdentifier` and specified engine values at the same time. Updated it to use `primaryCluster.clusterArn`, and removed engine settings because AWS uses the source cluster settings when a source cluster is provided.
- The DynamoDB Global Table example used deprecated `pointInTimeRecovery: true`. Updated it to `pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }`.
- The S3 replication example used generic bucket read/write grants. Replaced them with the replication-specific IAM actions documented by Amazon S3.
- The Route 53 ALB alias failover example mixed `evaluateTargetHealth` with an explicit health check on the primary record. Removed the explicit `healthCheckId`, matching AWS guidance for supported alias targets such as ELB load balancers.
- The Aurora Global Database failover command omitted `--allow-data-loss`, which is required for unplanned failover semantics. Added the flag and a `--region` value.
- The example ARNs used malformed 9-digit account IDs, and the target group ARN was missing the target group suffix. Updated both examples to plausible ARN shapes.

## Review Notes
- The AWS CLI is not installed in the local environment, so CLI validation was performed against the official AWS CLI command reference.
- The CDK snippets still use contextual placeholder variables such as `primaryVpc`, `drSubnetGroup`, `primaryAlb`, and `drAlb`; those are reasonable for a blog excerpt but would need to be defined in a complete CDK stack.
- Aurora Global Database replication is asynchronous with typical lag under one second, so the article's RPO/RTO guidance should still be tested against real workload metrics.
