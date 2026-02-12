# How to Create MSK Clusters with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, MSK, Terraform, Kafka

Description: Practical guide to provisioning Amazon MSK (Managed Streaming for Apache Kafka) clusters with Terraform, covering broker configuration, encryption, monitoring, and serverless mode.

---

Amazon MSK (Managed Streaming for Apache Kafka) takes the operational pain out of running Kafka. You get the full Apache Kafka API without managing brokers, ZooKeeper, patching, or cluster scaling. For teams that need reliable event streaming but don't want to become Kafka operations experts, MSK is the way to go.

Setting up MSK involves several components: the cluster itself, networking, security configuration, and monitoring. This guide covers both provisioned clusters (where you pick the instance types) and MSK Serverless (where AWS handles everything).

## Basic MSK Cluster

Let's start with a standard three-broker cluster.

This creates a three-broker MSK cluster across three availability zones:

```hcl
resource "aws_msk_cluster" "main" {
  cluster_name           = "production-kafka"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type = "kafka.m5.large"

    client_subnets = [
      var.private_subnet_ids[0],
      var.private_subnet_ids[1],
      var.private_subnet_ids[2],
    ]

    storage_info {
      ebs_storage_info {
        volume_size = 100  # GB per broker

        provisioned_throughput {
          enabled           = true
          volume_throughput  = 250  # MiB/s
        }
      }
    }

    security_groups = [aws_security_group.msk.id]
  }

  encryption_info {
    encryption_at_rest_kms_key_arn = aws_kms_key.msk.arn

    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }
    }
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_kms_key" "msk" {
  description         = "KMS key for MSK encryption"
  enable_key_rotation = true
}
```

## Kafka Configuration

MSK uses Apache Kafka configuration properties. You create a configuration resource and reference it from your cluster.

This defines the Kafka broker configuration:

```hcl
resource "aws_msk_configuration" "main" {
  kafka_versions = ["3.6.0"]
  name           = "production-kafka-config"

  server_properties = <<-PROPERTIES
    auto.create.topics.enable=false
    default.replication.factor=3
    min.insync.replicas=2
    num.io.threads=8
    num.network.threads=5
    num.partitions=6
    num.replica.fetchers=2
    replica.lag.time.max.ms=30000
    socket.receive.buffer.bytes=102400
    socket.request.max.bytes=104857600
    socket.send.buffer.bytes=102400
    unclean.leader.election.enable=false
    log.retention.hours=168
    log.retention.bytes=-1
  PROPERTIES
}
```

Key configuration choices:

- **`auto.create.topics.enable=false`**: Don't let producers create topics accidentally. Create them explicitly.
- **`default.replication.factor=3`**: Every topic is replicated across all three brokers by default.
- **`min.insync.replicas=2`**: Producers must get acknowledgment from at least 2 replicas for durability.
- **`unclean.leader.election.enable=false`**: Prevents data loss by not allowing out-of-sync replicas to become leaders.

## Security Group

Kafka uses several ports for different protocols. Configure the security group based on your authentication method.

This security group allows both plaintext and TLS Kafka traffic plus ZooKeeper:

```hcl
resource "aws_security_group" "msk" {
  name        = "msk-cluster"
  description = "Security group for MSK cluster"
  vpc_id      = var.vpc_id

  # Kafka TLS listener
  ingress {
    description     = "Kafka TLS"
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  # Kafka SASL/SCRAM listener
  ingress {
    description     = "Kafka SASL/SCRAM"
    from_port       = 9096
    to_port         = 9096
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  # Kafka IAM auth listener
  ingress {
    description     = "Kafka IAM"
    from_port       = 9098
    to_port         = 9098
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  # ZooKeeper
  ingress {
    description     = "ZooKeeper"
    from_port       = 2181
    to_port         = 2181
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "msk-cluster-sg"
  }
}
```

## SASL/SCRAM Authentication

For production, you'll want authentication. SASL/SCRAM with Secrets Manager is one of the cleaner options.

This enables SASL/SCRAM authentication and creates a user credential:

```hcl
resource "aws_msk_cluster" "with_auth" {
  cluster_name           = "secure-kafka"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3

  client_authentication {
    sasl {
      scram = true
    }
  }

  # ... other configuration blocks ...

  broker_node_group_info {
    instance_type   = "kafka.m5.large"
    client_subnets  = var.private_subnet_ids
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = 100
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }
}

# Create a secret for the Kafka user
resource "aws_secretsmanager_secret" "kafka_user" {
  name       = "AmazonMSK_producer_user"  # Must start with "AmazonMSK_"
  kms_key_id = aws_kms_key.msk.arn
}

resource "aws_secretsmanager_secret_version" "kafka_user" {
  secret_id = aws_secretsmanager_secret.kafka_user.id

  secret_string = jsonencode({
    username = "producer"
    password = "strong-password-here"
  })
}

# Associate the secret with the MSK cluster
resource "aws_msk_scram_secret_association" "main" {
  cluster_arn     = aws_msk_cluster.with_auth.arn
  secret_arn_list = [aws_secretsmanager_secret.kafka_user.arn]

  depends_on = [aws_secretsmanager_secret_version.kafka_user]
}
```

