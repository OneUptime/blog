# Validation Summary: How to Implement Prometheus EC2 SD (Service Discovery)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (v2.x) — service discovery and relabeling
- AWS EC2 — instances, tags, metadata
- AWS IAM — roles, policies, instance profiles, users
- AWS CLI — `aws iam`, `aws ec2` commands
- Terraform / HCL — AWS provider resources (`aws_iam_role`, `aws_iam_role_policy`, `aws_iam_instance_profile`, `aws_security_group`, `aws_instance`)
- Node Exporter, Redis Exporter (referenced as scrape targets)
- PromQL (debugging queries and alerting rules)

## Sources Consulted
- Prometheus EC2 SD configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#ec2_sd_config
- Prometheus EC2 SD source: https://github.com/prometheus/prometheus/blob/main/discovery/aws/ec2.go
- Prometheus SD metrics source: https://github.com/prometheus/prometheus/blob/main/discovery/metrics_refresh.go and https://github.com/prometheus/prometheus/blob/main/discovery/refresh/refresh.go
- Prometheus relabel_config documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
- AWS CLI reference for `associate-iam-instance-profile`: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-iam-instance-profile.html
- AWS IAM and EC2 documentation for trust policies and instance profiles
- Terraform AWS provider documentation for `aws_iam_role`, `aws_iam_role_policy`, `aws_iam_instance_profile`, `aws_security_group`, `aws_instance`

## Issues Found

**1. Incorrect metric name in the `PrometheusEC2SDError` alerting rule.** The post used `prometheus_sd_ec2_refresh_failures_total`, which does not exist in modern Prometheus 2.x. Service discovery refresh failure metrics were unified into a generic `CounterVec` exposed as `prometheus_sd_refresh_failures_total` with a `mechanism` label (per `discovery/metrics_refresh.go`). Users copy-pasting the original name into their alert rules would silently get no data, defeating the purpose of the alert.

Fix: changed the alert expression from `prometheus_sd_ec2_refresh_failures_total > 0` to `rate(prometheus_sd_refresh_failures_total{mechanism="ec2"}[5m]) > 0`, which is the correct metric and uses `rate()` so the alert fires on new failures rather than any historical failure ever recorded.

## Review Notes

- All `__meta_ec2_*` labels listed in the post are real and current — verified against the EC2 SD source (`discovery/aws/ec2.go`). Newer Prometheus versions also expose `__meta_ec2_region`, which could simplify the region-extraction relabel in the multi-region example, but using the AZ regex still works correctly.
- The relabel snippet that maps `__meta_ec2_public_ip` to `__address__` will produce an invalid address (`:9100`) for instances that have no public IP. The post relies on context (the section is explicitly about using public IP), so this was left as-is, but readers should pair it with a filter or a `keep` action on a non-empty `__meta_ec2_public_ip` in production.
- The `metrics_path: /actuator/prometheus` example targets Spring Boot Actuator's Micrometer Prometheus endpoint — correct and a common real-world choice.
- The Terraform configuration references `var.vpc_id`, `var.allowed_cidr`, `var.ami_id`, `var.private_subnet_id`, `var.public_subnet_id` without showing a `variables.tf` block. This is consistent with the rest of the post being a reference rather than a complete drop-in module, so left unchanged.
- The Prometheus version downloaded in the Terraform `user_data` (v2.48.0) is older than current releases, but it is a real, working version and the example is illustrative.
- AWS CLI commands, IAM policy/trust-policy JSON, YAML schema, and HCL syntax all verified as correct.
