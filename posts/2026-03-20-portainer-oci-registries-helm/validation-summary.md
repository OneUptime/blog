# Validation Summary: How to Set Up OCI-Format Registries in Portainer for Helm Charts (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Business Edition
- Kubernetes
- Helm
- OCI registries
- GitHub Container Registry (GHCR)
- Amazon ECR
- Harbor
- FluxCD
- GitHub Actions

## Sources Consulted
- Helm OCI registries documentation: https://helm.sh/docs/v3/topics/registries/
- Helm `registry login` command reference: https://helm.sh/docs/helm/helm_registry_login/
- Portainer registry administration docs: https://docs.portainer.io/sts/admin/registries
- Portainer custom registry setup docs: https://docs.portainer.io/admin/registries/add/custom
- Portainer Helm chart deployment docs: https://docs.portainer.io/user/kubernetes/applications/manifest/helm
- Portainer Kubernetes registry access docs: https://docs.portainer.io/2.27/user/kubernetes/cluster/registries
- Flux HelmRelease docs: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository docs: https://fluxcd.io/flux/components/source/helmrepositories/
- Amazon ECR OCI artifact docs: https://docs.aws.amazon.com/AmazonECR/latest/userguide/push-oci-artifact.html
- Harbor OCI Helm chart docs: https://goharbor.io/docs/main/working-with-projects/working-with-oci/working-with-helm-oci-charts/
- GitHub Container registry docs: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Packages with Actions docs: https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- Azure `setup-helm` action repository: https://github.com/Azure/setup-helm

## Issues Found
- The Portainer setup section described adding an OCI source as a separate “Helm repository” with an `oci://` repository URL and OCI type selector. Portainer’s documented flow is to add a registry under `Registries`, then grant namespace access in the Kubernetes environment. I updated the steps and example fields accordingly.
- The Portainer deployment section described entering an OCI repository URL directly during Helm deployment. Current Portainer docs show selecting `Create from code`, choosing `Helm chart`, using `Helm repository` as the deployment method, and selecting the configured registry from a dropdown. I corrected that workflow.
- The Flux example used the outdated `helm.toolkit.fluxcd.io/v2beta1` API and omitted the OCI source definition. I replaced it with a complete, current example using `source.toolkit.fluxcd.io/v1` `HelmRepository` with `type: oci` and `helm.toolkit.fluxcd.io/v2` `HelmRelease`.
- The Harbor section implied OCI Helm charts appear in a dedicated Harbor Helm Charts view and emphasized vulnerability scanning. Harbor’s OCI Helm chart docs describe OCI Helm charts as OCI artifacts within a project. I corrected the wording to match that model.
- The GitHub Actions publishing example authenticated with `GITHUB_TOKEN` but omitted the required workflow permissions, and it used the older `azure/setup-helm@v3` action. I added `contents: read` and `packages: write`, and updated the action to `azure/setup-helm@v4`.
- The post overgeneralized Portainer registry support by listing Docker Hub in a Portainer-specific prerequisite and by saying the flow works with all major providers. Portainer’s docs currently note that Docker Hub is not supported as a source for OCI-format Helm charts. I narrowed the wording to registries Portainer documents as suitable for this use case.
- The explanation of OCI chart storage was imprecise. I updated it to state that OCI Helm charts are stored as OCI registry artifacts with manifests and layers.

## Review Notes
- Helm 4 is available as of April 24, 2026, but the OCI commands used in this post remain valid and are documented in current Helm command references. The post’s `Helm 3.8+` prerequisite is still reasonable because OCI support became generally available by default in Helm 3.8.
- The `HELM_EXPERIMENTAL_OCI` environment variable is only relevant to Helm versions earlier than 3.8.0. The post already labels it as unnecessary for Helm 3.8+.
- Flux now documents `OCIRepository` plus `chartRef` as the recommended production pattern for OCI-based Helm charts, although `HelmRepository` with `type: oci` remains supported and valid.
