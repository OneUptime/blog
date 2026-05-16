# Validation Summary: How to Test Disaster Recovery Procedures for Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- etcd
- QEMU
- Docker-based Talos test clusters
- Bash
- YAML

## Sources Consulted
- Talos Linux v1.13 CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux v1.13 release notes: https://github.com/siderolabs/talos/releases/tag/v1.13.0
- Talos Linux disaster recovery documentation: https://docs.siderolabs.com/talos/v1.13/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Talos Linux machine configuration editing documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Kubernetes node status documentation: https://kubernetes.io/docs/reference/node/node-status
- Kubernetes API health endpoint documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes ComponentStatus API documentation: https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/component-status-v1/

## Issues Found
- The Talos cluster configuration snippet used non-current field names (`cluster.name`, `cluster.endpoint`, and `cluster.clusterNetwork`). Updated it to the documented v1alpha1 shape using `cluster.clusterName`, `cluster.controlPlane.endpoint`, and `cluster.network`.
- The QEMU image download pinned Talos v1.9.0. Updated the example to use Talos v1.13.0, the current stable release as of this review.
- The Docker-based test cluster command used the older top-level `talosctl cluster create` form with `--controlplanes` and `--wait-timeout`. Updated it to the current `talosctl cluster create docker` form and removed unsupported flags for that provisioner.
- The worker node failure scenario said Kubernetes marks an unreachable node `NotReady` after about 40 seconds. Updated this to about 50 seconds to match the documented default `node-monitor-grace-period`.
- The etcd member list commands used `talosctl etcd member list`, which is not the current command. Updated them to `talosctl etcd members`.
- The control plane validation used `kubectl get cs`, which relies on the deprecated `ComponentStatus` API. Replaced it with `kubectl get --raw='/readyz?verbose'`.
- The full recovery flow bootstrapped from the snapshot before applying configuration to all replacement control plane nodes. Updated the sequence so replacement control plane nodes receive configuration before recovery bootstrap, matching Talos disaster recovery guidance.
- The automated config comparison pulled the whole `machineconfig` resource and tried to remove metadata with `yq`. Updated it to retrieve the actual machine configuration from `.spec` using `talosctl get machineconfig v1alpha1 -o jsonpath='{.spec}'`.

## Review Notes
The post is now technically valid as a practical DR testing guide. The snippets still assume environment-specific node IPs, hostnames, stored config paths, and backup locations; readers will need to adapt those values to their own clusters.
