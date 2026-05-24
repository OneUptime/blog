# Validation Summary: How to Handle Container Secrets in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS Secrets Manager
- AWS Systems Manager (SSM) Parameter Store
- AWS KMS
- AWS ECS (Fargate)
- AWS IAM
- AWS Lambda (Python 3.12)
- Kubernetes Secrets (Opaque, kubernetes.io/tls, kubernetes.io/dockerconfigjson)
- Kubernetes Deployments (env from secret_key_ref, volume mounts)
- HashiCorp Vault (vault_generic_secret data source, KV v2)
- Terraform S3 backend with KMS encryption and DynamoDB locking

## Sources Consulted
- AWS provider documentation for Terraform: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
  - `aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`, `aws_secretsmanager_secret_rotation`
  - `aws_ecs_task_definition` (secrets block format)
  - `aws_kms_key`, `aws_ssm_parameter`, `aws_iam_role_policy`, `aws_lambda_function`
- AWS ECS documentation on referencing Secrets Manager JSON keys: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html (ARN suffix format `:json-key:version-stage:version-id`)
- Kubernetes provider documentation for Terraform: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
  - `kubernetes_secret` (data auto base64-encoding, type values)
  - `kubernetes_deployment` (env value_from secret_key_ref, volume.secret.default_mode)
- HashiCorp Vault provider documentation: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/generic_secret
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html (Python 3.12 confirmed supported)

## Issues Found
No technical issues found.

## Review Notes
- `vault_generic_secret` is still valid but `vault_kv_secret_v2` is the more idiomatic choice for KV v2 secret engines. The KV v2 path `secret/data/app/database` shown in the post is the correct path format when accessing KV v2 via the generic data source.
- The S3 backend example uses `dynamodb_table` for state locking. As of Terraform 1.10+, native S3 lockfile-based locking is available via `use_lockfile = true`. The `dynamodb_table` approach remains valid and widely used.
- The comment on `sensitive = true` (line 401) correctly notes it prevents display in plan/apply output. Worth being aware that `sensitive` does not prevent values from being stored in plain text in state files — separate state encryption (covered later in the post) is the mitigation.
- `sensitive = false` on the output (line 414) is redundant since false is the default, but not incorrect.
- The Secrets Manager ARN suffix format `${arn}:password::` correctly omits the version stage and version ID, defaulting to AWSCURRENT.
- The IAM policy correctly grants secrets access to the ECS execution role (not the task role), which is the role used at task launch to pull secrets into the container environment.
