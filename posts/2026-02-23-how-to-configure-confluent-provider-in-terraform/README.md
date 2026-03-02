# How to Configure Confluent Provider in Terraform (Kafka)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Confluent, Kafka, Event Streaming, Infrastructure as Code

Description: Learn how to configure the Confluent provider in Terraform to manage Kafka clusters, topics, schemas, connectors, and access control on Confluent Cloud.

---

Apache Kafka has become the backbone of event-driven architectures, and Confluent Cloud is one of the most popular managed Kafka services. As your streaming platform grows with more topics, schemas, connectors, and consumers, managing everything through the Confluent Cloud console becomes a bottleneck. The Confluent Terraform provider lets you define your entire event streaming infrastructure as code.

This guide covers setting up the provider, creating Kafka clusters, managing topics, configuring Schema Registry, setting up connectors, and handling access control.

## Prerequisites

- Terraform 1.0 or later
- A Confluent Cloud account
- A Cloud API key with OrganizationAdmin or EnvironmentAdmin role

## Getting Your Cloud API Key

1. Log in to Confluent Cloud
2. Go to the hamburger menu and select Cloud API keys (under Administration)
3. Click Add key
4. Select the appropriate scope (Global access or granular access)
5. Copy the API key and secret

## Declaring the Provider

```hcl
# versions.tf - Declare the Confluent provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    confluent = {
      source  = "confluentinc/confluent"
      version = "~> 1.70"
    }
  }
}
```

## Provider Configuration

```hcl
# provider.tf - Configure with Cloud API key
provider "confluent" {
  cloud_api_key    = var.confluent_cloud_api_key
  cloud_api_secret = var.confluent_cloud_api_secret
}

variable "confluent_cloud_api_key" {
  type        = string
  description = "Confluent Cloud API key"
}

variable "confluent_cloud_api_secret" {
  type        = string
  sensitive   = true
  description = "Confluent Cloud API secret"
}
```

### Environment Variables

```bash
# Set Confluent credentials via environment variables
export CONFLUENT_CLOUD_API_KEY="your-api-key"
export CONFLUENT_CLOUD_API_SECRET="your-api-secret"
```

```hcl
# Provider picks up credentials from environment variables
provider "confluent" {}
```

## Environment Management

Confluent environments are logical groupings for your clusters and resources.

```hcl
# Create an environment
resource "confluent_environment" "production" {
  display_name = "Production"
}

resource "confluent_environment" "staging" {
  display_name = "Staging"
}
```

## Kafka Cluster Management

### Basic Cluster

```hcl
# Create a basic Kafka cluster
resource "confluent_kafka_cluster" "production" {
  display_name = "production-cluster"
  availability = "MULTI_ZONE"
  cloud        = "AWS"
  region       = "us-east-1"

  basic {}

  environment {
    id = confluent_environment.production.id
  }
}
```

### Standard Cluster

```hcl
# Create a standard cluster with more features
resource "confluent_kafka_cluster" "standard" {
  display_name = "standard-cluster"
  availability = "MULTI_ZONE"
  cloud        = "AWS"
  region       = "us-east-1"

  standard {}

  environment {
    id = confluent_environment.production.id
  }
}
```

### Dedicated Cluster

```hcl
# Create a dedicated cluster for high-throughput workloads
resource "confluent_kafka_cluster" "dedicated" {
  display_name = "dedicated-cluster"
  availability = "MULTI_ZONE"
  cloud        = "AWS"
  region       = "us-east-1"

  dedicated {
    cku = 2  # Confluent Kafka Units
  }

  environment {
    id = confluent_environment.production.id
  }
}
```

## Service Accounts and API Keys

Before creating topics, you need service accounts and API keys for authentication.

```hcl
# Create a service account for an application
resource "confluent_service_account" "app_producer" {
  display_name = "app-producer"
  description  = "Service account for the application producer"
}

resource "confluent_service_account" "app_consumer" {
  display_name = "app-consumer"
  description  = "Service account for the application consumer"
}

# Create Kafka API keys for the service accounts
resource "confluent_api_key" "producer_key" {
  display_name = "producer-api-key"
  description  = "API key for the producer service account"

  owner {
    id          = confluent_service_account.app_producer.id
    api_version = confluent_service_account.app_producer.api_version
    kind        = confluent_service_account.app_producer.kind
  }

  managed_resource {
    id          = confluent_kafka_cluster.production.id
    api_version = confluent_kafka_cluster.production.api_version
    kind        = confluent_kafka_cluster.production.kind

    environment {
      id = confluent_environment.production.id
    }
  }
}

resource "confluent_api_key" "consumer_key" {
  display_name = "consumer-api-key"

  owner {
    id          = confluent_service_account.app_consumer.id
    api_version = confluent_service_account.app_consumer.api_version
    kind        = confluent_service_account.app_consumer.kind
  }

  managed_resource {
    id          = confluent_kafka_cluster.production.id
    api_version = confluent_kafka_cluster.production.api_version
    kind        = confluent_kafka_cluster.production.kind

    environment {
      id = confluent_environment.production.id
    }
  }
}
```

