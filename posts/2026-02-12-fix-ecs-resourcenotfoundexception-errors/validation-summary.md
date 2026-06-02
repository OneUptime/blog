# Validation Summary: How to Fix ECS 'ResourceNotFoundException' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon ECS
- AWS CLI
- AWS SDK for Python (Boto3)
- Amazon EventBridge
- IAM policies
- ECS ARN formats and account settings

## Sources Consulted
- Amazon ECS API Reference: DescribeServices - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DescribeServices.html
- Amazon ECS Developer Guide: Deleting an Amazon ECS service - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/delete-service-v2.html
- Amazon ECS Developer Guide: Amazon ECS task definition states - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-definition-state.html
- Amazon ECS API Reference: DescribeTasks - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DescribeTasks.html
- Amazon ECS Developer Guide: Viewing Amazon ECS stopped task errors - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/stopped-task-errors.html
- AWS CLI Command Reference: describe-services - https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-services.html
- Amazon ECS Developer Guide: ECS account settings and ARN formats - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-account-settings.html
- AWS CLI Command Reference: put-account-setting - https://docs.aws.amazon.com/cli/latest/reference/ecs/put-account-setting.html
- Amazon ECS Developer Guide: ResourceNotFoundException troubleshooting - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/resource-not-found-error.html

## Issues Found
- The deleted-service example described `--include TAGS` as including inactive services in a listing. AWS CLI documentation says `--include TAGS` only includes resource tags, while AWS ECS documentation says deleted services in DRAINING or INACTIVE status are viewed with `DescribeServices` by name. Updated the explanation and command comment.
- The post said task definitions can be deregistered but not deleted. Amazon ECS has supported deletion of inactive task definition revisions since 2023. Updated the text to mention deletion.
- The post said a deregistered task definition can still be used to run tasks. AWS documentation says INACTIVE task definitions cannot be used to run new tasks or create new services, though existing tasks and services are unaffected. Corrected the statement.
- The post said `describe-tasks` returns `ResourceNotFoundException` after stopped task retention expires. AWS documentation says stopped tasks appear in returned API results for at least one hour; the API returns `tasks` and `failures` rather than documenting `ResourceNotFoundException` for this case. Updated the wording to avoid the incorrect exception claim.
- The final Python snippet used `boto3` without importing it. Added `import boto3` to make the snippet self-contained.
- The post used `ResourceNotFoundException` as a catch-all for several ECS missing-resource cases. AWS ECS APIs often report missing resources as specific exceptions, response `failures`, or client errors. Updated broad wording to say "not-found errors" while preserving the article's troubleshooting focus.

## Review Notes
The title still maps to AWS's ECS troubleshooting terminology for ResourceNotFoundException, especially for missing task-referenced resources such as Secrets Manager secrets.
