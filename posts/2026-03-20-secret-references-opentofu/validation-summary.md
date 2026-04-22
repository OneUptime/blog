# Validation Summary: How to Use Secret References in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- Terraform AWS Provider
- AWS ECS
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS Lambda
- Kubernetes
- External Secrets Operator
- kubectl Terraform Provider

## Sources Consulted
- OpenTofu documentation: Sensitive Data in State - https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu documentation: Output Values and `sensitive` outputs - https://opentofu.org/docs/language/values/outputs/
- Terraform AWS Provider documentation source: `aws_ssm_parameter` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ssm_parameter.html.markdown
- Terraform AWS Provider documentation source: `aws_secretsmanager_secret` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/secretsmanager_secret.html.markdown
- Terraform AWS Provider documentation source: `aws_secretsmanager_secret_version` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/secretsmanager_secret_version.html.markdown
- Terraform AWS Provider documentation source: `aws_ecs_task_definition` resource - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_task_definition.html.markdown
- Terraform AWS Provider documentation source: `aws_lambda_function` resource - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown
- AWS ECS documentation: Pass Secrets Manager secrets through environment variables - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- AWS ECS documentation: Pass Systems Manager parameters through environment variables - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-ssm-paramstore.html
- AWS ECS API Reference: Secret object and `valueFrom` - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Secret.html
- AWS Lambda documentation: Use Secrets Manager secrets in Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html
- AWS Lambda documentation: Working with Lambda environment variables - https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-retrieve.html
- AWS Lambda documentation: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- External Secrets Operator documentation: ExternalSecret API - https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator documentation: AWS Secrets Manager provider - https://external-secrets.io/latest/provider/aws-secrets-manager/
- kubectl Terraform Provider documentation source: `kubectl_manifest` resource - https://raw.githubusercontent.com/gavinbunney/terraform-provider-kubectl/master/docs/resources/kubectl_manifest.md

## Issues Found
- The SSM Parameter Store example used the `aws_ssm_parameter` data source only to pass `arn` into ECS. The AWS provider documentation states this data source exports the parameter `value`, defaults `with_decryption` to `true`, and warns that the unencrypted value of a `SecureString` is stored in raw state. I changed the example to pass the parameter name directly for same-Region ECS tasks, with a comment noting that cross-Region parameters require a full ARN.
- The External Secrets Operator example used `apiVersion: external-secrets.io/v1beta1`. Current External Secrets Operator examples use `external-secrets.io/v1` for `ExternalSecret`, so I updated the manifest to `v1`.
- The sensitive values section claimed `aws_secretsmanager_secret_version` could be referenced without exposing the value in state. The AWS provider documentation says that data source retrieves the secret value, and OpenTofu documentation says state contains resource attributes and sensitive values. I changed the comments to warn that reading a secret version brings the value into OpenTofu state.
- The output example implied `sensitive = true` prevents logging without mentioning state. I updated the comment and conclusion to clarify that `sensitive = true` redacts CLI output but does not remove values from state.
- The description and conclusion were too broad about keeping values out of state and passing ARNs only. I adjusted the wording to focus on passing identifiers instead of reading values, and to cover ARNs, names, and External Secrets references.

## Review Notes
- The ECS Secrets Manager JSON-key syntax with trailing colons is consistent with AWS ECS documentation.
- ECS tasks still need the task execution role to have the required Secrets Manager, SSM Parameter Store, and KMS permissions. Older ECS agent or Fargate platform versions may not support all secret JSON-key and version-selection features.
- The Lambda example is technically correct as an identifier-passing pattern, but the Lambda function code or extension must retrieve the secret value at runtime and the execution role needs the corresponding IAM permissions.
- The Kubernetes example keeps the AWS secret value out of OpenTofu state, but External Secrets Operator writes the resolved value into a Kubernetes Secret, so Kubernetes etcd encryption and RBAC remain important.
