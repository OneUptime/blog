# Validation Summary: How to Create New Relic Dashboards with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- New Relic Terraform Provider (`newrelic/newrelic` ~> 3.0)
- `newrelic_one_dashboard` resource
- NRQL (New Relic Query Language)
- New Relic dashboard widgets (line, area, billboard, table, heatmap)
- Dashboard template variables

## Sources Consulted
- New Relic Terraform Provider — `newrelic_one_dashboard` resource docs (https://github.com/newrelic/terraform-provider-newrelic/blob/main/website/docs/r/one_dashboard.html.markdown)
- New Relic Terraform Provider — index/configuration docs (https://github.com/newrelic/terraform-provider-newrelic/blob/main/website/docs/index.html.markdown)
- New Relic Terraform Registry (https://registry.terraform.io/providers/newrelic/newrelic/latest/docs)

## Issues Found
No technical issues found.

Verified items:
- Provider block: `account_id`, `api_key`, and `region` ("US"/"EU"/"JP" — post uses "US") are valid arguments.
- Provider source `newrelic/newrelic` and version constraint `~> 3.0` are correct.
- All widget block names used (`widget_line`, `widget_area`, `widget_billboard`, `widget_table`, `widget_heatmap`) are documented widget types.
- `permissions` values `public_read_write`, `public_read_only`, and `private` are the three valid options.
- `nrql_query` schema correctly uses `account_id` (singular) inside widgets and `account_ids` (plural list) inside the variable block.
- `variable` block attributes (`name`, `title`, `type`, `default_values`, `is_multi_selection`, `nrql_query`) match the documented schema.
- `widget_billboard` thresholds (`critical`, `warning`) are valid attributes.
- NRQL functions used (`percentage`, `rate`, `percentile`, `apdex`, `histogram`, `latest`, `uniques`, `sum`) and clauses (`FACET`, `TIMESERIES AUTO`, `WHERE`) are syntactically valid.
- The `apdex(duration, t:0.5)` parameter syntax is the documented form.
- Widget grid layout values (`row`, `column`, `width`, `height`) sit within the dashboard's 12-column grid.

## Review Notes
- The CPU heatmap query `SELECT histogram(cpuPercent, 10, 10) FROM SystemSample FACET hostname TIMESERIES AUTO` is syntactically valid NRQL and accepted by the provider, but combining `histogram()` with both `FACET` and `TIMESERIES` is unusual; some users may find a query without `TIMESERIES` (e.g. `SELECT histogram(cpuPercent, 100, 20) FROM SystemSample FACET hostname`) yields a more conventional heatmap visualization. This is a stylistic NRQL note, not a technical error.
- The post uses `permissions = "public_read_write"` and `"public_read_only"`. The provider's documented default is `public_read_only`, so the second example could omit it; this is not an error.
- The `~> 3.0` version constraint pins to the 3.x minor branch. The provider has had subsequent major versions, but 3.x remains supported and the schemas referenced in this post are stable across recent versions.
