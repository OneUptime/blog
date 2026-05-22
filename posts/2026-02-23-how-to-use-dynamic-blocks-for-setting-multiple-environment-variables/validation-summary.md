# Validation Summary: How to Use Dynamic Blocks for Setting Multiple Environment Variables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- Terraform functions and sensitive values
- AWS Lambda
- Amazon ECS and AWS Fargate
- AWS Systems Manager Parameter Store
- AWS Secrets Manager
- AWS Elastic Beanstalk
- Kubernetes ConfigMaps and Deployments

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform `merge` function documentation: https://developer.hashicorp.com/terraform/language/functions/merge
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform AWS provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_ecs_task_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider `aws_elastic_beanstalk_environment` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elastic_beanstalk_environment
- Terraform Kubernetes provider `kubernetes_config_map` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map
- AWS Lambda environment variables documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- Amazon ECS task definition parameters documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS Elastic Beanstalk environment properties documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-softwaresettings.html
- AWS Elastic Beanstalk supported platforms documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/platforms-supported.html
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The SSM Parameter Store ARN examples in the ECS secrets section used a 9-digit account ID. AWS account IDs in ARNs are 12 digits, so the examples were changed to use `123456789012`.
- The Elastic Beanstalk example used an older Ruby 3.2 AL2023 solution stack string. The supported-platform documentation now lists Ruby 4.0 AL2023 version 4.13.0, so the example was updated to `64bit Amazon Linux 2023 v4.13.0 running Ruby 4.0`.
- The Kubernetes deployment example showed both per-key `env` entries and `env_from` for the same ConfigMap while describing them as alternatives. The redundant `env_from` block was removed and the comment now says to replace the dynamic `env` block with `env_from` when loading the whole ConfigMap.

## Review Notes
- The Lambda, ECS, Elastic Beanstalk, and Kubernetes Terraform shapes match the documented provider schemas after the fixes.
- The Lambda empty-environment explanation is consistent with the Terraform AWS provider requirement that, if the `environment` block is provided, at least one variable key must be present.
- The sensitive-variable section correctly notes that sensitive values should be kept out of Terraform state by using external secret stores where possible.
