# Validation Summary: How to Configure GKE Release Channels for Automatic Cluster Version Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE release channels
- Google Cloud CLI (`gcloud`)
- Kubernetes (`kubectl`)
- Terraform Google provider
- Cloud Logging
- GKE cluster notifications

## Sources Consulted
- Google Cloud: About GKE release channels - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/release-channels
- Google Cloud: Use GKE release channels - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/release-channels
- Google Cloud SDK: `gcloud container clusters create` - https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud SDK: `gcloud container clusters update` - https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud: Configure maintenance windows and exclusions - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/maintenance-windows-and-exclusions
- Google Cloud: Maintenance windows and exclusions concepts - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/maintenance-windows-and-exclusions
- Google Cloud: About GKE cluster upgrades - https://docs.cloud.google.com/kubernetes-engine/upgrades
- Google Cloud: GKE release schedule - https://docs.cloud.google.com/kubernetes-engine/docs/release-schedule
- Google Cloud: GKE cluster notifications - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/cluster-notifications
- HashiCorp Terraform Registry: `google_container_cluster` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster

## Issues Found
- The post stated that GKE offers only three release channels. GKE also has the Extended channel, so the wording was changed to say the guide focuses on the three commonly used channels.
- The post gave fixed week ranges for Rapid, Regular, and Stable availability. Current GKE release timing varies by version and channel, so those specific ranges were removed.
- The maintenance window command used `--maintenance-window-duration`, which is not part of the current `gcloud container clusters update` recurring-window syntax. It was replaced with `--maintenance-window-end`.
- Maintenance exclusion examples omitted `--add-maintenance-exclusion-scope`. Although the default is `no_upgrades`, current examples and CLI syntax document the scope explicitly, so the examples now include `--add-maintenance-exclusion-scope=no_upgrades`.
- The pause/resume section used `--no-enable-autoupgrade` and `--enable-autoupgrade` on `gcloud container clusters update`. For clusters in release channels, upgrade timing should be controlled with maintenance exclusions. The section now uses a `no_upgrades` maintenance exclusion and removal command.
- The node pool example pinned an old GKE 1.28 patch version, which is unsupported as of the review date. It now uses a placeholder value from `get-server-config`.
- The alerting example used a Cloud Monitoring policy filter against audit-log fields, which is not a valid metric-threshold policy filter. It was replaced with GKE Pub/Sub upgrade notifications using `--notification-config`.
- The testing example assumed a Kubernetes context named exactly `test-cluster`. It now runs `gcloud container clusters get-credentials` before applying manifests with `kubectl`.

## Review Notes
The Terraform snippets use current `release_channel`, `maintenance_policy`, and node pool `management` blocks. The article intentionally remains a concise operational guide; future improvements could mention the Extended channel in more detail and add version-skew guidance for manually managed node pools.
