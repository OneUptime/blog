# How to Use HCP Terraform Free Tier Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Free Tier, Infrastructure as Code, Cloud Management

Description: Learn how to maximize value from the HCP Terraform free tier including workspace management, state storage, and team collaboration tips.

---

HCP Terraform (formerly Terraform Cloud) offers a generous free tier that many teams overlook. Whether you are a solo developer or a small team getting started with infrastructure as code, the free tier provides enough functionality to manage real production workloads. This guide walks through how to get the most out of it.

## What the Free Tier Includes

The HCP Terraform free tier gives you access to a surprisingly complete set of features. You get up to 500 managed resources, unlimited workspaces, remote state management, VCS integration, and a single concurrent run. The free tier also includes access to the private module registry and basic team management for up to five users.

That is more than enough for many startups and small teams. The key is knowing how to organize your workloads to stay within those limits.

## Setting Up Your Organization

Start by creating an organization in HCP Terraform. Go to [app.terraform.io](https://app.terraform.io) and sign up for an account if you have not already.

```hcl
# In your Terraform configuration, connect to HCP Terraform
terraform {
  cloud {
    organization = "my-startup"

    workspaces {
      # Use tags to organize workspaces
      tags = ["networking"]
    }
  }
}
```

One common mistake is creating separate organizations for different projects. Keep everything under one organization on the free tier. This way, your five team members can access all workspaces without hitting user limits.

## Workspace Organization Strategy

Since you get unlimited workspaces, the trick is splitting your infrastructure into logical, manageable units. A good approach is to separate workspaces by lifecycle and blast radius.

```hcl
# Workspace: networking-prod
# Manages VPC, subnets, route tables
terraform {
  cloud {
    organization = "my-startup"

    workspaces {
      name = "networking-prod"
    }
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name        = "production-vpc"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

```hcl
# Workspace: app-prod
# Manages application resources separately
terraform {
  cloud {
    organization = "my-startup"

    workspaces {
      name = "app-prod"
    }
  }
}

# Reference networking outputs using data source
data "terraform_remote_state" "networking" {
  backend = "remote"

  config = {
    organization = "my-startup"
    workspaces = {
      name = "networking-prod"
    }
  }
}
```

This pattern keeps your resource count per workspace manageable and makes it easy to understand what each workspace controls.

## Staying Within the 500 Resource Limit

The 500-resource limit applies across your entire organization. To track your resource usage, check the organization settings page regularly.

Here are some practical tips for staying under the limit:

First, avoid managing resources that do not need to be in Terraform. Things like one-off test instances or resources managed by other tools should stay out of your state.

```hcl
# Use lifecycle rules to ignore resources you only create once
resource "aws_iam_role" "bootstrap" {
  name = "bootstrap-role"

  # Prevent Terraform from counting this in ongoing management
  # if you only need it during initial setup
  lifecycle {
    ignore_changes = all
  }

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}
```

Second, consolidate where possible. Instead of creating individual security group rules as separate resources, use inline rules:

```hcl
# Instead of separate aws_security_group_rule resources (each counts as 1),
# use inline rules (the whole security group counts as 1 resource)
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Web server security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Using Remote State Effectively

One of the biggest advantages of HCP Terraform, even on the free tier, is remote state management. You get state locking, versioning, and encrypted storage at no cost.

```hcl
# Share outputs between workspaces using remote state
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The VPC ID for use by other workspaces"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "Private subnet IDs for application deployment"
}
```

State versioning means you can roll back if something goes wrong. HCP Terraform keeps a history of every state change, which is invaluable when debugging infrastructure issues.

## VCS Integration on Free Tier

Connect your GitHub, GitLab, or Bitbucket repository to trigger automatic plans on pull requests. This is included in the free tier and is one of the most valuable features.

```hcl
# Your terraform configuration in a Git repository
# When you open a PR that modifies .tf files,
# HCP Terraform automatically runs a plan

terraform {
  cloud {
    organization = "my-startup"

    workspaces {
      name = "app-staging"
    }
  }
}

# Changes to this file trigger automatic plans
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "staging-app"
  }
}
```

The speculative plan runs against your pull request, posting results as a comment. Reviewers can see exactly what infrastructure changes a code change will cause before merging.

## Managing the Single Concurrent Run Limit

The free tier allows one concurrent run. This means if someone triggers a plan or apply in one workspace, other workspaces queue up and wait.

To work around this limitation:

- Schedule your applies during off-peak hours
- Use the CLI workflow for quick iterations on a single workspace
- Queue runs strategically by batching related changes

```bash
# Use CLI-driven runs for faster iteration during development
terraform plan

# Only trigger VCS-driven runs when you are ready to merge
# This keeps the run queue clear for others on your team
```

## Team Collaboration Tips

With five users on the free tier, establish clear ownership patterns. Assign workspace ownership so team members know who is responsible for what.

```hcl
# Use workspace tags to indicate ownership
# Tag format: owner-<username>
terraform {
  cloud {
    organization = "my-startup"

    workspaces {
      tags = ["owner-alice", "service-api", "env-production"]
    }
  }
}
```

Document your workspace naming convention and tagging strategy in your team wiki. Consistent naming makes it easy to find and manage workspaces as your infrastructure grows.

## When to Consider Upgrading

Watch for these signals that you are outgrowing the free tier:

- Regularly hitting the 500-resource limit
- Needing more than one concurrent run
- Requiring team-level access controls (read-only vs. admin)
- Needing Sentinel policies for governance
- More than five team members need access

Until you hit those walls, the free tier is genuinely capable of supporting production infrastructure. Many teams run on it for months or even years before needing to upgrade.

## Monitoring Your Usage

Keep an eye on your resource count and run history through the HCP Terraform dashboard. The organization settings page shows your current resource consumption against the free tier limits.

```bash
# You can also check workspace details via the API
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-startup/workspaces" | \
  jq '.data[] | {name: .attributes.name, resources: .attributes["resource-count"]}'
```

This API call lists all your workspaces and their resource counts, helping you track usage programmatically.

## Wrapping Up

The HCP Terraform free tier is a solid foundation for infrastructure as code workflows. By organizing your workspaces thoughtfully, staying within resource limits, and leveraging free features like VCS integration and remote state, you can run production infrastructure without spending a dollar on tooling. Start small, iterate, and upgrade only when you genuinely need the extra capacity.
