# Validation Summary: How to Deploy a DaemonSet Workload in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- DaemonSets
- `kubectl`
- HostPath volumes
- Node selectors
- Taints and tolerations

## Sources Consulted
- Rancher: Deploying Workloads: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/workloads-and-pods/deploy-workloads
- Kubernetes: DaemonSet: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes: Perform a Rolling Update on a DaemonSet: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes: Logging Architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes: Running Pods on Only Some Nodes: https://kubernetes.io/docs/tasks/manage-daemon/pods-some-nodes/
- RKE2: Logging: https://docs.rke2.io/reference/logging

## Issues Found
- Corrected the Rancher UI navigation. Rancher’s documented workload flow is to open the cluster’s `Workload` view, click `Create`, and then choose the workload type, rather than navigating directly to `Workloads > DaemonSets`.
- Added the `node-role.kubernetes.io/master` toleration alongside `node-role.kubernetes.io/control-plane`. The current Kubernetes DaemonSet examples include both keys so the DaemonSet can also run on clusters that still use the legacy control-plane taint key.
- Removed the `/var/lib/docker/containers` hostPath instructions and YAML entries. That path is Docker-runtime-specific, while Rancher-managed RKE2 clusters use containerd and Kubernetes writes pod logs under `/var/log/pods` by default. The remaining `/var/log` mount is sufficient for this tutorial example and matches the current Kubernetes DaemonSet example more closely.
- Updated the verification and edit instructions to refer to the Rancher `Workload` view consistently after correcting the navigation path.

## Review Notes
- The core explanation of DaemonSets, the `RollingUpdate` and `OnDelete` strategy descriptions, the `maxUnavailable` default of `1`, and the node-selector example are consistent with the Kubernetes documentation.
- The example still uses `fluentd:latest`, which exists, but a pinned tag would be more reproducible for production-oriented guidance.
- Local checks: the YAML code blocks in the post were extracted and parsed successfully with PyYAML, and `validation.json` was validated with `jq`.
- Runtime validation against a live Rancher-managed cluster was not performed in this workspace. `kubectl` is not installed here, so command behavior was verified against official documentation rather than local CLI help.
