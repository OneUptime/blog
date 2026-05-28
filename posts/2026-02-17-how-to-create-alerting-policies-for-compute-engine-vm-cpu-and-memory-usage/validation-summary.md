# Validation Summary: How to Create Alerting Policies for Compute Engine VM CPU and Memory Usage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Compute Engine
- Cloud Monitoring alerting policies
- Ops Agent metrics
- gcloud CLI
- VM Manager OS policy assignments
- Terraform Google provider

## Sources Consulted
- Google Cloud Monitoring Compute Engine metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Monitoring Ops Agent metrics: https://docs.cloud.google.com/monitoring/api/metrics_opsagent
- Google Cloud Monitoring alert policy API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud Monitoring filter syntax: https://docs.cloud.google.com/monitoring/api/v3/filters
- Google Cloud SDK `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud VM Manager OS policy assignment docs: https://docs.cloud.google.com/compute/vm-manager/docs/os-policies/create-os-policy-assignment
- Terraform Google provider `google_monitoring_alert_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy

## Issues Found
- The CLI example used `gcloud alpha monitoring policies create`. The stable `gcloud monitoring policies create` command supports `--policy-from-file`, so the example was updated to use the current stable command.
- The memory metric state list omitted `slab`. The Ops Agent `agent.googleapis.com/memory/percent_used` metric reports `buffered`, `cached`, `free`, `slab`, and `used`, so the explanatory text was corrected.
- The VM-name scoping example used `metadata.system_labels.name`, which is not a valid alert-policy metric-threshold filter field. It was changed to `metric.labels.instance_name=starts_with("api-server")`, which is supported by the Compute Engine CPU metric.
- The multi-condition alert used `AND`, but `AND` can combine conditions that are true on different resources. For CPU and memory on the same VM, the correct combiner is `AND_WITH_MATCHING_RESOURCE`, so the JSON and explanation were updated.

## Review Notes
The examples intentionally leave notification channel IDs as placeholders or references. To run them unchanged, readers still need an existing Cloud Monitoring notification channel and project-specific identifiers such as VM instance IDs and zones.
