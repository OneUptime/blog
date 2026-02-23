# How to Use Terraform with Port for Internal Developer Platform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Port, Internal Developer Platform, DevOps, Platform Engineering, Infrastructure as Code

Description: Learn how to integrate Terraform with Port to build an internal developer platform that enables self-service infrastructure provisioning with a visual software catalog.

---

Port is an internal developer platform that helps organizations build a unified software catalog and self-service hub. When integrated with Terraform, Port enables developers to provision infrastructure through a user-friendly interface while maintaining platform engineering standards. This guide walks you through connecting Terraform with Port to create a self-service infrastructure experience.

## Why Use Terraform with Port?

Port provides a visual interface for managing your software catalog, defining self-service actions, and tracking infrastructure resources. Terraform provides the reliable infrastructure provisioning engine. Together, they give platform teams the ability to create self-service workflows where developers can request and manage infrastructure without deep Terraform knowledge.

Key benefits include a visual catalog of all Terraform-managed resources, self-service actions backed by Terraform automation, scorecards to track infrastructure health and compliance, and a unified view of services and their dependencies.

## Prerequisites

You need a Port account, Terraform configurations stored in Git, a CI/CD platform for running Terraform (GitHub Actions, GitLab CI, etc.), the Port Terraform provider, and cloud provider credentials.

## Step 1: Configure the Port Terraform Provider

