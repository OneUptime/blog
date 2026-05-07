# Validation Summary: How to Create AWS Systems Manager Parameters with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Systems Manager Parameter Store
- AWS CLI
- AWS IAM
- AWS KMS
- Amazon EC2

## Sources Consulted
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `lifecycle` meta-argument: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu sensitive data in state: https://opentofu.org/docs/language/state/sensitive-data/
- Terraform Registry `aws_ssm_parameter`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Terraform Registry `random_password`: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- AWS Systems Manager Parameter Store overview: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- AWS Systems Manager parameter creation and naming rules: https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-su-create.html
- AWS CLI `ssm get-parameter`: https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameter.html
- AWS Systems Manager `SecureString` KMS encryption: https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html
- AWS Systems Manager IAM access for Parameter Store: https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html
- Amazon ECS task definition parameters for SSM-backed secrets: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters_ec2.html
- AWS Lambda environment variables: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- Amazon Linux 2023 AWS CLI v2: https://docs.aws.amazon.com/linux/al2023/ug/awscli2.html

## Issues Found
- The introduction claimed Parameter Store integrates natively with EC2 user data and Lambda environment variables. I changed this to say parameters can be read from EC2 user data scripts, ECS task definitions, and Lambda functions, which matches the documented integration patterns.
- The EC2 user data example assumed a `ubuntu` AMI already had the AWS CLI installed and that `/etc/myapp` already existed. I changed the AMI reference to `data.aws_ami.al2023.id`, quoted the JMESPath query, and added `mkdir -p /etc/myapp` so the example is consistent with a common AWS AMI that ships with AWS CLI v2 and avoids a file write failure.

## Review Notes
- The `SecureString` example is valid, but using `value = random_password.api_key.result` still stores the plaintext secret in OpenTofu state. That is expected behavior unless you adopt newer write-only or ephemeral patterns supported by recent OpenTofu and provider versions.
- The IAM example correctly includes `kms:Decrypt` for reading `SecureString` values encrypted with a customer managed KMS key. If a team uses the default `aws/ssm` key instead, KMS access behavior differs.
