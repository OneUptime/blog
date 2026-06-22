# Validation Summary: How to Fix 'Service Account' Key Errors

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Google Cloud Platform (GCP)
- GCP Service Accounts & IAM
- gcloud CLI
- Application Default Credentials (ADC)
- Workload Identity (GKE)
- Docker
- Kubernetes (Secrets, Deployments)
- Bash scripting / jq
- Python google-auth / google-api-python-client error messages

## Sources Consulted
- Application Default Credentials search order and credential file locations — https://docs.cloud.google.com/docs/authentication/application-default-credentials
- Disable and enable service account keys — https://docs.cloud.google.com/iam/docs/keys-disable-enable
- Create and delete service account keys — https://docs.cloud.google.com/iam/docs/keys-create-delete
- gcloud projects add-iam-policy-binding reference — https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- gcloud iam service-accounts keys reference — https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys
- Manage access to projects, folders, and organizations — https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access
- Authenticate to Google Cloud APIs from GKE workloads — https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Kubernetes Deployments — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Secrets — https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
1. **Incorrect IAM binding command (`gcloud projects add-iam-binding`)** — In "Error 4: Permission Denied Despite Valid Key", the post used `gcloud projects add-iam-binding` in two places. No such subcommand exists; the correct command is `gcloud projects add-iam-policy-binding`. Fixed both occurrences. (Note: the post already correctly used `add-iam-policy-binding` elsewhere, e.g. in the Workload Identity section, so this was an inconsistency.)

2. **Incorrect claim that disabled keys cannot be re-enabled via gcloud** — In "Error 3: Service Account Key Is Disabled", the post stated "Unfortunately, you cannot re-enable a disabled key via gcloud. You need to use the Console or create a new key." This is wrong: `gcloud iam service-accounts keys enable KEY_ID --iam-account=...` exists and re-enables a disabled key (confirmed via the official "Disable and enable service account keys" docs). Replaced the incorrect statement and added the correct `keys enable` command while keeping the "create a new key" option as an alternative. This also makes the prose consistent with the accompanying mermaid flowchart, which already showed an "Enable Key" path.

3. **Invalid Kubernetes `apps/v1` Deployment manifest** — The Deployment example omitted `spec.selector` and matching pod template labels. In `apps/v1`, the selector must match the pod template labels. Added `spec.selector.matchLabels.app: my-app` and matching `template.metadata.labels.app: my-app`.

4. **Incomplete Workload Identity Federation for GKE setup for existing Standard node pools** — The Workload Identity section enabled the feature on the cluster, but official GKE docs state existing Standard cluster node pools are unaffected and must be updated to use the GKE metadata server. Added the `gcloud container node-pools update ... --workload-metadata=GKE_METADATA` command and updated the wording to the current product name, "Workload Identity Federation for GKE."

## Review Notes
- The JSON key field list shown via `jq 'keys'` reflects the standard fields of a GCP service account key. Newer keys may additionally include a `universe_domain` field; the post says the file "should contain these fields" rather than claiming the list is exhaustive, so no change was required.
- All other gcloud commands were verified as current and correct: `gcloud auth activate-service-account`, `gcloud auth application-default login`, `gcloud iam service-accounts keys list/delete/create`, `gcloud container clusters update --workload-pool`, `gcloud container node-pools update --workload-metadata=GKE_METADATA`, and `gcloud iam service-accounts add-iam-policy-binding` for the IAM service account impersonation form of Workload Identity Federation for GKE.
- The ADC credential file paths (Linux/macOS `~/.config/gcloud/...`, Windows `%APPDATA%\gcloud\...`) are accurate.
- The Kubernetes Secret manifest and the diagnostic bash script are syntactically valid and behave as described. The Deployment manifest is valid after adding the required selector and labels.
- The post's security guidance (preferring Workload Identity over long-lived keys) aligns with current Google Cloud best practices.
