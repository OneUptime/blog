# Validation Summary: How to Create Grafana Dashboards with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform / HCL2
- Grafana Terraform provider (`grafana/grafana`)
- `grafana_dashboard` and `grafana_folder` resources
- Prometheus / node_exporter metrics (PromQL)
- Grafana dashboard JSON model (panels, templating, thresholds, fieldConfig)

## Sources Consulted
- HCL Native Syntax Specification — https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- Terraform Configuration Syntax — https://developer.hashicorp.com/terraform/language/syntax/configuration
- Grafana Terraform provider — `grafana_dashboard` resource docs (https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/dashboard)
- Grafana Terraform provider — `grafana_folder` resource docs (https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/folder)
- terraform-provider-grafana issue #2502 (folder ID vs UID inconsistent plan)
- Grafana dashboard JSON model reference — https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/view-dashboard-json-model/
- node_exporter metric naming conventions

## Issues Found
1. **Invalid HCL syntax — semicolon as separator.** The original declaration `variable "grafana_auth" { type = string; sensitive = true }` is not valid HCL2. The HCL Native Syntax Specification requires attributes inside a block body to be terminated by a newline; semicolons are not in HCL's token list. The single-attribute one-liner `variable "grafana_url" { type = string }` is valid via the `OneLineBlock` production, but multi-attribute one-liners are not. Rewrote both variables in standard multi-line block form so they parse correctly under `terraform validate`.
2. **`grafana_folder.<name>.id` reference replaced with `.uid`.** While the `folder` argument on `grafana_dashboard` accepts either an ID or a UID, the official provider examples use `.uid`, and there is a known upstream bug (terraform-provider-grafana#2502) where referencing `.id` (which is constructed from the folder's URL/path) produces "Provider produced inconsistent final plan" errors on apply. Switching to `.uid` is the safe, currently-recommended pattern and matches the resource documentation.

## Review Notes
- The pinned provider version `~> 2.0` is older — the current major is v4.x. The HCL examples in the post still work against v2.x of the provider, and v2.x is the supported floor for the syntax shown, so the constraint was left as-is. Readers writing greenfield code today would typically pick a newer constraint (`~> 3.0` or `~> 4.0`).
- The Prometheus expressions for CPU, memory, disk, and network are correct against standard `node_exporter` metric names (`node_cpu_seconds_total`, `node_memory_MemAvailable_bytes`, `node_memory_MemTotal_bytes`, `node_filesystem_avail_bytes`, `node_filesystem_size_bytes`, `node_network_receive_bytes_total`, `node_network_transmit_bytes_total`).
- Panel `type` values (`timeseries`, `gauge`, `stat`, `heatmap`) are valid current Grafana panel plugin IDs.
- The templating variable `refresh = 2` corresponds to "On time range change" in Grafana's enum (0=Never, 1=On dashboard load, 2=On time range change), which is correct.
- The templating `datasource = "Prometheus"` uses the legacy string-name form. Modern dashboard JSON typically uses a `{type, uid}` object, but the string form continues to be accepted for backward compatibility and works fine when only one Prometheus datasource exists by that name.
- Panel `targets` do not include a per-target `datasource` field, which is technically valid (they inherit the dashboard/panel default), but adding one is recommended for multi-datasource dashboards.
