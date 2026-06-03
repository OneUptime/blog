# Validation Summary: How to Configure ECS Task IAM Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS IAM
- ECS task IAM roles and task execution roles
- AWS CLI
- Terraform AWS provider
- AWS SDK for Python (boto3)
- AWS SDK for JavaScript v3
- AWS SDK for Go v2
- Amazon S3, Amazon SQS, Amazon DynamoDB, Amazon ECR, Secrets Manager, CloudWatch Logs

## Sources Consulted
- Amazon ECS task IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html
- Amazon ECS task execution IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Amazon ECS IAM role best practices: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-iam-roles.html
- AWS CLI `ecs describe-tasks` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-tasks.html
- AWS CLI `ecs describe-task-definition` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-task-definition.html
- Terraform AWS provider `aws_ecs_task_definition` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider `aws_iam_role` and `aws_iam_role_policy` resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- AWS Service Authorization Reference for Amazon SQS, Amazon S3, and Amazon DynamoDB: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsqs.html, https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html, https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondynamodb.html
- AWS SDK for JavaScript v3 `GetObjectCommand` reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/GetObjectCommand/
- AWS SDK for JavaScript v3 credential provider documentation: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html
- Node.js ECMAScript modules documentation: https://nodejs.org/api/esm.html

## Issues Found
- The Node.js example used CommonJS `require()` with top-level `await`, which is not valid in a normal CommonJS script. Wrapped the awaited call in an `async` function and invoked it with `.catch(console.error)`.
- The trust policy section said conditions can restrict which ECS clusters can assume the role. AWS documentation states that using `aws:SourceArn` to specify a specific ECS cluster is not currently supported for task role trust policies. Updated the wording to describe account scoping and confused deputy mitigation while noting the wildcard requirement for ECS resources.

## Review Notes
The local AWS CLI was not installed in the workspace, so CLI command validation was performed against the official AWS CLI command reference rather than local `--help` output. The S3, SQS, and DynamoDB IAM action/resource examples are technically valid, though splitting S3 bucket-level and object-level actions into separate statements could make the policy clearer in a future cleanup.