Use Terraform to define your Port catalog structure.

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    port = {
      source  = "port-labs/port-labs"
      version = "~> 2.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure the Port provider
provider "port" {
  client_id = var.port_client_id
  secret    = var.port_client_secret
}

provider "aws" {
  region = var.aws_region
}
```

## Step 2: Define Blueprints in Port

Blueprints define the structure of entities in your software catalog.

```hcl
# port-blueprints.tf
# Define a blueprint for cloud environments
resource "port_blueprint" "environment" {
  identifier = "environment"
  title      = "Environment"
  icon       = "Cloud"
  description = "Cloud infrastructure environment"

  properties = {
    string_props = {
      "region" = {
        title       = "AWS Region"
        description = "The AWS region for this environment"
        required    = true
      }
      "account_id" = {
        title       = "AWS Account ID"
        description = "The AWS account ID"
        required    = true
      }
      "status" = {
        title       = "Status"
        description = "Current environment status"
        enum        = ["active", "provisioning", "decommissioning"]
        default     = "active"
      }
    }
    object_props = {
      "terraform_outputs" = {
        title       = "Terraform Outputs"
        description = "Outputs from Terraform apply"
      }
    }
  }
}

# Define a blueprint for services
resource "port_blueprint" "service" {
  identifier = "service"
  title      = "Service"
  icon       = "Microservice"
  description = "A microservice or application"

  properties = {
    string_props = {
      "language" = {
        title    = "Programming Language"
        required = true
        enum     = ["go", "python", "nodejs", "java"]
      }
      "repository" = {
        title    = "Repository URL"
        format   = "url"
        required = true
      }
      "owner" = {
        title    = "Team Owner"
        required = true
      }
    }
    boolean_props = {
      "has_database" = {
        title   = "Has Database"
        default = false
      }
      "has_cache" = {
        title   = "Has Cache"
        default = false
      }
    }
  }

  # Define relationships to other blueprints
  relations = {
    "environment" = {
      title      = "Environment"
      target     = port_blueprint.environment.identifier
      required   = false
      many       = false
    }
  }
}

# Define a blueprint for Terraform workspaces
resource "port_blueprint" "terraform_workspace" {
  identifier = "terraform_workspace"
  title      = "Terraform Workspace"
  icon       = "Terraform"
  description = "A Terraform workspace managing infrastructure"

  properties = {
    string_props = {
      "state_backend" = {
        title = "State Backend"
        enum  = ["s3", "gcs", "azurerm", "terraform_cloud"]
      }
      "terraform_version" = {
        title = "Terraform Version"
      }
      "last_apply_status" = {
        title = "Last Apply Status"
        enum  = ["success", "failed", "pending"]
      }
    }
    number_props = {
      "resource_count" = {
        title       = "Managed Resources"
        description = "Number of resources managed by this workspace"
      }
    }
    string_props = {
      "last_apply_time" = {
        title  = "Last Apply Time"
        format = "date-time"
      }
    }
  }

  relations = {
    "service" = {
      title  = "Service"
      target = port_blueprint.service.identifier
      many   = false
    }
    "environment" = {
      title  = "Environment"
      target = port_blueprint.environment.identifier
      many   = false
    }
  }
}
```

## Step 3: Create Self-Service Actions

Define actions that developers can trigger from the Port UI.

```hcl
# port-actions.tf
# Create a self-service action for provisioning a new service
resource "port_action" "create_service" {
  identifier = "create_service"
  title      = "Create New Service"
  icon       = "Rocket"
  blueprint  = port_blueprint.service.identifier

  trigger = "CREATE"

  # Define the form that developers fill out
  user_properties = {
    string_props = {
      "service_name" = {
        title       = "Service Name"
        description = "Name of the new service (lowercase, hyphens)"
        pattern     = "^[a-z][a-z0-9-]*$"
        required    = true
      }
      "language" = {
        title    = "Language"
        enum     = ["go", "python", "nodejs", "java"]
        required = true
      }
      "environment" = {
        title    = "Target Environment"
        enum     = ["staging", "production"]
        required = true
        default  = "staging"
      }
      "instance_size" = {
        title    = "Instance Size"
        enum     = ["small", "medium", "large"]
        required = true
        default  = "small"
      }
    }
    boolean_props = {
      "include_database" = {
        title   = "Include Database"
        default = false
      }
      "include_cache" = {
        title   = "Include Redis Cache"
        default = false
      }
    }
  }

  # Trigger a GitHub Actions workflow
  github_method = {
    org      = var.github_org
    repo     = "infrastructure"
    workflow = "create-service.yml"
  }
}

# Create an action for scaling a service
resource "port_action" "scale_service" {
  identifier = "scale_service"
  title      = "Scale Service"
  icon       = "Scale"
  blueprint  = port_blueprint.service.identifier

  trigger = "DAY-2"

  user_properties = {
    number_props = {
      "replicas" = {
        title       = "Number of Replicas"
        minimum     = 1
        maximum     = 20
        required    = true
      }
    }
    string_props = {
      "instance_type" = {
        title = "Instance Type"
        enum  = ["t3.small", "t3.medium", "t3.large", "t3.xlarge"]
      }
    }
  }

  github_method = {
    org      = var.github_org
    repo     = "infrastructure"
    workflow = "scale-service.yml"
  }
}

# Create an action for destroying a service
resource "port_action" "destroy_service" {
  identifier = "destroy_service"
  title      = "Destroy Service Infrastructure"
  icon       = "Trash"
  blueprint  = port_blueprint.service.identifier

  trigger = "DELETE"

  required_approval = true

  github_method = {
    org      = var.github_org
    repo     = "infrastructure"
    workflow = "destroy-service.yml"
  }
}
```

## Step 4: Create the Backend Workflow

Set up the GitHub Actions workflow that Port triggers.

```yaml
# .github/workflows/create-service.yml
# Workflow triggered by Port self-service action
name: Create Service Infrastructure

on:
  workflow_dispatch:
    inputs:
      service_name:
        description: 'Service name'
        required: true
      language:
        description: 'Programming language'
        required: true
      environment:
        description: 'Target environment'
        required: true
      instance_size:
        description: 'Instance size'
        required: true
      include_database:
        description: 'Include database'
        required: true
      include_cache:
        description: 'Include cache'
        required: true
      port_run_id:
        description: 'Port action run ID'
        required: true

jobs:
  provision:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Notify Port that provisioning has started
      - name: Update Port Action Status
        uses: port-labs/port-github-action@v1
        with:
          clientId: ${{ secrets.PORT_CLIENT_ID }}
          clientSecret: ${{ secrets.PORT_CLIENT_SECRET }}
          operation: PATCH_RUN
          runId: ${{ inputs.port_run_id }}
          logMessage: "Starting infrastructure provisioning for ${{ inputs.service_name }}"

      - uses: hashicorp/setup-terraform@v3

      # Generate Terraform configuration from templates
      - name: Generate Terraform Config
        run: |
          mkdir -p services/${{ inputs.service_name }}
          envsubst < templates/service/main.tf.tpl > services/${{ inputs.service_name }}/main.tf
        env:
          SERVICE_NAME: ${{ inputs.service_name }}
          ENVIRONMENT: ${{ inputs.environment }}
          INSTANCE_SIZE: ${{ inputs.instance_size }}
          INCLUDE_DATABASE: ${{ inputs.include_database }}
          INCLUDE_CACHE: ${{ inputs.include_cache }}

      # Run Terraform
      - name: Terraform Init
        working-directory: services/${{ inputs.service_name }}
        run: terraform init

      - name: Terraform Apply
        working-directory: services/${{ inputs.service_name }}
        run: terraform apply -auto-approve

      # Capture outputs
      - name: Get Terraform Outputs
        id: tf_output
        working-directory: services/${{ inputs.service_name }}
        run: |
          echo "outputs=$(terraform output -json)" >> $GITHUB_OUTPUT

      # Register the service in Port catalog
      - name: Create Port Entity
        uses: port-labs/port-github-action@v1
        with:
          clientId: ${{ secrets.PORT_CLIENT_ID }}
          clientSecret: ${{ secrets.PORT_CLIENT_SECRET }}
          operation: UPSERT
          identifier: ${{ inputs.service_name }}
          blueprint: service
          properties: |
            {
              "language": "${{ inputs.language }}",
              "repository": "https://github.com/${{ github.repository_owner }}/${{ inputs.service_name }}",
              "owner": "platform-team",
              "has_database": ${{ inputs.include_database }},
              "has_cache": ${{ inputs.include_cache }}
            }
          relations: |
            {
              "environment": "${{ inputs.environment }}"
            }

      # Update Port action status
      - name: Complete Port Action
        uses: port-labs/port-github-action@v1
        with:
          clientId: ${{ secrets.PORT_CLIENT_ID }}
          clientSecret: ${{ secrets.PORT_CLIENT_SECRET }}
          operation: PATCH_RUN
          runId: ${{ inputs.port_run_id }}
          status: "SUCCESS"
          logMessage: "Infrastructure provisioned successfully"
```

## Step 5: Sync Terraform State to Port Catalog

Keep the Port catalog in sync with your actual Terraform state.

```hcl
# port-sync.tf
# Sync Terraform resources to Port catalog entities

# Create an environment entity in Port
resource "port_entity" "production_env" {
  identifier = "production"
  title      = "Production Environment"
  blueprint  = port_blueprint.environment.identifier

  properties = {
    string_props = {
      "region"     = var.aws_region
      "account_id" = data.aws_caller_identity.current.account_id
      "status"     = "active"
    }
    object_props = {
      "terraform_outputs" = jsonencode({
        vpc_id           = module.vpc.vpc_id
        cluster_endpoint = module.eks.cluster_endpoint
      })
    }
  }
}

# Create a Terraform workspace entity
resource "port_entity" "platform_workspace" {
  identifier = "platform-production"
  title      = "Platform Production Workspace"
  blueprint  = port_blueprint.terraform_workspace.identifier

  properties = {
    string_props = {
      "state_backend"     = "s3"
      "terraform_version" = "1.6.0"
      "last_apply_status" = "success"
      "last_apply_time"   = timestamp()
    }
    number_props = {
      "resource_count" = 42
    }
  }

  relations = {
    single_relations = {
      "environment" = port_entity.production_env.identifier
    }
  }
}
```

## Step 6: Create Scorecards for Infrastructure Quality

Define scorecards in Port to track infrastructure standards.

```hcl
# port-scorecards.tf
# Create a scorecard for infrastructure quality
resource "port_scorecard" "infra_quality" {
  identifier = "infrastructure_quality"
  title      = "Infrastructure Quality"
  blueprint  = port_blueprint.service.identifier

  rules = {
    "has_monitoring" = {
      identifier = "has_monitoring"
      title      = "Has Monitoring"
      level      = "Gold"
      query = {
        combinator = "and"
        conditions = [
          {
            property = "has_monitoring"
            operator = "="
            value    = true
          }
        ]
      }
    }
    "uses_managed_database" = {
      identifier = "uses_managed_database"
      title      = "Uses Managed Database"
      level      = "Silver"
      query = {
        combinator = "and"
        conditions = [
          {
            property = "has_database"
            operator = "="
            value    = true
          }
        ]
      }
    }
  }
}
```

## Best Practices

Use Port blueprints to model your infrastructure at the right abstraction level for developers. Create self-service actions for common operations like provisioning, scaling, and destroying resources. Keep the Port catalog in sync with Terraform state using automated pipelines. Use Port scorecards to track compliance with infrastructure standards. Implement approval workflows in Port actions for production changes. Tag all Terraform resources with Port entity identifiers for traceability.

## Conclusion

Terraform and Port together create a developer-friendly internal platform. Port provides the visual catalog, self-service actions, and governance features, while Terraform handles the actual infrastructure provisioning. This combination lets platform teams define standardized infrastructure patterns that developers can consume through an intuitive interface, reducing the barrier to infrastructure management while maintaining quality and compliance standards.
