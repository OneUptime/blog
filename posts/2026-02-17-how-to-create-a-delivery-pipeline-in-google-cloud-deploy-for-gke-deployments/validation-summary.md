# Validation Summary: How to Create a Delivery Pipeline in Google Cloud Deploy for GKE Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Deploy
- Google Kubernetes Engine
- Google Cloud CLI
- Skaffold
- Kustomize
- Kubernetes manifests
- Cloud Build
- Artifact Registry
- IAM

## Sources Consulted
- Google Cloud Deploy configuration schema: https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy GKE quickstart: https://docs.cloud.google.com/deploy/docs/deploy-app-gke
- Google Cloud Deploy Skaffold guide: https://docs.cloud.google.com/deploy/docs/using-skaffold
- Google Cloud Deploy manifest management with Kustomize: https://cloud.google.com/deploy/docs/using-skaffold/managing-manifests
- Google Cloud Deploy verification guide: https://docs.cloud.google.com/deploy/docs/verify-deployment
- Google Cloud Deploy canary deployment strategy: https://docs.cloud.google.com/deploy/docs/deployment-strategies/canary
- Google Cloud Deploy release promotion and approvals: https://docs.cloud.google.com/deploy/docs/promote-release
- Google Cloud Deploy service accounts: https://cloud.google.com/deploy/docs/cloud-deploy-service-account
- Google Cloud Deploy IAM roles: https://docs.cloud.google.com/iam/docs/roles-permissions/clouddeploy
- Google Cloud CLI reference for release creation: https://cloud.google.com/sdk/gcloud/reference/deploy/releases/create
- Google Cloud CLI reference for rollout approval: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/rollouts/approve
- Google Cloud CLI reference for target rollback: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/targets/rollback

## Issues Found
- The original Skaffold example used `rawYaml` to include base manifests and environment-specific `deployment-patch.yaml` files. Raw YAML is applied directly and is not a patching mechanism, so this would not reliably render per-environment manifests. Changed the example to use Skaffold profiles with Kustomize overlays and added the required `kustomization.yaml` snippets.
- The staging profile referenced `k8s/overlays/staging/*.yaml`, but no staging manifest example was provided. Added a staging Kustomize overlay and patch so the referenced profile is complete.
- The base Deployment used a full Artifact Registry image while the release command used `--images=my-app=...`. Changed the manifest image to the `my-app` placeholder so Cloud Deploy/Skaffold image substitution matches the release command.
- The delivery pipeline enabled `strategy.standard.verify: true`, but the Skaffold configuration did not include a `verify` stanza. Added a minimal Skaffold `verify` configuration so deployment verification is valid.
- The prerequisites enabled only Cloud Deploy and GKE APIs, but the workflow also relies on Cloud Build, Cloud Storage, and Artifact Registry. Added those APIs to the enable command.
- The IAM example granted `roles/clouddeploy.operator` to the CI/CD service account. For creating releases, `roles/clouddeploy.releaser` is the narrower correct role, and the caller also needs `iam.serviceAccounts.actAs` on the Cloud Deploy execution service account. Updated the IAM block accordingly and added the required execution service account roles for GKE deployment.

## Review Notes
The examples are technically valid as a walkthrough, but production usage should replace the placeholder verification command with real smoke or integration tests and should consider using a dedicated Cloud Deploy execution service account instead of the default Compute Engine service account.
