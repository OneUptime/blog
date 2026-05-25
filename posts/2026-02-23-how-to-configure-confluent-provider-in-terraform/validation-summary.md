# Validation Summary: How to Configure Confluent Provider in Terraform (Kafka)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Confluent Terraform Provider
- Confluent Cloud
- Apache Kafka
- Kafka topics and ACLs
- Schema Registry and Avro schemas
- Confluent Cloud managed connectors
- AWS PrivateLink networking

## Sources Consulted
- Confluent Terraform Provider for Confluent Cloud: https://docs.confluent.io/cloud/current/clusters/terraform-provider.html
- Confluent Terraform Provider GitHub documentation: https://github.com/confluentinc/terraform-provider-confluent/tree/master/docs
- `confluent_environment` resource documentation: https://registry.terraform.io/providers/confluentinc/confluent/latest/docs/resources/confluent_environment
- `confluent_kafka_cluster` resource documentation: https://registry.terraform.io/providers/confluentinc/confluent/latest/docs/resources/confluent_kafka_cluster
- `confluent_api_key` resource documentation: https://registry.terraform.io/providers/confluentinc/confluent/latest/docs/resources/confluent_api_key
- `confluent_kafka_topic` resource documentation: https://registry.terraform.io/providers/confluentinc/confluent/latest/docs/resources/confluent_kafka_topic
- `confluent_kafka_acl` resource documentation: https://registry.terraform.io/providers/confluentinc/confluent/latest/docs/resources/confluent_kafka_acl
- `confluent_schema_registry_cluster` data source documentation: https://registry.terraform.io/providers/confluentinc/confluent/latest/docs/data-sources/confluent_schema_registry_cluster
- `confluent_schema` resource documentation: https://registry.terraform.io/providers/confluentinc/confluent/latest/docs/resources/confluent_schema
- `confluent_connector` resource documentation: https://registry.terraform.io/providers/confluentinc/confluent/latest/docs/resources/confluent_connector
- `confluent_network` resource documentation: https://registry.terraform.io/providers/confluentinc/confluent/latest/docs/resources/confluent_network
- `confluent_private_link_access` resource documentation: https://registry.terraform.io/providers/confluentinc/confluent/latest/docs/resources/confluent_private_link_access
- Apache Avro specification for logical types: https://avro.apache.org/docs/

## Issues Found
- The provider version constraint used the older v1 line. Updated it to `~> 2.73` to match current Confluent Terraform Provider examples.
- The Schema Registry example used the old `confluent_schema_registry_cluster` resource shape with a Schema Registry region ID. Updated it to configure `stream_governance` on the environment and read the Schema Registry cluster with the current `data "confluent_schema_registry_cluster"` data source.
- The topic and ACL examples used producer and consumer API keys to administer Kafka resources before those principals had the required administrative permissions. Added an `app_manager` service account, a `CloudClusterAdmin` role binding, and a manager Kafka API key for topic and ACL management.
- The Schema Registry API key was owned by the producer service account without a role binding granting schema-management permissions. Added a `schema_registry_manager` service account with `EnvironmentAdmin` and used it for the Schema Registry API key.
- The Avro timestamp field placed `logicalType` directly on the field instead of on the field type schema. Updated `created_at` to use `{ type = "long", logicalType = "timestamp-millis" }`.
- Updated Schema Registry output references from the removed resource to the current data source.

## Review Notes
The connector example follows Confluent's managed S3 sink connector configuration shape, but production use should still generate connector-specific ACLs from Confluent Cloud or the connector docs because required ACLs vary by connector settings such as DLQ, success, and error topic options.
