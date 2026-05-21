# Validation Summary: How to Handle Istio Helm Chart Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Helm
- Kubernetes
- Helm chart dependencies
- Custom Resource Definitions
- Helm hooks

## Sources Consulted
- Istio official Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio 1.22.0 official Helm chart packages from https://istio-release.storage.googleapis.com/charts/
- Helm dependency best practices: https://helm.sh/docs/chart_best_practices/dependencies/
- Helm dependency build documentation: https://helm.sh/docs/helm/helm_dependency_build/
- Helm dependency update documentation: https://helm.sh/docs/helm/helm_dependency_update/
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Kubernetes kubectl version command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The Helm chart examples used `istio/base`, `istio/istiod`, and `istio/gateway` without first configuring the Istio Helm repository. Added `helm repo add istio https://istio-release.storage.googleapis.com/charts` and `helm repo update` before the first chart commands and before the CRD `helm pull` example.
- The install examples omitted `--wait` for `istiod` and the gateway, while Istio's official Helm install flow waits for those components. Added `--wait` to those commands and to the umbrella install command.
- The umbrella chart section claimed dependency ordering was handled automatically. Helm installs CRDs from `crds/` before templates, but subcharts are still applied as one release and share the release namespace. Updated the wording to reflect that limitation.
- The umbrella install command used `helm install istio ./istio-umbrella` immediately after `cd istio-umbrella`, which would point at a non-existent nested path. Changed it to `helm install istio .`.
- The pre-install hook used `kubectl version --short`, but the current Kubernetes command reference no longer supports the `--short` flag. Replaced it with `kubectl version`.
- The upgrade section said sub-charts upgrade in dependency order. Helm renders and applies the umbrella chart as one release, so this was changed to describe the actual upgrade behavior and retain the CRD warning.
- The conclusion overstated that umbrella charts automatically handle both ordering and version alignment. Revised it to say umbrella charts keep versions aligned and reduce the install to one command, while CRD handling and namespace behavior still need attention.

## Review Notes
The local environment did not have `helm` or `kubectl` installed, so CLI behavior was verified against official command documentation and the Istio 1.22.0 chart packages downloaded from the official chart repository. The post intentionally uses Istio 1.22.0 examples, which are no longer the latest Istio release as of 2026-05-21, but the examples are internally consistent for that version.
