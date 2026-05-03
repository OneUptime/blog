# Validation Summary: How to Manage Datadog Synthetic Tests with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+)
- Datadog Synthetics (API HTTP tests, multi-step API tests, SSL certificate tests)
- Datadog/datadog Terraform/OpenTofu provider (~> 3.39)
- HCL configuration language

## Sources Consulted
- [Datadog/datadog provider — synthetics_test resource (Terraform Registry)](https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/synthetics_test)
- [terraform-provider-datadog docs/resources/synthetics_test.md (master)](https://github.com/DataDog/terraform-provider-datadog/blob/master/docs/resources/synthetics_test.md)
- [Datadog Synthetics HTTP Testing docs](https://docs.datadoghq.com/synthetics/api_tests/http_tests/)
- [GitHub issue #2531 — extracted_value with http_body and `field`](https://github.com/DataDog/terraform-provider-datadog/issues/2531)
- [GitHub issue #440 — datadog_synthetics_test retry option](https://github.com/DataDog/terraform-provider-datadog/issues/440)

## Issues Found
- **`extracted_value` with `field` set when `type = "http_body"`**: The multi-step API test example included `field = "token"` inside the `extracted_value` block. The Datadog API rejects (or ignores) the `field` attribute when the extraction `type` is `http_body` — `field` is intended for `http_header` extractions (to specify which header to read). The body location is determined by the `parser` block (here `json_path` with `$.token`). Removed the `field` line from the example.

## Review Notes
- The `retry { interval = 300 }` value with the comment "300ms between retries" is correct — the Datadog provider documents this attribute in milliseconds (max 5000).
- `monitor_options { renotify_interval = 120 }` is correct (units are minutes per the provider docs); 120 minutes is a reasonable example.
- `tick_every` is in seconds (60 = every minute, 300 = every 5 minutes, 86400 = daily) — matches the inline comments.
- `port = "443"` is intentionally a string in the provider schema (documented as `port (String)`), so the example is correct as written.
- The post's `Description` line mentions "browser tests" but the post itself only covers API/HTTP, multi-step, and SSL tests. Not a technical error, but a future revision could either add a browser test example or drop the mention from the description.
- The `request_headers` map and top-level `assertion` blocks for the api+http test are correctly used; the SSL `request_definition { host, port }` and `assertion { type = "certificate", operator = "isInMoreThan", target = "30" }` match the provider schema.
- `accept_self_signed`, `check_certificate_revocation`, and `monitor_id` (computed) are all valid per the provider schema.
