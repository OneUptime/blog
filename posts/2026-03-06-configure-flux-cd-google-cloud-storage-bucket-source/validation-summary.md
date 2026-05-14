# Validation Summary: How to Configure Flux CD with Google Cloud Storage Bucket Source

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller Bucket sources
- Flux CD kustomize-controller Kustomizations
- Flux CD notification-controller Receivers and Alerts
- Google Cloud Storage buckets, lifecycle rules, Pub/Sub notifications, HMAC keys, and access logs
- Google Kubernetes Engine Workload Identity Federation
- Google Cloud CLI, kubectl, and Cloud Build

## Sources Consulted
- Flux Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux GCP integration documentation: https://fluxcd.io/flux/integrations/gcp/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Cloud Storage Pub/Sub notifications documentation: https://cloud.google.com/storage/docs/pubsub-notifications
- Cloud Storage HMAC key documentation: https://cloud.google.com/storage/docs/authentication/managing-hmackeys
- Cloud Storage lifecycle documentation: https://cloud.google.com/storage/docs/lifecycle
- Cloud Storage access logs documentation: https://cloud.google.com/storage/docs/access-logs
- Google Cloud SDK references for `gcloud storage buckets create`, `gcloud storage buckets update`, `gcloud storage buckets notifications create`, `gcloud logging metrics create`, and `gcloud alpha monitoring policies create`
- Flux source-controller implementation for Bucket artifact path behavior: https://github.com/fluxcd/source-controller

## Issues Found
- The prerequisites omitted that Workload Identity Federation for GKE must be enabled before annotating the Flux `source-controller` service account. Added this prerequisite.
- The lifecycle rule was described as deleting old versions after 30 days, but the JSON only retained versions based on `numNewerVersions`. Added `daysSinceNoncurrentTime: 30` so the rule matches the explanation.
- The sample Deployment used a literal `PROJECT_ID` inside the container image because the heredoc prevented shell expansion. Changed that heredoc so `${PROJECT_ID}` is rendered into the image name.
- The sample manifests targeted the `production` namespace but did not create it. Added a Namespace manifest and included it in `kustomization.yaml`.
- Flux’s GCS Bucket integration requires both `roles/storage.bucketViewer` and `roles/storage.objectViewer` so the controller can confirm bucket existence and read/list objects. Added the missing bucket viewer role.
- The Flux Kustomizations used `path: ./` while the Bucket source used `prefix: production/` or `prefix: staging/`. Flux stores fetched objects using their object keys, so the Kustomization paths need to point to `./production` and `./staging`. Updated the paths.
- The GCS notification section created a Pub/Sub topic and bucket notification but did not connect Pub/Sub to the Flux webhook receiver. Added a Pub/Sub push subscription example using the Receiver webhook path and an externally reachable receiver URL.
- The storage access logging command referenced a log bucket without creating it or granting Cloud Storage permission to write logs. Added log bucket creation and the `cloud-storage-analytics@google.com` `roles/storage.objectCreator` binding.
- The Monitoring alert command used a log query as a Monitoring metric condition filter. Added a logs-based metric and changed the alert policy to target that metric.

## Review Notes
- `gcloud` was not installed in the local workspace, so CLI validation was performed against official Google Cloud SDK documentation instead of local `--help` output.
- The Pub/Sub push subscription example assumes the Flux `webhook-receiver` service is exposed at an HTTPS URL. In production, configure ingress, TLS, and optional Pub/Sub authenticated push according to the cluster's security requirements.
