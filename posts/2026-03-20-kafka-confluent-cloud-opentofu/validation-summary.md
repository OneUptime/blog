# Validation Summary: How to Deploy Kafka on Confluent Cloud with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- Confluent Terraform Provider
- Confluent Cloud for Apache Kafka
- Kafka topics
- Confluent Cloud service accounts
- Confluent Cloud API keys
- Confluent Cloud RBAC
- Confluent Cloud ACLs

## Sources Consulted
- Confluent Terraform provider docs for `confluent_kafka_cluster`: https://github.com/confluentinc/terraform-provider-confluent/blob/v2.70.1/docs/resources/confluent_kafka_cluster.md
- Confluent Terraform provider docs for `confluent_kafka_topic`: https://github.com/confluentinc/terraform-provider-confluent/blob/v2.70.1/docs/resources/confluent_kafka_topic.md
- Confluent Terraform provider docs for `confluent_kafka_acl`: https://github.com/confluentinc/terraform-provider-confluent/blob/v2.70.1/docs/resources/confluent_kafka_acl.md
- Confluent Terraform provider docs for `confluent_api_key`: https://github.com/confluentinc/terraform-provider-confluent/blob/v2.70.1/docs/resources/confluent_api_key.md
- Confluent Terraform provider docs for `confluent_role_binding`: https://github.com/confluentinc/terraform-provider-confluent/blob/v2.70.1/docs/resources/confluent_role_binding.md
- Official Confluent provider example for Standard Kafka with ACLs: https://github.com/confluentinc/terraform-provider-confluent/blob/v2.70.1/examples/configurations/standard-kafka-acls/main.tf
- Confluent Cloud Terraform provider overview: https://docs.confluent.io/cloud/current/clusters/terraform-provider.html
- Kafka cluster types in Confluent Cloud: https://docs.confluent.io/cloud/current/clusters/cluster-types.html
- Kafka cluster API and availability semantics: https://docs.confluent.io/cloud/current/clusters/cluster-api.html
- Stream Governance packages: https://docs.confluent.io/cloud/current/stream-governance/packages.html
- Topic configuration reference: https://docs.confluent.io/cloud/current/topics/manage.html
- ACL overview and operations: https://docs.confluent.io/cloud/current/security/access-control/acls/overview.html
- ACL examples and use cases: https://docs.confluent.io/cloud/current/security/access-control/acls/examples.html
- Manage RBAC role bindings: https://docs.confluent.io/cloud/current/security/access-control/rbac/manage-role-bindings.html
- Predefined RBAC roles: https://docs.confluent.io/cloud/current/security/access-control/rbac/predefined-rbac-roles.html
- Broker-side schema validation: https://docs.confluent.io/cloud/current/sr/broker-side-schema-validation.html

## Issues Found
- The post pinned the provider to `~> 1.76`, which is an outdated provider line. I updated it to `~> 2.70.0` so the post uses the current documented provider series.
- The Standard cluster example used `availability = "MULTI_ZONE"`, which does not generalize well across current Confluent Cloud cluster availability models. I changed the example to `SINGLE_ZONE` to match the official provider example for Standard clusters and corrected the production availability guidance in the best-practices section.
- The `topic_admin` Kafka API key was missing the dependency used in Confluent’s official examples to ensure the `CloudClusterAdmin` role binding exists before the key is used for topic and ACL management. I added `depends_on = [confluent_role_binding.topic_admin]`.
- The Schema Registry best-practice note implied that simply enabling Schema Registry enforces schemas. I corrected it to reflect that you provision Schema Registry separately, and that broker-side schema validation requires a Dedicated Kafka cluster.
- The description referred to “serverless Kafka deployments,” while the example provisions a standard managed Kafka cluster. I adjusted the wording to “fully managed Kafka deployments” for accuracy.

## Review Notes
- The post uses resource-level `credentials` blocks for topics and ACLs. This is supported, but the provider documentation notes that these secrets are stored in Terraform/OpenTofu state, so secure state storage remains important.
- Confluent Cloud availability labels for elastic clusters are organization-dependent in current docs. Some organizations use legacy `SINGLE_ZONE`/`MULTI_ZONE` labels, while newer organizations use `LOW`/`HIGH`.
