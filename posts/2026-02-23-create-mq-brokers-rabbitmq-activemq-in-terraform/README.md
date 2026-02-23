# How to Create MQ Brokers (RabbitMQ ActiveMQ) in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Amazon MQ, RabbitMQ, ActiveMQ, Messaging, Infrastructure as Code

Description: Learn how to create Amazon MQ brokers for both RabbitMQ and ActiveMQ engines using Terraform, including cluster deployments and configuration management.

---

Amazon MQ is a managed message broker service for Apache ActiveMQ and RabbitMQ. If your applications rely on standard messaging protocols like AMQP, MQTT, OpenWire, or STOMP, Amazon MQ handles the heavy lifting of broker provisioning, patching, and high availability. Managing your brokers through Terraform means you can spin up consistent messaging infrastructure across development, staging, and production environments without manual setup.

This guide covers creating both ActiveMQ and RabbitMQ brokers, configuring high availability, managing users, and setting up proper networking.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI with appropriate permissions
- A VPC with subnets (for production deployments)
- Understanding of message broker concepts

## Provider Setup

```hcl
terraform {
  required_version = ">= 1.0"

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

## Creating a Single-Instance ActiveMQ Broker

A single-instance broker is good for development and testing. It runs on one instance with no failover.

```hcl
# Security group for the ActiveMQ broker
resource "aws_security_group" "activemq" {
  name        = "activemq-broker-sg"
  description = "Security group for Amazon MQ ActiveMQ broker"
  vpc_id      = aws_vpc.main.id

  # OpenWire protocol
  ingress {
    from_port   = 61617
    to_port     = 61617
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "OpenWire SSL"
  }

  # AMQP protocol
  ingress {
    from_port   = 5671
    to_port     = 5671
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "AMQP SSL"
  }

  # STOMP protocol
  ingress {
    from_port   = 61614
    to_port     = 61614
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "STOMP SSL"
  }

  # MQTT protocol
  ingress {
    from_port   = 8883
    to_port     = 8883
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "MQTT SSL"
  }

  # Web console
  ingress {
    from_port   = 8162
    to_port     = 8162
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "ActiveMQ Web Console"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "activemq-broker-sg"
  }
}

# Single-instance ActiveMQ broker
resource "aws_mq_broker" "activemq_single" {
  broker_name = "dev-activemq-broker"

  engine_type        = "ActiveMQ"
  engine_version     = "5.17.6"
  host_instance_type = "mq.m5.large"
  deployment_mode    = "SINGLE_INSTANCE"

  # Authentication
  user {
    username       = "admin"
    password       = var.activemq_admin_password
    console_access = true
    groups         = ["admin"]
  }

  user {
    username = "app-user"
    password = var.activemq_app_password
    groups   = ["app"]
  }

  # Place in a private subnet
  subnet_ids         = [aws_subnet.private[0].id]
  security_groups    = [aws_security_group.activemq.id]
  publicly_accessible = false

  # Enable automatic minor version upgrades
  auto_minor_version_upgrade = true

  # Maintenance window
  maintenance_window_start_time {
    day_of_week = "SUNDAY"
    time_of_day = "03:00"
    time_zone   = "UTC"
  }

  # CloudWatch logging
  logs {
    general = true
    audit   = true
  }

  # Encryption at rest
  encryption_options {
    use_aws_owned_key = false
    kms_key_id        = aws_kms_key.mq.arn
  }

  tags = {
    Environment = "development"
  }
}

