# Validation Summary: How to Configure Fleet Helm Chart Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- Helm
- GitOps

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Git repository contents and Helm values behavior: https://fleet.rancher.io/explanations/gitrepo-content
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Helm command reference: https://helm.sh/docs/helm/
- Helm `helm list` command reference: https://helm.sh/docs/v3/helm/helm_list

## Issues Found
- The post used `targets:` inside `fleet.yaml` examples where Fleet expects `targetCustomizations:` for per-cluster bundle customization. I removed invalid `targets:` blocks from the basic examples and changed the per-cluster example to `targetCustomizations:` to match Fleet’s documented schema.
- The values-files section showed `targetCustomizations.helm.valuesFiles`, which is not listed as a supported target customization in Fleet’s reference. I changed the per-cluster override in that example to use supported inline `helm.values`.
- The `valuesFrom` example incorrectly said the referenced Secret must exist in `fleet-default`. Fleet documents `valuesFrom` as reading Secrets or ConfigMaps from downstream clusters. I updated the example to reference a Secret in the downstream application namespace and changed the `kubectl create secret generic` command accordingly.
- The advanced-options example described `disablePreProcess` as disabling OpenAPI validation. In Fleet, `disablePreProcess` disables Go template preprocessing for Fleet values. I corrected that comment and also clarified that `waitForJobs` applies to Helm Jobs.
- The repository structure example referenced `values-common.yaml` without showing the file. I added it to the sample tree so the example is internally consistent.

## Review Notes
- The article uses fixed chart versions as examples. Those snippets are structurally valid, but readers should still confirm the currently desired chart version before deploying in production.
