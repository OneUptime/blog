# Validation Summary: How to Configure Azure VM Scale Sets with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Azure Virtual Machine Scale Sets (VMSS)
- azurerm Terraform provider (`azurerm_linux_virtual_machine_scale_set`, `azurerm_monitor_autoscale_setting`, `azurerm_lb`, `azurerm_lb_backend_address_pool`, `azurerm_lb_probe`, `azurerm_lb_rule`, `azurerm_virtual_machine_scale_set_extension`)
- Azure Load Balancer (Standard SKU)
- Azure Monitor Autoscale
- Azure VM Extensions (CustomScript)
- Managed Identity

## Sources Consulted
- azurerm provider docs — `azurerm_linux_virtual_machine_scale_set`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine_scale_set
- azurerm provider docs — `azurerm_monitor_autoscale_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting
- azurerm provider docs — `azurerm_lb`, `azurerm_lb_probe`, `azurerm_lb_rule`, `azurerm_lb_backend_address_pool`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb
- azurerm provider docs — `azurerm_virtual_machine_scale_set_extension`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_scale_set_extension
- Azure docs — VMSS rolling upgrades and health probes: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-upgrade-scale-set
- Azure docs — Custom Script Extension for Linux (publisher `Microsoft.Azure.Extensions`, type `CustomScript`, version 2.1): https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux
- Azure docs — Ubuntu 20.04 LTS Gen2 image reference (`Canonical` / `0001-com-ubuntu-server-focal` / `20_04-lts-gen2`)

## Issues Found
No technical issues found. All resource types, argument names, and nested block structures match the current azurerm provider schema:

- `azurerm_linux_virtual_machine_scale_set` arguments (`sku`, `instances`, `admin_ssh_key`, `source_image_reference`, `os_disk`, `network_interface`, `identity`, `upgrade_mode`, `rolling_upgrade_policy`, `health_probe_id`, `custom_data`) are correct.
- `rolling_upgrade_policy` fields (`max_batch_instance_percent`, `max_unhealthy_instance_percent`, `max_unhealthy_upgraded_instance_percent`, `pause_time_between_batches`) are all valid.
- `azurerm_monitor_autoscale_setting` — `profile`, `capacity`, `rule.metric_trigger`, `rule.scale_action`, `recurrence` (with `timezone`, `days`, `hours`, `minutes`), and `notification.email` blocks are correct.
- `azurerm_lb_rule` uses the current plural `backend_address_pool_ids` list argument.
- CustomScript extension uses the correct publisher (`Microsoft.Azure.Extensions`), type (`CustomScript`), and current handler version `2.1`.
- Ubuntu 20.04 Gen2 image reference (`0001-com-ubuntu-server-focal` / `20_04-lts-gen2`) is correct.

## Review Notes
- The scheduled `business-hours` profile only defines a start recurrence (Mon–Fri at 07:00 UTC). Scheduled autoscale profiles in Azure typically use paired recurrences (one to enter and one to exit the schedule) — without a trailing recurrence, the profile will remain active after business hours until another higher-priority profile takes over. This is syntactically valid but readers planning real deployments should usually add a second profile or a "default"-named return profile.
- `pause_time_between_batches = "PT0S"` means no pause between rolling upgrade batches; for production workloads a small pause (e.g., `PT30S` or longer) is often safer to let newly upgraded instances stabilize against the health probe.
- Ubuntu 20.04 LTS reaches standard end-of-life support in April 2025; new deployments may want to consider `22_04-lts-gen2` or `24_04-lts` image SKUs instead, though the 20.04 reference is still syntactically valid.
- The CustomScript extension example stores the storage account key directly in `protected_settings`; using a managed identity with `azurerm_role_assignment` and a SAS-less blob URL is a more modern approach, but the shown pattern still works.
