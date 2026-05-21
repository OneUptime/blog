# Validation Summary: How to Set Up Helm Repository for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Helm
- Kubernetes
- ChartMuseum
- OCI registries
- Air-gapped Kubernetes deployments

## Sources Consulted
- Istio official Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio official ambient Helm installation documentation: https://istio.io/latest/docs/ambient/install/helm/
- Helm official OCI registry documentation: https://helm.sh/docs/v3/topics/registries/
- Helm official `helm repo add` command documentation: https://helm.sh/docs/helm/helm_repo_add/
- Helm official `helm repo update` command documentation: https://helm.sh/docs/helm/helm_repo_update/
- Helm official `helm search repo` command documentation: https://helm.sh/docs/helm/helm_search_repo/
- Helm official `helm pull` command documentation: https://helm.sh/docs/helm/helm_pull/
- Helm official `helm show chart` command documentation: https://helm.sh/docs/helm/helm_show_chart/
- ChartMuseum official API documentation: https://chartmuseum.com/docs/
- ChartMuseum Helm chart documentation on Artifact Hub: https://artifacthub.io/packages/helm/chartmuseum/chartmuseum
- Istio official Helm chart index: https://istio-release.storage.googleapis.com/charts/index.yaml

## Issues Found
- The ChartMuseum install command did not enable the upload API, but the later `curl --data-binary ... /api/charts` examples require that API. Added `--set env.open.DISABLE_API=false`, matching ChartMuseum chart documentation.
- The mirror example downloaded the `cni` chart but did not push it to ChartMuseum. Added the missing `curl` upload for `cni-1.22.0.tgz`.
- The multiple-source example used `helm repo add` with an `oci://` URL. Helm OCI registries are used directly by OCI-capable commands and authenticated with `helm registry login`; they are not added as classic chart repositories with `helm repo add`. Replaced that command with `helm registry login registry.example.com` and adjusted the surrounding explanation.

## Review Notes
- Istio chart version `1.22.0` is available in the official Istio chart index for `base`, `istiod`, `gateway`, and `cni`.
- The examples intentionally use Istio `1.22.0`, which is no longer the latest Istio release as of this review date, but the commands remain technically valid for installing that specific chart version.
