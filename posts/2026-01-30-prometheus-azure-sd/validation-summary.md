# Validation Summary: How to Create Prometheus Azure SD (Service Discovery)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (Azure Service Discovery)
- Azure (VMs, VM Scale Sets, Resource Groups, Tags)
- Azure CLI (`az` command)
- Azure Service Principal / Managed Identity
- Kubernetes (Secrets, Deployments)
- YAML configuration
- `promtool`

## Sources Consulted
- Prometheus official documentation — Configuration / `azure_sd_config`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#azure_sd_config
- Prometheus source code for Azure SD: https://github.com/prometheus/prometheus/tree/main/discovery/azure
- Azure CLI reference for `az ad sp create-for-rbac`: https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Azure CLI reference for `az vm identity assign` and `az role assignment create`
- Prometheus relabel_config reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config

## Issues Found

1. **Incorrect meta label name** — The post listed `__meta_azure_resource_group` in the labels table and used it in the production config. The actual label exposed by Prometheus Azure SD is `__meta_azure_machine_resource_group`. Fixed in the labels table and in the production `relabel_configs` example so the rule actually produces a value.
2. **Missing `authentication_method` for Managed Identity** — The Managed Identity example only set `subscription_id` and `port` and relied on a comment to imply behavior. Prometheus requires `authentication_method: ManagedIdentity` (default is `OAuth`); without it, Prometheus would still try OAuth and fail. Added the field to the example.
3. **Incomplete labels table** — While correcting the resource group label, also added `__meta_azure_tenant_id`, `__meta_azure_machine_id`, and `__meta_azure_machine_computer_name`, which are part of the documented Azure SD label set and were missing from the table.

## Review Notes
- The `resource_group` field on `azure_sd_config` (used in the "Filtering by Resource Group" section) was added in Prometheus 2.35. The post already states "Prometheus 2.x or later" as a prerequisite; users on very old 2.x releases (< 2.35) would not have this option. Not flagged as an error since the post's prerequisite is broad enough.
- The dynamic-port relabeling pattern works but is a little subtle: it first overwrites `__address__` with the port-only value from the tag, then concatenates the private IP and the now port-only `__address__`. Technically correct, kept as-is to preserve the author's style.
- `az ad sp create-for-rbac` output format (`appId`, `displayName`, `password`, `tenant`) is current and accurate.
- The Mermaid diagrams render and reflect the described flow accurately.
- Prometheus debug log line format example (`level=debug ts=...`) matches Prometheus 2.x logfmt-style output; newer Prometheus 3.x uses slog-style structured logging by default, but logfmt remains supported, so the example is still valid.
