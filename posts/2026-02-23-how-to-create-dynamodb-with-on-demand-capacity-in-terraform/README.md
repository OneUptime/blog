# How to Create DynamoDB with On-Demand Capacity in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, DynamoDB, Database, Infrastructure as Code, Serverless

Description: Learn how to create and configure Amazon DynamoDB tables with on-demand capacity mode using Terraform for cost-effective, auto-scaling NoSQL databases.

---

Amazon DynamoDB is one of the most popular NoSQL database services on AWS. When you combine it with Terraform for infrastructure as code, you get a powerful, repeatable way to provision and manage your database resources. One of the most useful features of DynamoDB is on-demand capacity mode, which automatically scales your read and write throughput based on actual traffic patterns. In this guide, we will walk through how to create DynamoDB tables with on-demand capacity using Terraform.

## Understanding On-Demand Capacity Mode

DynamoDB offers two capacity modes: provisioned and on-demand. With provisioned mode, you specify the number of reads and writes per second that your application needs. With on-demand mode, DynamoDB handles capacity management for you. You pay per request instead of pre-provisioning throughput.

On-demand mode is ideal for workloads with unpredictable traffic patterns, new applications where you are still learning your traffic patterns, and applications that have spiky or seasonal usage. The trade-off is that on-demand pricing per request is higher than provisioned capacity, but you eliminate the risk of over-provisioning or throttling.

## Setting Up the Terraform Provider

Before creating any DynamoDB resources, you need to configure the AWS provider in Terraform.

```hcl
# Configure the AWS provider with your preferred region
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"  # Change to your preferred region
}
```

## Creating a Basic DynamoDB Table with On-Demand Capacity

The key to enabling on-demand capacity is setting the `billing_mode` attribute to `PAY_PER_REQUEST`. Here is a basic example:

```hcl
# Create a DynamoDB table with on-demand capacity mode
resource "aws_dynamodb_table" "users_table" {
  name         = "users"
  billing_mode = "PAY_PER_REQUEST"  # This enables on-demand capacity
  hash_key     = "user_id"          # Partition key

  # Define the partition key attribute
  attribute {
    name = "user_id"
    type = "S"  # S = String, N = Number, B = Binary
  }

  # Add tags for resource management
  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

Notice that when using `PAY_PER_REQUEST`, you do not need to specify `read_capacity` or `write_capacity` attributes. DynamoDB manages those automatically.

## Adding a Sort Key

Many DynamoDB use cases require a composite primary key with both a partition key and a sort key. Here is how to add one:

```hcl
# DynamoDB table with composite primary key (partition + sort key)
resource "aws_dynamodb_table" "orders_table" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "customer_id"  # Partition key
  range_key    = "order_date"   # Sort key

  # Define the partition key attribute
  attribute {
    name = "customer_id"
    type = "S"
  }

  # Define the sort key attribute
  attribute {
    name = "order_date"
    type = "S"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Adding Global Secondary Indexes

Global secondary indexes (GSIs) let you query data using different attributes than your primary key. With on-demand capacity, GSIs also scale automatically.

```hcl
# DynamoDB table with a global secondary index
resource "aws_dynamodb_table" "products_table" {
  name         = "products"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "product_id"
  range_key    = "category"

  attribute {
    name = "product_id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "price"
    type = "N"
  }

  # Define a global secondary index for querying by category and price
  global_secondary_index {
    name            = "CategoryPriceIndex"
    hash_key        = "category"
    range_key       = "price"
    projection_type = "ALL"  # Project all attributes into the index
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

With on-demand mode, you do not need to specify `read_capacity` or `write_capacity` on the GSI either. This is a significant advantage since managing GSI capacity separately from the base table is one of the more painful aspects of provisioned mode.

## Adding Local Secondary Indexes

Local secondary indexes (LSIs) share the same partition key as the base table but use a different sort key. They must be defined at table creation time.

```hcl
# DynamoDB table with a local secondary index
resource "aws_dynamodb_table" "events_table" {
  name         = "events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "event_type"
  range_key    = "event_date"

  attribute {
    name = "event_type"
    type = "S"
  }

  attribute {
    name = "event_date"
    type = "S"
  }

  attribute {
    name = "severity"
    type = "N"
  }

  # Local secondary index using the same partition key but different sort key
  local_secondary_index {
    name            = "SeverityIndex"
    range_key       = "severity"
    projection_type = "INCLUDE"
    non_key_attributes = ["message", "source"]
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Using Variables for Reusable Configuration

To make your DynamoDB configuration reusable across environments, use Terraform variables:

```hcl
# variables.tf - Define configurable parameters
variable "environment" {
  description = "The deployment environment"
  type        = string
  default     = "dev"
}

variable "table_name" {
  description = "The name of the DynamoDB table"
  type        = string
}

# main.tf - Use variables in the table definition
resource "aws_dynamodb_table" "app_table" {
  name         = "${var.environment}-${var.table_name}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # Enable server-side encryption with AWS-managed key
  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Table       = var.table_name
  }
}

# outputs.tf - Export useful values
output "table_arn" {
  description = "The ARN of the DynamoDB table"
  value       = aws_dynamodb_table.app_table.arn
}

output "table_name" {
  description = "The name of the DynamoDB table"
  value       = aws_dynamodb_table.app_table.name
}
```

## Enabling Time to Live (TTL)

TTL allows DynamoDB to automatically delete expired items, which helps manage storage costs:

```hcl
# DynamoDB table with TTL enabled
resource "aws_dynamodb_table" "sessions_table" {
  name         = "sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  # Enable TTL on the 'expires_at' attribute
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Switching Between Capacity Modes

If you start with on-demand and later want to switch to provisioned capacity (or vice versa), you can change the `billing_mode` attribute:

```hcl
# To switch from on-demand to provisioned, update billing_mode and add capacity
resource "aws_dynamodb_table" "switchable_table" {
  name         = "switchable"
  billing_mode = "PROVISIONED"  # Changed from PAY_PER_REQUEST
  hash_key     = "id"

  read_capacity  = 10  # Required when using PROVISIONED mode
  write_capacity = 5   # Required when using PROVISIONED mode

  attribute {
    name = "id"
    type = "S"
  }
}
```

Keep in mind that AWS limits how frequently you can switch between capacity modes. You can switch from provisioned to on-demand once per day, and from on-demand to provisioned at any time.

## Monitoring Your On-Demand Tables

Even though on-demand tables scale automatically, you should still monitor them. Consider setting up CloudWatch alarms with Terraform to track consumed read and write capacity units, throttled requests, and system errors. Tools like [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can help you build comprehensive monitoring dashboards for your DynamoDB tables.

## Best Practices

When using DynamoDB with on-demand capacity in Terraform, keep these practices in mind. First, always use on-demand mode for unpredictable workloads and switch to provisioned mode with auto-scaling once you understand your traffic patterns. Second, design your partition keys carefully to avoid hot partitions, since on-demand mode does not protect against poor key design. Third, use Terraform workspaces or variable files to manage different environments. Fourth, enable encryption and point-in-time recovery for production tables.

## Conclusion

Creating DynamoDB tables with on-demand capacity in Terraform is straightforward. By setting `billing_mode` to `PAY_PER_REQUEST`, you let AWS handle all capacity management while you focus on your application logic. Combined with Terraform's infrastructure as code approach, you get a reliable, version-controlled way to manage your DynamoDB resources across environments. Start with on-demand capacity for new projects and optimize later as your traffic patterns become clear.
