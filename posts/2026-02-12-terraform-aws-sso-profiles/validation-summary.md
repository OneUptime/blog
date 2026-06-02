# Validation Summary: How to Use Terraform with AWS SSO Profiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM Identity Center / AWS SSO
- AWS CLI v2
- Terraform
- Terraform AWS provider
- AWS IAM roles and OIDC federation

## Sources Consulted
- AWS CLI User Guide: Configuring IAM Identity Center authentication with the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- AWS CLI Command Reference: Configuration variables and credential precedence - https://docs.aws.amazon.com/cli/latest/topic/config-vars.html
- AWS IAM Identity Center User Guide: Set session duration for AWS accounts - https://docs.aws.amazon.com/singlesignon/latest/userguide/howtosessionduration.html
- AWS IAM Identity Center User Guide: Understanding authentication sessions - https://docs.aws.amazon.com/singlesignon/latest/userguide/authconcept.html
- HashiCorp Terraform Language: Provider configuration - https://developer.hashicorp.com/terraform/language/block/provider
- Terraform Registry: HashiCorp AWS provider documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The post stated that SSO tokens typically expire after 1-8 hours and then said IAM Identity Center session length can be extended up to 12 hours. This mixed different IAM Identity Center session concepts. I changed the wording to refer specifically to AWS account credentials controlled by the IAM Identity Center permission set session duration, which defaults to 1 hour for new permission sets and can be configured up to 12 hours.

## Review Notes
The AWS CLI SSO profile examples match the current recommended `sso-session` configuration format. The Terraform AWS provider examples use valid `profile`, provider alias, `provider = aws.alias`, and `assume_role` syntax. The CI/CD section is directionally correct: SSO profiles are mainly for interactive local use, while CI/CD should use workload identity or role-based credentials such as OIDC-backed role assumption.
