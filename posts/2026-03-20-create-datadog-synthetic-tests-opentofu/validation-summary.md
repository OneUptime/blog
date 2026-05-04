# Validation Summary: How to Create Datadog Synthetic Tests with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Datadog Synthetic Tests (HTTP API, SSL, Multistep API)
- Datadog Terraform Provider (DataDog/datadog ~> 3.0)
- Datadog Monitors

## Sources Consulted
- [Datadog Terraform Provider — datadog_synthetics_test resource docs](https://github.com/DataDog/terraform-provider-datadog/blob/master/docs/resources/synthetics_test.md)
- [Terraform Registry — DataDog/datadog provider](https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/synthetics_test)
- [GitHub issue #1492 — synthetics_check_id on synthetics alert monitors](https://github.com/DataDog/terraform-provider-datadog/issues/1492)

## Issues Found

1. **SSL test `port` field had wrong type.** The post used `port = 443` (number), but the provider schema declares `port` inside `request_definition` as a String. Updated to `port = "443"`.

2. **`datadog_monitor` for synthetic alerts was incorrect.** The original "Alerting on Test Failures" section created a standalone `datadog_monitor` with `type = "synthetics alert"` and a metric-style query (`synthetics.run_results.failed{*}`). Synthetic alert monitors are not creatable as standalone metric monitors with this query syntax — they are auto-created and linked to the synthetic test via the test's own `monitor_id`. The proper way to control alert notifications is via the top-level `message` field on the `datadog_synthetics_test` resource (with optional `tags` for routing). Replaced the section with a corrected example using `message` and `tags` on the synthetic test itself.

## Review Notes

- The provider source `DataDog/datadog ~> 3.0` is correct and current.
- All other schema usage was verified correct: `request_definition` with `method`/`url`/`timeout`, `request_headers` as a top-level map, `assertion` blocks (`statusCode`/`responseTime`/`body`/`certificate` types with `is`/`lessThan`/`contains`/`isInMoreThan` operators), `options_list` (`tick_every`, `min_failure_duration`, `min_location_failed`, `retry`, `monitor_options.renotify_interval`), `api_step` blocks for multistep tests, `extracted_value` (singular) with nested `parser` using `type = "json_path"` and `value`, and the `aws:<region>` location format.
- Subtypes used (`http`, `ssl`, `multi`) are all valid for `type = "api"`.
- The `{{ auth_token }}` templating between API steps is the correct Datadog syntax for using extracted values in subsequent steps.
