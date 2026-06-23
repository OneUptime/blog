# Validation Summary: How to Set Up Aurora Serverless v2

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Amazon Aurora Serverless v2
- Amazon RDS and AWS CLI
- AWS CloudFormation
- Amazon CloudWatch
- AWS Secrets Manager
- IAM database authentication
- RDS Proxy
- PostgreSQL and MySQL-compatible Aurora
- Node.js `pg` and AWS SDK for JavaScript v3
- Python cost estimation

## Sources Consulted
- Amazon Aurora User Guide: Requirements and limitations for Aurora serverless - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.requirements.html
- Amazon Aurora User Guide: Scaling to Zero ACUs with automatic pause and resume - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html
- Amazon Aurora User Guide: Performance and scaling for Aurora serverless - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html
- Amazon Aurora User Guide: Amazon CloudWatch metrics for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- Amazon RDS API Reference: CreateDBCluster - https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_CreateDBCluster.html
- Amazon Aurora User Guide: Modifying an Amazon Aurora DB cluster - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Modifying.html
- AWS CloudFormation Template Reference: AWS::RDS::DBCluster ServerlessV2ScalingConfiguration - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-rds-dbcluster-serverlessv2scalingconfiguration.html
- AWS CloudFormation Template Reference: AWS::RDS::DBProxy and AWS::RDS::DBProxyTargetGroup - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbproxy.html and https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbproxytargetgroup.html
- AWS SDK for JavaScript v3: @aws-sdk/rds-signer - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-rds-signer/
- Aurora PostgreSQL release calendar - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html
- Amazon Aurora pricing - https://aws.amazon.com/rds/aurora/pricing/

## Issues Found
- Updated the Aurora PostgreSQL example engine version from `15.4` to `15.10` because `15.4` is no longer listed among currently supported Aurora PostgreSQL 15 minor versions, while `15.10` is listed as an LTS minor release.
- Corrected the Aurora Serverless v2 capacity range from an implied 128 ACU maximum to 256 ACUs for recent engine versions, and updated the diagram and workload table accordingly.
- Replaced "instant scaling" wording with fine-grained scaling wording. Aurora Serverless v2 scales in 0.5 ACU increments, but AWS documents auto-pause and resume as non-instantaneous.
- Corrected the development capacity guidance. Auto-pause requires `MinCapacity=0` on supported engine versions; `0.5` ACU remains active and does not pause.
- Updated the non-production cost optimization command to use `MinCapacity=0` with `SecondsUntilAutoPause=300`, matching the documented CLI syntax for auto-pause.
- Removed invalid/unused JavaScript SDK imports from the IAM authentication example and added the required `pg` `Pool` import.
- Added a note that IAM database authentication must be enabled on the cluster before IAM auth tokens can be used.
- Replaced the "frequent scaling" CloudWatch alarm. `SampleCount` on `ServerlessDatabaseCapacity` counts metric samples, not scaling events, so the example now alarms on `ACUUtilization` near the configured maximum.
- Corrected the CloudWatch command comment from "Current ACU utilization" to "Current ACU capacity" because `ServerlessDatabaseCapacity` reports ACUs, while `ACUUtilization` reports utilization.
- Replaced the unsupported "1,000 connections per ACU" claim with guidance based on engine `max_connections` and the configured capacity range.
- Updated the final RDS Proxy recommendation to note that RDS Proxy keeps connections open and prevents Aurora Serverless v2 auto-pause.
- Corrected the RDS Proxy target group CloudFormation property from `ConnectionPoolConfig` to `ConnectionPoolConfigurationInfo`.

## Review Notes
The CloudFormation snippets reference surrounding resources such as VPCs, subnets, security groups, IAM roles, and alert topics that are not included in the excerpt. That is acceptable for a blog snippet, but a complete deployable template would need to define or import those resources.
