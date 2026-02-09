# How to Configure Terraform Cloud Workspaces for Multi-Environment Kubernetes Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, DevOps

Description: Learn how to use Terraform Cloud workspaces to manage multiple Kubernetes environments with isolated state, variable management, and automated deployment workflows across development, staging, and production.

---

Managing infrastructure across multiple environments creates challenges. Each environment needs its own state, variables, and access controls. Terraform Cloud workspaces solve this by providing isolated execution environments with centralized management and collaboration features.

This guide shows you how to structure Terraform Cloud workspaces for Kubernetes deployments across multiple environments while maintaining security and automation.

## Understanding Terraform Cloud Workspaces

Terraform Cloud workspaces differ from CLI workspaces. Each Cloud workspace has its own state, variables, run history, and settings. They function as independent execution environments that share the same configuration code but maintain separate infrastructure.

For Kubernetes deployments, this means one workspace for development, another for staging, and a third for production, all using the same Terraform modules but with environment-specific values.

## Setting Up Your Terraform Cloud Organization

Create an organization and configure authentication:

```bash
# Install Terraform CLI
brew install terraform

# Login to Terraform Cloud
terraform login

# This opens a browser to generate a token
```

Create a terraform block in your configuration:

```hcl
# terraform.tf
terraform {
  required_version = ">= 1.6.0"

  cloud {
    organization = "your-org-name"

    workspaces {
      tags = ["kubernetes", "eks"]
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}
```

The tags attribute allows multiple workspaces to use the same configuration. Each workspace gets its own isolated state.

## Creating Environment-Specific Workspaces

Set up workspaces for each environment via the Terraform Cloud UI or API:

```bash
# Create workspaces using Terraform Cloud API
cat > create-workspaces.sh <<'EOF'
#!/bin/bash

ORG="your-org-name"
TOKEN="your-tfc-token"

for ENV in development staging production; do
  curl \
    --header "Authorization: Bearer $TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    --data @- \
    https://app.terraform.io/api/v2/organizations/$ORG/workspaces <<JSON
{
  "data": {
    "type": "workspaces",
    "attributes": {
      "name": "k8s-$ENV",
      "description": "Kubernetes infrastructure for $ENV environment",
      "auto-apply": $([ "$ENV" = "production" ] && echo "false" || echo "true"),
      "execution-mode": "remote",
      "terraform-version": "1.6.0",
      "working-directory": "",
      "file-triggers-enabled": true,
      "trigger-patterns": [
        "modules/**/*.tf",
        "environments/$ENV/**/*.tf"
      ],
      "queue-all-runs": false,
      "speculative-enabled": true,
      "structured-run-output-enabled": true
    }
  }
}
JSON
done
EOF

chmod +x create-workspaces.sh
./create-workspaces.sh
```

This creates three workspaces with different auto-apply settings. Development and staging automatically apply changes, while production requires manual approval.

## Structuring Your Terraform Configuration

Organize code to support multiple environments:

```
project/
├── terraform.tf           # Cloud and provider config
├── variables.tf           # Variable definitions
├── main.tf               # Main resources
├── outputs.tf            # Output definitions
├── modules/
│   ├── eks/              # EKS cluster module
│   ├── networking/       # VPC and networking
│   └── kubernetes/       # K8s resources
└── environments/
    ├── development.tfvars
    ├── staging.tfvars
    └── production.tfvars
```

Define variables that differ across environments:

```hcl
# variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production"
  }
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "node_instance_type" {
  description = "EC2 instance type for nodes"
  type        = string
}

variable "min_nodes" {
  description = "Minimum number of nodes"
  type        = number
}

variable "max_nodes" {
  description = "Maximum number of nodes"
  type        = number
}

variable "desired_nodes" {
  description = "Desired number of nodes"
  type        = number
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}
```

Create environment-specific variable files:

```hcl
# environments/development.tfvars
environment         = "development"
cluster_name        = "dev-cluster"
node_instance_type  = "t3.medium"
min_nodes          = 1
max_nodes          = 3
desired_nodes      = 2
aws_region         = "us-west-2"
```

```hcl
# environments/production.tfvars
environment         = "production"
cluster_name        = "prod-cluster"
node_instance_type  = "m5.xlarge"
min_nodes          = 3
max_nodes          = 10
desired_nodes      = 5
aws_region         = "us-east-1"
```

## Configuring Workspace Variables

