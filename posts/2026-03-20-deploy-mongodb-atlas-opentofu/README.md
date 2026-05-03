# How to Deploy MongoDB Atlas with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, MongoDB, Atlas, Database, Infrastructure as Code, NoSQL

Description: Learn how to deploy MongoDB Atlas clusters using OpenTofu - including project setup, cluster configuration, network peering, and database user management.

## Introduction

MongoDB Atlas has a Terraform/OpenTofu provider (`mongodb/mongodbatlas`) that manages Atlas projects, clusters, network peering, and users. This enables managing MongoDB as code with the same workflows as your other infrastructure.

## Provider Configuration

```hcl
terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.0"
    }
  }
}

provider "mongodbatlas" {
  # Authenticate via environment variables:
  # MONGODB_ATLAS_PUBLIC_KEY and MONGODB_ATLAS_PRIVATE_KEY
  # Or explicitly:
  # public_key  = var.atlas_public_key
  # private_key = var.atlas_private_key
}
```

## Atlas Project

```hcl
resource "mongodbatlas_project" "main" {
  name   = "${var.environment}-${var.project_name}"
  org_id = var.atlas_org_id

  # Enable advanced security features
  is_collect_database_specifics_statistics_enabled = true
  is_data_explorer_enabled                         = true
  is_performance_advisor_enabled                   = true
  is_realtime_performance_panel_enabled            = true
  is_schema_advisor_enabled                        = true
}
```

## Atlas Cluster

```hcl
resource "mongodbatlas_advanced_cluster" "main" {
  project_id   = mongodbatlas_project.main.id
  name         = "${var.environment}-cluster"
  cluster_type = "REPLICASET"

  replication_specs {
    num_shards = 1

    region_configs {
      electable_specs {
        instance_size = var.environment == "prod" ? "M30" : "M10"
        node_count    = 3  # 3-node replica set
      }

      analytics_specs {
        instance_size = "M10"
        node_count    = var.environment == "prod" ? 1 : 0
      }

      provider_name = "AWS"
      priority      = 7
      region_name   = upper(replace(var.aws_region, "-", "_"))  # "US_EAST_1"
    }
  }

  # Cloud backup
  backup_enabled = true

  # Encryption at rest
  encryption_at_rest_provider = "AWS"

  # Auto-scaling
  advanced_configuration {
    javascript_enabled                   = false
    minimum_enabled_tls_protocol         = "TLS1_2"
    no_table_scan                        = false
    oplog_min_retention_hours            = 24
    sample_size_bi_connector             = 5000
    sample_refresh_interval_bi_connector = 300
  }

  tags {
    key   = "Environment"
    value = var.environment
  }
}
```

## Network Peering (AWS VPC)

```hcl
# Atlas side: create peering request

resource "mongodbatlas_network_peering" "aws" {
  project_id             = mongodbatlas_project.main.id
  container_id           = one(values(mongodbatlas_advanced_cluster.main.replication_specs[0].container_id))
  accepter_region_name   = var.aws_region
  aws_account_id         = var.aws_account_id
  route_table_cidr_block = var.vpc_cidr
  vpc_id                 = aws_vpc.main.id
  provider_name          = "AWS"
  atlas_cidr_block       = "192.168.0.0/21"
}

# AWS side: accept the peering connection
resource "aws_vpc_peering_connection_accepter" "atlas" {
  vpc_peering_connection_id = mongodbatlas_network_peering.aws.connection_id
  auto_accept               = true

  tags = { Name = "atlas-vpc-peering" }
}

# Add route to Atlas in route table
resource "aws_route" "to_atlas" {
  route_table_id            = aws_route_table.private.id
  destination_cidr_block    = mongodbatlas_network_peering.aws.atlas_cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection_accepter.atlas.id
}
```

## Database User

```hcl
# Password-based user
resource "mongodbatlas_database_user" "app" {
  project_id         = mongodbatlas_project.main.id
  username           = "${var.environment}-app-user"
  password           = var.mongodb_password
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = var.db_name
  }

  scopes {
    name = mongodbatlas_advanced_cluster.main.name
    type = "CLUSTER"
  }
}

# AWS IAM-based user (no password needed)
resource "mongodbatlas_database_user" "iam_user" {
  project_id         = mongodbatlas_project.main.id
  username           = "arn:aws:iam::${var.aws_account_id}:role/${var.app_role_name}"
  auth_database_name = "$external"
  aws_iam_type       = "ROLE"

  roles {
    role_name     = "readWrite"
    database_name = var.db_name
  }
}
```

## IP Access List

```hcl
# Allow VPC CIDR (after peering)
resource "mongodbatlas_project_ip_access_list" "vpc" {
  project_id = mongodbatlas_project.main.id
  cidr_block = var.vpc_cidr
  comment    = "Application VPC CIDR"
}
```

## Outputs

```hcl
output "connection_string" {
  sensitive = true
  value     = mongodbatlas_advanced_cluster.main.connection_strings[0].standard_srv
}

output "cluster_id" {
  value = mongodbatlas_advanced_cluster.main.cluster_id
}
```

## Conclusion

MongoDB Atlas OpenTofu provider manages the full Atlas lifecycle: projects, clusters, network peering with AWS VPCs, and database users. Use VPC peering for production deployments - traffic stays within AWS's network without traversing the public internet. Prefer AWS IAM-based authentication over password users when your applications run on EC2, ECS, or Lambda with IAM roles. Enable cloud backup and encryption at rest for production clusters.
