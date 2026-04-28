# How to Create an Elasticsearch/OpenSearch Domain with OpenTofu on AWS (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, OpenSearch, Elasticsearch, Search

Description: Learn how to create an AWS OpenSearch Service domain with fine-grained access control, encryption, and VPC deployment using OpenTofu.

## Introduction

Amazon OpenSearch Service (formerly Elasticsearch Service) is a managed search and analytics service. This guide covers deploying an OpenSearch domain with high availability, encryption, and access control using OpenTofu.

## Step 1: Configure the Provider

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}
```

## Step 2: Create the OpenSearch Domain

```hcl
resource "aws_opensearch_domain" "main" {
  domain_name    = "my-search-domain"
  engine_version = "OpenSearch_2.11"

  # Cluster configuration
  cluster_config {
    instance_type            = "m6g.large.search"
    instance_count           = 3  # Odd number for quorum
    dedicated_master_enabled = true
    dedicated_master_type    = "m6g.large.search"
    dedicated_master_count   = 3
    zone_awareness_enabled   = true

    zone_awareness_config {
      availability_zone_count = 3
    }
  }

  # EBS storage
  ebs_options {
    ebs_enabled = true
    volume_size = 100  # GB per node
    volume_type = "gp3"
    throughput  = 250
    iops        = 3000
  }

  # VPC configuration
  vpc_options {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.opensearch.id]
  }

  # Encryption at rest
  encrypt_at_rest {
    enabled    = true
    kms_key_id = var.kms_key_arn
  }

  # Node-to-node encryption
  node_to_node_encryption {
    enabled = true
  }

  # Domain endpoint options
  domain_endpoint_options {
    enforce_https                   = true
    tls_security_policy             = "Policy-Min-TLS-1-2-2019-07"
    custom_endpoint_enabled         = false
  }

  # Fine-grained access control
  advanced_security_options {
    enabled                        = true
    anonymous_auth_enabled         = false
    internal_user_database_enabled = true

    master_user_options {
      master_user_name     = var.master_username
      master_user_password = var.master_password
    }
  }

  # Auto-tune for performance optimization
  auto_tune_options {
    desired_state       = "ENABLED"
    rollback_on_disable = "NO_ROLLBACK"
  }

  # Snapshot configuration
  snapshot_options {
    automated_snapshot_start_hour = 3
  }

  # Access policy
  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "*" }
      Action    = "es:*"
      Resource  = "arn:aws:es:${var.aws_region}:${data.aws_caller_identity.current.account_id}:domain/my-search-domain/*"
    }]
  })

  tags = {
    Environment = "production"
  }
}

resource "aws_security_group" "opensearch" {
  name   = "opensearch-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }
}
```

## Step 3: Outputs

```hcl
output "opensearch_endpoint" {
  value = aws_opensearch_domain.main.endpoint
}

output "opensearch_dashboard_endpoint" {
  value = aws_opensearch_domain.main.dashboard_endpoint
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully created an AWS OpenSearch domain using OpenTofu with multi-AZ deployment, dedicated master nodes, VPC deployment, encryption at rest and in transit, and fine-grained access control. OpenSearch is ideal for full-text search, log analytics, and real-time data visualization. Use dedicated master nodes for clusters with more than 10 data nodes.
