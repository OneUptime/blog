# Validation Summary: How to Set Up OCI-Format Registries in Portainer for Helm Charts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (container management)
- Helm (Kubernetes package manager)
- OCI (Open Container Initiative) Distribution Specification
- Container registries (Amazon ECR, GHCR, ACR, Harbor, Google Artifact Registry)
- Kubernetes
- AWS CLI

## Sources Consulted
- Helm OCI documentation: https://helm.sh/docs/topics/registries/
- Helm 3.8.0 release notes (OCI graduated to GA): https://github.com/helm/helm/releases/tag/v3.8.0
- OCI Distribution Specification: https://github.com/opencontainers/distribution-spec
- AWS ECR documentation for OCI artifacts: https://docs.aws.amazon.com/AmazonECR/latest/userguide/push-oci-artifact.html
- AWS account ID format reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/console_account-alias.html
- Portainer registry management documentation: https://docs.portainer.io/admin/registries
- Helm CLI reference (helm registry login, helm push, helm pull, helm install): https://helm.sh/docs/helm/helm_registry_login/

## Issues Found
- **AWS account ID had only 9 digits** - The example used `123456789.dkr.ecr.us-east-1.amazonaws.com` for the ECR registry URL. AWS account IDs are always exactly 12 digits, so this was technically incorrect. Fixed by changing to `123456789012` (12 digits) in both the `helm registry login` and `helm push` commands.

## Review Notes
- The `HELM_EXPERIMENTAL_OCI=1` note is accurate - this environment variable was required for Helm 3.7.x and earlier. OCI support graduated to GA in Helm 3.8.0 (released January 2022), making this flag unnecessary in current versions.
- All Helm CLI commands (`helm package`, `helm registry login`, `helm push`, `helm pull`, `helm install`) are syntactically correct and use current, non-deprecated flags.
- The list of OCI-supporting registries is accurate.
- The AWS ECR commands (`aws ecr create-repository`, `aws ecr get-login-password`) are correct.
- The chart name (`my-app`) is automatically extracted from the .tgz filename and appended to the OCI URL on push, so creating the `helm-charts/my-app` ECR repository and pushing to `oci://.../helm-charts` is the correct flow.
- Portainer UI navigation paths (Settings > Registries, Applications > Add application) are accurate as of recent Portainer CE/BE releases. Portainer's UI may evolve over time, so readers should consult the current Portainer docs if labels differ.
