# Validation Summary: How to Use GKE Notifications to Get Alerted on Cluster Upgrade

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE cluster notifications
- Google Cloud Pub/Sub
- Google Cloud CLI
- Cloud Functions / Cloud Run functions
- Cloud Monitoring notification channels
- PagerDuty Events API
- Terraform Google provider
- Python

## Sources Consulted
- Google Cloud GKE: Receive cluster notifications through Pub/Sub: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-notifications
- Google Cloud GKE: Cluster notifications: https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-notifications
- Google Cloud SDK: gcloud container clusters update: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Terraform Registry: google_container_cluster resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Registry: google_pubsub_subscription resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Google Cloud Functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud SDK: gcloud functions deploy: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Monitoring: Create and manage notification channels: https://cloud.google.com/monitoring/support/notification-options
- Google Cloud Monitoring API channels guide: https://cloud.google.com/monitoring/alerts/using-channels-api
- PagerDuty Events API v2 overview: https://developer.pagerduty.com/docs/events-api-v2/overview/

## Issues Found
- The post listed `AutoUpgradeEvent` as a GKE notification type. Current GKE documentation lists `SecurityBulletinEvent`, `UpgradeAvailableEvent`, `UpgradeEvent`, and `UpgradeInfoEvent`, so the notification type list was corrected.
- The post described `UpgradeEvent` as covering upgrade starts and finishes. Current GKE documentation uses `UpgradeEvent` for initiated upgrades and `UpgradeInfoEvent` for completion and other upgrade lifecycle information, so the wording was corrected.
- The example notification JSON incorrectly modeled the Pub/Sub `data` field as a full JSON object with `type` and `cluster` fields. GKE Pub/Sub notifications put human-readable text in `data`, generic metadata in attributes such as `type_url` and `cluster_name`, and structured notification details in `attributes.payload`, so the example and explanation were corrected.
- The Slack Cloud Function decoded `event['data']` and parsed it as JSON. That would not work for GKE notifications because the structured payload is in `event['attributes']['payload']`. The function now parses `attributes.payload`, derives the notification type from `attributes.type_url`, and gets the cluster name from `attributes.cluster_name`.
- The Slack formatter used a non-existent `resource` field for upgrade notifications. GKE's `UpgradeEvent` payload uses `resourceType`, so the formatter now uses that field.
- The Cloud Function deployment used `--runtime python39`. Python 3.9 for Cloud Functions was decommissioned on 2026-04-05, so the example now uses `python312`.
- The PagerDuty handler parsed `event['data']` as JSON and checked `notification.get('type')`. It now parses `attributes.payload`, checks `attributes.type_url`, normalizes severity casing, and uses `attributes.cluster_name` as the PagerDuty source.
- The multi-cluster update loop used `--zone "$location"`, which fails for regional clusters returned by `gcloud container clusters list --format="value(name,location)"`. It now uses `--location "$location"`, which works for both regional and zonal clusters.

## Review Notes
The email section creates a Cloud Monitoring notification channel but does not include the full alerting policy setup. That is technically plausible as a setup step, but a future revision could add a complete log-based alert policy example for GKE cluster notification logs.
