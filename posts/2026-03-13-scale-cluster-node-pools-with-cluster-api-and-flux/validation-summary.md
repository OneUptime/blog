# Validation Summary: How to Scale Cluster Node Pools with Cluster API and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cluster API (CAPI) — `MachineDeployment` (`cluster.x-k8s.io/v1beta1`)
- Cluster API Provider AWS — `AWSMachineTemplate` (`infrastructure.cluster.x-k8s.io/v1beta2`)
- Kubeadm bootstrap provider — `KubeadmConfigTemplate` (`bootstrap.cluster.x-k8s.io/v1beta1`)
- Flux CD — `HelmRelease` (`helm.toolkit.fluxcd.io/v2`)
- Kubernetes Cluster Autoscaler (with the `clusterapi` cloud provider)
- Kubernetes `CronJob` (`batch/v1`)
- `kubectl` / `clusterctl`

## Sources Consulted
- Cluster API book — MachineDeployment reference: https://cluster-api.sigs.k8s.io/developer/architecture/controllers/machine-deployment
- Cluster Autoscaler — Cluster API cloud provider README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/clusterapi/README.md
- Cluster Autoscaler Helm chart README and values.yaml: https://github.com/kubernetes/autoscaler/tree/master/charts/cluster-autoscaler
- Cluster Autoscaler chart index: https://kubernetes.github.io/autoscaler/index.yaml
- Flux Helm Controller API v2 reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux 2.3 GA announcement (Helm APIs promoted to v2): https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Kubernetes CronJob reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Cluster Autoscaler FAQ (scale-down flags, scale-to-zero): https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md

## Issues Found
- **`clusterAPIMode: incluster-incluster` was inconsistent with the described topology.** The post described "the autoscaler runs on the workload cluster but manages CAPI on the management cluster", but `incluster-incluster` is the value used when the autoscaler runs in the management cluster and the management cluster *is* the workload cluster. Per the cluster-autoscaler Helm chart values.yaml, the syntax is `workloadClusterMode-managementClusterMode`; for "autoscaler in workload cluster, management cluster reached via kubeconfig" the correct value is `incluster-kubeconfig`. Changed `clusterAPIMode` to `incluster-kubeconfig` and added a comment clarifying the syntax order.

## Review Notes
- The CAPI autoscaler annotations `cluster.x-k8s.io/cluster-api-autoscaler-node-group-min-size` and `cluster.x-k8s.io/cluster-api-autoscaler-node-group-max-size` are correct and apply to `MachineSet`, `MachineDeployment`, and `MachinePool`.
- API versions used (`cluster.x-k8s.io/v1beta1` for MachineDeployment, `infrastructure.cluster.x-k8s.io/v1beta2` for AWSMachineTemplate, `bootstrap.cluster.x-k8s.io/v1beta1` for KubeadmConfigTemplate, `helm.toolkit.fluxcd.io/v2` for HelmRelease) are all valid as of 2026-05-12. Note that CAPI plans to deprecate `v1beta1` Machine APIs in favor of `v1beta2` over time — readers on newer CAPI releases may need to switch API versions.
- For `clusterAPIMode: incluster-kubeconfig`, the chart's documentation also notes that the management-cluster kubeconfig may need to be mounted via `extraVolumeSecrets` (at `clusterAPICloudConfigPath`, default `/etc/kubernetes/mgmt-kubeconfig`) depending on the chart version. The post's use of `clusterAPIKubeconfigSecret: management-cluster-kubeconfig` is acceptable as an illustrative simplification but readers should consult the chart README for their exact chart version.
- Cluster Autoscaler chart version `9.35.x`: only `9.35.0` actually exists in that minor (the next release is `9.36.0`). The pinning is acceptable but readers should be aware that "9.35.x" effectively pins to a single version. As of 2026-05-12 the latest is `9.57.0`+.
- Helm chart values like `scale-down-unneeded-time`, `scale-down-utilization-threshold`, and `skip-nodes-with-local-storage` are valid Cluster Autoscaler flags.
- The "scaleToZero" feature mentioned in Best Practices is implemented in the CAPI provider by setting the `min-size` annotation to `"0"` and providing capacity annotations (`capacity.cluster-autoscaler.kubernetes.io/...`); the post phrases it as a named feature, which is a slight simplification but not technically wrong.
- The CronJob examples reference a `serviceAccountName: cluster-scaler` without showing the ServiceAccount/Role/RoleBinding manifests; this is a reasonable omission for brevity but readers should know they need RBAC permissions to patch MachineDeployments.
