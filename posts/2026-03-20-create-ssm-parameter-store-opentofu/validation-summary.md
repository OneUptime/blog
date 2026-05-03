# Validation Summary: How to Create AWS SSM Parameter Store Parameters with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS Systems Manager (SSM) Parameter Store
- AWS KMS (for SecureString encryption)
- AWS IAM (policy for parameter read access)
- AWS ECS (task definition referencing SSM parameters via `secrets`)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- AWS SSM Parameter Store — Creating parameters and naming constraints: https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-su-create.html
- AWS SSM PutParameter API reference (parameter types, KeyId, data types): https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_PutParameter.html
- AWS ECS — Pass sensitive data to a container (secrets / valueFrom): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html
- HashiCorp AWS provider — `aws_ssm_parameter` resource (cross-referenced for argument names: name, type, value, key_id, data_type, description, tags, lifecycle ignore_changes)
- HashiCorp AWS provider — `aws_ecs_task_definition` resource (container_definitions, secrets, environment, valueFrom syntax)

## Issues Found
No technical issues found.

All HCL is syntactically valid and uses current, non-deprecated AWS provider arguments. Parameter naming uses the recommended hierarchical `/environment/app/KEY` form with a leading slash. The IAM resource ARN `arn:aws:ssm:REGION:ACCOUNT:parameter/production/myapp/*` is in the correct AWS-documented format (no leading slash inside the resource portion). The ECS `secrets[].valueFrom = aws_ssm_parameter.db_password.arn` pattern matches AWS guidance for injecting Parameter Store values as environment variables.

## Review Notes
- `data_type = "text"` in the feature flags example is the default value, so it is redundant but not incorrect. Other valid `data_type` values are `aws:ec2:image` and `aws:ssm:integration`.
- The `aws_ssm_parameter.app_config["DB_HOST"].value` reference inside the ECS `environment` block is resolved at OpenTofu plan/apply time, so the value is baked into the task definition revision. This is correct OpenTofu behavior, but readers should be aware that updating the parameter value alone will not update the ECS task — a new task definition revision (and deployment) is needed. (For runtime resolution, the `secrets` block — which the post correctly demonstrates for `DB_PASSWORD` — is the right mechanism.)
- The ECS task definition example omits `cpu`, `memory`, and `requires_compatibilities`, which would be required for Fargate launch type but are optional for the EC2 launch type. The example is valid as a snippet but may need those fields added by readers targeting Fargate.
- `aws_s3_bucket.data.id` works and returns the bucket name; `aws_s3_bucket.data.bucket` is the more idiomatic modern attribute but both are equivalent here.
