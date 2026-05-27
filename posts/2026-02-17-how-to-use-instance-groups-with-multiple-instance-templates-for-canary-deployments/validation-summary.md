# Validation Summary: How to Use Instance Groups with Multiple Instance Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Managed instance groups
- Instance templates
- Canary deployments
- Google Cloud CLI
- Cloud Monitoring API
- Terraform Google provider
- Cloud Load Balancing

## Sources Consulted
- Google Cloud SDK reference: `gcloud compute instance-groups managed rolling-action start-update` - https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/rolling-action/start-update
- Google Cloud SDK beta reference: `gcloud beta compute instance-groups managed rolling-action start-update` - https://cloud.google.com/sdk/gcloud/reference/beta/compute/instance-groups/managed/rolling-action/start-update
- Google Cloud Compute Engine documentation: Automatically apply VM configuration updates in a MIG - https://cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups
- Google Cloud SDK reference: `gcloud compute instance-groups managed wait-until` - https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/wait-until
- Cloud Monitoring API reference: `projects.timeSeries.list` - https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Terraform Google provider documentation: `google_compute_instance_group_manager` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_group_manager
- Terraform Google provider documentation: `google_compute_instance_template` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template
- Google Cloud Load Balancing documentation: Backend services overview - https://cloud.google.com/load-balancing/docs/backend-service

## Issues Found
- The Cloud Monitoring example used `gcloud monitoring time-series list`, but the current Google Cloud CLI Monitoring groups do not include a `time-series list` command. Replaced it with an authenticated `curl` request to the official Cloud Monitoring `projects.timeSeries.list` REST API, including the required filter, interval, and view parameters.
- The update policy example used `--min-ready` with the GA `gcloud compute instance-groups managed rolling-action start-update` command. The official CLI reference documents `--min-ready` on the beta variant, so the example now uses `gcloud beta compute instance-groups managed rolling-action start-update` and a duration value of `120s`.
- The load balancer section stated that canary traffic is proportional to the instance share without qualification. Adjusted the wording to clarify that this is approximate and assumes identical backend capacity and no session affinity.

## Review Notes
The remaining MIG canary commands, Terraform version blocks, update policy fields, template image formats, and `wait-until --stable` usage match the official documentation. The example Monitoring filter still depends on the user having a custom metric named `custom.googleapis.com/app/error_rate` and a resource label matching the canary instance ID.