Set variables in Terraform Cloud for each workspace:

```bash
# Script to set workspace variables
cat > set-workspace-vars.sh <<'EOF'
#!/bin/bash

ORG="your-org-name"
TOKEN="your-tfc-token"
WORKSPACE_NAME=$1
VARS_FILE=$2

WORKSPACE_ID=$(curl -s \
  --header "Authorization: Bearer $TOKEN" \
  "https://app.terraform.io/api/v2/organizations/$ORG/workspaces/$WORKSPACE_NAME" \
  | jq -r '.data.id')

# Parse tfvars file and create variables
while IFS='=' read -r key value; do
  key=$(echo $key | xargs)
  value=$(echo $value | xargs | tr -d '"')

  curl \
    --header "Authorization: Bearer $TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    --data @- \
    https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars <<JSON
{
  "data": {
    "type": "vars",
    "attributes": {
      "key": "$key",
      "value": "$value",
      "category": "terraform",
      "hcl": false,
      "sensitive": false
    }
  }
}
JSON
done < <(grep -v '^#' $VARS_FILE | grep '=')
EOF

chmod +x set-workspace-vars.sh

# Set variables for each environment
./set-workspace-vars.sh k8s-development environments/development.tfvars
./set-workspace-vars.sh k8s-staging environments/staging.tfvars
./set-workspace-vars.sh k8s-production environments/production.tfvars
```

For sensitive values like AWS credentials, set them as sensitive environment variables through the UI or API:

```bash
# Set AWS credentials as sensitive environment variables
curl \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data @- \
  https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars <<'JSON'
{
  "data": {
    "type": "vars",
    "attributes": {
      "key": "AWS_ACCESS_KEY_ID",
      "value": "your-access-key",
      "category": "env",
      "sensitive": true
    }
  }
}
JSON
```

## Building the Main Configuration

Create your main Terraform configuration:

```hcl
# main.tf
provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
      Workspace   = terraform.workspace
    }
  }
}

# VPC and networking
module "networking" {
  source = "./modules/networking"

  environment  = var.environment
  cluster_name = var.cluster_name
  aws_region   = var.aws_region

  vpc_cidr = var.environment == "production" ? "10.0.0.0/16" : "10.1.0.0/16"
}

# EKS cluster
module "eks" {
  source = "./modules/eks"

  environment        = var.environment
  cluster_name       = var.cluster_name
  vpc_id            = module.networking.vpc_id
  subnet_ids        = module.networking.private_subnet_ids
  node_instance_type = var.node_instance_type
  min_nodes         = var.min_nodes
  max_nodes         = var.max_nodes
  desired_nodes     = var.desired_nodes
}

# Kubernetes provider using EKS cluster
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_cert)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      module.eks.cluster_name
    ]
  }
}

# Deploy Kubernetes resources
module "kubernetes_resources" {
  source = "./modules/kubernetes"

  environment  = var.environment
  cluster_name = var.cluster_name

  depends_on = [module.eks]
}
```

## Implementing VCS Integration

Connect workspaces to your Git repository:

```bash
# Connect workspace to VCS using API
curl \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data @- \
  https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID <<'JSON'
{
  "data": {
    "type": "workspaces",
    "attributes": {
      "vcs-repo": {
        "identifier": "your-org/your-repo",
        "oauth-token-id": "ot-xxxxx",
        "branch": "main",
        "default-branch": true
      }
    }
  }
}
JSON
```

Configure different branches for different environments:

- Development workspace: tracks `develop` branch
- Staging workspace: tracks `staging` branch
- Production workspace: tracks `main` branch with manual approval

Update workspace VCS settings:

```json
{
  "data": {
    "type": "workspaces",
    "attributes": {
      "vcs-repo": {
        "identifier": "your-org/your-repo",
        "oauth-token-id": "ot-xxxxx",
        "branch": "develop"
      },
      "file-triggers-enabled": true,
      "trigger-patterns": [
        "**/*.tf",
        "modules/**/*"
      ]
    }
  }
}
```

## Setting Up Run Triggers

Create dependencies between workspaces:

