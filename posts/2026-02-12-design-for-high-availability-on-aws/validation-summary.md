# Validation Summary: How to Design for High Availability on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Availability Zones
- Amazon VPC
- AWS CDK v2
- Amazon RDS for PostgreSQL
- Amazon Aurora PostgreSQL
- Amazon ElastiCache for Redis OSS
- Elastic Load Balancing Application Load Balancer
- CloudWatch alarms
- Express.js
- connect-redis
- AWS Fault Injection Service

## Sources Consulted
- AWS Regions and Availability Zones documentation: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions-availability-zones.html
- Amazon RDS Multi-AZ failover documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- AWS CDK v2 RDS construct library documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds-readme.html
- AWS CDK v2 DatabaseClusterProps API reference: https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/rds/DatabaseClusterProps.Builder.html
- AWS CDK v2 ClusterInstance API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ClusterInstance.html
- AWS CDK v2 AuroraPostgresEngineVersion API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.AuroraPostgresEngineVersion.html
- AWS CDK v2 DatabaseInstanceProps API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.DatabaseInstanceProps.html
- AWS CDK v2 ApplicationLoadBalancerProps API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationLoadBalancerProps.html
- Elastic Load Balancing target group health check documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS CloudFormation AWS::ElastiCache::ReplicationGroup reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticache-replicationgroup.html
- AWS CDK v2 CfnSubnetGroup API reference: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_elasticache/CfnSubnetGroup.html
- AWS Fault Injection Service scenario documentation: https://docs.aws.amazon.com/fis/latest/userguide/az-availability-scenario.html
- connect-redis package documentation and package metadata: https://www.npmjs.com/package/connect-redis
- MDN AbortSignal.timeout documentation: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static

## Issues Found
- The post described an Availability Zone as a single physically separate data center. AWS defines an AZ as a physically separate location that consists of one or more discrete data centers, so the wording was corrected.
- The Aurora CDK example used deprecated `instances` and `instanceProps` properties on `DatabaseCluster`. Current CDK v2 uses `writer` and `readers`, so the snippet was updated to use `rds.ClusterInstance.provisioned`.
- The Aurora PostgreSQL example used `AuroraPostgresEngineVersion.VER_15_4`, which current CDK docs mark as deprecated because that engine version is no longer supported by Amazon RDS. It was updated to `VER_15_17`.
- The session-store snippet imported `connect-redis` with `.default`. Current package exports `RedisStore` as a named CommonJS export, so it was changed to `const { RedisStore } = require('connect-redis');`.

## Review Notes
The ALB target group snippet is valid as a target group definition, but a complete deployable CDK stack would still need a listener and target registration. The health check example is syntactically valid for modern Node.js runtimes with global `fetch` and `AbortSignal.timeout`; older Node.js versions would need a different timeout pattern or a fetch polyfill.