## IAM Authentication

IAM authentication is the AWS-native option. It uses IAM policies instead of usernames and passwords.

This enables IAM authentication on the cluster:

```hcl
resource "aws_msk_cluster" "iam_auth" {
  cluster_name           = "iam-kafka"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3

  client_authentication {
    sasl {
      iam = true
    }
  }

  # ... broker and encryption config ...

  broker_node_group_info {
    instance_type   = "kafka.m5.large"
    client_subnets  = var.private_subnet_ids
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = 100
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }
}

# IAM policy for a Kafka producer
resource "aws_iam_policy" "kafka_producer" {
  name = "kafka-producer"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kafka-cluster:Connect",
          "kafka-cluster:DescribeTopic",
          "kafka-cluster:WriteData",
          "kafka-cluster:DescribeGroup"
        ]
        Resource = [
          aws_msk_cluster.iam_auth.arn,
          "${aws_msk_cluster.iam_auth.arn}/*"
        ]
      }
    ]
  })
}
```

## MSK Serverless

If you don't want to manage capacity at all, MSK Serverless scales automatically based on load.

This creates an MSK Serverless cluster:

```hcl
resource "aws_msk_serverless_cluster" "main" {
  cluster_name = "serverless-kafka"

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.msk.id]
  }

  client_authentication {
    sasl {
      iam {
        enabled = true
      }
    }
  }

  tags = {
    Environment = "production"
  }
}
```

MSK Serverless is simpler to set up but only supports IAM authentication and has some throughput limits. It's great for variable workloads where you don't want to over-provision.

## CloudWatch Monitoring

MSK publishes metrics at three levels of detail. Enhanced monitoring gives you per-broker and per-topic metrics.

This enables enhanced monitoring and sets up key alarms:

```hcl
resource "aws_msk_cluster" "monitored" {
  # ... cluster config ...
  cluster_name           = "monitored-kafka"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3

  enhanced_monitoring = "PER_TOPIC_PER_BROKER"

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

  broker_node_group_info {
    instance_type   = "kafka.m5.large"
    client_subnets  = var.private_subnet_ids
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = 100
      }
    }
  }
}

resource "aws_cloudwatch_log_group" "msk" {
  name              = "/msk/production-kafka"
  retention_in_days = 14
}

# Alarm on under-replicated partitions
resource "aws_cloudwatch_metric_alarm" "under_replicated" {
  alarm_name          = "msk-under-replicated-partitions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UnderReplicatedPartitions"
  namespace           = "AWS/Kafka"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Kafka cluster has under-replicated partitions"

  dimensions = {
    "Cluster Name" = aws_msk_cluster.monitored.cluster_name
  }

  alarm_actions = [var.sns_topic_arn]
}

# Alarm on high disk usage
resource "aws_cloudwatch_metric_alarm" "disk_usage" {
  alarm_name          = "msk-high-disk-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "KafkaDataLogsDiskUsed"
  namespace           = "AWS/Kafka"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Kafka broker disk usage above 80%"

  dimensions = {
    "Cluster Name" = aws_msk_cluster.monitored.cluster_name
  }

  alarm_actions = [var.sns_topic_arn]
}
```

For a broader monitoring setup, see our guide on [CloudWatch alarms with Terraform](https://oneuptime.com/blog/post/create-cloudwatch-alarms-terraform/view).

## Outputs

```hcl
output "bootstrap_brokers_tls" {
  value = aws_msk_cluster.main.bootstrap_brokers_tls
}

output "zookeeper_connect_string" {
  value = aws_msk_cluster.main.zookeeper_connect_string
}

output "cluster_arn" {
  value = aws_msk_cluster.main.arn
}
```

## Wrapping Up

MSK clusters in Terraform require careful attention to networking, authentication, and storage configuration. For production, always enable encryption (in-transit and at-rest), use SASL/SCRAM or IAM authentication, and set up monitoring for under-replicated partitions and disk usage. The Kafka configuration properties deserve just as much attention as the infrastructure - settings like `min.insync.replicas` and `replication.factor` directly impact your data durability guarantees.
