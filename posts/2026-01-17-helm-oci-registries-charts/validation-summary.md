# Validation Summary: Working with OCI Registries for Helm Charts

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Helm 3 OCI registry support
- Kubernetes Helm charts
- OCI-compliant container registries
- Docker Hub
- GitHub Container Registry (GHCR)
- AWS Elastic Container Registry (ECR)
- Azure Container Registry (ACR)
- Google Artifact Registry
- Harbor
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- Argo CD
- Sigstore Cosign

## Sources Consulted
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Helm `registry login` command reference: https://helm.sh/docs/helm/helm_registry_login/
- AWS ECR Helm OCI artifact documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/push-oci-artifact.html
- Azure Container Registry Helm chart documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-helm-repos
- Azure CLI `az acr manifest` command reference: https://learn.microsoft.com/en-us/cli/azure/acr/manifest
- Google Artifact Registry Helm chart documentation: https://docs.cloud.google.com/artifact-registry/docs/helm/manage-charts
- Argo CD private repository documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Harbor OCI Helm chart documentation: https://goharbor.io/docs/main/working-with-projects/working-with-oci/working-with-helm-oci-charts/
- ORAS `tag` command reference: https://oras.land/docs/commands/oras_tag/
- Sigstore Cosign signing documentation: https://docs.sigstore.dev/cosign/signing/other_types/
- Docker Hub pricing/product information: https://www.docker.com/pricing/ and https://www.docker.com/products/docker-hub/

## Issues Found
- The post said older Helm versions could enable OCI by setting `HELM_EXPERIMENTAL_OCI=1`. Updated this to specify Helm 3.7 and recommend upgrading for older releases, because OCI became generally available in Helm 3.8 and earlier support was experimental.
- The post implied Helm can push charts with arbitrary additional tags. Updated the section to state that `helm push` uses the chart version as the tag, and that registry-level aliases can be created with tools such as ORAS but Helm pull/install workflows should use `--version` or a digest reference.
- AWS ECR examples used a 9-digit account ID placeholder. Updated it to a 12-digit account ID placeholder, matching AWS account ID format.
- Docker Hub private repository wording was too absolute. Updated it to say Docker Hub plan limits apply for private repositories.
- The Argo CD Application example omitted `spec.project`. Added `project: default` to match Argo CD's standard declarative Application examples.
- The Argo CD repository Secret example omitted the `name` field. Added `name: ghcr`, matching Argo CD declarative repository Secret documentation.

## Review Notes
- Helm was not installed in the local environment, so command verification was performed against official command references instead of local `--help` output.
- Helm OCI charts are not discoverable through traditional `helm repo` and `helm search repo` workflows; the post correctly avoids using those commands for OCI charts.
- Digest-based installs are supported by Helm and are correctly recommended for immutable production deployments.
