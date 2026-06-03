# Validation Summary: How to Create Aurora Serverless with CDK

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Aurora Serverless v2
- Amazon Aurora PostgreSQL-compatible edition
- Amazon Aurora MySQL-compatible edition
- AWS CDK v2
- Amazon RDS
- Amazon VPC and security groups
- AWS Key Management Service
- AWS Lambda
- AWS Secrets Manager
- Amazon RDS Data API
- Amazon CloudWatch alarms
- Amazon SNS
- Node.js and TypeScript
- PostgreSQL `pg` client

## Sources Consulted
- AWS CDK API Reference: `DatabaseClusterProps` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.DatabaseClusterProps.html
- AWS CDK API Reference: `ClusterInstance` - https://docs.aws.amazon.com/cdk/api/v2/dotnet/api/Amazon.CDK.AWS.RDS.ClusterInstance.html
- AWS CDK API Reference: `ServerlessV2ScalingConfigurationProperty` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.CfnDBCluster.ServerlessV2ScalingConfigurationProperty.html
- Amazon Aurora User Guide: How Aurora Serverless v2 works - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html
- Amazon Aurora User Guide: Requirements and limitations for Aurora Serverless v2 - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.requirements.html
- Amazon Aurora User Guide: Supported Regions and Aurora DB engines for RDS Data API - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.Data_API.html
- Amazon Aurora User Guide: Using the Amazon RDS Data API - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html
- Amazon Aurora User Guide: Supported Regions and Aurora DB engines for IAM database authentication - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.IAMdbauth.html
- Amazon RDS User Guide: IAM database authentication for MariaDB, MySQL, and PostgreSQL - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html
- Amazon RDS User Guide: Connecting to your DB instance using IAM authentication - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.html

## Issues Found
- The first TypeScript example imported `aws-secretsmanager` but did not use it. Removed the unused import so the example is cleaner and avoids failures in projects with `noUnusedLocals` enabled.
- The security configuration snippet referenced `encryptionKey` without defining it. Added a KMS key definition using `aws-cdk-lib/aws-kms` before passing it to `storageEncryptionKey`.
- The IAM authentication explanation implied applications authenticate only by IAM role and no longer need database-authentication mechanics. Updated the text to state that applications generate an IAM database authentication token and connect as a database user configured for IAM authentication.
- The ACU explanation said a 0.5 ACU minimum lets the cluster scale down to "nearly nothing." For the Aurora PostgreSQL 15.4 examples, 0.5 ACU is the lowest continuously running capacity, not auto-pause to zero. Updated the explanation accordingly.
- The Data API section did not mention that Aurora Serverless v2 Data API support depends on engine version and Region. Added that caveat.

## Review Notes
The CDK APIs used for Aurora Serverless v2 clusters, serverless writer/readers, scaling capacity, security groups, IAM authentication, Lambda VPC integration, generated Secrets Manager credentials, Data API enablement, and CloudWatch metrics were verified against official AWS documentation. The Aurora PostgreSQL 15.4 examples are valid for 0.5-128 ACU scaling and Data API support in supported Regions, but they do not demonstrate Serverless v2 auto-pause to 0 ACUs.
