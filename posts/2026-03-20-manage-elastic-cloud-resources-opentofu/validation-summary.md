# Validation Summary: How to Manage Elastic Cloud Resources with OpenTofu - Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Elastic Cloud Terraform/OpenTofu provider (`elastic/ec`)
- Elastic Cloud Hosted
- Elasticsearch
- Kibana
- Integrations Server

## Sources Consulted
- Elastic Cloud provider documentation: https://registry.terraform.io/providers/elastic/ec/latest/docs
- Elastic provider source repository and generated docs: https://github.com/elastic/terraform-provider-ec
- Elastic Cloud provider authentication docs: https://github.com/elastic/terraform-provider-ec/blob/master/docs/index.md
- `ec_deployment` resource docs: https://github.com/elastic/terraform-provider-ec/blob/master/docs/resources/deployment.md
- `ec_deployment_traffic_filter` resource docs: https://github.com/elastic/terraform-provider-ec/blob/master/docs/resources/deployment_traffic_filter.md
- `ec_deployment_traffic_filter_association` resource docs: https://github.com/elastic/terraform-provider-ec/blob/master/docs/resources/deployment_traffic_filter_association.md
- `ec_stack` data source docs: https://github.com/elastic/terraform-provider-ec/blob/master/docs/data-sources/stack.md
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- Elastic Cloud Hosted regions and deployment templates: https://www.elastic.co/docs/reference/cloud/cloud-hosted/ec-regions-templates-instances
- Elastic Cloud Hosted FAQ on resizing and downtime: https://www.elastic.co/guide/en/cloud/current/ec-faq-getting-started.html
- Elastic Cloud API update deployment docs: https://www.elastic.co/docs/api/doc/cloud/operation/operation-update-deployment
- Elasticsearch plugin docs for `analysis-icu`: https://www.elastic.co/guide/en/elasticsearch/plugins/current/analysis-icu.html
- Elasticsearch plugin docs for `analysis-phonetic`: https://www.elastic.co/guide/en/elasticsearch/plugins/current/analysis-phonetic.html

## Issues Found
- The provider example used `apikey = var.ec_api_key` but the text instructed readers to export `EC_API_KEY`. Those are different authentication paths. I changed the provider block to `provider "ec" {}` so it correctly matches the documented `EC_API_KEY` environment-variable flow.
- The provider version constraint was pinned to `~> 0.10`, while the current provider line is `0.12.x` and Elastic explicitly recommends using the latest provider versions. I updated the example to `~> 0.12`.
- The post used an `apm` block while also selecting the latest stack version through `data.ec_stack.latest.version`. In current provider docs, `apm` is deprecated for stack versions `8.0+` and `integrations_server` replaces it. I changed the snippet to use `integrations_server`.
- The output examples used `ec_deployment.app_search.elasticsearch[0]` and `kibana[0]`. In the current provider schema and official examples, these are singleton attributes, so the correct references are `ec_deployment.app_search.elasticsearch.https_endpoint` and `ec_deployment.app_search.kibana.https_endpoint`. I corrected both outputs.
- The scaling section claimed `tofu apply` would use "zero downtime through a rolling restart." Current Elastic Cloud documentation does not guarantee that implementation detail for these plan changes, and the API supports multiple plan strategies. I rewrote the sentence to match the official docs: Elastic Cloud applies the resize plan in the background, and highly available deployments are resized without downtime.

## Review Notes
- The deployment template IDs used in the post, including `aws-storage-optimized` and `aws-general-purpose`, are valid current Elastic Cloud Hosted template IDs, but the exact set of templates varies by region.
- The `plugins` list in `elasticsearch.config` is supported by the provider, but the available plugin set depends on the selected stack version.
