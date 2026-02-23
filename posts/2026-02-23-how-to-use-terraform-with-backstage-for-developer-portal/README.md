# How to Use Terraform with Backstage for Developer Portal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Backstage, Developer Portal, DevOps, Infrastructure as Code, Platform Engineering

Description: Learn how to integrate Terraform with Backstage to create a self-service developer portal where teams can provision infrastructure through software templates.

---

Backstage is Spotify's open-source developer portal platform that provides a centralized place for managing software, documentation, and infrastructure. Integrating Terraform with Backstage allows platform teams to create self-service templates that developers can use to provision infrastructure without needing to write Terraform code themselves. This guide covers setting up Backstage with Terraform for a streamlined developer experience.

## Why Combine Terraform and Backstage?

Platform engineering teams often face a challenge: they want to standardize infrastructure provisioning while giving developers autonomy. Backstage solves this by providing a user-friendly portal where developers can discover services, read documentation, and create new resources through templates. When Terraform powers these templates, developers get point-and-click infrastructure provisioning backed by production-grade Terraform modules.

Benefits include self-service infrastructure for development teams, standardized Terraform modules enforced through templates, a software catalog that tracks all provisioned resources, and reduced cognitive load on developers who do not need to learn Terraform.

## Prerequisites

You need a running Backstage instance (or plan to deploy one), Terraform configurations organized as reusable modules, a Git repository for storing generated Terraform code, a CI/CD pipeline that can execute Terraform, and a Kubernetes cluster for hosting Backstage.

## Step 1: Deploy Backstage with Terraform

Use Terraform to provision the infrastructure for Backstage itself.

```hcl
# backstage-infra.tf
# Provision infrastructure for Backstage
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# Create a PostgreSQL database for Backstage
resource "aws_rds_instance" "backstage" {
  identifier           = "backstage-db"
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = "db.t3.medium"
  allocated_storage    = 50
  db_name              = "backstage"
  username             = "backstage"
  password             = var.db_password
  skip_final_snapshot  = true
  publicly_accessible  = false

  vpc_security_group_ids = [aws_security_group.backstage_db.id]
  db_subnet_group_name   = aws_db_subnet_group.backstage.name
}

# Deploy Backstage to Kubernetes
resource "helm_release" "backstage" {
  name       = "backstage"
  repository = "https://backstage.github.io/charts"
  chart      = "backstage"
  namespace  = "backstage"
  version    = "1.0.0"

  set {
    name  = "backstage.appConfig.backend.database.client"
    value = "pg"
  }

  set {
    name  = "backstage.appConfig.backend.database.connection.host"
    value = aws_rds_instance.backstage.address
  }

  set_sensitive {
    name  = "backstage.appConfig.backend.database.connection.password"
    value = var.db_password
  }

  depends_on = [aws_rds_instance.backstage]
}
```

## Step 2: Create Backstage Software Templates for Terraform

Software templates in Backstage define forms that developers fill out to generate new resources.

