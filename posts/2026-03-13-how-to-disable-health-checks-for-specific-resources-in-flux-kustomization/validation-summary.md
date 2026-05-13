# Validation Summary: How to Disable Health Checks for Specific Resources in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux Kustomization custom resources
- Kubernetes
- kubectl
- Flux CLI
- GitOps

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize Controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux installation and supported Kubernetes versions: https://fluxcd.io/flux/installation/
- Flux v2.3 release notes and supported versions: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The prerequisites listed "Kubernetes cluster running version 1.25 or later", which is outdated and inaccurate for current Flux releases. Updated it to require a Kubernetes version supported by the user's Flux release.
- The prerequisites listed "Flux v2.3 or later" even though the article uses broadly available Flux v2 Kustomization behavior. Updated it to "Flux v2 installed on the cluster".
- The "Disabling All Health Checks" section said the Kustomization "immediately reports success". Flux still has to complete reconciliation and apply the resources successfully. Updated the wording to say it reports success after the apply completes without waiting for health status.
- The verification section introduced the commands as showing resources being health-checked, but `.status.inventory.entries` lists applied resources, not health-check targets. Updated the section introduction to distinguish configured health checks from applied inventory.
- The Flux CLI command used `flux get kustomization my-app`, but the official documented command is `flux get kustomizations`. Updated the command to `flux get kustomizations my-app`.
- The inventory command used `kubectl -o jsonpath` and piped the result to `jq`, which is unreliable because kubectl JSONPath output is not a general JSON encoder. Updated it to use `kubectl -o json | jq '.status.inventory.entries'`.

## Review Notes
The remaining Kustomization examples use valid `apiVersion`, `kind`, `spec.wait`, `spec.healthChecks`, `spec.dependsOn`, `spec.timeout`, `spec.prune`, and `spec.sourceRef` fields according to the Flux Kustomization documentation. The post could optionally mention that `wait: true` causes `.spec.healthChecks` to be ignored, but the current examples already avoid combining those fields.
