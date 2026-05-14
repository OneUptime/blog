# Validation Summary: How to Scale GitOps to 100+ Clusters with Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Helm Controller and HelmRelease resources
- External Secrets Operator
- AWS Secrets Manager
- Prometheus, kube-prometheus-stack, and Grafana
- Bash, kubectl, and Flux CLI

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux bootstrap for GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux repository structure guide: https://fluxcd.io/flux/guides/repository-structure/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator ClusterSecretStore API: https://external-secrets.io/latest/api/clustersecretstore/
- External Secrets Operator Helm chart listing: https://artifacthub.io/packages/helm/external-secrets-operator/external-secrets
- kube-prometheus-stack Helm chart listing and values: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack

## Issues Found
- The generated `cluster-config.yaml` was not included in the template `kustomization.yaml`, so Flux would not apply the ConfigMap used by `postBuild.substituteFrom`. Added `cluster-config.yaml` to the template resources list.
- The source-controller patch included `--requeue-dependency=15s`, which is not a source-controller option. Removed that argument while keeping the valid concurrency tuning.
- The External Secrets examples used `external-secrets.io/v1beta1` and an old `0.9.x` chart range. Updated the CRDs to the current `external-secrets.io/v1` API and the chart range to `2.x`.
- The monitoring section described Prometheus federation, but the YAML configures Prometheus `remoteWrite`. Renamed the step to Prometheus Remote Write.
- The kube-prometheus-stack chart example used the outdated `56.x` range. Updated it to the current `85.x` range.
- The progressive rollout comments said clusters referenced branches or tags, but the YAML only set `APP_VERSION` substitutions. Updated the comments to describe version substitution accurately.
- The fleet health script printed the third column from `flux get kustomizations`, which is the suspended state in Flux output, not readiness. Changed it to print the fourth column and used `--status-selector ready=false` for failed-count checks.

## Review Notes
The guide is technically valid after the fixes. The Git mirror deployment remains an illustrative placeholder because `your-org/git-mirror:v1.0.0` is not a standard Flux component; a production implementation should document the selected mirror/proxy service and its authentication model.
