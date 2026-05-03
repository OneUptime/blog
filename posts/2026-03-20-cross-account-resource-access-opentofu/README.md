# How to Set Up Cross-Account Resource Access with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Cross-Account, IAM, Role Assumption, Infrastructure as Code

Description: Learn how to configure OpenTofu to provision and access resources across multiple AWS accounts using IAM role assumption with provider aliases.

## Introduction

Cross-account resource access is a core pattern in AWS multi-account architectures. OpenTofu achieves this through the `assume_role` block in the AWS provider, allowing one configuration to deploy resources in multiple accounts by assuming roles in each target account.

## Hub Account Configuration

The central (hub) account manages the OpenTofu execution and assumes roles in spoke accounts:

```hcl
# Hub account - default provider (the account running OpenTofu)

provider "aws" {
  region = "us-east-1"
  # Uses the CI/CD role in the hub account
}

# Spoke: production account
provider "aws" {
  alias  = "prod"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::${var.prod_account_id}:role/OpenTofuDeployRole"
    session_name = "OpenTofuDeploy"
    external_id  = var.external_id   # Extra security for third-party scenarios
  }
}

# Spoke: networking account
provider "aws" {
  alias  = "networking"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::${var.networking_account_id}:role/OpenTofuDeployRole"
    session_name = "OpenTofuDeploy"
  }
}
```

## Trust Policy in Spoke Accounts

The `OpenTofuDeployRole` in each spoke account must trust the hub CI role:

```hcl
# In the spoke account: trust policy for OpenTofuDeployRole
resource "aws_iam_role" "opentofu_deploy" {
  name = "OpenTofuDeployRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = {
        # Trust the CI role in the hub account
        AWS = "arn:aws:iam::${var.hub_account_id}:role/ci-role"
      }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "sts:ExternalId" = var.external_id
        }
      }
    }]
  })
}
```

## Deploying Cross-Account Resources

```hcl
# Create a VPC in the networking account
resource "aws_vpc" "shared" {
  provider   = aws.networking
  cidr_block = "10.0.0.0/16"
  tags = { Name = "shared-network-vpc" }
}

# Create a VPC in the prod account
resource "aws_vpc" "prod_app" {
  provider   = aws.prod
  cidr_block = "10.1.0.0/16"
  tags = { Name = "prod-application-vpc" }
}

# Cross-account VPC peering: networking → prod
resource "aws_vpc_peering_connection" "net_to_prod" {
  provider    = aws.networking         # Requester side
  vpc_id      = aws_vpc.shared.id
  peer_vpc_id = aws_vpc.prod_app.id
  peer_owner_id = var.prod_account_id
  peer_region   = "us-east-1"
  auto_accept   = false
}

resource "aws_vpc_peering_connection_accepter" "prod_accepts" {
  provider                  = aws.prod  # Accepter side
  vpc_peering_connection_id = aws_vpc_peering_connection.net_to_prod.id
  auto_accept               = true
}
```

## Granting Hub Account Permission to Assume Spoke Roles

```hcl
# In the hub account: allow CI role to assume roles in all spoke accounts
resource "aws_iam_role_policy" "ci_assume_spoke_roles" {
  name = "assume-spoke-roles"
  role = aws_iam_role.ci.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sts:AssumeRole"
      Resource = [
        "arn:aws:iam::${var.prod_account_id}:role/OpenTofuDeployRole",
        "arn:aws:iam::${var.networking_account_id}:role/OpenTofuDeployRole",
        "arn:aws:iam::${var.dev_account_id}:role/OpenTofuDeployRole",
      ]
    }]
  })
}
```

## Conclusion

Cross-account resource access in OpenTofu is built on IAM role assumption. The hub CI account assumes deployment roles in each spoke account using the `assume_role` provider block. Trust policies in spoke accounts restrict assumption to the specific hub CI role, and optionally require an external ID for additional security. This pattern enables a single OpenTofu configuration to orchestrate infrastructure across an entire AWS Organization.
