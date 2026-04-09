# Validation Summary: How to Set Plugin and Provisioner Replicas in Rook CSI Helm Config

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph storage orchestrator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes CSI (Container Storage Interface)
- Helm (Kubernetes package manager)

## Sources Consulted
- Rook Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook CSI provisioner deployment template: https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/template/rbd/csi-rbdplugin-provisioner-dep.yaml
- Rook CSI operator source code: https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/spec.go
- Rook CSI configuration logic: https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/csi.go

## Issues Found

### Issue 1: Incorrect Helm key `rbdProvisionerExtraArgs`
- **What was wrong:** The blog used `csi.rbdProvisionerExtraArgs` with `--leader-election-*` flags to configure leader election timeouts. This Helm key does not exist in the Rook operator chart.
- **What was changed:** Replaced with the correct dedicated Helm values: `csi.csiLeaderElectionLeaseDuration`, `csi.csiLeaderElectionRenewDeadline`, and `csi.csiLeaderElectionRetryPeriod`. These are first-class Helm values that map to the operator's ConfigMap and are injected into provisioner container args.
- **Why:** Using a non-existent Helm key would be silently ignored, leaving leader election at defaults and confusing readers who expect the configuration to take effect.

### Issue 2: Inaccurate leader election enablement claim
- **What was wrong:** The blog stated "The Helm chart enables this automatically when `provisionerReplicas` is greater than 1." In reality, leader election is always hardcoded to `true` (`--leader-election=true`) in the provisioner deployment template, regardless of replica count.
- **What was changed:** Corrected to state that leader election is always enabled in the provisioner deployment, regardless of replica count.
- **Why:** The conditional phrasing could mislead readers into thinking leader election is disabled with a single replica, which is not the case.

## Review Notes
- The operator automatically overrides `provisionerReplicas` to 1 on single-node clusters, regardless of the configured value. The blog does not mention this but it is not incorrect — just additional context that could be useful for readers.
- All other technical details verified as correct: `csi.provisionerReplicas` key and default value of 2, `csi.provisionerNodeAffinity` string format, `csi.provisionerTolerations` array format, Helm repo name `rook-release`, deployment names `csi-rbdplugin-provisioner` and `csi-cephfsplugin-provisioner`, label selector and container name in the monitoring command.
