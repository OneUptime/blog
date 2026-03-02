# How to Configure MongoDB Atlas Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, MongoDB Atlas, Database, Infrastructure as Code

Description: Learn how to configure the MongoDB Atlas provider in Terraform to manage clusters, database users, network access, and backup policies as code.

---

MongoDB Atlas is the managed database service for MongoDB, and managing it through Terraform makes sense when your clusters are part of a larger infrastructure setup. Instead of clicking through the Atlas web console to create clusters, configure users, and set up network peering, you define everything in code. This means your database infrastructure is version-controlled, reproducible, and consistent across environments.

The MongoDB Atlas Terraform provider covers cluster management, database users, network access, backup configuration, and more. This guide walks through the setup and common use cases.

## Prerequisites

- Terraform 1.0 or later
- A MongoDB Atlas account
- An Atlas organization with a project (or the ability to create one)
- An Atlas API key pair (public and private key)

## Creating API Keys

1. Log in to MongoDB Atlas
2. Go to Organization Settings > Access Manager > API Keys
3. Click Create API Key
4. Assign the appropriate role (Organization Project Creator for full access)
5. Save both the Public Key and Private Key
6. Whitelist the IP address where Terraform will run

## Declaring the Provider

```hcl
# versions.tf - Declare the MongoDB Atlas provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.15"
    }
  }
}
```

## Provider Configuration

```hcl
# provider.tf - Configure with API keys
provider "mongodbatlas" {
  public_key  = var.atlas_public_key
  private_key = var.atlas_private_key
}

variable "atlas_public_key" {
  type        = string
  description = "MongoDB Atlas API public key"
}

variable "atlas_private_key" {
  type        = string
  sensitive   = true
  description = "MongoDB Atlas API private key"
}
```

### Environment Variables

```bash
# Set credentials via environment variables
export MONGODB_ATLAS_PUBLIC_KEY="your-public-key"
export MONGODB_ATLAS_PRIVATE_KEY="your-private-key"
```

```hcl
# Provider picks up credentials from environment variables
provider "mongodbatlas" {}
```

## Project Management

```hcl
# Create a project in your organization
resource "mongodbatlas_project" "app" {
  name   = "my-application"
  org_id = var.atlas_org_id

  # Optional: set limits
  limits {
    name  = "atlas.project.deployment.clusters"
    value = 5
  }
}

variable "atlas_org_id" {
  type        = string
  description = "MongoDB Atlas organization ID"
}
```

## Cluster Management

### Shared Tier (Free/Shared)

```hcl
# Create a free tier cluster (M0)
resource "mongodbatlas_cluster" "free" {
  project_id = mongodbatlas_project.app.id
  name       = "dev-cluster"

  # Free tier configuration
  provider_name               = "TENANT"
  backing_provider_name       = "AWS"
  provider_region_name        = "US_EAST_1"
  provider_instance_size_name = "M0"
}
```

### Dedicated Cluster

```hcl
# Create a dedicated cluster
resource "mongodbatlas_cluster" "production" {
  project_id = mongodbatlas_project.app.id
  name       = "production"

  # Cluster tier
  provider_name               = "AWS"
  provider_region_name        = "US_EAST_1"
  provider_instance_size_name = "M30"

  # Disk configuration
  disk_size_gb                = 100
  auto_scaling_disk_gb_enabled = true

  # Replication configuration
  replication_specs {
    num_shards = 1

    regions_config {
      region_name     = "US_EAST_1"
      electable_nodes = 3
      priority        = 7
      read_only_nodes = 0
    }
  }

  # MongoDB version
  mongo_db_major_version = "7.0"

  # Backup
  cloud_backup = true

  # Auto-scaling
  auto_scaling_compute_enabled                    = true
  auto_scaling_compute_scale_down_enabled         = true

  # Maintenance window
  advanced_configuration {
    javascript_enabled           = false
    minimum_enabled_tls_protocol = "TLS1_2"
    no_table_scan                = false
  }
}
```

### Multi-Region Cluster

```hcl
# Create a multi-region cluster for high availability
resource "mongodbatlas_cluster" "global" {
  project_id = mongodbatlas_project.app.id
  name       = "global-cluster"

  provider_name               = "AWS"
  provider_instance_size_name = "M30"

  cluster_type = "REPLICASET"

  replication_specs {
    num_shards = 1

    # Primary region
    regions_config {
      region_name     = "US_EAST_1"
      electable_nodes = 3
      priority        = 7
      read_only_nodes = 0
    }

    # Read replica in EU
    regions_config {
      region_name     = "EU_WEST_1"
      electable_nodes = 2
      priority        = 6
      read_only_nodes = 1
    }

    # Read replica in APAC
    regions_config {
      region_name     = "AP_SOUTHEAST_1"
      electable_nodes = 0
      priority        = 0
      read_only_nodes = 1
    }
  }

  cloud_backup = true
}
```

## Database Users

```hcl
# Create a database user with password authentication
resource "mongodbatlas_database_user" "app" {
  project_id         = mongodbatlas_project.app.id
  auth_database_name = "admin"
  username           = "app-user"
  password           = var.db_password

  roles {
    role_name     = "readWrite"
    database_name = "myapp"
  }

  roles {
    role_name     = "read"
    database_name = "analytics"
  }

  scopes {
    name = mongodbatlas_cluster.production.name
    type = "CLUSTER"
  }
}

# Create an admin user
resource "mongodbatlas_database_user" "admin" {
  project_id         = mongodbatlas_project.app.id
  auth_database_name = "admin"
  username           = "dba-admin"
  password           = var.admin_password

  roles {
    role_name     = "atlasAdmin"
    database_name = "admin"
  }
}

# Create a user with AWS IAM authentication
resource "mongodbatlas_database_user" "iam_user" {
  project_id         = mongodbatlas_project.app.id
  auth_database_name = "$external"
  username           = var.aws_iam_role_arn

  aws_iam_type = "ROLE"

  roles {
    role_name     = "readWrite"
    database_name = "myapp"
  }
}
```