```bash
# Create run trigger from staging to production
STAGING_WS_ID=$(curl -s \
  --header "Authorization: Bearer $TOKEN" \
  "https://app.terraform.io/api/v2/organizations/$ORG/workspaces/k8s-staging" \
  | jq -r '.data.id')

PROD_WS_ID=$(curl -s \
  --header "Authorization: Bearer $TOKEN" \
  "https://app.terraform.io/api/v2/organizations/$ORG/workspaces/k8s-production" \
  | jq -r '.data.id')

curl \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data @- \
  https://app.terraform.io/api/v2/workspaces/$PROD_WS_ID/run-triggers <<JSON
{
  "data": {
    "type": "run-triggers",
    "relationships": {
      "sourceable": {
        "data": {
          "id": "$STAGING_WS_ID",
          "type": "workspaces"
        }
      }
    }
  }
}
JSON
```

Now when staging completes successfully, production workspace queues a speculative plan automatically.

## Implementing Team Access Controls

Define team permissions per workspace:

```bash
# Create teams
for TEAM in developers platform-team security-team; do
  curl \
    --header "Authorization: Bearer $TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    --data @- \
    https://app.terraform.io/api/v2/organizations/$ORG/teams <<JSON
{
  "data": {
    "type": "teams",
    "attributes": {
      "name": "$TEAM",
      "organization-access": {
        "manage-workspaces": false,
        "manage-policies": false
      }
    }
  }
}
JSON
done

# Grant developers read access to dev workspace
curl \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data @- \
  https://app.terraform.io/api/v2/team-workspaces <<JSON
{
  "data": {
    "type": "team-workspaces",
    "attributes": {
      "access": "read"
    },
    "relationships": {
      "team": {
        "data": {
          "id": "team-developers-id",
          "type": "teams"
        }
      },
      "workspace": {
        "data": {
          "id": "$DEV_WORKSPACE_ID",
          "type": "workspaces"
        }
      }
    }
  }
}
JSON

# Grant platform team write access to all workspaces
for WS in development staging production; do
  curl \
    --header "Authorization: Bearer $TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    --data @- \
    https://app.terraform.io/api/v2/team-workspaces <<JSON
{
  "data": {
    "type": "team-workspaces",
    "attributes": {
      "access": "write"
    },
    "relationships": {
      "team": {
        "data": {
          "id": "team-platform-id",
          "type": "teams"
        }
      },
      "workspace": {
        "data": {
          "id": "workspace-$WS-id",
          "type": "workspaces"
        }
      }
    }
  }
}
JSON
done
```

## Implementing Sentinel Policies

Add policy as code for compliance:

```hcl
# policies/require-tags.sentinel
import "tfplan/v2" as tfplan

required_tags = ["Environment", "ManagedBy", "Owner"]

validate_tags = func(resource) {
  tags = resource.change.after.tags

  for required_tags as tag {
    if tag not in keys(tags) {
      return false
    }
  }

  return true
}

main = rule {
  all tfplan.resource_changes as _, rc {
    rc.type == "aws_eks_cluster" implies validate_tags(rc)
  }
}
```

Apply policies to workspaces:

```bash
# Create policy set
curl \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data @- \
  https://app.terraform.io/api/v2/organizations/$ORG/policy-sets <<'JSON'
{
  "data": {
    "type": "policy-sets",
    "attributes": {
      "name": "kubernetes-policies",
      "description": "Required policies for K8s infrastructure",
      "global": false,
      "policies-path": "policies",
      "vcs-repo": {
        "identifier": "your-org/your-repo",
        "oauth-token-id": "ot-xxxxx",
        "branch": "main"
      }
    },
    "relationships": {
      "workspaces": {
        "data": [
          {"id": "ws-staging-id", "type": "workspaces"},
          {"id": "ws-production-id", "type": "workspaces"}
        ]
      }
    }
  }
}
JSON
```

## Implementing Cost Estimation

Enable cost estimation for production workspace:

```bash
curl \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data @- \
  https://app.terraform.io/api/v2/workspaces/$PROD_WS_ID <<'JSON'
{
  "data": {
    "type": "workspaces",
    "attributes": {
      "assessments-enabled": true
    }
  }
}
JSON
```

This shows cost estimates for infrastructure changes before applying them.

## Summary

Terraform Cloud workspaces provide enterprise-grade infrastructure management for Kubernetes deployments across multiple environments. Each workspace maintains isolated state while sharing configuration code, with environment-specific variables controlling behavior. VCS integration automates deployments, run triggers create dependencies between environments, and team access controls ensure security. Policy as code enforces compliance requirements, and cost estimation helps manage cloud spending. This approach scales from small teams to large organizations managing dozens of Kubernetes clusters.
