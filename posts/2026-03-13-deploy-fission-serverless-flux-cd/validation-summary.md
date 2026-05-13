# Validation Summary: How to Deploy Fission Serverless with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Fission
- Flux CD
- Kubernetes
- HelmRelease
- HelmRepository
- Kustomize
- Fission CRDs: Environment, Package, Function, HTTPTrigger

## Sources Consulted
- Fission installation documentation: https://fission.io/docs/installation/
- Fission CRD reference: https://fission.io/docs/reference/crd-reference/
- Fission YAML specs documentation: https://fission.io/docs/usage/spec/
- Fission HTTP trigger documentation: https://fission.io/docs/usage/triggers/http-trigger/
- Fission CLI function log reference: https://fission.io/docs/reference/fission-cli/fission_function_log/
- Fission Helm chart values from the official chart repository: https://github.com/fission/fission-charts/blob/main/charts/fission-all/values.yaml
- Fission v1.22.0 CRD manifests: https://github.com/fission/fission/tree/v1.22.0/crds/v1
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI get kustomizations reference: https://v2-6.docs.fluxcd.io/flux/cmd/flux_get_kustomizations/

## Issues Found
- Updated the Kubernetes prerequisite from 1.25+ to 1.28+ because the current Fission `fission-all` chart requires Kubernetes 1.28+.
- Updated the Helm chart version from `1.20.*` to `1.22.*` to match the current Fission chart line.
- Added the Fission CRD Kustomize remote resource before the HelmRelease, because Fission installation requires CRDs to be installed separately.
- Replaced invalid or deprecated chart values: `logger.enabled`, `prometheus.enabled`, `executor.defaultIdleContainerCount`, `functionNamespace`, and `builderNamespace`.
- Replaced the removed deployment health check for `Deployment/controller` with a health check against the Fission `HelmRelease`.
- Updated Python environment images from Docker Hub-style names to the current `ghcr.io/fission/*` images shown in official Fission docs.
- Added a missing Fission `Package` resource so the `Function` object's `packageref` points to a defined package.
- Replaced deprecated `HTTPTrigger.spec.method` and `host` usage with `methods`.
- Corrected the HTTP trigger comment from canary rollout configuration to ingress configuration.
- Fixed test commands: `flux get kustomizations` does not accept multiple positional names, and `fission function log -f hello-python` incorrectly passed the function name positionally.
- Updated the router address command to handle either LoadBalancer IP or hostname.
- Adjusted performance wording from "under 100 milliseconds" to "around 100 milliseconds" to match Fission's documented claim.
- Replaced the inaccurate Flux `OCIRepository` package recommendation with Fission `Package` URL references.

## Review Notes
Could not run local `helm`, `flux`, `fission`, or `kubectl` validation commands because those CLIs are not installed in the review environment. The snippets were checked against official documentation and upstream CRD/chart source.
