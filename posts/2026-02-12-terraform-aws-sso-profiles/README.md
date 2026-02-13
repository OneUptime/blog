# How to Use Terraform with AWS SSO Profiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, SSO, IAM, DevOps

Description: Learn how to configure Terraform to authenticate using AWS SSO profiles for secure, session-based access to your AWS accounts.

---

If you've been managing AWS infrastructure with Terraform, you've probably dealt with static IAM credentials at some point. Long-lived access keys sitting in environment variables or config files aren't exactly a security best practice. AWS SSO (now called IAM Identity Center) gives you a much better option - temporary, session-based credentials that rotate automatically.

This post walks through setting Terraform up to work with AWS SSO profiles so you can ditch those static keys for good.

## Why AWS SSO with Terraform?

Static IAM credentials have a few problems. They don't expire unless you manually rotate them. They're easy to leak accidentally in git commits or CI logs. And if someone gets access to them, they can do damage until you revoke them.

AWS SSO solves these issues by giving you short-lived credentials tied to specific roles and accounts. You authenticate once through a browser, and the CLI handles the rest. Terraform can then pick up those credentials from your named profiles.

## Setting Up AWS SSO

Before configuring Terraform, you need AWS SSO set up in your organization. If it's already running, you just need to configure your local CLI.

Run the SSO configuration wizard:

```bash
# Start the SSO configuration process
aws configure sso
```

The wizard will ask for several values:

```
SSO session name (Recommended): my-org
SSO start URL [None]: https://my-org.awsapps.com/start
SSO region [None]: us-east-1
SSO registration scopes [sso:account:access]:
```

After authenticating in your browser, you'll pick an account and role. The wizard then creates a named profile in `~/.aws/config`.

Here's what the resulting config looks like:

```ini
# ~/.aws/config
[profile dev-account]
sso_session = my-org
sso_account_id = 111111111111
sso_role_name = AdministratorAccess
region = us-east-1
output = json

[profile prod-account]
sso_session = my-org
sso_account_id = 222222222222
sso_role_name = AdministratorAccess
region = us-east-1
output = json

[sso-session my-org]
sso_start_url = https://my-org.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
```

## Logging In

Before Terraform can use these profiles, you need an active SSO session:

```bash
# Authenticate with your SSO session
aws sso login --profile dev-account
```

This opens your browser for authentication. Once you're in, the CLI caches temporary credentials locally.

## Configuring Terraform to Use SSO Profiles

The simplest approach is setting the `profile` attribute in your AWS provider block.

```hcl
# main.tf - Using a named SSO profile
provider "aws" {
  region  = "us-east-1"
  profile = "dev-account"
}
```

That's really all you need. When Terraform runs, it picks up the cached SSO credentials for that profile. No access keys, no secrets in your code.

## Using Variables for Profile Selection

Hardcoding the profile name works fine for single-account setups, but most teams work across multiple accounts. Variables make switching between them easy.

```hcl
# variables.tf
variable "aws_profile" {
  description = "AWS SSO profile to use"
  type        = string
  default     = "dev-account"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# main.tf
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}
```

Now you can switch accounts at plan time:

```bash
# Target the dev account
terraform plan -var="aws_profile=dev-account"

# Target the prod account
terraform plan -var="aws_profile=prod-account"
```

## Multi-Account Setups with Provider Aliases

Many teams deploy shared infrastructure across accounts. Terraform's provider aliases work well with SSO profiles for this pattern.

```hcl
# Shared networking in the network account
provider "aws" {
  alias   = "network"
  region  = "us-east-1"
  profile = "network-account"
}

# Application resources in the app account
provider "aws" {
  alias   = "app"
  region  = "us-east-1"
  profile = "app-account"
}

# Create a VPC in the network account
resource "aws_vpc" "shared" {
  provider   = aws.network
  cidr_block = "10.0.0.0/16"
}

# Create resources in the app account
resource "aws_instance" "web" {
  provider      = aws.app
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}
```

Just make sure you've logged into all the SSO profiles before running Terraform:

```bash
# Login to all required profiles
aws sso login --profile network-account
aws sso login --profile app-account
```

## Environment Variable Approach

If you prefer not to put profile names in your Terraform code, you can use the `AWS_PROFILE` environment variable instead.

```hcl
# main.tf - No profile specified, uses AWS_PROFILE env var
provider "aws" {
  region = "us-east-1"
}
```

```bash
# Set the profile via environment variable
export AWS_PROFILE=dev-account
terraform plan
```

This keeps your Terraform code account-agnostic, which some teams prefer.

## Terraform Workspaces and SSO Profiles

You can map Terraform workspaces to SSO profiles for a clean multi-environment workflow.

```hcl
# Map workspace names to SSO profiles
locals {
  profile_map = {
    dev     = "dev-account"
    staging = "staging-account"
    prod    = "prod-account"
  }

  current_profile = local.profile_map[terraform.workspace]
}

provider "aws" {
  region  = "us-east-1"
  profile = local.current_profile
}
```

```bash
# Switch workspace and plan
terraform workspace select dev
terraform plan

terraform workspace select prod
terraform plan
```

## Handling Token Expiration

SSO tokens expire after a configurable period (typically 1-8 hours). When they expire, Terraform operations will fail with an authentication error. You'll need to re-authenticate:

```bash
# Re-authenticate when tokens expire
aws sso login --profile dev-account

# Then retry your Terraform command
terraform apply
```

For long-running operations, you might want to extend the session duration in your SSO settings. AWS IAM Identity Center lets administrators configure session length up to 12 hours.

## CI/CD Considerations

SSO profiles work great for local development, but CI/CD pipelines are a different story. You can't open a browser in a pipeline. For CI/CD, you've got a few options:

- Use IAM roles with OIDC federation (recommended for GitHub Actions, GitLab CI)
- Use instance profiles for EC2-based runners
- Use the `credential_process` setting to fetch credentials programmatically

Here's an example using OIDC with GitHub Actions:

```hcl
# For CI/CD, use role assumption instead of SSO profiles
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/terraform-ci"
  }
}
```

For more on infrastructure automation, check out how to [run Terraform plan as a pull request check](https://oneuptime.com/blog/post/2026-02-12-terraform-plan-pull-request-check/view).

## Troubleshooting Common Issues

**"Token has expired"** - Run `aws sso login` again. Your cached credentials have timed out.

**"Profile not found"** - Make sure the profile name in Terraform matches exactly what's in `~/.aws/config`.

**"The SSO session associated with this profile has expired"** - This is different from token expiration. Your entire SSO session needs refreshing. Run `aws sso login` with the profile name.

**Credentials not being picked up** - Check that you don't have `AWS_ACCESS_KEY_ID` set in your environment. Static credentials take precedence over SSO profiles in some configurations.

## Summary

Using AWS SSO profiles with Terraform is straightforward and significantly improves your security posture. You get temporary credentials, centralized access management, and no more static keys floating around. The initial setup takes a few minutes, and after that it's just a matter of running `aws sso login` at the start of your day.

The combination of SSO profiles with Terraform variables gives you flexibility to target different accounts without changing code, which is exactly what you want for a multi-account AWS strategy.
