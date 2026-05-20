# Validation Summary: How to Manage Secrets with ArgoCD and Google Secret Manager

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- ArgoCD
- Kubernetes and GKE
- Google Cloud Secret Manager
- Workload Identity Federation for GKE
- External Secrets Operator
- Google Cloud CLI
- Pub/Sub-based Secret Manager rotation notifications

## Sources Consulted
- External Secrets Operator Google Cloud Secret Manager provider documentation: https://external-secrets.io/main/provider/google-secrets-manager/
- External Secrets Operator API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator Helm chart index: https://charts.external-secrets.io/index.yaml
- Google Cloud GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud SDK `gcloud secrets create` reference: https://cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud Secret Manager rotation documentation: https://cloud.google.com/secret-manager/docs/secret-rotation
- Google Cloud Secret Manager create/access documentation: https://cloud.google.com/secret-manager/docs/creating-and-accessing-secrets

## Issues Found
- The ESO installation pinned chart `0.10.0` and all ESO manifests used `external-secrets.io/v1beta1`. Updated the chart target to `2.5.0` and the CRDs to `external-secrets.io/v1` to match the current GA API.
- The required API enablement list omitted `iamcredentials.googleapis.com`, which is required for the GKE Kubernetes service account to IAM service account impersonation flow. Added it.
- The rotation example uses Pub/Sub notifications but the required APIs did not include Pub/Sub. Added `pubsub.googleapis.com`.
- The Workload Identity section enabled the cluster-level workload pool for existing Standard clusters but did not update existing node pools to use the GKE metadata server. Added the `gcloud container node-pools update ... --workload-metadata=GKE_METADATA` step.
- The "find by labels" example only filtered by name. Added `find.tags` using the labels created earlier in the post.
- The Secret Manager rotation description implied Secret Manager automatically rotates values with Cloud Functions. Reworded it to clarify that Secret Manager publishes rotation notifications and a subscriber such as a Cloud Function must create the new version.
- The rotation command used `30d`, while the official Secret Manager documentation specifies a seconds-based duration such as `2592000s`. Updated the command to use `2592000s`.
- The rotation example used `2026-04-01T00:00:00Z`, which is in the past as of this validation date and would fail because Secret Manager requires the next rotation time to be in the future. Updated it to `2026-06-01T00:00:00Z`.

## Review Notes
The examples now align with the current ESO GA API and Google Cloud's documented Workload Identity and Secret Manager rotation behavior. The post still uses broad project-level Secret Manager access for simplicity; in production, secret-level IAM bindings or separate stores per namespace can reduce blast radius.
