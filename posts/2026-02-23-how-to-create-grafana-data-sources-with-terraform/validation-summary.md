# Validation Summary: How to Create Grafana Data Sources with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL2)
- Grafana
- grafana/grafana Terraform provider (`grafana_data_source` resource)
- Prometheus
- Elasticsearch
- AWS CloudWatch
- InfluxDB (Flux)
- Loki
- Tempo
- PostgreSQL
- Azure Monitor

## Sources Consulted
- HCL2 syntax specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- grafana/grafana Terraform provider docs: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/data_source
- Grafana Loki data source provisioning docs (derivedFields struct)
- Grafana Tempo data source docs (`tracesToLogsV2`, `serviceMap`)
- Grafana Elasticsearch data source source (`grafana-elasticsearch-datasource/src/types.ts`)
- Grafana PostgreSQL data source source (`grafana-postgresql-datasource/configuration/ConfigurationEditor.tsx`)
- Azure Monitor plugin manifest (`grafana-azure-monitor-datasource`)

## Issues Found

1. **Invalid HCL2 one-line variable syntax with semicolons.** Several variable declarations used the form `variable "x" { type = string; sensitive = true }`. HCL2 does not support `;` as an attribute separator — the spec defines `Attribute = Identifier "=" Expression Newline;`. Fixed by expanding all affected variable blocks to multi-line form (`grafana_auth`, `aws_access_key`, `aws_secret_key`, `influxdb_token`, `postgres_password`, `azure_client_secret`, and the simple ones for consistency).

2. **Deprecated Elasticsearch `esVersion` field.** The Elasticsearch data source no longer uses `esVersion` in `json_data` — the field was removed from `ElasticsearchOptions` and Grafana now auto-detects the cluster version. Removed `esVersion = "8.0.0"` from the Elasticsearch `json_data_encoded` block.

3. **Deprecated Tempo `tracesToLogs` config (and wrong `tags` shape).** Grafana 9+ uses `tracesToLogsV2`, and within it `tags` must be an array of objects with a `key` field, not a plain string array. Renamed the block to `tracesToLogsV2` and changed `tags = ["service.name"]` to `tags = [{ key = "service.name" }]`.

## Review Notes

- `grafana_data_source` is correct for the grafana/grafana provider; all eight data source type strings (`prometheus`, `elasticsearch`, `cloudwatch`, `influxdb`, `loki`, `tempo`, `postgres`, `grafana-azure-monitor-datasource`) match the official plugin IDs.
- Loki `derivedFields` field names (`name`, `matcherRegex`, `url`, `datasourceUid`) are correct. The optional `matcherType` (`'label' | 'regex'`) could be added in future versions if non-regex matching is needed.
- PostgreSQL `postgresVersion = 1500` (for PG 15) is the correct integer encoding; valid values include 900–906, 1000, 1100, 1200, 1300, 1400, 1500.
- The `grafana_data_source` resource itself is being gradually superseded by typed resources (e.g., `grafana_data_source_config`) in newer provider versions, but it remains supported and is still the canonical way to manage data sources with the `~> 2.0` provider used in the post.
- The escaped Terraform interpolation `"$${__value.raw}"` in the Loki `derivedFields.url` is correct — it produces the literal `${__value.raw}` template Grafana expects.
