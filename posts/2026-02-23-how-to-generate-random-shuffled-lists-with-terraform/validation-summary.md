# Validation Summary: How to Generate Random Shuffled Lists with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp Random Provider (~> 3.6) — `random_shuffle` resource
- HashiCorp AWS Provider (~> 5.0)
- AWS resources: `aws_availability_zones` (data source), `aws_subnet`, `aws_route53_record` (weighted routing policy)
- Terraform built-in functions: `formatdate`, `timestamp`, `cidrsubnet`, `md5`, `join`, `length`

## Sources Consulted
- Terraform Random Provider — `random_shuffle` resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/shuffle
- Terraform `formatdate` function: https://developer.hashicorp.com/terraform/language/functions/formatdate
- Terraform `timestamp` function: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform `cidrsubnet` function: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- AWS Provider `aws_route53_record` (weighted routing policy): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS Provider `aws_availability_zones` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- AWS Provider `aws_subnet` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet

## Issues Found
- **`formatdate("YYYY-WW", timestamp())` is invalid.** Terraform's `formatdate` function does not support a `W` (week-of-year) specifier. Per the official docs, any letters that are not recognized specifiers are reserved and must be escaped with single quotes; an unescaped `W` either errors at plan time or, at best, would never change (defeating the purpose of a "weekly" keeper). Changed the keeper to a monthly rotation using the supported `YYYY-MM` format (`rotation_month = formatdate("YYYY-MM", timestamp())`) and updated the comment to "Reshuffle monthly to distribute load." This preserves the time-based reshuffling intent while using a specifier that actually works.

## Review Notes
- The `random_shuffle` resource arguments used (`input`, `result_count`, `keepers`) are all valid and match the current Random Provider 3.6 schema. The `result` attribute is correctly referenced.
- The `aws_route53_record` weighted-routing example correctly uses `weighted_routing_policy { weight = ... }` and `set_identifier`, which is the right pattern for co-located weighted records.
- `cidrsubnet("10.0.0.0/16", 8, count.index)` correctly produces `/24` subnets at offsets 0, 1, 2.
- Using `timestamp()` inside `keepers` will trigger a re-shuffle every plan run because `timestamp()` returns the current apply time; the post addresses this correctly by wrapping it in `formatdate` to bucket time into stable periods. (The `per_deploy` example intentionally uses bare `timestamp()` to demonstrate forced reshuffling — that's accurate.)
- The post does not mention the optional `seed` argument on `random_shuffle`, which can produce deterministic shuffles. Not an error — just a minor omission for completeness.
- Worth noting (not a bug): the shard-distribution example computes `idx % length(var.database_shards)` against the shuffled result. Since `result_count` defaults to the input length, the modulo is harmless here, but readers should be aware that if `result_count` were smaller than `length(database_shards)`, the modulo would need to use `length(random_shuffle.shard_assignment.result)` instead.