```yaml
# templates/new-service/template.yaml
# Backstage template for creating a new service with Terraform infrastructure
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: new-service-with-infra
  title: New Service with Infrastructure
  description: Create a new microservice with Terraform-provisioned infrastructure
  tags:
    - terraform
    - infrastructure
    - recommended
spec:
  owner: platform-team
  type: service

  # Define the form parameters developers will fill out
  parameters:
    - title: Service Information
      required:
        - name
        - description
        - owner
      properties:
        name:
          title: Service Name
          type: string
          description: Name of the service (lowercase, hyphens allowed)
          pattern: '^[a-z][a-z0-9-]*$'
        description:
          title: Description
          type: string
          description: Brief description of the service
        owner:
          title: Owner
          type: string
          description: Team that owns this service
          ui:field: OwnerPicker
          ui:options:
            catalogFilter:
              kind: Group

    - title: Infrastructure Configuration
      required:
        - environment
        - region
      properties:
        environment:
          title: Environment
          type: string
          enum:
            - staging
            - production
          default: staging
        region:
          title: AWS Region
          type: string
          enum:
            - us-east-1
            - us-west-2
            - eu-west-1
          default: us-east-1
        database:
          title: Include Database
          type: boolean
          default: false
        databaseEngine:
          title: Database Engine
          type: string
          enum:
            - postgres
            - mysql
          default: postgres
          ui:options:
            hidden:
              $eval: '!parameters.database'
        cacheEnabled:
          title: Include Redis Cache
          type: boolean
          default: false

  # Define the steps to execute when the template is used
  steps:
    # Step 1: Generate Terraform configurations from the template
    - id: generate-terraform
      name: Generate Terraform Configuration
      action: fetch:template
      input:
        url: ./terraform-skeleton
        targetPath: terraform
        values:
          serviceName: ${{ parameters.name }}
          environment: ${{ parameters.environment }}
          region: ${{ parameters.region }}
          database: ${{ parameters.database }}
          databaseEngine: ${{ parameters.databaseEngine }}
          cacheEnabled: ${{ parameters.cacheEnabled }}
          owner: ${{ parameters.owner }}

    # Step 2: Generate the application code
    - id: generate-app
      name: Generate Application Code
      action: fetch:template
      input:
        url: ./app-skeleton
        targetPath: app
        values:
          serviceName: ${{ parameters.name }}

    # Step 3: Publish to GitHub
    - id: publish
      name: Publish to GitHub
      action: publish:github
      input:
        allowedHosts: ['github.com']
        repoUrl: github.com?owner=${{ parameters.owner }}&repo=${{ parameters.name }}
        description: ${{ parameters.description }}
        defaultBranch: main

    # Step 4: Register in Backstage catalog
    - id: register
      name: Register in Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps.publish.output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml

    # Step 5: Trigger Terraform pipeline
    - id: trigger-terraform
      name: Provision Infrastructure
      action: github:actions:dispatch
      input:
        repoUrl: github.com?owner=${{ parameters.owner }}&repo=${{ parameters.name }}
        workflowId: terraform.yml
        branchOrTagName: main

  output:
    links:
      - title: Repository
        url: ${{ steps.publish.output.remoteUrl }}
      - title: Open in Backstage
        icon: catalog
        entityRef: ${{ steps.register.output.entityRef }}
```

## Step 3: Create the Terraform Skeleton Template

The skeleton template generates Terraform configurations based on the developer's choices.

```hcl
# templates/new-service/terraform-skeleton/main.tf
# Terraform configuration for ${{ values.serviceName }}
# Generated by Backstage Software Template
# Owner: ${{ values.owner }}

terraform {
  required_version = ">= 1.0"

  backend "s3" {
    bucket = "terraform-state-central"
    key    = "services/${{ values.serviceName }}/${{ values.environment }}/terraform.tfstate"
    region = "${{ values.region }}"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "${{ values.region }}"

  default_tags {
    tags = {
      Service     = "${{ values.serviceName }}"
      Environment = "${{ values.environment }}"
      Owner       = "${{ values.owner }}"
      ManagedBy   = "terraform"
      CreatedBy   = "backstage"
    }
  }
}

# ECS Service for the application
module "ecs_service" {
  source = "git::https://github.com/org/terraform-modules.git//ecs-service?ref=v2.0.0"

  service_name = "${{ values.serviceName }}"
  environment  = "${{ values.environment }}"
  vpc_id       = data.terraform_remote_state.platform.outputs.vpc_id
  subnet_ids   = data.terraform_remote_state.platform.outputs.private_subnet_ids
}

{%- if values.database %}
# Database for the service
module "database" {
  source = "git::https://github.com/org/terraform-modules.git//rds?ref=v2.0.0"

  service_name = "${{ values.serviceName }}"
  engine       = "${{ values.databaseEngine }}"
  environment  = "${{ values.environment }}"
  vpc_id       = data.terraform_remote_state.platform.outputs.vpc_id
  subnet_ids   = data.terraform_remote_state.platform.outputs.database_subnet_ids
}
{%- endif %}

{%- if values.cacheEnabled %}
# Redis cache for the service
module "redis" {
  source = "git::https://github.com/org/terraform-modules.git//elasticache?ref=v2.0.0"

  service_name = "${{ values.serviceName }}"
  environment  = "${{ values.environment }}"
  vpc_id       = data.terraform_remote_state.platform.outputs.vpc_id
  subnet_ids   = data.terraform_remote_state.platform.outputs.private_subnet_ids
}
{%- endif %}

# Reference platform infrastructure state
data "terraform_remote_state" "platform" {
  backend = "s3"
  config = {
    bucket = "terraform-state-central"
    key    = "platform/${{ values.environment }}/terraform.tfstate"
    region = "${{ values.region }}"
  }
}
```

