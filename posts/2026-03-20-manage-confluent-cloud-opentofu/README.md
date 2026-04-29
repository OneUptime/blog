# How to Manage Confluent Cloud Resources with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Confluent, Kafka, Streaming, Cloud

Description: Learn how to manage Confluent Cloud environments, Kafka clusters, topics, service accounts, and ACLs using OpenTofu for infrastructure-as-code Kafka management.

## Introduction

The Confluent provider for OpenTofu manages Confluent Cloud resources including environments, Kafka clusters, topics, schemas, service accounts, and role bindings. This enables treating your streaming infrastructure with the same rigor as your compute infrastructure.

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
  cloud_api_key    = var.confluent_cloud_api_key
  cloud_api_secret = var.confluent_cloud_api_secret
}
```

## Creating an Environment

```hcl
resource "confluent_environment" "prod" {
  display_name = "Production"

  stream_governance {
    package = "ESSENTIALS"
  }
}
```

## Kafka Cluster

```hcl
resource "confluent_kafka_cluster" "main" {
  display_name = "prod-kafka"
  availability = "MULTI_ZONE"
  cloud        = "AWS"
  region       = "us-east-1"

  dedicated {
    cku = 2  # Confluent Kafka Units
  }

  environment {
    id = confluent_environment.prod.id
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

## Service Accounts and API Keys

```hcl
resource "confluent_service_account" "app_manager" {
  display_name = "app-manager"
  description  = "Service account to manage the Kafka cluster"
}

resource "confluent_service_account" "app_producer" {
  display_name = "app-producer"
  description  = "Service account for application Kafka producer"
}

resource "confluent_role_binding" "app_manager_kafka_admin" {
  principal   = "User:${confluent_service_account.app_manager.id}"
  role_name   = "CloudClusterAdmin"
  crn_pattern = confluent_kafka_cluster.main.rbac_crn
}

resource "confluent_api_key" "app_manager_key" {
  display_name = "app-manager-kafka-key"
  description  = "Kafka API key for app manager"

  owner {
    id          = confluent_service_account.app_manager.id
    api_version = confluent_service_account.app_manager.api_version
    kind        = confluent_service_account.app_manager.kind
  }

  managed_resource {
    id          = confluent_kafka_cluster.main.id
    api_version = confluent_kafka_cluster.main.api_version
    kind        = confluent_kafka_cluster.main.kind

    environment {
      id = confluent_environment.prod.id
    }
  }

  depends_on = [
    confluent_role_binding.app_manager_kafka_admin
  ]
}

resource "confluent_api_key" "producer_key" {
  display_name = "app-producer-kafka-key"
  description  = "Kafka API key for app producer"

  owner {
    id          = confluent_service_account.app_producer.id
    api_version = confluent_service_account.app_producer.api_version
    kind        = confluent_service_account.app_producer.kind
  }

  managed_resource {
    id          = confluent_kafka_cluster.main.id
    api_version = confluent_kafka_cluster.main.api_version
    kind        = confluent_kafka_cluster.main.kind

    environment {
      id = confluent_environment.prod.id
    }
  }
}
```

## Kafka Topics

```hcl
locals {
  topics = {
    "orders"       = { partitions = 6, retention_hours = 168 }
    "payments"     = { partitions = 6, retention_hours = 720 }
    "user-events"  = { partitions = 12, retention_hours = 168 }
    "audit-log"    = { partitions = 3, retention_hours = 8760 }
  }
}

resource "confluent_kafka_topic" "topics" {
  for_each         = local.topics
  kafka_cluster {
    id = confluent_kafka_cluster.main.id
  }
  topic_name       = each.key
  partitions_count = each.value.partitions
  rest_endpoint    = confluent_kafka_cluster.main.rest_endpoint

  config = {
    "retention.ms"           = tostring(each.value.retention_hours * 3600000)
    "cleanup.policy"         = "delete"
    "min.insync.replicas"    = "2"
  }

  credentials {
    key    = confluent_api_key.app_manager_key.id
    secret = confluent_api_key.app_manager_key.secret
  }
}
```

## ACL-Based Access Control

```hcl
resource "confluent_kafka_acl" "producer_write" {
  kafka_cluster {
    id = confluent_kafka_cluster.main.id
  }
  resource_type = "TOPIC"
  resource_name = confluent_kafka_topic.topics["orders"].topic_name
  pattern_type  = "LITERAL"
  principal     = "User:${confluent_service_account.app_producer.id}"
  host          = "*"
  operation     = "WRITE"
  permission    = "ALLOW"
  rest_endpoint = confluent_kafka_cluster.main.rest_endpoint

  credentials {
    key    = confluent_api_key.app_manager_key.id
    secret = confluent_api_key.app_manager_key.secret
  }
}
```

## Schema Registry

```hcl
data "confluent_schema_registry_cluster" "main" {
  environment {
    id = confluent_environment.prod.id
  }

  depends_on = [
    confluent_kafka_cluster.main
  ]
}

resource "confluent_service_account" "env_manager" {
  display_name = "env-manager"
  description  = "Service account to manage Schema Registry resources"
}

resource "confluent_role_binding" "env_manager_environment_admin" {
  principal   = "User:${confluent_service_account.env_manager.id}"
  role_name   = "EnvironmentAdmin"
  crn_pattern = confluent_environment.prod.resource_name
}

resource "confluent_api_key" "sr_key" {
  display_name = "env-manager-schema-registry-key"
  description  = "Schema Registry API key for env manager"

  owner {
    id          = confluent_service_account.env_manager.id
    api_version = confluent_service_account.env_manager.api_version
    kind        = confluent_service_account.env_manager.kind
  }

  managed_resource {
    id          = data.confluent_schema_registry_cluster.main.id
    api_version = data.confluent_schema_registry_cluster.main.api_version
    kind        = data.confluent_schema_registry_cluster.main.kind

    environment {
      id = confluent_environment.prod.id
    }
  }

  depends_on = [
    confluent_role_binding.env_manager_environment_admin
  ]
}

resource "confluent_schema" "order_schema" {
  schema_registry_cluster {
    id = data.confluent_schema_registry_cluster.main.id
  }
  rest_endpoint = data.confluent_schema_registry_cluster.main.rest_endpoint
  subject_name  = "orders-value"
  format        = "AVRO"

  schema = jsonencode({
    type = "record"
    name = "Order"
    fields = [
      { name = "id", type = "string" },
      { name = "amount", type = "double" },
      { name = "timestamp", type = "long" }
    ]
  })

  credentials {
    key    = confluent_api_key.sr_key.id
    secret = confluent_api_key.sr_key.secret
  }
}
```

## Conclusion

Managing Confluent Cloud with OpenTofu enables version-controlled, reproducible Kafka infrastructure. Use `prevent_destroy` on clusters to prevent accidental deletion, manage topics and ACLs as code to ensure consistent access control, and source provider credentials from Vault or AWS Secrets Manager while protecting your OpenTofu state because API key secrets can still be recorded there. The `for_each` pattern works well for managing many topics with similar configurations.
