# Validation Summary: How to implement ArgoCD with OCI registries for Helm chart deployments

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Argo CD
- Helm 3 OCI registries
- Kubernetes manifests and Secrets
- Amazon ECR and EKS IRSA
- Google Artifact Registry
- GitHub Container Registry
- Argo CD Image Updater

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD OCI user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Argo CD private repositories guide: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repo_add/
- Argo CD high availability / repo-server timeout guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries/
- AWS CLI `ecr get-login-password` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Amazon ECR Helm chart documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/using-helm-charts-eks.html
- Amazon EKS Argo CD repository access documentation: https://docs.aws.amazon.com/eks/latest/userguide/argocd-configure-repositories.html
- Google Artifact Registry Helm documentation: https://docs.cloud.google.com/artifact-registry/docs/helm
- Google Artifact Registry authentication documentation: https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Argo CD Image Updater image configuration documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/

## Issues Found
- Argo CD Helm OCI examples incorrectly used `oci://` in `repoURL` and repository Secret `url` values. Updated Helm OCI repository URLs to omit the `oci://` prefix, matching Argo CD's Helm OCI format.
- The ECR `argocd repo add` command used unsupported `--password-stdin`. Replaced it with a supported `--password "$ECR_PASSWORD"` flow.
- The ECR IRSA section implied standard token refresh from IRSA alone. Reworded it to apply only to EKS/Argo CD integrations that support IAM-backed ECR access.
- Several Argo CD `Application` examples were missing required `project` or `destination` fields. Added minimal valid fields.
- The Image Updater section implied it updates Helm chart versions. Reworded it to clarify that Image Updater updates container image tags rendered by Helm.
- The mirroring CronJob used `--version latest`, but Helm OCI chart tags must match chart semantic versions and should not use `latest`. Replaced it with an explicit semantic version.
- The troubleshooting `helm registry login` command used `oci://`, which Helm registry login does not use. Updated it to log in to the registry host.
- The timeout example used a non-documented `helm.oci.timeout` key. Replaced it with the documented `ARGOCD_EXEC_TIMEOUT` repo-server setting.

## Review Notes
The Helm push, pull, and show commands correctly keep `oci://` because Helm CLI OCI chart references require it for chart artifact operations. The Argo CD examples intentionally omit `oci://` only where Argo CD is using Helm OCI repository mode.
