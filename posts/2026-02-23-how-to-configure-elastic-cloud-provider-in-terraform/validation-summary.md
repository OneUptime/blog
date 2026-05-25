# Validation Summary: How to Configure Elastic Cloud Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Elastic Cloud Terraform provider (`elastic/ec`)
- Elastic Stack Terraform provider (`elastic/elasticstack`)
- Elastic Cloud Hosted
- Elastic Cloud Enterprise
- Elasticsearch
- Kibana
- Elastic Integrations Server / Fleet
- Elasticsearch index lifecycle management
- Elastic Cloud traffic filters and PrivateLink

## Sources Consulted
- Elastic Cloud Terraform provider overview and authentication docs: https://registry.terraform.io/providers/elastic/ec/latest/docs
- Elastic Cloud Terraform provider GitHub docs: https://github.com/elastic/terraform-provider-ec
- `ec_deployment` resource docs: https://registry.terraform.io/providers/elastic/ec/latest/docs/resources/deployment
- `ec_stack` data source docs: https://registry.terraform.io/providers/elastic/ec/latest/docs/data-sources/stack
- `ec_deployment_traffic_filter` resource docs: https://registry.terraform.io/providers/elastic/ec/latest/docs/resources/deployment_traffic_filter
- `ec_deployment_traffic_filter_association` resource docs: https://registry.terraform.io/providers/elastic/ec/latest/docs/resources/deployment_traffic_filter_association
- `ec_deployment_elasticsearch_keystore` resource docs: https://registry.terraform.io/providers/elastic/ec/latest/docs/resources/deployment_elasticsearch_keystore
- `ec_deployment_extension` resource docs: https://registry.terraform.io/providers/elastic/ec/latest/docs/resources/deployment_extension
- Elastic Cloud regions and deployment templates reference: https://www.elastic.co/docs/reference/cloud/cloud-hosted/ec-regions-templates-instances
- Elastic Stack Terraform provider overview: https://registry.terraform.io/providers/elastic/elasticstack/latest/docs
- `elasticstack_elasticsearch_index_lifecycle` resource docs: https://registry.terraform.io/providers/elastic/elasticstack/latest/docs/resources/elasticsearch_index_lifecycle

## Issues Found
- The post listed Terraform 1.0 as sufficient for the Elastic Cloud provider. Current `elastic/ec` docs require Terraform 1.2.7 or later, so the prerequisite and `required_version` constraint were updated.
- The post pinned `elastic/ec` to `~> 0.9`, while the current provider release is 0.13.0 and the examples use the newer attribute-style deployment schema. Updated the provider constraint to `~> 0.13`.
- The later `elasticstack` examples did not declare the `elastic/elasticstack` provider source. Added it to `required_providers` with the current `~> 0.16` constraint so Terraform resolves the provider correctly.
- The introduction described the Elastic Cloud provider as also known as the ECE provider. Current docs describe it as supporting Elastic Cloud Hosted, Elastic Cloud Enterprise, Serverless, and GovCloud. Reworded this to avoid implying it is only or primarily the ECE provider.
- The "Getting Deployment Templates" section used `data "ec_stack"` but described it as a template lookup. `ec_stack` retrieves Elastic Stack versions, not deployment templates. Renamed and reworded the section to describe stack version lookup accurately.
- The examples used deprecated AWS deployment template IDs (`aws-io-optimized-v2` and `aws-hot-warm-v2`). Replaced them with current template IDs available in `us-east-1` (`aws-storage-optimized` and `aws-storage-optimized-faster-warm`).
- The ILM delete phase set `min_age` but did not include a delete action. Added `delete {}` so the policy actually deletes indices in the delete phase.
- The data source comment said `ec_stack` lists regions and templates. Updated it to state that it looks up the latest matching stack version in a region.

## Review Notes
- Terraform CLI is not installed in this workspace, so I could not run `terraform validate`. The snippets were checked against current official provider schemas and documentation instead.
- The Elastic Cloud provider docs still show some deprecated template IDs in examples, but the Elastic Cloud regions and templates reference marks those IDs as deprecated. The post now uses current non-deprecated AWS template IDs.