# KMS key for encryption at rest
resource "aws_kms_key" "mq" {
  description             = "KMS key for Amazon MQ encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}
```

## Active/Standby ActiveMQ Broker

For production, use an active/standby deployment that provides automatic failover.

```hcl
# Production ActiveMQ broker with active/standby failover
resource "aws_mq_broker" "activemq_ha" {
  broker_name = "prod-activemq-broker"

  engine_type        = "ActiveMQ"
  engine_version     = "5.17.6"
  host_instance_type = "mq.m5.large"
  deployment_mode    = "ACTIVE_STANDBY_MULTI_AZ"

  user {
    username       = "admin"
    password       = var.activemq_admin_password
    console_access = true
    groups         = ["admin"]
  }

  user {
    username = "producer"
    password = var.activemq_producer_password
    groups   = ["producer"]
  }

  user {
    username = "consumer"
    password = var.activemq_consumer_password
    groups   = ["consumer"]
  }

  # Active/standby requires subnets in two AZs
  subnet_ids          = [aws_subnet.private[0].id, aws_subnet.private[1].id]
  security_groups     = [aws_security_group.activemq.id]
  publicly_accessible = false

  auto_minor_version_upgrade = true

  maintenance_window_start_time {
    day_of_week = "SUNDAY"
    time_of_day = "03:00"
    time_zone   = "UTC"
  }

  logs {
    general = true
    audit   = true
  }

  encryption_options {
    use_aws_owned_key = false
    kms_key_id        = aws_kms_key.mq.arn
  }

  tags = {
    Environment = "production"
  }
}
```

## ActiveMQ Configuration

You can customize the ActiveMQ XML configuration through Terraform.

```hcl
# Custom ActiveMQ configuration
resource "aws_mq_configuration" "activemq_config" {
  name           = "activemq-production-config"
  description    = "Production ActiveMQ configuration"
  engine_type    = "ActiveMQ"
  engine_version = "5.17.6"

  data = <<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<broker xmlns="http://activemq.apache.org/schema/core">
  <plugins>
    <forcePersistencyModeBrokerPlugin persistenceFlag="true"/>
    <statisticsBrokerPlugin/>
    <timeStampingBrokerPlugin ttlCeiling="86400000" zeroExpirationOverride="86400000"/>
  </plugins>

  <destinationPolicy>
    <policyMap>
      <policyEntries>
        <policyEntry topic=">">
          <pendingMessageLimitStrategy>
            <constantPendingMessageLimitStrategy limit="1000"/>
          </pendingMessageLimitStrategy>
        </policyEntry>
        <policyEntry queue=">">
          <deadLetterStrategy>
            <individualDeadLetterStrategy queuePrefix="DLQ." useQueueForQueueMessages="true"/>
          </deadLetterStrategy>
        </policyEntry>
      </policyEntries>
    </policyMap>
  </destinationPolicy>
</broker>
XML
}

# Apply the configuration to the broker
resource "aws_mq_broker" "activemq_configured" {
  broker_name = "configured-activemq"

  engine_type        = "ActiveMQ"
  engine_version     = "5.17.6"
  host_instance_type = "mq.m5.large"
  deployment_mode    = "SINGLE_INSTANCE"

  # Reference the custom configuration
  configuration {
    id       = aws_mq_configuration.activemq_config.id
    revision = aws_mq_configuration.activemq_config.latest_revision
  }

  user {
    username       = "admin"
    password       = var.activemq_admin_password
    console_access = true
  }

  subnet_ids          = [aws_subnet.private[0].id]
  security_groups     = [aws_security_group.activemq.id]
  publicly_accessible = false
}
```

## Creating a RabbitMQ Broker

RabbitMQ brokers have a simpler configuration model than ActiveMQ.

```hcl
# Security group for RabbitMQ
resource "aws_security_group" "rabbitmq" {
  name        = "rabbitmq-broker-sg"
  description = "Security group for Amazon MQ RabbitMQ broker"
  vpc_id      = aws_vpc.main.id

  # AMQP protocol
  ingress {
    from_port   = 5671
    to_port     = 5671
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "AMQP SSL"
  }

  # RabbitMQ management UI
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "RabbitMQ Management Console"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rabbitmq-broker-sg"
  }
}