## Step 4: Register Terraform Resources in the Backstage Catalog

Track Terraform-managed resources in the Backstage software catalog.

```yaml
# catalog-info.yaml
# Backstage catalog descriptor for the service
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${{ values.serviceName }}
  description: ${{ values.description }}
  annotations:
    github.com/project-slug: ${{ values.owner }}/${{ values.serviceName }}
    backstage.io/techdocs-ref: dir:.
  tags:
    - terraform
    - ${{ values.environment }}
spec:
  type: service
  lifecycle: production
  owner: ${{ values.owner }}
  dependsOn:
    - resource:default/${{ values.serviceName }}-database
    - resource:default/${{ values.serviceName }}-cache
  providesApis:
    - ${{ values.serviceName }}-api
---
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: ${{ values.serviceName }}-infrastructure
  description: Terraform-managed infrastructure for ${{ values.serviceName }}
  annotations:
    terraform/workspace: services/${{ values.serviceName }}/${{ values.environment }}
spec:
  type: terraform-workspace
  owner: ${{ values.owner }}
  dependencyOf:
    - component:default/${{ values.serviceName }}
```

## Step 5: Create a Backstage Terraform Plugin

Build a custom Backstage plugin to show Terraform state information in the catalog.

```typescript
// plugins/terraform/src/components/TerraformCard.tsx
// Backstage plugin component showing Terraform resource status
import React from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  InfoCard,
  Table,
  TableColumn,
} from '@backstage/core-components';

// Define the columns for the resource table
const columns: TableColumn[] = [
  { title: 'Resource', field: 'name' },
  { title: 'Type', field: 'type' },
  { title: 'Status', field: 'status' },
  { title: 'Last Updated', field: 'lastUpdated' },
];

export const TerraformCard = () => {
  const { entity } = useEntity();
  const workspace = entity.metadata.annotations?.['terraform/workspace'];

  // Fetch Terraform state information from your backend
  const [resources, setResources] = React.useState([]);

  React.useEffect(() => {
    // Call your backend API to get Terraform state
    fetch(`/api/terraform/workspaces/${workspace}/resources`)
      .then(res => res.json())
      .then(data => setResources(data));
  }, [workspace]);

  return (
    <InfoCard title="Terraform Resources">
      <Table
        columns={columns}
        data={resources}
        options={{ paging: false, search: false }}
      />
    </InfoCard>
  );
};
```

## Step 6: Automating the Terraform Pipeline

Set up the CI/CD pipeline that runs when Backstage generates new Terraform code.

```yaml
# .github/workflows/terraform.yml
# Pipeline triggered by Backstage template
name: Terraform Infrastructure

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'terraform/**'

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        working-directory: terraform
        run: terraform init

      - name: Terraform Plan
        working-directory: terraform
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        working-directory: terraform
        run: terraform apply -auto-approve tfplan
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Best Practices

Design Terraform modules that align with Backstage template parameters so the mapping is clean. Use Backstage's entity annotations to link catalog entries to their Terraform workspaces. Create templates for common infrastructure patterns that teams frequently need. Include documentation in your templates so developers understand what they are provisioning. Use Backstage's permission system to control who can create infrastructure through templates. Build custom plugins to surface Terraform state and cost information in the Backstage catalog.

## Conclusion

Terraform and Backstage together create a powerful internal developer platform. Backstage provides the user-friendly interface and software catalog, while Terraform provides reliable infrastructure provisioning behind the scenes. By connecting them through software templates, you enable self-service infrastructure that follows organizational standards. Developers get the speed and autonomy they want, while platform teams maintain control over infrastructure patterns and governance.
