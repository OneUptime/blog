# Validation Summary: How to Handle GKE Cluster Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes
- Google Cloud CLI (`gcloud`)
- `kubectl`
- Managed Service for Prometheus
- Backup for GKE
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota
- Workload Identity Federation for GKE

## Sources Consulted
- Google Cloud CLI reference for `gcloud container clusters create`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud CLI reference for `gcloud container clusters update`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud CLI reference for `gcloud container clusters upgrade`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/upgrade
- Google Cloud CLI reference for `gcloud container node-pools create`: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud CLI reference for `gcloud container node-pools update`: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Google Cloud CLI reference for Backup for GKE backup plans: https://cloud.google.com/sdk/gcloud/reference/beta/container/backup-restore/backup-plans/create
- Google Cloud documentation for GKE release schedules: https://cloud.google.com/kubernetes-engine/docs/release-schedule
- Google Cloud documentation for Managed Service for Prometheus and `PodMonitoring`: https://cloud.google.com/stackdriver/docs/managed-prometheus
- Kubernetes documentation for NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation for ResourceQuota: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found
- The post used `gcloud container node-pools upgrade`, which is not the documented command path for GKE node pool upgrades. Changed the node pool version upgrade example to use `gcloud container clusters upgrade my-cluster --node-pool default-pool`.
- The post used an upgrade command to set node pool surge settings. Changed that example to `gcloud container node-pools update`, which is the documented command for configuring node pool upgrade settings.
- The post hard-coded `1.28.5-gke.1200` as an upgrade target. That version is stale for a 2026 review and may not be available in current GKE release channels. Replaced it with `<available-version>` so the command aligns with the preceding `get-server-config` lookup.
- The Backup for GKE example used a `locations/us-central1-a` cluster resource path for a zonal cluster. Updated it to the documented zonal form: `projects/my-project/zones/us-central1-a/clusters/my-cluster`.

## Review Notes
The remaining examples are generally valid as illustrative commands and Kubernetes manifests, but several GKE features depend on cluster mode, release channel, region, project settings, and enabled APIs. Readers should still confirm available GKE versions and regional feature availability before running the commands in production.
