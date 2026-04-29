# Validation Summary: How to Manage Confluent Cloud Resources with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Confluent Cloud
- Apache Kafka
- Schema Registry
- Infrastructure as Code

## Sources Consulted
- Confluent Cloud Terraform provider overview: https://docs.confluent.io/cloud/current/clusters/terraform-provider.html
- Confluent Terraform provider `confluent_environment` resource docs: https://github.com/confluentinc/terraform-provider-confluent/blob/master/docs/resources/confluent_environment.md
- Confluent Terraform provider `confluent_kafka_cluster` resource docs: https://github.com/confluentinc/terraform-provider-confluent/blob/master/docs/resources/confluent_kafka_cluster.md
- Confluent Terraform provider `confluent_service_account` resource docs: https://github.com/confluentinc/terraform-provider-confluent/blob/master/docs/resources/confluent_service_account.md
- Confluent Terraform provider `confluent_role_binding` resource docs: https://github.com/confluentinc/terraform-provider-confluent/blob/master/docs/resources/confluent_role_binding.md
- Confluent Terraform provider `confluent_api_key` resource docs: https://github.com/confluentinc/terraform-provider-confluent/blob/master/docs/resources/confluent_api_key.md
- Confluent Terraform provider `confluent_kafka_topic` resource docs: https://github.com/confluentinc/terraform-provider-confluent/blob/master/docs/resources/confluent_kafka_topic.md
- Confluent Terraform provider `confluent_kafka_acl` resource docs: https://github.com/confluentinc/terraform-provider-confluent/blob/master/docs/resources/confluent_kafka_acl.md
- Confluent Terraform provider `confluent_schema` resource docs: https://github.com/confluentinc/terraform-provider-confluent/blob/master/docs/resources/confluent_schema.md
- Confluent Terraform provider `confluent_schema_registry_cluster` data source docs: https://github.com/confluentinc/terraform-provider-confluent/blob/master/docs/data-sources/confluent_schema_registry_cluster.md
- Confluent example for Kafka ACLs: https://github.com/confluentinc/terraform-provider-confluent/tree/master/examples/configurations/basic-kafka-acls
- Confluent example for Schema Registry schemas: https://github.com/confluentinc/terraform-provider-confluent/tree/master/examples/configurations/single-event-types-avro-schema
- Stream Governance packages docs: https://docs.confluent.io/cloud/current/stream-governance/packages.html
- Terraform security best practices for Confluent Cloud: https://docs.confluent.io/cloud/current/clusters/terraform-security.html
- Confluent Cloud API key docs: https://docs.confluent.io/cloud/current/security/authenticate/workload-identities/service-accounts/api-keys/overview.html
- ACL operations for Confluent Cloud: https://docs.confluent.io/cloud/current/security/access-control/acls/operations.html

## Issues Found
- The post created Kafka topics and ACLs with the producer service account's Kafka API key. Current Confluent examples use a separate manager service account with a `CloudClusterAdmin` role binding and Kafka API key for topic and ACL administration, so the post was updated to add `app_manager`, a `confluent_role_binding`, and `app_manager_key`, and to use that key in the topic and ACL resources.
- The ACL example hardcoded `resource_name = "orders"` even though the topic was created through a `for_each` resource. The ACL was updated to reference `confluent_kafka_topic.topics["orders"].topic_name` so the ACL targets the managed topic directly.
- The Schema Registry example used `confluent_schema_registry_cluster` as a resource with a `region` block. The current provider exposes Schema Registry clusters through the `confluent_schema_registry_cluster` data source instead, so the post was updated to use the data source and to wait for the Kafka cluster before reading it.
- The Schema Registry example referenced `confluent_api_key.sr_key` but never defined it. The post was updated to add an `env_manager` service account, an `EnvironmentAdmin` role binding, and a Schema Registry API key resource consistent with Confluent's official example.
- The original Schema Registry setup put the `ESSENTIALS` package on a nonexistent `confluent_schema_registry_cluster` resource. The post was updated to model Stream Governance on the environment with `stream_governance { package = "ESSENTIALS" }`, which matches the current provider.
- The conclusion said to store API keys in Vault or AWS Secrets Manager rather than in OpenTofu state. That overstates what the provider can avoid, because Confluent API key secrets and resource credentials can still be present in state. The conclusion was corrected to recommend sourcing provider credentials from a secrets manager and protecting state accordingly.

## Review Notes
- Confluent's current provider examples pin version `2.70.0`, while the post uses `~> 2.0`. That version constraint is still valid, but it intentionally allows newer `2.x` releases.
- Stream Governance Essentials is automatically attached to new environments by default in Confluent Cloud. The post now sets it explicitly to preserve the original intent and align the Schema Registry example with the current provider model.
- The ACL example remains a minimal topic write example. Depending on the client and workload, additional ACLs such as `IDEMPOTENT_WRITE` or consumer-group permissions may be needed, but the current snippet is consistent with Confluent's own basic ACL examples.
- The `tofu` CLI was not available in this workspace, so validation was documentation-based rather than running `tofu validate`.
