# Validation Summary: How to Set Up a Managed Instance Group with Autohealing Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Managed instance groups
- Autohealing health checks
- Google Cloud CLI
- VPC firewall rules
- Terraform Google provider
- Nginx on Debian 12

## Sources Consulted
- Google Cloud Compute Engine: Set up an application-based health check and autohealing: https://docs.cloud.google.com/compute/docs/instance-groups/autohealing-instances-in-migs
- Google Cloud SDK reference: `gcloud compute instance-groups managed create`: https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/create
- Google Cloud SDK reference: `gcloud compute operations list`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/operations/list
- Google Cloud SDK reference: `gcloud compute firewall-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud Load Balancing health check concepts: https://cloud.google.com/load-balancing/docs/health-check-concepts
- Terraform Google provider: `google_compute_instance_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template
- Terraform Google provider: `google_compute_health_check`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_health_check
- Terraform Google provider: `google_compute_instance_group_manager`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_group_manager
- Terraform Google provider: `google_compute_firewall`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall

## Issues Found
- The Terraform example was described as the complete equivalent setup but omitted the required firewall rule for Google health check probes. I added a `google_compute_firewall` resource allowing TCP port 80 from `130.211.0.0/22` and `35.191.0.0/16` to instances tagged `http-server`.
- The Terraform instance template did not include an `access_config` block, so the VMs would not receive ephemeral public IP addresses by default. That would make the startup script's `apt-get update` and `apt-get install -y nginx` fail in a default setup without Cloud NAT. I added an empty `access_config` block to match the behavior readers expect from the CLI example.
- The operations log command filtered for `operationType:recreateInstances`, which is not the documented autohealing repair operation pattern. I changed it to `operationType~compute.instances.repair.*`, matching Google Cloud's autohealing operations guidance.

## Review Notes
The local workspace does not have `gcloud` installed, so CLI syntax was verified against the official Google Cloud SDK reference instead of local `--help` output. The remaining commands, flags, health check parameters, firewall source ranges, and Terraform resource fields are consistent with the consulted official documentation.
