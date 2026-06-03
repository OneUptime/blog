# Validation Summary: How to Configure ECS Task Execution Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS IAM
- AWS managed policies
- Amazon ECR
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS KMS
- Amazon S3
- Amazon CloudWatch Logs
- Terraform
- AWS CloudFormation
- AWS CLI

## Sources Consulted
- Amazon ECS task execution IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AmazonECSTaskExecutionRolePolicy managed policy reference: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonECSTaskExecutionRolePolicy.html
- Using non-AWS container images in Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/private-auth.html
- Pass sensitive data to an Amazon ECS container: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html
- Send Amazon ECS logs to CloudWatch: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html
- AWS CLI `secretsmanager create-secret` command reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html

## Issues Found
- Several example ARNs used `123456789` as the placeholder AWS account ID. AWS account IDs are 12 digits, so these were changed to `123456789012`.
- The CloudFormation example referenced `SecretsKMSKey.Arn` without defining a `SecretsKMSKey` resource. The example now declares a `SecretsKMSKeyArn` parameter and uses `!Ref SecretsKMSKeyArn`.
- The CloudFormation section described the template as covering "all the common permissions," but the snippet did not include every permission discussed in the article, such as S3 environment file access. The wording was narrowed to "common secrets and parameter permissions."

## Review Notes
The reviewed ECS execution role permissions match AWS documentation: the managed policy includes ECR image pull and CloudWatch log stream/event permissions; Secrets Manager, SSM Parameter Store, customer managed KMS keys, private registry credentials, and S3 environment files require additional permissions as described. AWS CLI was not installed locally, so CLI syntax was verified against the official AWS CLI command reference.