## Topic Management

```hcl
# Create a Kafka topic
resource "confluent_kafka_topic" "orders" {
  kafka_cluster {
    id = confluent_kafka_cluster.production.id
  }

  topic_name       = "orders"
  partitions_count = 12
  rest_endpoint    = confluent_kafka_cluster.production.rest_endpoint

  config = {
    "cleanup.policy"      = "delete"
    "retention.ms"        = "604800000"    # 7 days
    "max.message.bytes"   = "1048576"      # 1 MB
    "min.insync.replicas" = "2"
  }

  credentials {
    key    = confluent_api_key.producer_key.id
    secret = confluent_api_key.producer_key.secret
  }
}

# Create a compacted topic for state
resource "confluent_kafka_topic" "user_profiles" {
  kafka_cluster {
    id = confluent_kafka_cluster.production.id
  }

  topic_name       = "user-profiles"
  partitions_count = 6
  rest_endpoint    = confluent_kafka_cluster.production.rest_endpoint

  config = {
    "cleanup.policy"    = "compact"
    "retention.ms"      = "-1"             # Keep forever
    "min.cleanable.dirty.ratio" = "0.5"
    "delete.retention.ms" = "86400000"     # 1 day
  }

  credentials {
    key    = confluent_api_key.producer_key.id
    secret = confluent_api_key.producer_key.secret
  }
}

# Create multiple related topics
locals {
  event_topics = {
    "order-created"   = { partitions = 12, retention_days = 7 }
    "order-updated"   = { partitions = 12, retention_days = 7 }
    "order-completed" = { partitions = 6, retention_days = 30 }
    "payment-processed" = { partitions = 6, retention_days = 30 }
    "notification-sent" = { partitions = 3, retention_days = 3 }
  }
}

resource "confluent_kafka_topic" "events" {
  for_each = local.event_topics

  kafka_cluster {
    id = confluent_kafka_cluster.production.id
  }

  topic_name       = each.key
  partitions_count = each.value.partitions
  rest_endpoint    = confluent_kafka_cluster.production.rest_endpoint

  config = {
    "cleanup.policy" = "delete"
    "retention.ms"   = tostring(each.value.retention_days * 86400000)
  }

  credentials {
    key    = confluent_api_key.producer_key.id
    secret = confluent_api_key.producer_key.secret
  }
}
```

## ACL Management

```hcl
# Allow the producer to write to the orders topic
resource "confluent_kafka_acl" "producer_write" {
  kafka_cluster {
    id = confluent_kafka_cluster.production.id
  }

  resource_type = "TOPIC"
  resource_name = confluent_kafka_topic.orders.topic_name
  pattern_type  = "LITERAL"
  principal     = "User:${confluent_service_account.app_producer.id}"
  host          = "*"
  operation     = "WRITE"
  permission    = "ALLOW"
  rest_endpoint = confluent_kafka_cluster.production.rest_endpoint

  credentials {
    key    = confluent_api_key.producer_key.id
    secret = confluent_api_key.producer_key.secret
  }
}

# Allow the consumer to read from the orders topic
resource "confluent_kafka_acl" "consumer_read" {
  kafka_cluster {
    id = confluent_kafka_cluster.production.id
  }

  resource_type = "TOPIC"
  resource_name = confluent_kafka_topic.orders.topic_name
  pattern_type  = "LITERAL"
  principal     = "User:${confluent_service_account.app_consumer.id}"
  host          = "*"
  operation     = "READ"
  permission    = "ALLOW"
  rest_endpoint = confluent_kafka_cluster.production.rest_endpoint

  credentials {
    key    = confluent_api_key.consumer_key.id
    secret = confluent_api_key.consumer_key.secret
  }
}

# Allow the consumer to use a consumer group
resource "confluent_kafka_acl" "consumer_group" {
  kafka_cluster {
    id = confluent_kafka_cluster.production.id
  }

  resource_type = "GROUP"
  resource_name = "order-processing"
  pattern_type  = "PREFIXED"
  principal     = "User:${confluent_service_account.app_consumer.id}"
  host          = "*"
  operation     = "READ"
  permission    = "ALLOW"
  rest_endpoint = confluent_kafka_cluster.production.rest_endpoint

  credentials {
    key    = confluent_api_key.consumer_key.id
    secret = confluent_api_key.consumer_key.secret
  }
}
```

## Schema Registry

