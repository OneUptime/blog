# How to Use IAM Roles for Terraform Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, IAM, AWS, Authentication, Security, IaC, DevOps

Description: Learn how to use IAM roles instead of static credentials for Terraform authentication on AWS, covering role assumption, instance profiles, cross-account access, and session policies.

---

Using IAM roles instead of static access keys for Terraform authentication is a fundamental security practice. Roles provide temporary credentials that expire automatically, can be scoped to specific actions, and leave clear audit trails. This guide covers the practical patterns for using IAM roles with Terraform across different execution environments.

## Why Roles Over Static Keys

Static IAM access keys have several risks:

- They do not expire unless you manually rotate them
- If leaked (in logs, config files, or version control), they provide persistent access
- They are difficult to audit because the same key is used across many sessions
- Revoking them can break multiple systems at once

IAM roles address all of these issues. When you assume a role, AWS issues temporary credentials (access key, secret key, and session token) that expire after a configurable period (default 1 hour, maximum 12 hours).

## Using Roles on EC2 Instances

If Terraform runs on an EC2 instance, attach an IAM instance profile:

```hcl
# Create the IAM role
resource "aws_iam_role" "terraform" {
  name = "terraform-execution"

  # Allow EC2 to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Attach policies for what Terraform needs to do
resource "aws_iam_role_policy_attachment" "terraform_ec2" {
  role       = aws_iam_role.terraform.name
  policy_arn = aws_iam_policy.terraform_permissions.arn
}

# Create an instance profile
resource "aws_iam_instance_profile" "terraform" {
  name = "terraform-execution"
  role = aws_iam_role.terraform.name
}

# Launch an EC2 instance with the profile
resource "aws_instance" "terraform_runner" {
  ami                  = "ami-0c55b159cbfafe1f0"
  instance_type        = "t3.medium"
  iam_instance_profile = aws_iam_instance_profile.terraform.name

  tags = {
    Name = "terraform-runner"
  }
}
```

With the instance profile attached, Terraform automatically uses the role's credentials without any provider configuration:

```hcl
# No explicit credentials needed - uses the instance profile
provider "aws" {
  region = "us-east-1"
}
```

## Using Roles on ECS

If Terraform runs in an ECS task (common for CI/CD platforms):

```hcl
# Task execution role (for ECS to pull images and write logs)
resource "aws_iam_role" "ecs_execution" {
  name = "terraform-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Task role (for Terraform to use)
resource "aws_iam_role" "terraform_task" {
  name = "terraform-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Attach Terraform permissions to the task role
resource "aws_iam_role_policy_attachment" "terraform_task" {
  role       = aws_iam_role.terraform_task.name
  policy_arn = aws_iam_policy.terraform_permissions.arn
}

# ECS task definition
resource "aws_ecs_task_definition" "terraform" {
  family                   = "terraform"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.terraform_task.arn

  container_definitions = jsonencode([{
    name  = "terraform"
    image = "hashicorp/terraform:1.7.0"
    # Terraform automatically uses the task role
  }])
}
```

## Assuming Roles from a Local Machine

When running Terraform locally, assume a role using the AWS provider configuration:

```hcl
# Assume a role for Terraform operations
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::123456789012:role/TerraformDeployRole"
    session_name = "terraform-local"
    duration     = "1h"

    # Optional: restrict permissions further with a session policy
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Effect   = "Allow"
          Action   = ["ec2:*", "rds:*", "s3:*"]
          Resource = "*"
        }
      ]
    })
  }
}
```

Or use AWS profiles configured with role assumption:

```ini
# ~/.aws/config
[profile terraform-dev]
role_arn = arn:aws:iam::123456789012:role/TerraformDevRole
source_profile = default
region = us-east-1

[profile terraform-prod]
role_arn = arn:aws:iam::987654321098:role/TerraformProdRole
source_profile = default
region = us-east-1
mfa_serial = arn:aws:iam::123456789012:mfa/myuser
```

```hcl
# Use a specific profile
provider "aws" {
  region  = "us-east-1"
  profile = "terraform-prod"
}
```

## Cross-Account Role Assumption

One of the most powerful IAM role patterns is cross-account access. A central account holds the Terraform execution environment, and roles in target accounts allow deployment:

```hcl
# In the central account: role that can assume roles in other accounts
resource "aws_iam_role" "terraform_central" {
  name = "terraform-central"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "assume_deploy_roles" {
  name = "assume-deploy-roles"
  role = aws_iam_role.terraform_central.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRole"
        Resource = [
          "arn:aws:iam::111111111111:role/TerraformDeployRole",  # Dev account
          "arn:aws:iam::222222222222:role/TerraformDeployRole",  # Staging account
          "arn:aws:iam::333333333333:role/TerraformDeployRole"   # Prod account
        ]
      }
    ]
  })
}
```

```hcl
# In each target account: role that the central account can assume
resource "aws_iam_role" "terraform_deploy" {
  name = "TerraformDeployRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::000000000000:role/terraform-central"  # Central account role
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = "terraform-deploy-${var.account_name}"
          }
        }
      }
    ]
  })
}
```

Use multiple providers to deploy across accounts:

```hcl
# Central account provider
provider "aws" {
  region = "us-east-1"
  alias  = "central"
}

# Dev account provider
provider "aws" {
  region = "us-east-1"
  alias  = "dev"

  assume_role {
    role_arn    = "arn:aws:iam::111111111111:role/TerraformDeployRole"
    external_id = "terraform-deploy-dev"
  }
}

# Production account provider
provider "aws" {
  region = "us-east-1"
  alias  = "prod"

  assume_role {
    role_arn    = "arn:aws:iam::333333333333:role/TerraformDeployRole"
    external_id = "terraform-deploy-prod"
  }
}

# Deploy resources to different accounts
resource "aws_instance" "dev_server" {
  provider      = aws.dev
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

resource "aws_instance" "prod_server" {
  provider      = aws.prod
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.large"
}
```

## Requiring MFA for Role Assumption

For production environments, require MFA when assuming roles:

```hcl
resource "aws_iam_role" "terraform_prod" {
  name = "TerraformProdRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:root"
        }
        Action = "sts:AssumeRole"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
          NumericLessThan = {
            "aws:MultiFactorAuthAge" = 3600  # MFA must be less than 1 hour old
          }
        }
      }
    ]
  })
}
```

## Session Tags for Audit Trails

Use session tags to track who is running Terraform:

```hcl
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::123456789012:role/TerraformDeployRole"
    session_name = "terraform-${var.deployer_name}"

    tags = {
      DeployedBy = var.deployer_name
      Pipeline   = var.pipeline_id
      Repository = var.repository_name
    }
  }
}
```

These tags appear in CloudTrail logs, making it easy to trace who deployed what.

## Monitoring Your Infrastructure

IAM roles secure how Terraform accesses your cloud infrastructure, but you also need to monitor the resources it creates. [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your AWS infrastructure, alerting you when services experience issues regardless of which account or role deployed them.

## Conclusion

IAM roles provide a far more secure authentication mechanism for Terraform than static access keys. Use instance profiles for EC2-based runners, task roles for ECS, cross-account assumption for multi-account setups, and OIDC for CI/CD platforms. The initial setup is more involved than dropping an access key into an environment variable, but the security benefits are substantial and the ongoing operational overhead is lower since you never need to rotate credentials.

For more on Terraform security, see our guides on [OIDC authentication](https://oneuptime.com/blog/post/2026-02-23-how-to-use-oidc-for-provider-authentication-in-terraform/view) and [least privilege for service accounts](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-least-privilege-for-terraform-service-accounts/view).
