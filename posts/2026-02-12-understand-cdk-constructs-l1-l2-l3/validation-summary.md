# Validation Summary: How to Understand CDK Constructs (L1, L2, L3)

## Status
validated

## Post Type
Conceptual

## Technologies Covered
- AWS CDK v2 (aws-cdk-lib) — TypeScript
- Amazon S3 (CfnBucket / s3.Bucket, StorageClass, LifecycleRule)
- Amazon RDS (DatabaseInstance, PostgresEngineVersion 15)
- AWS Lambda (Runtime NODEJS_20_X)
- Amazon API Gateway (LambdaRestApi)
- Amazon ECS / Fargate (ecs-patterns ApplicationLoadBalancedFargateService)

## Sources Consulted
- AWS CDK API v2 — aws-cdk-lib.aws_s3.Bucket — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html (verified `versioned` prop, `blockPublicAccess` default, `lifecycleRules`, methods `addToResourcePolicy`/`grantRead`/`addEventNotification`)
- AWS CDK API v2 — aws-cdk-lib.aws_s3.StorageClass — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.StorageClass.html (verified `INFREQUENT_ACCESS` static member exists)
- AWS CDK API v2 — aws-cdk-lib.aws_s3.LifecycleRule — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.LifecycleRule.html (verified `id`, `expiration: Duration`, `transitions` with `storageClass`/`transitionAfter: Duration`)
- AWS CDK API v2 — aws-cdk-lib.aws_s3.CfnBucket — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.CfnBucket.html (verified camelCase L1 props: versioningConfiguration, publicAccessBlockConfiguration, lifecycleConfiguration, tags, analyticsConfigurations)
- AWS CDK API v2 — aws-cdk-lib.aws_rds.DatabaseInstance — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.DatabaseInstance.html (verified engine/instanceType/credentials/multiAz/allocatedStorage/maxAllocatedStorage/deletionProtection props and `grantConnect`)
- AWS CDK API v2 — aws-cdk-lib.aws_rds.PostgresEngineVersion — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.PostgresEngineVersion.html (verified `VER_15` static property)
- AWS CDK API v2 — aws-cdk-lib.aws_lambda.Runtime — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html (verified `NODEJS_20_X`)
- AWS CDK API v2 — aws-cdk-lib.aws_apigateway.LambdaRestApi — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.LambdaRestApi.html (verified `handler` required, `proxy` defaults to true)
- AWS CDK API v2 — aws-cdk-lib.aws_ecs_patterns.ApplicationLoadBalancedFargateService — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns.ApplicationLoadBalancedFargateService.html (verified taskImageOptions/desiredCount/cpu/memoryLimitMiB/publicLoadBalancer props and `targetGroup`)
- AWS CDK API v2 — aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationTargetGroup — https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationTargetGroup.html (verified `configureHealthCheck` method)
- AWS CloudFormation — AWS::S3::Bucket AnalyticsConfiguration — https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-analyticsconfiguration.html (verified escape-hatch shape: Id, StorageClassAnalysis.DataExport.Destination.BucketArn/Format, OutputSchemaVersion 'V_1')

## Issues Found
- L2 `s3.Bucket` default for `blockPublicAccess`: the post claimed "blockPublicAccess is BLOCK_ALL by default" (code comment) and "Public access is blocked by default" (prose). Per the CDK docs, the construct does NOT set `BlockPublicAccess.BLOCK_ALL`; the default is "CloudFormation defaults will apply" (new buckets don't allow public access). Fixed both the code comment and the prose to state that `blockPublicAccess` is left unset by default and CloudFormation's own defaults block public access for new buckets.

## Review Notes
- All other code is accurate: L1 `CfnBucket` camelCase props (versioningConfiguration.status, publicAccessBlockConfiguration flags, lifecycleConfiguration.rules with id/status/expirationInDays/transitions storageClass/transitionInDays, tags `{key,value}`) match the L1 API and underlying CloudFormation spec.
- The escape-hatch `analyticsConfigurations` shape (`storageClassAnalysis.dataExport.destination.bucketArn`/`format`, `outputSchemaVersion: 'V_1'`) matches the CloudFormation AnalyticsConfiguration definition exactly, including the `'V_1'` literal.
- L2 RDS, Lambda, API Gateway, and ECS Patterns examples all use existing classes, enums, props, and methods (`PostgresEngineVersion.VER_15`, `InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM)`, `SubnetType.PRIVATE_ISOLATED`, `Credentials.fromGeneratedSecret`, `Runtime.NODEJS_20_X`, `LambdaRestApi`, `ApplicationLoadBalancedFargateService`, `targetGroup.configureHealthCheck`).
- `s3.StorageClass.INFREQUENT_ACCESS` is the correct CDK enum member (maps to S3 STANDARD_IA); confirmed in the StorageClass API page.
- The conceptual framing (L1 = auto-generated `Cfn`-prefixed CloudFormation mappings, L2 = hand-written constructs with smart defaults/convenience methods, L3 = patterns) is consistent with official AWS CDK terminology.
- `connections.allowFrom(...)` is provided via the `IConnectable`/`Connections` interface; the DatabaseInstance API page did not enumerate the method, but it is a standard documented member of `Connections` and is used correctly here.
- The three internal blog cross-links were left untouched per instructions.
