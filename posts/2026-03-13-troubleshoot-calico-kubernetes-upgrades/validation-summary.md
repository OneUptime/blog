# Validation Summary: How to Troubleshoot Calico on Kubernetes Upgrades

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- kubectl
- calicoctl
- Kubernetes DaemonSets
- Calico IPPool resources

## Sources Consulted
- Calico upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico ImageSet documentation: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes DaemonSet rolling update documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes Pod disruption documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post said a cordoned node prevents a `calico-node` DaemonSet pod from scheduling. Kubernetes automatically adds an unschedulable-node toleration to DaemonSet pods, so cordoning alone is not the right blocker. Changed this to check for custom taints that `calico-node` does not tolerate.
- The post listed PodDisruptionBudgets as a common cause of a `calico-node` DaemonSet rollout being unable to terminate pods. Kubernetes PDBs constrain evictions such as node drains, but workload-controller rolling updates are not blocked by PDBs in that way. Changed this to inspect DaemonSet update strategy and DaemonSet rollout status.
- The emergency rollback command patched `Installation.spec.version`, but the Calico Open Source `Installation` API has no `spec.version` field. Changed the rollback guidance to re-apply the previous version's Calico CRDs and Tigera Operator manifest, matching the official operator upgrade mechanism.
- The rollback section stated that rollback requires the previous ImageSet to exist. ImageSets are relevant when digest pinning is used, but they are not the general version rollback mechanism. Updated the text to make the ImageSet requirement conditional on ImageSet-based installs.

## Review Notes
- `kubectl` was not installed in the local environment, so command syntax was verified against official Kubernetes CLI reference documentation rather than local `--help` output.
- The example target version `v3.28.0` remains technically valid as a placeholder because the post explicitly says to replace it with the target version.
