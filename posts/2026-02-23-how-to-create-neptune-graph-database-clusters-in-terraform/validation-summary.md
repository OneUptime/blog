# Validation Summary: How to Create Neptune Graph Database Clusters in Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- AWS Provider for Terraform (~> 5.0)
- Amazon Neptune (graph database)
- Neptune Serverless
- AWS KMS
- AWS IAM
- AWS VPC, Subnets, Security Groups
- Amazon CloudWatch (alarms, log exports)
- Amazon SNS
- Amazon S3 (bulk loading)
- Apache TinkerPop Gremlin
- SPARQL (RDF query language)

## Sources Consulted
- [Amazon Neptune parameters documentation](https://docs.aws.amazon.com/neptune/latest/userguide/parameters.html) — verified `neptune_query_timeout` is BOTH a cluster-level AND instance-level parameter, and `neptune_enable_audit_log` is a cluster-level parameter
- [Neptune DB Clusters and Instances](https://docs.aws.amazon.com/neptune/latest/userguide/feature-overview-db-clusters.html) — verified "up to 15 read-replica DB instances" claim
- [Neptune storage overview](https://docs.aws.amazon.com/neptune/latest/userguide/feature-overview-storage.html) — verified storage maximum is 128 TiB (not 128 TB)
- [Neptune Serverless capacity scaling](https://docs.aws.amazon.com/neptune/latest/userguide/neptune-serverless-capacity-scaling.html) — verified NCU range (min 1.0, max 128.0; max_capacity must be at least 2.5)
- [Neptune instance types](https://docs.aws.amazon.com/neptune/latest/userguide/instance-types.html) — verified `db.r6g.large` is a valid supported instance class, and `db.serverless` is the correct serverless instance class
- [Neptune bulk load IAM role creation](https://docs.aws.amazon.com/neptune/latest/userguide/bulk-load-tutorial-IAM-CreateRole.html) — verified `rds.amazonaws.com` is the correct service principal for the S3 access trust policy
- [AWS Managed Policies reference](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/policy-list.html) — verified that `NeptuneNotebookPolicy` does NOT exist as an AWS managed policy
- Terraform AWS provider docs (`aws_neptune_cluster`, `aws_neptune_cluster_instance`, `aws_neptune_subnet_group`, `aws_neptune_cluster_parameter_group`, `aws_neptune_parameter_group`)

## Issues Found

1. **Non-existent AWS managed policy `NeptuneNotebookPolicy`**: The post referenced `arn:aws:iam::aws:policy/NeptuneNotebookPolicy`, which is not a real AWS managed policy. AWS does not publish a managed policy by this name. Neptune Workbench notebooks run on SageMaker and typically use the SageMaker execution role pattern.
   - **Fix**: Replaced the policy ARN with `arn:aws:iam::aws:policy/AmazonSageMakerFullAccess`, which is the standard managed policy used as the base for SageMaker notebook execution roles (including Neptune Workbench notebooks).

2. **Storage unit mismatch (TB vs TiB)**: The post claimed Neptune storage grows "up to 128 TB". According to AWS documentation, the correct maximum is 128 **tebibytes (TiB)**, not terabytes (TB).
   - **Fix**: Changed "128 TB" to "128 TiB" in the architecture description.

## Review Notes
- The `neptune_query_timeout` parameter appears in both the cluster parameter group and the instance parameter group in the post. This is technically valid — AWS documents `neptune_query_timeout` as BOTH a cluster-level AND instance-level parameter, with documented precedence rules between them. No change needed.
- The S3 bulk load IAM role trust policy correctly uses `rds.amazonaws.com` as the service principal — this is the documented correct principal for Neptune (which is built atop the RDS API).
- The Neptune Serverless example uses `min_capacity = 2.5` and `max_capacity = 128`, which is within the supported range (min ≥ 1.0, max ≤ 128.0, max ≥ 2.5).
- Port 8182 is correctly identified as the Neptune endpoint port.
- The Gremlin `wss://` and SPARQL `https://` endpoint URL formats are correct.
- The `GremlinErrors` CloudWatch metric is valid in the `AWS/Neptune` namespace.
- The `enable_cloudwatch_logs_exports = ["audit"]` value is supported by Neptune.
- The parameter group family `neptune1.3` is correct for engine version `1.3.x`.
- Engine version `1.3.1.0` was a valid Neptune engine version at the time of writing; newer releases may be available — readers should check the current supported engine versions.
- The post's claim that data is replicated "six ways across three availability zones" is accurate.
