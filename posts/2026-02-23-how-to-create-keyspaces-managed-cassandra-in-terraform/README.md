# How to Create Keyspaces (Managed Cassandra) in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Keyspaces, Cassandra, NoSQL, Database, Infrastructure as Code

Description: Learn how to create and manage Amazon Keyspaces (managed Apache Cassandra) resources using Terraform for serverless wide-column database workloads.

---

Amazon Keyspaces is a fully managed, serverless Apache Cassandra-compatible database service. It lets you run Cassandra workloads on AWS without managing servers, software, or patching. You use the same Cassandra Query Language (CQL), drivers, and tools that you already use with Cassandra. In this guide, we will cover how to create and configure Keyspaces resources using Terraform.

## Understanding Amazon Keyspaces

Keyspaces is a serverless service, which means you do not provision or manage infrastructure. You create keyspaces and tables, and AWS handles the rest. Keyspaces supports two capacity modes: on-demand, where you pay per read and write request, and provisioned, where you specify the throughput you need and optionally enable auto scaling.

Keyspaces stores data across multiple availability zones automatically, providing built-in high availability. Data is encrypted at rest by default, and you can use AWS-managed keys or your own customer-managed KMS keys.

## Setting Up the Provider

```hcl
# Configure Terraform with the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating a Keyspace

A keyspace in Cassandra is similar to a database in relational systems. It is the top-level container for tables:

```hcl
# Create a keyspace (similar to a database)
resource "aws_keyspaces_keyspace" "app_keyspace" {
  name = "app_data"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Creating Tables with On-Demand Capacity

Tables in Keyspaces are defined with a schema that includes partition keys, clustering columns, and regular columns:

```hcl
# Create a table with on-demand capacity
resource "aws_keyspaces_table" "users" {
  keyspace_name = aws_keyspaces_keyspace.app_keyspace.name
  table_name    = "users"

  # Define the schema
  schema_definition {
    # Partition key column
    column {
      name = "user_id"
      type = "uuid"
    }

    # Clustering column
    column {
      name = "created_at"
      type = "timestamp"
    }

    # Regular columns
    column {
      name = "email"
      type = "text"
    }

    column {
      name = "name"
      type = "text"
    }

    column {
      name = "status"
      type = "text"
    }

    # Define the partition key
    partition_key {
      name = "user_id"
    }

    # Define the clustering key with sort order
    clustering_key {
      name     = "created_at"
      order_by = "DESC"  # Most recent first
    }
  }

  # Use on-demand (pay-per-request) capacity
  capacity_specification {
    throughput_mode = "PAY_PER_REQUEST"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    status = "ENABLED"
  }

  # Enable TTL for automatic data expiration
  ttl {
    status = "ENABLED"
  }

  # Encryption with AWS-managed key
  encryption_specification {
    type = "AWS_OWNED_KMS_KEY"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Creating Tables with Provisioned Capacity

For predictable workloads, provisioned capacity can be more cost-effective:

```hcl
# Create a table with provisioned capacity
resource "aws_keyspaces_table" "events" {
  keyspace_name = aws_keyspaces_keyspace.app_keyspace.name
  table_name    = "events"

  schema_definition {
    column {
      name = "event_type"
      type = "text"
    }

    column {
      name = "event_time"
      type = "timestamp"
    }

    column {
      name = "event_id"
      type = "uuid"
    }

    column {
      name = "payload"
      type = "text"
    }

    # Composite partition key
    partition_key {
      name = "event_type"
    }

    # Composite clustering key
    clustering_key {
      name     = "event_time"
      order_by = "DESC"
    }

    clustering_key {
      name     = "event_id"
      order_by = "ASC"
    }
  }

  # Provisioned capacity mode
  capacity_specification {
    throughput_mode      = "PROVISIONED"
    read_capacity_units  = 100
    write_capacity_units = 50
  }

  point_in_time_recovery {
    status = "ENABLED"
  }

  ttl {
    status = "ENABLED"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Using Customer-Managed KMS Keys

For enhanced control over encryption, use a customer-managed KMS key:

```hcl
# Create a KMS key for Keyspaces encryption
resource "aws_kms_key" "keyspaces_key" {
  description             = "KMS key for Amazon Keyspaces encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Keyspaces to use the key"
        Effect = "Allow"
        Principal = {
          Service = "cassandra.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
          "kms:CreateGrant"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Environment = "production"
  }
}

resource "aws_kms_alias" "keyspaces_key_alias" {
  name          = "alias/keyspaces-encryption"
  target_key_id = aws_kms_key.keyspaces_key.key_id
}

data "aws_caller_identity" "current" {}

# Table with customer-managed encryption
resource "aws_keyspaces_table" "encrypted_table" {
  keyspace_name = aws_keyspaces_keyspace.app_keyspace.name
  table_name    = "sensitive_data"

  schema_definition {
    column {
      name = "record_id"
      type = "uuid"
    }

    column {
      name = "data"
      type = "text"
    }

    partition_key {
      name = "record_id"
    }
  }

  capacity_specification {
    throughput_mode = "PAY_PER_REQUEST"
  }

  # Use customer-managed KMS key
  encryption_specification {
    type    = "CUSTOMER_MANAGED_KMS_KEY"
    kms_key_identifier = aws_kms_key.keyspaces_key.arn
  }

  point_in_time_recovery {
    status = "ENABLED"
  }

  tags = {
    Environment = "production"
    DataClass   = "sensitive"
  }
}
```

## Working with Complex Data Types

Keyspaces supports various Cassandra data types including collections:

```hcl
# Table with complex data types
resource "aws_keyspaces_table" "profiles" {
  keyspace_name = aws_keyspaces_keyspace.app_keyspace.name
  table_name    = "user_profiles"

  schema_definition {
    column {
      name = "user_id"
      type = "uuid"
    }

    column {
      name = "username"
      type = "text"
    }

    column {
      name = "tags"
      type = "list<text>"  # List of text values
    }

    column {
      name = "preferences"
      type = "map<text, text>"  # Key-value pairs
    }

    column {
      name = "scores"
      type = "set<int>"  # Set of integers
    }

    partition_key {
      name = "user_id"
    }
  }

  capacity_specification {
    throughput_mode = "PAY_PER_REQUEST"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Setting Default TTL on Tables

You can set a default time-to-live for all rows in a table:

```hcl
# Table with default TTL
resource "aws_keyspaces_table" "sessions" {
  keyspace_name = aws_keyspaces_keyspace.app_keyspace.name
  table_name    = "sessions"

  schema_definition {
    column {
      name = "session_id"
      type = "uuid"
    }

    column {
      name = "user_id"
      type = "uuid"
    }

    column {
      name = "data"
      type = "text"
    }

    partition_key {
      name = "session_id"
    }
  }

  capacity_specification {
    throughput_mode = "PAY_PER_REQUEST"
  }

  # Enable TTL feature
  ttl {
    status = "ENABLED"
  }

  # Set default TTL to 24 hours (86400 seconds)
  default_time_to_live = 86400

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Creating Multiple Tables with a Module

```hcl
# modules/keyspaces-table/main.tf
variable "keyspace_name" {
  type = string
}

variable "table_name" {
  type = string
}

variable "partition_key_name" {
  type = string
}

variable "partition_key_type" {
  type    = string
  default = "uuid"
}

variable "enable_pitr" {
  type    = bool
  default = true
}

resource "aws_keyspaces_table" "table" {
  keyspace_name = var.keyspace_name
  table_name    = var.table_name

  schema_definition {
    column {
      name = var.partition_key_name
      type = var.partition_key_type
    }

    partition_key {
      name = var.partition_key_name
    }
  }

  capacity_specification {
    throughput_mode = "PAY_PER_REQUEST"
  }

  point_in_time_recovery {
    status = var.enable_pitr ? "ENABLED" : "DISABLED"
  }

  ttl {
    status = "ENABLED"
  }
}
```

## Connecting to Keyspaces

To connect your application to Amazon Keyspaces, you need to use TLS and authenticate with either IAM credentials or service-specific credentials. Here is how to create an IAM policy for Keyspaces access:

```hcl
# IAM policy for Keyspaces access
resource "aws_iam_policy" "keyspaces_access" {
  name        = "keyspaces-access-policy"
  description = "Policy for accessing Amazon Keyspaces"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cassandra:Select",
          "cassandra:Modify",
          "cassandra:Create",
          "cassandra:Drop",
          "cassandra:Alter",
          "cassandra:TagResource",
          "cassandra:UntagResource"
        ]
        Resource = [
          aws_keyspaces_keyspace.app_keyspace.arn,
          "${aws_keyspaces_keyspace.app_keyspace.arn}/*"
        ]
      }
    ]
  })
}
```

## Monitoring Keyspaces

Monitor your Keyspaces tables to understand performance and costs:

```hcl
# CloudWatch alarm for consumed read capacity
resource "aws_cloudwatch_metric_alarm" "keyspaces_reads" {
  alarm_name          = "keyspaces-high-reads"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ConsumedReadCapacityUnits"
  namespace           = "AWS/Cassandra"
  period              = 300
  statistic           = "Sum"
  threshold           = 10000

  dimensions = {
    Keyspace  = aws_keyspaces_keyspace.app_keyspace.name
    TableName = aws_keyspaces_table.users.table_name
  }

  alarm_actions = [aws_sns_topic.keyspaces_alerts.arn]
}

resource "aws_sns_topic" "keyspaces_alerts" {
  name = "keyspaces-alerts"
}
```

For full observability into your Keyspaces workloads, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can help you build monitoring dashboards that track query performance and capacity usage.

## Best Practices

Use on-demand capacity for unpredictable workloads and provisioned capacity with auto scaling for steady workloads. Enable point-in-time recovery on all production tables. Design your partition keys to distribute data evenly and avoid hot partitions. Use TTL to automatically expire data you no longer need. Enable encryption with customer-managed keys for sensitive data. Use IAM authentication instead of service-specific credentials when possible.

## Conclusion

Amazon Keyspaces provides a serverless, fully managed Cassandra experience on AWS. With Terraform, you can define your keyspaces and tables as code, making your infrastructure reproducible and version-controlled. Whether you are migrating from self-managed Cassandra or starting a new project, Keyspaces with Terraform gives you a solid foundation for wide-column database workloads.