## Network Access

### IP Whitelist

```hcl
# Allow access from a specific IP
resource "mongodbatlas_project_ip_access_list" "office" {
  project_id = mongodbatlas_project.app.id
  ip_address = var.office_ip
  comment    = "Office network"
}

# Allow access from a CIDR block
resource "mongodbatlas_project_ip_access_list" "vpc" {
  project_id = mongodbatlas_project.app.id
  cidr_block = "10.0.0.0/16"
  comment    = "Application VPC"
}

# Allow access from anywhere (development only)
resource "mongodbatlas_project_ip_access_list" "allow_all" {
  project_id = mongodbatlas_project.app.id
  cidr_block = "0.0.0.0/0"
  comment    = "Allow all - development only"
}
```

### VPC Peering (AWS)

```hcl
# Set up VPC peering with AWS
resource "mongodbatlas_network_peering" "aws" {
  project_id             = mongodbatlas_project.app.id
  container_id           = mongodbatlas_cluster.production.container_id
  provider_name          = "AWS"
  accepter_region_name   = "us-east-1"
  aws_account_id         = var.aws_account_id
  vpc_id                 = var.aws_vpc_id
  route_table_cidr_block = var.aws_vpc_cidr
}

# Accept the peering connection on the AWS side
resource "aws_vpc_peering_connection_accepter" "atlas" {
  vpc_peering_connection_id = mongodbatlas_network_peering.aws.connection_id
  auto_accept               = true
}
```

### Private Endpoints (AWS)

```hcl
# Create a private endpoint for Atlas
resource "mongodbatlas_privatelink_endpoint" "aws" {
  project_id    = mongodbatlas_project.app.id
  provider_name = "AWS"
  region        = "us-east-1"
}

# Create the AWS VPC endpoint
resource "aws_vpc_endpoint" "atlas" {
  vpc_id             = var.aws_vpc_id
  service_name       = mongodbatlas_privatelink_endpoint.aws.endpoint_service_name
  vpc_endpoint_type  = "Interface"
  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.atlas_endpoint.id]
}

# Register the endpoint with Atlas
resource "mongodbatlas_privatelink_endpoint_service" "aws" {
  project_id          = mongodbatlas_project.app.id
  private_link_id     = mongodbatlas_privatelink_endpoint.aws.private_link_id
  endpoint_service_id = aws_vpc_endpoint.atlas.id
  provider_name       = "AWS"
}
```

## Backup Configuration

```hcl
# Configure a backup schedule
resource "mongodbatlas_cloud_backup_schedule" "production" {
  project_id   = mongodbatlas_project.app.id
  cluster_name = mongodbatlas_cluster.production.name

  reference_hour_of_day    = 3   # 3 AM UTC
  reference_minute_of_hour = 0

  # Hourly snapshots
  policy_item_hourly {
    frequency_interval = 6  # Every 6 hours
    retention_unit     = "days"
    retention_value    = 7
  }

  # Daily snapshots
  policy_item_daily {
    frequency_interval = 1
    retention_unit     = "days"
    retention_value    = 30
  }

  # Weekly snapshots
  policy_item_weekly {
    frequency_interval = 1  # Sunday
    retention_unit     = "weeks"
    retention_value    = 12
  }

  # Monthly snapshots
  policy_item_monthly {
    frequency_interval = 1  # First day
    retention_unit     = "months"
    retention_value    = 12
  }
}
```

## Alerts

```hcl
# Create an alert for high CPU usage
resource "mongodbatlas_alert_configuration" "high_cpu" {
  project_id = mongodbatlas_project.app.id
  event_type = "OUTSIDE_METRIC_THRESHOLD"
  enabled    = true

  metric_threshold_config {
    metric_name = "NORMALIZED_SYSTEM_CPU_USER"
    operator    = "GREATER_THAN"
    threshold   = 80
    units       = "RAW"
    mode        = "AVERAGE"
  }

  notification {
    type_name     = "EMAIL"
    email_address = "ops@example.com"
    interval_min  = 15
    delay_min     = 5
  }
}
```

## Outputs

```hcl
# Connection string outputs
output "connection_string" {
  value     = mongodbatlas_cluster.production.connection_strings[0].standard_srv
  sensitive = true
}

output "cluster_state" {
  value = mongodbatlas_cluster.production.state_name
}
```

## Best Practices

1. Use environment variables for API keys in CI/CD pipelines.

2. Always configure IP access lists. Do not leave clusters accessible from `0.0.0.0/0` in production.

3. Use VPC peering or private endpoints for production workloads. This keeps traffic off the public internet.

4. Set up backup schedules through Terraform to ensure they are consistent across clusters.

5. Use database user scopes to restrict which clusters a user can access.

6. Enable auto-scaling for both compute and storage to handle traffic spikes.

## Wrapping Up

The MongoDB Atlas Terraform provider makes it straightforward to manage your database infrastructure as code. From cluster provisioning and user management to network configuration and backup policies, everything can be defined, reviewed, and version-controlled. This is especially valuable in environments where database changes need the same rigor as application deployments.

For monitoring your MongoDB Atlas clusters alongside your application infrastructure, [OneUptime](https://oneuptime.com) provides unified observability with database-aware monitoring and alerting.
