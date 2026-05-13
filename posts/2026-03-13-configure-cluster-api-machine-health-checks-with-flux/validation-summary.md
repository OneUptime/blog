# Validation Summary: How to Configure Cluster API Machine Health Checks with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cluster API
- MachineHealthCheck
- Flux CD Kustomization
- Kubernetes
- kubectl
- clusterctl
- Metal3 external remediation

## Sources Consulted
- Cluster API Book: Configure a MachineHealthCheck - https://cluster-api.sigs.k8s.io/tasks/automated-machine-management/healthchecking.html
- Cluster API Book: v1.10 to v1.11 migration notes - https://cluster-api.sigs.k8s.io/developer/providers/migrations/v1.10-to-v1.11
- Cluster API v1beta2 Go API reference - https://pkg.go.dev/sigs.k8s.io/cluster-api/api/core/v1beta2
- Cluster API Book: clusterctl get kubeconfig - https://cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig
- Flux documentation: Kustomization - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1 - https://fluxcd.io/flux/components/kustomize/api/v1/
- Metal3 user guide: Remediation Controller and MachineHealthCheck - https://book.metal3.io/capm3/remediaton.html
- Kubernetes documentation: Node Status - https://kubernetes.io/docs/reference/node/node-status

## Issues Found
- The MachineHealthCheck examples used the older `cluster.x-k8s.io/v1beta1` API and v1beta1 fields such as `unhealthyConditions`, `nodeStartupTimeout`, `maxUnhealthy`, and `remediationTemplate`. Updated the examples to the current v1beta2 shape using `checks.unhealthyNodeConditions`, `checks.nodeStartupTimeoutSeconds`, `remediation.triggerIf.unhealthyLessThanOrEqualTo`, and `remediation.templateRef`.
- The external remediation example referenced `AWSRemediationTemplate`, which is not a standard Cluster API Provider AWS remediation resource. Replaced it with the documented Metal3 remediation template reference and removed the namespace field because v1beta2 `templateRef` does not include `namespace`.
- The introduction described MachineHealthCheck remediation as always deleting the Machine and then MachineDeployment replacing it. Adjusted this to say the Machine is marked for remediation and the owning controller, such as MachineDeployment, MachineSet, or KubeadmControlPlane, handles replacement.
- The test command used `kubectl drain --force` without `--ignore-daemonsets`, which commonly fails on nodes with DaemonSet-managed pods. Added `--ignore-daemonsets` and `--delete-emptydir-data`, and clarified that cordon/drain is preparation before stopping kubelet rather than the health check trigger itself.
- Best-practice field names referenced v1beta1 fields. Updated them to the v1beta2 field paths and second-based timeout values.

## Review Notes
- The Flux Kustomization example uses current `kustomize.toolkit.fluxcd.io/v1` fields (`interval`, `path`, `prune`, `sourceRef`, and `dependsOn`) and is technically valid.
- The `clusterctl get kubeconfig production-cluster` command is valid for retrieving a workload cluster kubeconfig from stdout.
- The exact machine selector labels are environment-specific; readers must ensure their MachineDeployment or KubeadmControlPlane applies matching labels.
