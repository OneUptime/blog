# Validation Summary: How to Configure Autoscaling Predictive Policies Based on Historical Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Managed instance groups
- Compute Engine autoscaler
- Predictive autoscaling
- Cloud Monitoring metrics and PromQL
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Compute Engine predictive autoscaling documentation: https://docs.cloud.google.com/compute/docs/autoscaler/predictive-autoscaling
- Google Cloud CLI `set-autoscaling` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/set-autoscaling
- Google Cloud CLI `update-autoscaling` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/update-autoscaling
- Google Cloud autoscaler management documentation, including scale-in controls: https://docs.cloud.google.com/compute/docs/autoscaler/managing-autoscalers
- Google Cloud Monitoring metric list for Compute Engine instance group metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Monitoring PromQL documentation: https://docs.cloud.google.com/monitoring/promql
- Terraform Registry `google_compute_autoscaler` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_autoscaler

## Issues Found
- Predictive autoscaling was described as working with CPU utilization or other metrics. Google Cloud currently supports predictive autoscaling only for CPU utilization, so the explanation and custom metrics section were corrected.
- The post said predictive autoscaling requires 14 days of history. Google Cloud requires at least 3 days of CPU-based autoscaling history before predictions can affect decisions, while using up to 3 weeks of history as more data is collected. The prerequisites and closing summary were updated.
- The gcloud predictive autoscaling values were shown as `OPTIMIZE_AVAILABILITY` and `NONE`. The gcloud CLI uses `optimize-availability` and `none`, so the command and prose were updated. The Terraform value remains uppercase because that is correct for the provider/API field.
- The Cloud Monitoring example used MQL with an incorrect monitored resource. MQL is no longer the recommended query language, so the example was changed to PromQL using the documented metric names and `instance_group` monitored resource.
- The custom metric command incorrectly combined a custom Cloud Monitoring metric with `--cpu-utilization-predictive-method`. Predictive autoscaling is CPU-only, so the command was changed to reactive custom-metric autoscaling and the section was retitled.
- The custom metric target type used `GAUGE`, but the gcloud CLI accepts lowercase values such as `gauge`. The command was corrected.
- The scale-in control command used non-existent split flags. It was corrected to the documented `--scale-in-control max-scaled-in-replicas=10%,time-window=600` syntax.
- The prediction window was described as a fixed 30 to 60 minutes. Google Cloud documents that the initialization period controls how far in advance instances are started, so that explanation was corrected.

## Review Notes
The Terraform autoscaler snippet uses the correct `cpu_utilization.predictive_method = "OPTIMIZE_AVAILABILITY"` setting. The example references `google_compute_instance_template.my_template` without defining it in the snippet, which is acceptable for a focused autoscaler example but would need a template resource in a complete Terraform module.
