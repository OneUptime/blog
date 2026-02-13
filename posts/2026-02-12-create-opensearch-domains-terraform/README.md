# How to Create OpenSearch Domains with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Terraform, Search

Description: Complete guide to provisioning AWS OpenSearch Service domains with Terraform, covering cluster sizing, VPC deployment, access policies, and fine-grained access control.

---

Amazon OpenSearch Service (the successor to Elasticsearch Service) gives you a managed search and analytics engine. It handles cluster provisioning, patching, backups, and monitoring. You get a cluster running OpenSearch or Elasticsearch without managing any of the operational overhead.

Setting up an OpenSearch domain involves a lot of configuration decisions: instance types, storage, networking, access control, and encryption. Terraform lets you codify all of these decisions, making it easy to reproduce clusters across environments and review configuration changes before they're applied.

## Basic OpenSearch Domain

Let's start with a development-sized cluster and build up to production.

This creates a single-node OpenSearch domain suitable for development or testing:

```hcl
resource "aws_opensearch_domain" "dev" {
  domain_name    = "dev-search"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type  = "t3.small.search"
    instance_count = 1
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 20  # GB
    iops        = 3000
    throughput   = 125
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  tags = {
    Environment = "development"
    ManagedBy   = "terraform"
  }
}
```

## Production Domain with Multi-AZ

Production clusters need multiple nodes across availability zones, dedicated master nodes, and proper storage sizing.

This creates a production-grade OpenSearch cluster with dedicated master nodes and multi-AZ deployment:

```hcl
resource "aws_opensearch_domain" "production" {
  domain_name    = "production-search"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type            = "r6g.large.search"
    instance_count           = 4  # Data nodes (must be even for 2 AZs)
    zone_awareness_enabled   = true
    dedicated_master_enabled = true
    dedicated_master_type    = "m6g.large.search"
    dedicated_master_count   = 3

    zone_awareness_config {
      availability_zone_count = 2
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 100
    iops        = 3000
    throughput  = 125
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.opensearch.arn
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  auto_tune_options {
    desired_state       = "ENABLED"
    rollback_on_disable = "NO_ROLLBACK"

    maintenance_schedule {
      start_at = "2026-03-01T00:00:00Z"
      duration {
        value = 2
        unit  = "HOURS"
      }
      cron_expression_for_recurrence = "cron(0 0 ? * SUN *)"
    }
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_kms_key" "opensearch" {
  description = "KMS key for OpenSearch encryption"
  enable_key_rotation = true
}
```

Key sizing decisions:

- **Data nodes**: Use `r6g` instances for memory-heavy workloads (the most common case). Instance count should be a multiple of the AZ count.
- **Dedicated master nodes**: Always use 3 in production. They manage cluster state and don't handle search traffic.
- **Storage**: Size based on your data volume plus headroom. OpenSearch recommends keeping disk usage under 80%.

## VPC Deployment

For production, deploy OpenSearch inside your VPC to keep it off the public internet.

This deploys the OpenSearch domain within your VPC with appropriate security groups:

```hcl
resource "aws_opensearch_domain" "vpc" {
  domain_name    = "production-search"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type          = "r6g.large.search"
    instance_count         = 4
    zone_awareness_enabled = true

    zone_awareness_config {
      availability_zone_count = 2
    }

    dedicated_master_enabled = true
    dedicated_master_type    = "m6g.large.search"
    dedicated_master_count   = 3
  }

  vpc_options {
    subnet_ids = [
      var.private_subnet_ids[0],
      var.private_subnet_ids[1]
    ]
    security_group_ids = [aws_security_group.opensearch.id]
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 100
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  tags = {
    Environment = "production"
  }
}

resource "aws_security_group" "opensearch" {
  name        = "opensearch-cluster"
  description = "Security group for OpenSearch domain"
  vpc_id      = var.vpc_id

  ingress {
    description     = "HTTPS from application"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  tags = {
    Name = "opensearch-sg"
  }
}
```

Note: When deploying in a VPC, you also need a service-linked role. Terraform can create it:

```hcl
resource "aws_iam_service_linked_role" "opensearch" {
  aws_service_name = "opensearchservice.amazonaws.com"
}
```

## Access Policies

