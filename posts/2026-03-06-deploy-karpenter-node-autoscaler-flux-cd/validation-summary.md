# Validation Summary: How to Deploy Karpenter Node Autoscaler with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS EKS
- Karpenter
- Flux CD
- Kubernetes
- Helm
- OCI Helm charts
- AWS IAM Roles for Service Accounts
- Amazon EC2 Spot Instances

## Sources Consulted
- Karpenter Getting Started with Karpenter: https://karpenter.sh/v1.12/getting-started/getting-started-with-karpenter/
- Karpenter NodePools documentation: https://karpenter.sh/docs/concepts/nodepools/
- Karpenter EC2NodeClass documentation: https://karpenter.sh/docs/concepts/nodeclasses/
- Karpenter Compatibility Matrix: https://karpenter.sh/docs/upgrading/compatibility/
- Karpenter Metrics reference: https://karpenter.sh/v1.0/reference/metrics/
- Karpenter Helm chart values: https://github.com/aws/karpenter-provider-aws/blob/main/charts/karpenter/values.yaml
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://v2-0.docs.fluxcd.io/flux/components/kustomize/kustomization/

## Issues Found
- The EKS prerequisite said v1.25+, which is too broad for current Karpenter releases. Updated it to v1.29+ based on the current Karpenter compatibility matrix.
- The post used `HelmRepository` with `type: oci`. Flux now recommends `OCIRepository` with `HelmRelease.spec.chartRef` for OCI-based Helm charts, and the HelmRepository OCI mode is in maintenance mode. Updated the repository manifest, repository structure, and HelmRelease source reference.
- The Karpenter chart version was pinned to the outdated `1.1.x` range. Updated the OCIRepository semver selector to `1.12.x`, matching the current Karpenter documentation line.
- The Helm values used `podDisruptionBudget.minAvailable`, which is not the current Karpenter chart value. Changed it to `podDisruptionBudget.maxUnavailable`.
- The spot workload only tolerated the Spot taint and used preferred node affinity. Because the default NodePool had a higher weight and both pools could match tolerant workloads, this would not reliably trigger the Spot NodePool. Changed the workload to require `karpenter.sh/capacity-type=spot`.
- The Flux Kustomization used `wait: true` with explicit `healthChecks`, but Flux ignores `healthChecks` when `wait` is true. Changed the example to `wait: false` and health-check the HelmRelease directly.
- The metrics command used `kubectl get --raw /metrics -n karpenter`, which queries Kubernetes API server metrics rather than Karpenter's metrics endpoint. Replaced it with a port-forward to the Karpenter service followed by `curl` against `localhost:8080/metrics`.

## Review Notes
- The EC2NodeClass example still uses `al2023@latest`, which is valid, but Karpenter documentation does not recommend `latest` for production AMI rollout because new AMIs can drift and replace nodes automatically. Pinning an evaluated AMI version is safer for production.
- In a production Flux layout, many teams split the Karpenter HelmRelease and the NodePool/EC2NodeClass resources into separate Kustomizations so the custom resources are applied only after the CRDs are installed and the HelmRelease is ready.
