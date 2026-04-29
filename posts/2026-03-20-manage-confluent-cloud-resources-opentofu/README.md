# How to Manage Confluent Cloud Resources with OpenTofu - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Confluent Cloud, Kafka, Infrastructure as Code, Event Streaming

Description: Learn how to provision and manage Confluent Cloud Kafka clusters, topics, and service accounts using OpenTofu and the official Confluent provider.

## Introduction

Confluent Cloud is a fully managed Apache Kafka service. Using OpenTofu to manage Confluent Cloud resources enables consistent, repeatable Kafka infrastructure deployments with version-controlled configurations and automated lifecycle management.

## Prerequisites

- OpenTofu installed (v1.6+)
- A Confluent Cloud account
- Confluent Cloud API key and secret

## Provider Configuration

```hcl
terraform {
  required_providers {
    confluent = {
      source  = "confluentinc/confluent"
      version = "~> 2.0"
    }
  }
}

provider "confluent" {
}
```

Store credentials as environment variables:

```bash
export CONFLUENT_CLOUD_API_KEY="your-api-key"
export CONFLUENT_CLOUD_API_SECRET="your-api-secret"
```

## Creating a Kafka Cluster

```hcl
resource "confluent_environment" "staging" {
  display_name = "staging"
}

resource "confluent_kafka_cluster" "standard" {
  display_name = "app-kafka-cluster"
  availability = "SINGLE_ZONE"
  cloud        = "AWS"
  region       = "us-east-1"
  standard {}

  environment {
    id = confluent_environment.staging.id
  }
}
```

For a dedicated cluster with higher throughput:

```hcl
resource "confluent_environment" "production" {
  display_name = "production"
}

resource "confluent_kafka_cluster" "dedicated" {
  display_name = "prod-kafka-cluster"
  availability = "MULTI_ZONE"
  cloud        = "AWS"
  region       = "us-east-1"

  dedicated {
    cku = 2
  }

  environment {
    id = confluent_environment.production.id
  }
}
```

## Creating Kafka Topics

```hcl
resource "confluent_kafka_topic" "orders" {
  kafka_cluster {
    id = confluent_kafka_cluster.standard.id
  }

  topic_name       = "orders"
  rest_endpoint    = confluent_kafka_cluster.standard.rest_endpoint
  partitions_count = 6

  config = {
    "cleanup.policy" = "delete"
    "retention.ms"   = "604800000" # 7 days
  }

  credentials {
    key    = confluent_api_key.app_manager.id
    secret = confluent_api_key.app_manager.secret
  }
}
```

## Service Accounts and API Keys

```hcl
resource "confluent_service_account" "app_manager" {
  display_name = "app-manager"
  description  = "Service account for managing Kafka topics"
}

resource "confluent_api_key" "app_manager" {
  display_name = "app-manager-kafka-api-key"
  description  = "Kafka API Key for app-manager service account"

  owner {
    id          = confluent_service_account.app_manager.id
    api_version = confluent_service_account.app_manager.api_version
    kind        = confluent_service_account.app_manager.kind
  }

  managed_resource {
    id          = confluent_kafka_cluster.standard.id
    api_version = confluent_kafka_cluster.standard.api_version
    kind        = confluent_kafka_cluster.standard.kind

    environment {
      id = confluent_environment.staging.id
    }
  }

  depends_on = [
    confluent_role_binding.app_manager_cluster_admin
  ]
}

resource "confluent_service_account" "app_producer" {
  display_name = "app-producer"
  description  = "Service account for the orders producer application"
}

resource "confluent_api_key" "app_producer" {
  display_name = "app-producer-kafka-api-key"
  description  = "Kafka API Key for app-producer service account"

  owner {
    id          = confluent_service_account.app_producer.id
    api_version = confluent_service_account.app_producer.api_version
    kind        = confluent_service_account.app_producer.kind
  }

  managed_resource {
    id          = confluent_kafka_cluster.standard.id
    api_version = confluent_kafka_cluster.standard.api_version
    kind        = confluent_kafka_cluster.standard.kind

    environment {
      id = confluent_environment.staging.id
    }
  }
}
```

## Role Bindings and ACLs

Grant one service account cluster-admin access for topic management and another producer access to a specific topic:

```hcl
resource "confluent_role_binding" "app_manager_cluster_admin" {
  principal   = "User:${confluent_service_account.app_manager.id}"
  role_name   = "CloudClusterAdmin"
  crn_pattern = confluent_kafka_cluster.standard.rbac_crn
}

resource "confluent_role_binding" "app_producer_write" {
  principal   = "User:${confluent_service_account.app_producer.id}"
  role_name   = "DeveloperWrite"
  crn_pattern = "${confluent_kafka_cluster.standard.rbac_crn}/kafka=${confluent_kafka_cluster.standard.id}/topic=${confluent_kafka_topic.orders.topic_name}"
}
```

## Schema Registry

```hcl
data "confluent_schema_registry_cluster" "essentials" {
  environment {
    id = confluent_environment.staging.id
  }

  depends_on = [
    confluent_kafka_cluster.standard
  ]
}
```

## Outputs

```hcl
output "kafka_bootstrap_endpoint" {
  value = confluent_kafka_cluster.standard.bootstrap_endpoint
}

output "producer_api_key" {
  value     = confluent_api_key.app_producer.id
  sensitive = false
}

output "producer_api_secret" {
  value     = confluent_api_key.app_producer.secret
  sensitive = true
}
```

## Best Practices

- Use separate Confluent environments for dev, staging, and production.
- Mark API secrets as sensitive outputs and store them in a secrets manager.
- Set topic retention policies based on your data lifecycle requirements.
- Use dedicated clusters for critical production workloads with higher throughput or private networking requirements.
- Assign fine-grained role bindings rather than broad admin access.

## Conclusion

The official Confluent provider works with OpenTofu to enable full lifecycle management of Kafka infrastructure as code. From cluster creation to topic configuration and access control, you can manage your entire event streaming platform with the same workflows used for the rest of your infrastructure.