# Single-instance RabbitMQ broker
resource "aws_mq_broker" "rabbitmq_single" {
  broker_name = "dev-rabbitmq-broker"

  engine_type        = "RabbitMQ"
  engine_version     = "3.13"
  host_instance_type = "mq.m5.large"
  deployment_mode    = "SINGLE_INSTANCE"

  user {
    username = "admin"
    password = var.rabbitmq_admin_password
  }

  subnet_ids          = [aws_subnet.private[0].id]
  security_groups     = [aws_security_group.rabbitmq.id]
  publicly_accessible = false

  auto_minor_version_upgrade = true

  maintenance_window_start_time {
    day_of_week = "SATURDAY"
    time_of_day = "04:00"
    time_zone   = "UTC"
  }

  logs {
    general = true
  }

  tags = {
    Environment = "development"
  }
}
```

## RabbitMQ Cluster Deployment

For production RabbitMQ, deploy a cluster across multiple availability zones.

```hcl
# Production RabbitMQ cluster
resource "aws_mq_broker" "rabbitmq_cluster" {
  broker_name = "prod-rabbitmq-cluster"

  engine_type        = "RabbitMQ"
  engine_version     = "3.13"
  host_instance_type = "mq.m5.large"
  deployment_mode    = "CLUSTER_MULTI_AZ"

  user {
    username = "admin"
    password = var.rabbitmq_admin_password
  }

  # Cluster requires subnets in multiple AZs
  subnet_ids          = aws_subnet.private[*].id
  security_groups     = [aws_security_group.rabbitmq.id]
  publicly_accessible = false

  auto_minor_version_upgrade = true

  maintenance_window_start_time {
    day_of_week = "SUNDAY"
    time_of_day = "03:00"
    time_zone   = "UTC"
  }

  logs {
    general = true
  }

  encryption_options {
    use_aws_owned_key = false
    kms_key_id        = aws_kms_key.mq.arn
  }

  tags = {
    Environment = "production"
  }
}
```

## Variables and Outputs

```hcl
# Variables for passwords - use secrets manager in production
variable "activemq_admin_password" {
  type      = string
  sensitive = true
}

variable "activemq_app_password" {
  type      = string
  sensitive = true
}

variable "rabbitmq_admin_password" {
  type      = string
  sensitive = true
}

# Outputs for connecting to the brokers
output "activemq_console_url" {
  value       = aws_mq_broker.activemq_ha.instances[0].console_url
  description = "ActiveMQ web console URL"
}

output "activemq_endpoints" {
  value       = aws_mq_broker.activemq_ha.instances[0].endpoints
  description = "ActiveMQ broker endpoints"
}

output "rabbitmq_console_url" {
  value       = aws_mq_broker.rabbitmq_cluster.instances[0].console_url
  description = "RabbitMQ management console URL"
}

output "rabbitmq_endpoints" {
  value       = aws_mq_broker.rabbitmq_cluster.instances[0].endpoints
  description = "RabbitMQ broker endpoints"
}
```

## Storing Credentials in Secrets Manager

Never hardcode broker passwords. Use AWS Secrets Manager instead.

```hcl
# Generate a random password
resource "random_password" "mq_password" {
  length  = 24
  special = true
}

# Store in Secrets Manager
resource "aws_secretsmanager_secret" "mq_credentials" {
  name        = "amazon-mq/prod-broker/admin"
  description = "Amazon MQ broker admin credentials"
}

resource "aws_secretsmanager_secret_version" "mq_credentials" {
  secret_id = aws_secretsmanager_secret.mq_credentials.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.mq_password.result
  })
}
```

## Best Practices

1. **Choose the right engine.** Use ActiveMQ if you need JMS support, multiple protocols, or virtual destinations. Use RabbitMQ if you need advanced routing, exchange types, or if your team already knows RabbitMQ.

2. **Use multi-AZ for production.** Single-instance brokers have no failover. Always use active/standby (ActiveMQ) or cluster multi-AZ (RabbitMQ) for production workloads.

3. **Size your instances correctly.** Start with mq.m5.large and monitor CPU and memory utilization. Scale up if you see sustained high usage.

4. **Keep brokers private.** Set `publicly_accessible = false` and place brokers in private subnets. Applications should connect through VPC networking.

5. **Enable logging.** CloudWatch logs are essential for troubleshooting connection issues and monitoring broker health.

6. **Rotate credentials.** Store passwords in Secrets Manager and rotate them periodically. Update both the secret and the broker configuration together.

## Conclusion

Amazon MQ with Terraform gives you managed messaging infrastructure that you can deploy consistently across environments. Whether you choose ActiveMQ for its protocol versatility or RabbitMQ for its routing capabilities, Terraform handles the broker lifecycle from creation through configuration updates. The key is to start with the right deployment mode for your environment and build up from there.
