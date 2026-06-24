# How to Manage AWS Reserved Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Reserved Instances, Cost Optimization, Infrastructure as Code

Description: Learn how to purchase and manage AWS Reserved Instances with OpenTofu for RDS, ElastiCache, and other services to reduce costs with 1 or 3-year commitments.

Reserved Instances (RIs) and reserved nodes provide discounted pricing for services like RDS, ElastiCache, Redshift, and Amazon OpenSearch Service in exchange for one- or three-year commitments. AWS also offers Savings Plans, including Database Savings Plans for several managed data services, but RDS and ElastiCache still have service-specific RI purchase flows you can manage with OpenTofu.

## RDS Reserved Instances

```hcl
resource "aws_db_instance" "main" {
  identifier        = "production-db"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.r7g.large"
  allocated_storage = 100

  # ... other settings ...
}

# Purchase a reserved instance for the RDS class

resource "aws_rds_reserved_instance" "main" {
  reservation_id           = "production-rds-ri"
  offering_id              = data.aws_rds_reserved_instance_offering.main.offering_id
  instance_count           = 1

  tags = {
    Purpose = "Production RDS cost reduction"
  }
}

data "aws_rds_reserved_instance_offering" "main" {
  db_instance_class   = "db.r7g.large"
  duration            = 31536000  # 1 year in seconds
  multi_az            = false
  offering_type       = "No Upfront"
  product_description = "postgresql"
}
```

## ElastiCache Reserved Nodes

```hcl
data "aws_elasticache_reserved_cache_node_offering" "redis" {
  cache_node_type     = "cache.r7g.large"
  duration            = "P1Y"
  offering_type       = "No Upfront"
  product_description = "redis"
}

resource "aws_elasticache_reserved_cache_node" "redis" {
  reserved_cache_nodes_offering_id = data.aws_elasticache_reserved_cache_node_offering.redis.offering_id
  id                               = "production-redis-ri"
  cache_node_count                 = 2  # 1 primary + 1 replica

  tags = {
    Purpose = "Production Redis cost reduction"
  }
}
```

## OpenSearch Reserved Instances

```hcl
resource "aws_opensearch_domain" "main" {
  domain_name    = "production-search"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type  = "r6g.large.search"
    instance_count = 3
  }
  # ... other settings ...
}
```

Amazon OpenSearch Service supports Reserved Instances, but the AWS provider for OpenTofu documents `aws_opensearch_domain` for domain management and does not expose `aws_opensearch_reserved_instance` purchase resources. Purchase OpenSearch RIs separately with the AWS console, AWS CLI, or an SDK.

## Capacity Reservations for EC2 (Guaranteed Capacity)

```hcl
# On-Demand Capacity Reservation - reserves capacity without a pricing commitment
resource "aws_ec2_capacity_reservation" "app" {
  instance_type     = "r7g.large"
  instance_platform = "Linux/UNIX"
  availability_zone = "us-east-1a"
  instance_count    = 10

  instance_match_criteria = "open"  # Any instance in the AZ can use it
  tenancy                 = "default"

  tags = {
    Purpose = "Reserved capacity for production auto-scaling"
  }
}
```

## Budget Alert for RI Utilization

```hcl
resource "aws_budgets_budget" "ri_utilization" {
  name         = "reserved-instance-utilization"
  budget_type  = "RI_UTILIZATION"
  limit_amount = "100.0"
  limit_unit   = "PERCENTAGE"
  time_unit    = "MONTHLY"

  cost_types {
    include_credit             = false
    include_discount           = false
    include_other_subscription = false
    include_recurring          = false
    include_refund             = false
    include_subscription       = true
    include_support            = false
    include_tax                = false
    include_upfront            = false
    use_blended                = false
  }

  cost_filter {
    name   = "Service"
    values = ["Amazon Relational Database Service"]
  }

  notification {
    comparison_operator        = "LESS_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@example.com"]
  }
}
```

## Conclusion

AWS Reserved Instances in OpenTofu give you cost-optimized database infrastructure. Use the provider-backed RI resources for RDS and ElastiCache, treat EC2 Capacity Reservations as a separate capacity feature, and check each service's matching rules before you buy. RDS and ElastiCache reservations can be size-flexible within supported families, OpenSearch RIs are tied to the exact instance type, and AWS also offers Database Savings Plans for these services. Set budget alerts to catch underutilization before it becomes a cost leak.
