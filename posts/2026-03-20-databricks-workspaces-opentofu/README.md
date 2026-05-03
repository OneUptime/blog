# How to Deploy Databricks Workspaces with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Databricks, Data Engineering, Analytics, Infrastructure as Code, Spark, Cloud

Description: Learn how to provision Databricks workspaces on AWS or Azure using OpenTofu with proper VPC injection, cluster policies, and workspace configuration for data engineering teams.

---

Databricks is the unified analytics platform built on Apache Spark. Provisioning Databricks workspaces manually is time-consuming and hard to reproduce. OpenTofu automates workspace creation, cluster configuration, and user access management across all cloud providers Databricks supports.

## Deploying Databricks on AWS

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    databricks = {
      source  = "databricks/databricks"
      version = "~> 1.50"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Databricks provider for workspace-level resources
provider "databricks" {
  host  = databricks_mws_workspaces.main.workspace_url
  token = var.databricks_token
}
```

## VPC and IAM Setup

```hcl
# networking.tf
# Cross-account IAM role for Databricks control plane
resource "aws_iam_role" "databricks_cross_account" {
  name = "databricks-cross-account-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        AWS = "arn:aws:iam::414351767826:root"  # Databricks account
      }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "sts:ExternalId" = var.databricks_account_id
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "databricks_cross_account" {
  name = "DatabricksCrossAccountPolicy"
  role = aws_iam_role.databricks_cross_account.id
  policy = file("${path.module}/databricks_cross_account_policy.json")
}
```

## Creating the Workspace

```hcl
# workspace.tf
# Register the VPC configuration with Databricks
resource "databricks_mws_networks" "main" {
  account_id         = var.databricks_account_id
  network_name       = "${var.environment}-network"
  vpc_id             = var.vpc_id
  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.databricks.id]
}

# Register the credentials
resource "databricks_mws_credentials" "main" {
  account_id       = var.databricks_account_id
  role_arn         = aws_iam_role.databricks_cross_account.arn
  credentials_name = "${var.environment}-credentials"
}

# Create S3 root bucket for workspace storage
resource "aws_s3_bucket" "databricks_root" {
  bucket = "${var.project_name}-databricks-${var.environment}"
}

resource "databricks_mws_storage_configurations" "main" {
  account_id                 = var.databricks_account_id
  bucket_name                = aws_s3_bucket.databricks_root.bucket
  storage_configuration_name = "${var.environment}-storage"
}

# Create the workspace
resource "databricks_mws_workspaces" "main" {
  account_id      = var.databricks_account_id
  aws_region      = var.aws_region
  workspace_name  = "${var.environment}-workspace"

  credentials_id            = databricks_mws_credentials.main.credentials_id
  storage_configuration_id  = databricks_mws_storage_configurations.main.storage_configuration_id
  network_id                = databricks_mws_networks.main.network_id

  token {
    comment = "Terraform provisioning token"
  }
}
```

## Configuring Clusters and Policies

```hcl
# clusters.tf
# Cluster policy to enforce cost controls
resource "databricks_cluster_policy" "standard" {
  name = "Standard Data Engineering Policy"

  definition = jsonencode({
    "spark_version" = {
      type  = "fixed"
      value = "15.4.x-scala2.12"
    }
    "node_type_id" = {
      type     = "allowlist"
      values   = ["i3.xlarge", "i3.2xlarge", "r5d.large", "r5d.xlarge"]
    }
    "autoscale.min_workers" = {
      type  = "range"
      minValue = 1
      maxValue = 2
    }
    "autoscale.max_workers" = {
      type     = "range"
      minValue = 2
      maxValue = 10
    }
    "autotermination_minutes" = {
      type  = "fixed"
      value = 120  # Auto-terminate after 2 hours of inactivity
    }
  })
}

# A shared interactive cluster for data engineers
resource "databricks_cluster" "shared" {
  cluster_name            = "shared-engineering-cluster"
  spark_version           = "15.4.x-scala2.12"
  node_type_id            = "i3.xlarge"
  autotermination_minutes = 120

  policy_id = databricks_cluster_policy.standard.id

  autoscale {
    min_workers = 1
    max_workers = 8
  }
}
```

## Best Practices

- Use VPC injection (customer-managed VPC) for production workspaces to maintain network security policies.
- Configure cluster policies with auto-termination to prevent idle clusters from running indefinitely.
- Use Unity Catalog for centralized data governance across all workspaces.
- Grant workspace access via groups rather than individual users - groups are easier to manage at scale.
- Enable cluster-level logging to S3/ADLS to retain job logs for debugging and compliance.
