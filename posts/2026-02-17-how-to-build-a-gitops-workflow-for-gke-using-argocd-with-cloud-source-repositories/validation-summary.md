# Validation Summary: How to Build a GitOps Workflow for GKE Using ArgoCD

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Kubernetes Engine
- Argo CD
- Cloud Source Repositories
- Google Cloud IAM and Workload Identity Federation for GKE
- Kustomize
- Kubernetes manifests
- Cloud Pub/Sub
- Cloud Functions for Node.js
- Argo CD Notifications

## Sources Consulted
- Google Cloud: Workload Identity Federation for GKE - https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud: Cloud Source Repositories support notice - https://cloud.google.com/source-repositories/docs/support
- Google Cloud: Cloud Source Repositories authentication - https://cloud.google.com/source-repositories/docs/authentication
- Google Cloud: Configuring Pub/Sub notifications for Cloud Source Repositories - https://cloud.google.com/source-repositories/docs/configuring-notifications
- Google Cloud SDK: gcloud functions deploy reference - https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud: Cloud Functions runtime support - https://cloud.google.com/functions/docs/runtime-support
- Argo CD: Webhook configuration - https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD: Private repositories - https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD: Repository credentials secret example - https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repo-creds-yaml/
- Argo CD: Notifications Slack service - https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/slack/
- Argo CD: Notifications triggers - https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/triggers/
- Kustomize project documentation - https://kustomize.io/

## Issues Found
- Cloud Source Repositories availability was outdated for a 2026 post. Added a note that Cloud Source Repositories is unavailable to new customers as of June 17, 2024 and mentioned Secure Source Manager or another Git provider for new organizations.
- The architecture diagram implied Cloud Source Repositories sends a direct webhook to Argo CD. Updated it to show Cloud Source Repositories publishing a Pub/Sub notification to a Cloud Function, which then refreshes Argo CD.
- The Workload Identity section implied Workload Identity alone authenticates Argo CD to Cloud Source Repositories. Clarified that Argo CD still needs Git credentials and Workload Identity is only useful for a token-refreshing helper or sidecar.
- The declarative repository credentials example used a service-account-key style username/password pattern that is not documented for Cloud Source Repositories Git access. Replaced it with an Argo CD repo-creds secret using HTTPS credentials with a rotated OAuth token or equivalent credential.
- The Kustomize examples used deprecated fields. Replaced `commonLabels` with `labels` and `patchesStrategicMerge` with `patches`.
- The overlay example placed two YAML resources in one fenced block without a document separator. Added `---` so the YAML block remains syntactically valid.
- The Pub/Sub setup skipped the Cloud Source Repositories notification configuration. Added commands to create the topic, grant publish permission, and associate the repository with the topic using JSON message format.
- The Argo CD notifications trigger treated `OutOfSync` plus `Degraded` as a sync failure. Updated it to check `app.status?.operationState.phase in ['Error', 'Failed']`, matching Argo CD notification trigger examples.

## Review Notes
The post remains most useful for organizations that already used Cloud Source Repositories before June 17, 2024. New implementations should prefer an actively available Git provider or Secure Source Manager.
