# Validation Summary: How to Manage Elastic Cloud Resources with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- Elastic Cloud (`elastic/ec` provider)
- Elastic Stack / Elasticsearch (`elastic/elasticstack` provider)
- Kibana spaces
- Elasticsearch Index Lifecycle Management (ILM)
- Elasticsearch index templates

## Sources Consulted
- Elastic Cloud provider registry page: https://registry.terraform.io/providers/elastic/ec
- Elastic Stack provider registry page: https://registry.terraform.io/providers/elastic/elasticstack
- Elastic Cloud provider README: https://github.com/elastic/terraform-provider-ec
- Elastic Cloud provider `ec_stack` data source docs: https://github.com/elastic/terraform-provider-ec/blob/master/docs/data-sources/stack.md
- Elastic Cloud provider `ec_deployment` resource docs: https://github.com/elastic/terraform-provider-ec/blob/master/docs/resources/deployment.md
- Elastic docs, Manage Integrations Server: https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/manage-integrations-server
- Elastic Stack provider README: https://github.com/elastic/terraform-provider-elasticstack
- Elastic Stack provider `elasticstack_elasticsearch_index_template` docs: https://github.com/elastic/terraform-provider-elasticstack/blob/main/docs/resources/elasticsearch_index_template.md
- Elastic Stack provider `elasticstack_elasticsearch_index_lifecycle` docs: https://github.com/elastic/terraform-provider-elasticstack/blob/main/docs/resources/elasticsearch_index_lifecycle.md
- Elastic Stack provider `elasticstack_kibana_space` docs: https://github.com/elastic/terraform-provider-elasticstack/blob/main/docs/resources/kibana_space.md
- Elasticsearch ILM rollover docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- Elasticsearch ILM shrink docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-shrink.html
- Elasticsearch ILM error handling docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-error-handling.html
- Kibana spaces docs: https://www.elastic.co/guide/en/kibana/current/xpack-spaces.html
- Kibana features API docs: https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-features

## Issues Found
- The post used outdated provider version constraints (`elastic/ec ~> 0.9` and `elastic/elasticstack ~> 0.11`). I updated them to current supported minor lines (`~> 0.12` and `~> 0.14`) based on the current official provider releases.
- The deployment example used legacy `ec_deployment` block syntax (`elasticsearch {}` / `kibana {}`) that was replaced by attribute syntax in newer `elastic/ec` releases. I converted the example to the current `elasticsearch = {}` and `kibana = {}` form.
- The example referenced `ec_deployment_template`, but the current provider documents `ec_deployment_templates` and the snippet as written would not resolve a valid template ID. I replaced that with the documented `ec_stack` data source for stack version discovery and a current documented deployment template ID.
- The deployment example pinned Elastic Stack `8.12.0`, which is stale for a March 2026 post. I switched it to `data.ec_stack.latest.version` so the example matches current provider guidance.
- The example used the deprecated `apm` deployment block for an 8.x deployment. Elastic documents `integrations_server` as the replacement for stack versions later than 8.0, so I updated the example accordingly.
- The deployment example included `config { plugins = [] }` inside `elasticsearch`, which is not valid in the current `ec_deployment` schema. I removed that block.
- The outputs used old singleton-list accessors (`elasticsearch[0]` and `kibana[0]`). The current schema exposes these as singleton objects, so I corrected the output references.
- The `elasticstack` provider authentication example used nonexistent nested username/password fields under `ec_deployment.main.elasticsearch`. I updated it to use the documented root attributes `elasticsearch_username` and `elasticsearch_password`.
- The post configured only the Elasticsearch connection for the `elasticstack` provider, but the Kibana space resource also needs a Kibana connection. I added the documented Kibana provider block using the deployment’s Kibana endpoint and credentials.
- The index template and ILM examples combined a rollover alias setting with no alias bootstrap step. Elastic’s rollover docs require a properly bootstrapped write alias, and Elastic’s ILM troubleshooting docs call this out as a common error. I removed the rollover alias and rollover action to keep the example self-contained and valid.
- The template set `number_of_shards = 1` while the ILM policy later tried to shrink to `1` shard. Elastic’s shrink docs require the target shard count to be lower than, and a factor of, the source shard count. I changed the template to `2` primary shards so the warm-phase shrink to `1` is valid.
- The Kibana space example used feature IDs that are not demonstrated in current docs. I changed them to current feature IDs (`discover` and `apm`) that align with Kibana’s documented spaces/features APIs.

## Review Notes
- The `ec_stack` data source with `version_regex = "latest"` follows Elastic’s current examples, but it tracks the newest supported stack release. If stricter reproducibility is needed, pin an explicit stack version or use the `lock` option documented on `ec_stack`.
