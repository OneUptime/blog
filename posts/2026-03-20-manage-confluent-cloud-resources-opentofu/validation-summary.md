# Validation Summary: How to Manage Confluent Cloud Resources with OpenTofu - Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Confluent Terraform Provider
- Confluent Cloud
- Apache Kafka
- Schema Registry
- Infrastructure as Code

## Sources Consulted
- Confluent Cloud docs: Create a Kafka Cluster on Confluent Cloud from a Template Using Terraform - https://docs.confluent.io/cloud/current/clusters/terraform-provider.html
- Confluent provider docs index - https://raw.githubusercontent.com/confluentinc/terraform-provider-confluent/master/docs/index.md
- Confluent provider resource docs: `confluent_kafka_cluster` - https://raw.githubusercontent.com/confluentinc/terraform-provider-confluent/master/docs/resources/confluent_kafka_cluster.md
- Confluent provider resource docs: `confluent_kafka_topic` - https://raw.githubusercontent.com/confluentinc/terraform-provider-confluent/master/docs/resources/confluent_kafka_topic.md
- Confluent provider resource docs: `confluent_api_key` - https://raw.githubusercontent.com/confluentinc/terraform-provider-confluent/master/docs/resources/confluent_api_key.md
- Confluent provider resource docs: `confluent_role_binding` - https://raw.githubusercontent.com/confluentinc/terraform-provider-confluent/master/docs/resources/confluent_role_binding.md
- Confluent provider data source docs: `confluent_schema_registry_cluster` - https://raw.githubusercontent.com/confluentinc/terraform-provider-confluent/master/docs/data-sources/confluent_schema_registry_cluster.md
- Confluent provider resource docs: `confluent_environment` - https://raw.githubusercontent.com/confluentinc/terraform-provider-confluent/master/docs/resources/confluent_environment.md
- Confluent provider example: `standard-kafka-rbac` - https://raw.githubusercontent.com/confluentinc/terraform-provider-confluent/master/examples/configurations/standard-kafka-rbac/main.tf
- Confluent Cloud docs: Configuration Reference for Topics in Confluent Cloud - https://docs.confluent.io/cloud/current/topics/manage.html
- Confluent Cloud docs: Kafka Cluster Types in Confluent Cloud - https://docs.confluent.io/cloud/current/clusters/cluster-types.html
- Confluent Cloud docs: Predefined RBAC roles in Confluent Cloud - https://docs.confluent.io/cloud/current/security/access-control/rbac/predefined-rbac-roles.html
- Confluent Cloud docs: Manage Stream Governance Packages in Confluent Cloud - https://docs.confluent.io/cloud/current/stream-governance/packages.html
- Confluent Cloud docs: Quick Start for Schema Management on Confluent Cloud - https://docs.confluent.io/cloud/current/get-started/schema-registry.html

## Issues Found
- The provider snippet referenced `var.confluent_cloud_api_key` and `var.confluent_cloud_api_secret`, but the post only documented `CONFLUENT_CLOUD_API_KEY` and `CONFLUENT_CLOUD_API_SECRET`. I changed the provider block to use environment-variable-based authentication directly so the example is self-consistent.
- The post used a `basic` Kafka cluster for downstream RBAC examples. Confluent documents Kafka RBAC role bindings on Standard, Enterprise, Dedicated, and Freight clusters, but not Basic clusters. I changed the main cluster example and dependent references to `standard`.
- The topic example referenced an undefined `confluent_api_key.app_manager` resource. I added the missing `app_manager` service account and Kafka API key, which matches Confluent's RBAC examples for managing topics.
- The topic example set `compression.type`, but Confluent Cloud documents that this setting is not supported through the Kafka REST API or the Terraform/OpenTofu provider. I removed that config entry and left supported topic settings in place.
- The topic-management flow was missing the required cluster-admin RBAC grant for the manager service account. I added a `CloudClusterAdmin` role binding and made the manager API key depend on that role binding, matching the provider's RBAC example pattern.
- The dedicated cluster example referenced `confluent_environment.production` without defining it. I added the missing `production` environment resource.
- The Schema Registry section used `resource "confluent_schema_registry_cluster"`, but the current Confluent provider exposes Schema Registry cluster lookup as a data source, not a resource. I replaced it with `data "confluent_schema_registry_cluster"` and added the dependency on the Kafka cluster creation step.
- The best-practices note implied dedicated clusters are the general answer for SLA-backed production workloads. Current Confluent cluster-type guidance is more specific, so I updated that line to focus on high-throughput and private-networking production use cases.
- The conclusion referred to a "Confluent OpenTofu provider." I corrected this to the official Confluent provider working with OpenTofu.

## Review Notes
- The post's `~> 2.0` provider constraint is still valid against the current Confluent provider major version, but the exact example versions in upstream docs move over time.
- The Schema Registry example now reflects the current Confluent Cloud model: one Schema Registry per environment, looked up after cluster creation rather than provisioned as a standalone Terraform/OpenTofu resource.
