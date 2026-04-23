# How to Handle Resource Timeouts in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Timeout, Infrastructure as Code, DevOps

Description: A guide to configuring resource timeouts in OpenTofu to control how long operations wait before failing.

## Introduction

OpenTofu allows you to configure timeouts for resource operations like create, update, and delete. When a provider-supported operation takes longer than the configured timeout, OpenTofu marks the operation as failed. This helps prevent indefinitely hanging deployments.

## Basic Timeout Configuration

```hcl
resource "aws_db_instance" "main" {
  identifier          = "myapp-db"
  engine              = "postgres"
  instance_class      = "db.t3.medium"
  allocated_storage   = 20
  username            = var.db_username
  password            = var.db_password
  skip_final_snapshot = true

  timeouts {
    create = "60m"  # Wait up to 60 minutes for creation
    update = "30m"  # Wait up to 30 minutes for updates
    delete = "40m"  # Wait up to 40 minutes for deletion
  }
}
```

## Common Resources with Timeouts

```hcl
# EKS cluster can take 15-25 minutes to create

resource "aws_eks_cluster" "main" {
  name     = "my-cluster"
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }

  timeouts {
    create = "30m"
    update = "60m"
    delete = "15m"
  }
}

# RDS cluster creation and deletion can be slow
resource "aws_rds_cluster" "main" {
  cluster_identifier  = "myapp-cluster"
  engine              = "aurora-postgresql"
  engine_version      = "15.17"
  master_username     = var.db_username
  master_password     = var.db_password
  skip_final_snapshot = true

  timeouts {
    create = "120m"
    update = "120m"
    delete = "120m"
  }
}

# ElastiCache can take time to provision
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "myapp-cache"
  description          = "Application cache cluster"
  node_type            = "cache.t3.micro"
  num_cache_clusters   = 2
  parameter_group_name = "default.redis7"

  timeouts {
    create = "60m"
    update = "40m"
    delete = "40m"
  }
}
```

## Time Duration Format

```hcl
# Timeout values use Go duration format:
# - "30s"  - 30 seconds
# - "10m"  - 10 minutes
# - "2h"   - 2 hours
# - "1h30m" - 1 hour 30 minutes
# - "90m"  - 90 minutes

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  timeouts {
    create = "10m"   # Instances usually come up in 2-5 minutes
    delete = "5m"    # Termination is usually fast
  }
}
```

## Kubernetes Resources

```hcl
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "default"
  }

  spec {
    replicas = 3
    selector {
      match_labels = { app = "my-app" }
    }

    template {
      metadata {
        labels = { app = "my-app" }
      }
      spec {
        container {
          name  = "app"
          image = "my-app:latest"
        }
      }
    }
  }

  timeouts {
    create = "5m"   # Wait for all pods to be ready
    update = "5m"
    delete = "5m"
  }
}

resource "kubernetes_persistent_volume_claim" "data" {
  metadata {
    name = "app-data"
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "10Gi"
      }
    }
  }

  timeouts {
    create = "5m"  # Wait for PVC to bind
  }
}
```

## GCP Resources

```hcl
resource "google_container_cluster" "main" {
  name                = "my-cluster"
  location            = var.region
  deletion_protection = false

  initial_node_count = 3

  timeouts {
    create = "40m"
    update = "40m"
    delete = "40m"
  }
}

resource "google_sql_database_instance" "main" {
  name                = "myapp-db"
  database_version    = "POSTGRES_15"
  region              = var.region
  deletion_protection = false

  settings {
    tier = "db-f1-micro"
  }

  timeouts {
    create = "30m"
    update = "30m"
    delete = "30m"
  }
}
```

## What Happens When a Timeout Occurs

```bash
# When a timeout is exceeded, OpenTofu returns an error for the operation
# Example output:
# Error: timeout while waiting for state to become 'ACTIVE'
# (last state: 'CREATING', timeout: 30m0s)

# After a create timeout, the resource may still be creating in the background
# Check whether OpenTofu is already tracking it:
tofu state show aws_db_instance.main

# If the resource is in state and completed successfully, refresh state:
tofu apply -refresh-only

# If the remote object exists but is not in state, import it:
tofu import aws_db_instance.main myapp-db

# If the resource is stuck, manually clean it up in the provider.
# If OpenTofu is tracking an object that should be forgotten, remove it from state:
tofu state rm aws_db_instance.main
```

## Environment-Specific Timeouts

```hcl
variable "environment" {
  type = string
}

locals {
  # Production gets longer timeouts for careful operations
  db_timeouts = var.environment == "prod" ? {
    create = "120m"
    update = "120m"
    delete = "60m"
  } : {
    create = "30m"
    update = "30m"
    delete = "20m"
  }
}

resource "aws_db_instance" "main" {
  identifier          = "myapp-${var.environment}"
  engine              = "postgres"
  instance_class      = var.db_instance_class
  allocated_storage   = var.db_storage
  username            = var.db_username
  password            = var.db_password
  skip_final_snapshot = true

  timeouts {
    create = local.db_timeouts.create
    update = local.db_timeouts.update
    delete = local.db_timeouts.delete
  }
}
```

## Provider-Specific Timeout Support

```hcl
# Note: not all resources support all timeout types
# Check provider documentation for supported operations

# Some resources only support create:
resource "aws_db_snapshot" "manual" {
  db_instance_identifier = aws_db_instance.main.identifier
  db_snapshot_identifier = "myapp-manual-snapshot"

  timeouts {
    create = "40m"  # Manual DB snapshots can take time
    # update and delete are not supported by this resource
  }
}
```

## Conclusion

Resource timeouts are an important safeguard against indefinitely blocking deployments. Configure timeouts based on your experience with the actual time each resource type takes to provision in your environment. Longer timeouts are generally safer but may mask real failures. When a timeout occurs, OpenTofu returns an operation error, and you should investigate the actual state of the resource in your cloud provider before attempting another apply. Not all resources support all timeout types, so consult provider documentation to see which operations can be configured.
