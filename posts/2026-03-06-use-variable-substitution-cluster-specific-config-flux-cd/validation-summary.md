# Validation Summary: How to Use Variable Substitution for Cluster-Specific Config in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization
- Flux HelmRelease
- Kustomize
- Kubernetes Deployments, Services, Ingresses, ConfigMaps, and Secrets
- kubectl and Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux build kustomization` reference: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post said default values prevent errors when a variable is undefined. Flux substitutes undefined variables with an empty string by default, while strict substitution can make missing variables fail. Updated the wording to describe both behaviors accurately.
- The post described `${VAR:=default}` as `:-` syntax. Updated the text to say `:=` syntax, matching the examples and Flux documentation.
- The Secret example introduced `base/apps/web-app/secret.yaml` but did not show that it must be included in the Kustomize resources. Added a minimal `resources` snippet that includes `secret.yaml`.
- The `flux build kustomization` dry-run example omitted `--kustomization-file`, which is needed to use a local Flux Kustomization file without relying on the in-cluster object. Updated the command and added the official dry-run caveat that values from ConfigMaps and Secrets referenced by `substituteFrom` are skipped.

## Review Notes
- The Flux CLI is not installed in the local environment, so command validation was performed against the official Flux CLI reference instead of local `--help` output.
- The HelmRelease example uses `helm.toolkit.fluxcd.io/v2`, which matches the current Flux Helm API.
- The Kubernetes manifest examples use current stable APIs such as `apps/v1` Deployment and `networking.k8s.io/v1` Ingress.