```hcl
# Enable Schema Registry
resource "confluent_schema_registry_cluster" "production" {
  package = "ESSENTIALS"

  environment {
    id = confluent_environment.production.id
  }

  region {
    id = "sgreg-1"  # Schema Registry region
  }
}

# Create a Schema Registry API key
resource "confluent_api_key" "schema_registry_key" {
  display_name = "schema-registry-key"

  owner {
    id          = confluent_service_account.app_producer.id
    api_version = confluent_service_account.app_producer.api_version
    kind        = confluent_service_account.app_producer.kind
  }

  managed_resource {
    id          = confluent_schema_registry_cluster.production.id
    api_version = confluent_schema_registry_cluster.production.api_version
    kind        = confluent_schema_registry_cluster.production.kind

    environment {
      id = confluent_environment.production.id
    }
  }
}

# Register an Avro schema
resource "confluent_schema" "order_value" {
  schema_registry_cluster {
    id = confluent_schema_registry_cluster.production.id
  }

  rest_endpoint = confluent_schema_registry_cluster.production.rest_endpoint
  subject_name  = "orders-value"
  format        = "AVRO"

  schema = jsonencode({
    type      = "record"
    name      = "Order"
    namespace = "com.example.orders"
    fields = [
      { name = "order_id", type = "string" },
      { name = "customer_id", type = "string" },
      { name = "amount", type = "double" },
      { name = "currency", type = "string" },
      { name = "created_at", type = "long", logicalType = "timestamp-millis" },
      { name = "status", type = { type = "enum", name = "OrderStatus", symbols = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] } },
    ]
  })

  credentials {
    key    = confluent_api_key.schema_registry_key.id
    secret = confluent_api_key.schema_registry_key.secret
  }
}
```

## Connectors

```hcl
# Create a managed connector (e.g., S3 Sink)
resource "confluent_connector" "s3_sink" {
  environment {
    id = confluent_environment.production.id
  }

  kafka_cluster {
    id = confluent_kafka_cluster.production.id
  }

  config_nonsensitive = {
    "connector.class"          = "S3_SINK"
    "name"                     = "orders-s3-sink"
    "kafka.auth.mode"          = "SERVICE_ACCOUNT"
    "kafka.service.account.id" = confluent_service_account.app_consumer.id
    "topics"                   = "orders"
    "input.data.format"        = "AVRO"
    "output.data.format"       = "JSON"
    "s3.bucket.name"           = "my-data-lake"
    "time.interval"            = "HOURLY"
    "flush.size"               = "1000"
    "tasks.max"                = "1"
  }

  config_sensitive = {
    "aws.access.key.id"     = var.aws_access_key
    "aws.secret.access.key" = var.aws_secret_key
  }
}
```

## Network Configuration

```hcl
# Create a private link for AWS
resource "confluent_network" "private" {
  display_name     = "Private Network"
  cloud            = "AWS"
  region           = "us-east-1"
  connection_types = ["PRIVATELINK"]

  environment {
    id = confluent_environment.production.id
  }
}

resource "confluent_private_link_access" "aws" {
  display_name = "AWS Private Link"

  aws {
    account = var.aws_account_id
  }

  environment {
    id = confluent_environment.production.id
  }

  network {
    id = confluent_network.private.id
  }
}
```

## Outputs

```hcl
# Output useful connection information
output "bootstrap_servers" {
  value = confluent_kafka_cluster.production.bootstrap_endpoint
}

output "schema_registry_url" {
  value = confluent_schema_registry_cluster.production.rest_endpoint
}

output "producer_api_key" {
  value     = confluent_api_key.producer_key.id
  sensitive = false
}

output "producer_api_secret" {
  value     = confluent_api_key.producer_key.secret
  sensitive = true
}
```

## Best Practices

1. Use service accounts for each application. Do not share API keys between different services.

2. Follow the principle of least privilege with ACLs. Grant only the specific permissions each service needs.

3. Use Schema Registry with schema validation to prevent breaking changes in your event schemas.

4. Set appropriate retention policies on topics. Not every topic needs infinite retention.

5. Use prefixed ACL patterns when possible to reduce the number of ACL rules.

6. Separate environments (dev, staging, production) using Confluent environments.

7. Use compacted topics for state or reference data where you care about the latest value per key.

## Wrapping Up

The Confluent Terraform provider gives you complete control over your Kafka infrastructure as code. From cluster provisioning and topic management to schema registration and ACL configuration, everything can be defined, version-controlled, and deployed consistently. This is critical for event streaming platforms where misconfigured topics or incorrect ACLs can cause data loss or security issues.

For monitoring your Kafka consumers, tracking lag, and alerting on pipeline issues, [OneUptime](https://oneuptime.com) provides observability tools that complement Confluent's built-in monitoring.