Access policies control who can interact with the OpenSearch API. For VPC domains, you typically use IAM-based policies.

This access policy allows specific IAM roles to access the domain:

```hcl
resource "aws_opensearch_domain_policy" "main" {
  domain_name = aws_opensearch_domain.vpc.domain_name

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = [
            aws_iam_role.app.arn,
            aws_iam_role.admin.arn
          ]
        }
        Action   = "es:*"
        Resource = "${aws_opensearch_domain.vpc.arn}/*"
      }
    ]
  })
}
```

## Fine-Grained Access Control

For more granular control (document-level, field-level security), enable fine-grained access control with an internal user database or SAML.

This enables fine-grained access control with an internal master user:

```hcl
resource "aws_opensearch_domain" "fgac" {
  domain_name    = "secure-search"
  engine_version = "OpenSearch_2.11"

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true

    master_user_options {
      master_user_name     = "admin"
      master_user_password = var.opensearch_master_password
    }
  }

  cluster_config {
    instance_type  = "r6g.large.search"
    instance_count = 2
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 50
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }
}

variable "opensearch_master_password" {
  type      = string
  sensitive = true
}
```

## Snapshot Configuration

OpenSearch takes automated snapshots daily. You can also configure manual snapshot repositories.

This configures the automated snapshot timing:

```hcl
resource "aws_opensearch_domain" "with_snapshots" {
  # ... other configuration ...

  domain_name    = "production-search"
  engine_version = "OpenSearch_2.11"

  snapshot_options {
    automated_snapshot_start_hour = 3  # 3 AM UTC
  }

  cluster_config {
    instance_type  = "r6g.large.search"
    instance_count = 2
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 50
  }
}
```

## CloudWatch Alarms

Monitor your OpenSearch cluster's health and performance.

These alarms cover the most critical OpenSearch metrics:

```hcl
# Cluster status alarm
resource "aws_cloudwatch_metric_alarm" "cluster_status_red" {
  alarm_name          = "opensearch-cluster-red"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ClusterStatus.red"
  namespace           = "AWS/ES"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "OpenSearch cluster status is RED"

  dimensions = {
    DomainName = aws_opensearch_domain.production.domain_name
    ClientId   = data.aws_caller_identity.current.account_id
  }

  alarm_actions = [var.sns_topic_arn]
}

# Free storage space alarm
resource "aws_cloudwatch_metric_alarm" "low_storage" {
  alarm_name          = "opensearch-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/ES"
  period              = 300
  statistic           = "Minimum"
  threshold           = 10000  # 10 GB in MB
  alarm_description   = "OpenSearch free storage below 10 GB"

  dimensions = {
    DomainName = aws_opensearch_domain.production.domain_name
    ClientId   = data.aws_caller_identity.current.account_id
  }

  alarm_actions = [var.sns_topic_arn]
}

# JVM memory pressure
resource "aws_cloudwatch_metric_alarm" "jvm_memory" {
  alarm_name          = "opensearch-jvm-memory-pressure"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "JVMMemoryPressure"
  namespace           = "AWS/ES"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "OpenSearch JVM memory pressure above 80%"

  dimensions = {
    DomainName = aws_opensearch_domain.production.domain_name
    ClientId   = data.aws_caller_identity.current.account_id
  }

  alarm_actions = [var.sns_topic_arn]
}
```

For more on setting up CloudWatch monitoring, see our guide on [CloudWatch alarms with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-cloudwatch-alarms-terraform/view).

## Outputs

```hcl
output "opensearch_endpoint" {
  value = aws_opensearch_domain.production.endpoint
}

output "opensearch_dashboard_endpoint" {
  value = aws_opensearch_domain.production.dashboard_endpoint
}

output "opensearch_arn" {
  value = aws_opensearch_domain.production.arn
}
```

## Wrapping Up

OpenSearch domains require careful sizing and security configuration. For production, always deploy in a VPC with multi-AZ, dedicated master nodes, and encryption enabled. The auto-tune feature handles ongoing performance optimization. Start with conservative instance sizes and scale up based on the CloudWatch metrics - JVM memory pressure and CPU utilization are your primary indicators. The Terraform configurations in this guide provide a solid foundation for both development and production clusters.
