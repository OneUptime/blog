# How to Authenticate with AWS Using Named Profiles in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Named Profiles, Authentication, Local Development

Description: Learn how to use AWS named profiles in OpenTofu to manage multiple AWS accounts and environments from a single machine without switching environment variables.

## Introduction

AWS named profiles, stored in `~/.aws/credentials` and `~/.aws/config`, let you maintain multiple sets of credentials and configurations. OpenTofu supports named profiles via the `profile` argument in the provider block or the `AWS_PROFILE` environment variable-making it easy to deploy to different environments without changing your code.

## Setting Up Named Profiles

Configure profiles in the standard AWS CLI files:

```ini
# ~/.aws/credentials

[default]
aws_access_key_id     = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[dev]
aws_access_key_id     = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY

[prod]
aws_access_key_id     = AKIAIOSFODNN7PRODKEY
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEPROD
```

```ini
# ~/.aws/config
[default]
region = us-east-1

[profile dev]
region = us-east-1
output = json

[profile prod]
region = us-west-2
output = json

# SSO profile example
[profile sso-dev]
sso_session    = my-sso
sso_account_id = 111111111111
sso_role_name  = DeveloperAccess
region         = us-east-1
output         = json

[sso-session my-sso]
sso_start_url           = https://my-org.awsapps.com/start
sso_region              = us-east-1
sso_registration_scopes = sso:account:access
```

Before using an IAM Identity Center profile, run `aws sso login --profile sso-dev` to establish the session.

## Using a Profile in the Provider Block

```hcl
# Set the profile directly in the provider configuration
provider "aws" {
  region  = "us-east-1"
  profile = "dev"  # Reads from ~/.aws/credentials and ~/.aws/config
}
```

For flexibility, make the profile a variable:

```hcl
variable "aws_profile" {
  type        = string
  description = "AWS named profile to use for authentication"
  default     = "default"
}

provider "aws" {
  region  = "us-east-1"
  profile = var.aws_profile
}
```

Then select the profile at runtime:

```bash
# Deploy to dev
tofu apply -var="aws_profile=dev"

# Deploy to prod
tofu apply -var="aws_profile=prod"
```

## Using the AWS_PROFILE Environment Variable

Override the profile without changing HCL:

```bash
# Use the dev profile
export AWS_PROFILE=dev
tofu plan

# Use the prod profile
AWS_PROFILE=prod tofu apply
```

## Profiles with AssumeRole

Profiles can automatically assume a role when used:

```ini
# ~/.aws/config

# Base profile with credentials
[profile base-admin]
aws_access_key_id     = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
region                = us-east-1

# Profile that assumes a role in the prod account
[profile prod-deploy]
source_profile = base-admin
role_arn       = arn:aws:iam::123456789012:role/DeployRole
region         = us-west-2
```

```hcl
provider "aws" {
  region  = "us-west-2"
  # OpenTofu will automatically assume the role specified in the profile
  profile = "prod-deploy"
}
```

## Multi-Environment Workspace Pattern

If you already use OpenTofu workspaces, you can map workspace names to profiles, but workspaces are not the right isolation mechanism for deployments that require separate credentials or access controls:

```hcl
locals {
  # Map workspace names to AWS profiles
  profile_map = {
    dev     = "aws-dev"
    staging = "aws-staging"
    prod    = "aws-prod"
  }
}

provider "aws" {
  region  = "us-east-1"
  profile = local.profile_map[terraform.workspace]
}
```

```bash
# Select workspace and deploy
tofu workspace select dev
tofu apply  # Uses the aws-dev profile automatically
```

## Conclusion

Named profiles are ideal for local development workflows where a developer needs to interact with multiple AWS accounts. For CI/CD pipelines, prefer OIDC or IAM roles, but profiles remain the most ergonomic solution for daily developer use on a developer workstation.
