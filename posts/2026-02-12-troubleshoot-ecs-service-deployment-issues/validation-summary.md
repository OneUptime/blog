# Validation Summary: How to Troubleshoot ECS Service Deployment Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon ECS
- AWS CLI
- Elastic Load Balancing target groups
- AWS IAM
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- Amazon CloudWatch
- AWS CodeDeploy

## Sources Consulted
- AWS CLI Command Reference: `aws ecs update-service` - https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS CLI Command Reference: `aws ecs describe-services` - https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-services.html
- AWS CLI Command Reference: `aws ecs wait services-stable` - https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html
- AWS CLI Command Reference: `aws elbv2 describe-target-health` - https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-target-health.html
- AWS CLI Command Reference: `aws iam simulate-principal-policy` - https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- Amazon ECS Developer Guide: service definition parameters - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_definition_parameters.html
- Amazon ECS Developer Guide: deployment circuit breaker - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html
- Amazon ECS Developer Guide: task execution IAM role - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html

## Issues Found
- The `maximumPercent` explanation said it limits tasks that can be running. AWS documents this value as the upper limit for tasks in `RUNNING` or `PENDING` during rolling deployments, so the wording was corrected.
- The circuit breaker section implied automatic rollback is the default behavior. AWS documents rollback as an option that applies when the deployment circuit breaker is enabled with rollback, so the text was corrected to avoid implying that all failed ECS deployments roll back automatically.

## Review Notes
The AWS CLI was not installed in the local environment, so command syntax was verified against the current official AWS CLI documentation rather than local `--help` output. The post focuses on rolling deployments; current ECS documentation also describes newer ECS-controller deployment strategies such as blue/green, linear, and canary, but that does not make the rolling-update troubleshooting guidance incorrect.
