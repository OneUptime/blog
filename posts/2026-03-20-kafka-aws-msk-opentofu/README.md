# How to Deploy Kafka on AWS MSK with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, MSK, Kafka, Streaming, Infrastructure as Code, Data Engineering

Description: Learn how to deploy a production-ready Apache Kafka cluster on AWS MSK (Managed Streaming for Apache Kafka) using OpenTofu with proper networking, security, and monitoring.

---

AWS MSK removes the operational burden of running Kafka - no broker management, patching, or ZooKeeper administration. With OpenTofu, you define your MSK cluster configuration as code, enabling consistent deployments across environments and simplifying disaster recovery.

## Networking Setup

MSK runs inside a VPC. Create dedicated subnets in multiple AZs for broker placement.

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Security group for MSK brokers
resource "aws_security_group" "msk" {
  name        = "msk-brokers-sg"
  description = "Security group for MSK broker nodes"
  vpc_id      = var.vpc_id

  # Allow TLS client connections
  ingress {
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = [aws_security_group.msk_client.id]
  }

  # Allow IAM-authenticated client connections
  ingress {
    from_port       = 9098
    to_port         = 9098
    protocol        = "tcp"
    security_groups = [aws_security_group.msk_client.id]
  }

  # Allow TLS ZooKeeper connections for legacy admin tooling on ZooKeeper-based clusters
  ingress {
    from_port       = 2182
    to_port         = 2182
    protocol        = "tcp"
    security_groups = [aws_security_group.msk_client.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security group for Kafka clients
resource "aws_security_group" "msk_client" {
  name        = "msk-client-sg"
  description = "Security group for MSK client applications"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Creating the MSK Cluster

```hcl
# msk.tf
resource "aws_msk_cluster" "main" {
  cluster_name           = var.cluster_name
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3  # One per AZ for high availability

  broker_node_group_info {
    instance_type   = var.broker_instance_type  # kafka.m5.4xlarge or larger if using provisioned throughput below
    client_subnets  = var.private_subnet_ids    # One subnet per broker
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.broker_storage_gb  # GB per broker; 10+ required with provisioned throughput

        # Optional: increase EBS throughput for higher-throughput workloads
        provisioned_throughput {
          enabled           = true
          volume_throughput = 250  # MiB/s
        }
      }
    }
  }

  # Enable TLS encryption for client-broker communication
  client_authentication {
    tls {
      # List of ACM PCA ARNs for mutual TLS
      certificate_authority_arns = var.acm_pca_arns
    }
    sasl {
      iam   = true   # IAM authentication for clients
      scram = false
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"         # Enforce TLS for client connections
      in_cluster    = true          # Encrypt broker-to-broker traffic
    }
    encryption_at_rest_kms_key_arn = var.kms_key_arn
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  # Stream broker logs to CloudWatch Logs
  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }
    }
  }

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }

  tags = var.common_tags
}

# MSK cluster configuration
resource "aws_msk_configuration" "main" {
  name              = "${var.cluster_name}-config"
  kafka_versions    = ["3.6.0"]
  description       = "MSK cluster configuration for ${var.cluster_name}"

  server_properties = <<-PROPERTIES
    auto.create.topics.enable=false
    delete.topic.enable=true
    log.retention.hours=168
    num.partitions=3
    default.replication.factor=3
    min.insync.replicas=2
  PROPERTIES
}

resource "aws_cloudwatch_log_group" "msk" {
  name              = "/msk/${var.cluster_name}"
  retention_in_days = 30
}
```

## Outputs

```hcl
# outputs.tf
output "bootstrap_brokers_tls" {
  description = "TLS-enabled bootstrap broker string for Kafka clients"
  value       = aws_msk_cluster.main.bootstrap_brokers_tls
}

output "bootstrap_brokers_sasl_iam" {
  description = "SASL/IAM bootstrap broker string"
  value       = aws_msk_cluster.main.bootstrap_brokers_sasl_iam
}

output "zookeeper_connect_string_tls" {
  description = "TLS-enabled ZooKeeper connection string for legacy admin tooling"
  value       = aws_msk_cluster.main.zookeeper_connect_string_tls
}
```

## Best Practices

- Use `min.insync.replicas=2` and `replication.factor=3` to ensure data durability even during broker failures.
- Enable IAM authentication - it eliminates the need to manage Kafka user credentials and integrates with AWS IAM policies.
- Disable `auto.create.topics.enable` in production - create topics explicitly to maintain control over partition counts and replication factors.
- Configure automatic storage scaling separately after cluster creation to prevent broker disk full incidents during traffic spikes.
- Deploy brokers across 3 AZs by providing 3 private subnets for high availability.
