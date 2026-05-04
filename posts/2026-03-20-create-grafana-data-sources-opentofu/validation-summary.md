# Validation Summary: How to Create Grafana Data Sources with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide — walks through configuring multiple Grafana data sources (Prometheus, Loki, Tempo, CloudWatch, Elasticsearch, PostgreSQL) using the `grafana/grafana` Terraform/OpenTofu provider's `grafana_data_source` resource.

## Technologies Covered
- OpenTofu / Terraform
- Grafana Terraform provider (`grafana/grafana`)
- `grafana_data_source` resource
- Prometheus (with exemplar trace ID destinations)
- Loki (with derived fields)
- Tempo (with traces-to-logs and traces-to-metrics correlation)
- AWS CloudWatch
- Elasticsearch / OpenSearch
- PostgreSQL

## Sources Consulted
- [grafana_data_source resource — Terraform Registry](https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/data_source)
- [grafana/terraform-provider-grafana — data_source.md](https://github.com/grafana/terraform-provider-grafana/blob/main/docs/resources/data_source.md)
- [Configure the Loki data source — Grafana docs](https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/)
- [Configure the Tempo data source — Grafana docs](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/)
- [Provision the Tempo data source — Grafana docs](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/)
- [Configure trace to logs correlation — Grafana docs](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/)
- [Configure the Amazon CloudWatch data source — Grafana docs](https://grafana.com/docs/grafana/latest/datasources/aws-cloudwatch/configure/)
- [Configure AWS authentication — Grafana docs](https://grafana.com/docs/grafana/latest/datasources/aws-cloudwatch/aws-authentication/)
- [Configure the Elasticsearch data source — Grafana docs](https://grafana.com/docs/grafana/latest/datasources/elasticsearch/configure/)
- [Configure the PostgreSQL data source — Grafana docs](https://grafana.com/docs/grafana/latest/datasources/postgres/configure/)

## Issues Found

1. **Loki `derivedFields.url` was malformed.** The post had `url = "${grafana_data_source.tempo.uid}/$${__value.raw}"`. When `datasourceUid` is set on a derived field, the `url` value is interpreted as the **query** to run against that target data source — it should not be prefixed with the datasource UID. Per Grafana provisioning examples, this should just be `"$${__value.raw}"` so the captured trace ID is used as the Tempo query. Fixed: removed the `${grafana_data_source.tempo.uid}/` prefix.

2. **CloudWatch `accessKey` was placed in `json_data_encoded` instead of `secure_json_data_encoded`.** Grafana's official YAML provisioning example for the CloudWatch data source places **both** `accessKey` and `secretKey` under `secureJsonData`. The post had `accessKey` exposed in the regular (non-encrypted) `jsonData`, which would have stored it in plaintext in Grafana's database and contradicted the post's own conclusion advising readers to keep secrets in `secure_json_data_encoded`. Fixed: moved `accessKey = var.aws_access_key_id` into the `secure_json_data_encoded` block alongside `secretKey`.

## Review Notes

- **`tracesToLogs` is the legacy form.** Grafana now recommends `tracesToLogsV2`, which has a different `tags` shape (`[{ key = "app" }, { key = "pod" }]` instead of `["app", "pod"]`) plus extra fields (`spanStartTimeShift`, `spanEndTimeShift`, `filterByTraceID`, etc.). The legacy `tracesToLogs` block still functions for backward compatibility, so this was not changed — but readers targeting recent Grafana versions should consider migrating to `tracesToLogsV2`.
- **Provider pin is conservative.** The post pins to `grafana/grafana ~> 2.0`. The current major version (as of 2026-05-04) is 4.x. The schema fields used in the post (`is_default`, `json_data_encoded`, `secure_json_data_encoded`, `database_name`, `basic_auth_*`, `username`, `url`, `type`, `name`) all exist in the 4.x provider as well, so the examples remain compatible — but readers may want to bump the constraint.
- **PostgreSQL plugin ID transition.** Starting with Grafana 10.2.3, the built-in PostgreSQL data source plugin was renamed from `postgres` to `grafana-postgresql-datasource`. The `type = "postgres"` value used here still works for older Grafana versions and is generally accepted, but readers running newer Grafana with the new plugin ID may need `type = "grafana-postgresql-datasource"` instead.
- **`postgresVersion = 1400` format is correct** — Grafana encodes PostgreSQL versions as integers where 1400 = 14.0.
- **Elasticsearch `index`/`timeField`/`esVersion`/`interval` placement in `jsonData` is correct** — the legacy top-level `database` field for the index pattern is deprecated in favor of `jsonData.index`, which the post already uses.
