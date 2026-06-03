# Validation Summary: How to Create an RDS Database with CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- Amazon RDS
- PostgreSQL
- Aurora PostgreSQL
- Amazon VPC and security groups
- AWS Secrets Manager
- AWS SDK for JavaScript v3
- TypeScript

## Sources Consulted
- AWS CDK v2 DatabaseInstanceProps API Reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.DatabaseInstanceProps.html
- AWS CDK v2 PostgresEngineVersion API Reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.PostgresEngineVersion.html
- AWS CDK v2 AuroraPostgresEngineVersion API Reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.AuroraPostgresEngineVersion.html
- AWS CDK v2 ClusterInstance API Reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ClusterInstance.html
- AWS CDK v2 SubnetType API Reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.SubnetType.html
- Amazon RDS Multi-AZ failover documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- AWS SDK for JavaScript v3 Secrets Manager examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_secrets-manager_code_examples.html

## Issues Found
- The RDS PostgreSQL examples used `rds.PostgresEngineVersion.VER_16_2`, which is now marked deprecated because PostgreSQL 16.2 is no longer supported by Amazon RDS. Updated both PostgreSQL instance and parameter group examples to `rds.PostgresEngineVersion.VER_16_13`.
- The Aurora PostgreSQL cluster example used `rds.AuroraPostgresEngineVersion.VER_16_1`, which is now marked deprecated because Aurora PostgreSQL 16.1 is no longer supported by Amazon RDS. Updated it to `rds.AuroraPostgresEngineVersion.VER_16_13`.

## Review Notes
The updated CDK and AWS SDK TypeScript examples were type-checked against `aws-cdk-lib@2.257.0`, `constructs`, `@aws-sdk/client-secrets-manager`, and TypeScript. The SDK v3 Secrets Manager example compiles, although AWS's current documentation commonly shows the explicit `SecretsManagerClient` plus `GetSecretValueCommand` pattern.
