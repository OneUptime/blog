# How to Create an Elasticsearch/OpenSearch Domain with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, OpenSearch, Elasticsearch, Search

Description: Learn how to deploy an Amazon OpenSearch Service domain with OpenTofu including encryption, VPC access, fine-grained access control, and automated snapshots.

## Introduction

Amazon OpenSearch Service (formerly Elasticsearch Service) provides managed search and analytics. OpenTofu deploys OpenSearch domains with VPC access, encryption at rest, node-to-node encryption, and fine-grained access control.

## OpenSearch Domain

```hcl
resource "aws_opensearch_domain" "main" {
  domain_name    = var.domain_name
  engine_version = "OpenSearch_2.13"

  cluster_config {
    instance_type          = var.instance_type  # e.g., r6g.large.search
    instance_count         = var.instance_count  # 3 for HA
    dedicated_master_enabled = var.instance_count >= 3 ? true : false
    dedicated_master_type  = "r6g.large.search"
    dedicated_master_count = 3
    zone_awareness_enabled = var.instance_count > 1 ? true : false

    dynamic "zone_awareness_config" {
      for_each = var.instance_count > 1 ? [1] : []
      content {
        availability_zone_count = min(var.instance_count, 3)
      }
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = var.volume_size_gb
    throughput  = 250
    iops        = 3000
  }

  vpc_options {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.opensearch.id]
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = var.kms_key_arn
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    anonymous_auth_enabled         = false
    internal_user_database_enabled = true

    master_user_options {
      master_user_name     = var.master_username
      master_user_password = random_password.opensearch_master.result
    }
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch.arn
    log_type                 = "INDEX_SLOW_LOGS"
    enabled                  = true
  }

  tags = {
    Name        = var.domain_name
    Environment = var.environment
  }
}

resource "random_password" "opensearch_master" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}
```

## Security Group

```hcl
resource "aws_security_group" "opensearch" {
  name   = "${var.domain_name}-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }
}
```

## Outputs

```hcl
output "domain_endpoint"    { value = aws_opensearch_domain.main.endpoint }
output "dashboard_endpoint" { value = aws_opensearch_domain.main.dashboard_endpoint }
output "domain_arn"         { value = aws_opensearch_domain.main.arn }
```

## Conclusion

Deploy OpenSearch with fine-grained access control and VPC isolation from day one. Enable all three encryption settings (at-rest, in-transit, node-to-node) and use dedicated master nodes for clusters with three or more data nodes to ensure stability during heavy indexing.
