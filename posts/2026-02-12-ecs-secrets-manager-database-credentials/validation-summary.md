# Validation Summary: How to Use ECS with Secrets Manager for Database Credentials

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- AWS Secrets Manager
- AWS IAM
- AWS KMS
- Amazon EventBridge
- AWS CloudTrail
- AWS Serverless Application Repository
- AWS CDK
- JavaScript
- Python with boto3 and psycopg2

## Sources Consulted
- Amazon ECS: Pass Secrets Manager secrets through Amazon ECS environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- Amazon ECS API Reference: Secret valueFrom requirements: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Secret.html
- Amazon ECS task execution IAM role permissions: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AWS Secrets Manager secret structure and ARN format: https://docs.aws.amazon.com/secretsmanager/latest/userguide/whats-in-a-secret.html
- AWS Secrets Manager JSON structure for RDS/Aurora rotation templates: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_secret_json_structure.html
- AWS Secrets Manager RotateSecret API: https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_RotateSecret.html
- AWS Secrets Manager rotation function templates: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_available-rotation-templates.html
- AWS Secrets Manager EventBridge matching: https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-eventbridge.html
- AWS CLI serverlessrepo create-cloud-formation-change-set command: https://docs.aws.amazon.com/cli/latest/reference/serverlessrepo/create-cloud-formation-change-set.html
- AWS CDK ECS README for container secrets: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
- AWS CDK ECS Secret API: https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/ecs/Secret.html

## Issues Found
- The post used 9-digit AWS account IDs in ARNs and ECR image references. Changed examples to 12-digit account IDs so the ARNs match AWS formats.
- The Secrets Manager RDS PostgreSQL secret omitted the `engine` key required by AWS rotation templates and represented `port` as a string. Added `"engine": "postgres"` and changed the port to a numeric value.
- The ECS `valueFrom` examples used incomplete Secrets Manager ARN examples. Updated them to include a representative six-character Secrets Manager ARN suffix.
- The Serverless Application Repository change set command omitted required capabilities for an application that creates IAM and resource policy permissions. Added `CAPABILITY_IAM` and `CAPABILITY_RESOURCE_POLICY`, and noted that the returned CloudFormation change set must be executed.
- The EventBridge example matched the `RotateSecret` API call rather than successful rotation service events. Updated it to match `RotationSucceeded` events with the required `eventSource` and CloudTrail detail types.
- The description and wrap-up overstated plaintext protection. Revised wording to clarify that credentials are kept out of plaintext task definitions and encrypted at rest, while ECS still injects them as runtime environment variables.
- The CDK snippet imported an unused `cdk` namespace and assigned the added container to an unused variable. Removed both to keep the TypeScript snippet cleaner.

## Review Notes
- ECS injects secret values at task launch; running tasks do not automatically receive rotated values. The post correctly covers this and presents redeploy or application-level refresh options.
- Referencing individual JSON keys requires Fargate platform version 1.4.0 or later for Linux tasks, or ECS container agent 1.37.0 or later for EC2-backed tasks. The post does not mention this version caveat, but the examples are otherwise current.
