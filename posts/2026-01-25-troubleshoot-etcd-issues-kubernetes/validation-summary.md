# Validation Summary: How to Troubleshoot etcd Issues in Kubernetes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- etcd
- etcdctl
- etcdutl
- kubeadm static Pods
- Prometheus alerting rules

## Sources Consulted
- Kubernetes documentation: Operating etcd clusters for Kubernetes - https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes documentation: Set up a High Availability etcd Cluster with kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/setup-ha-etcd-with-kubeadm/
- etcd documentation: How to check Cluster status - https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd documentation: Maintenance - https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd documentation: Disaster recovery - https://etcd.io/docs/v3.5/op-guide/recovery/
- etcd documentation: Configuration options - https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd documentation: Metrics - https://etcd.io/docs/v3.5/metrics/
- etcd monitoring mixin alert rules - https://monitoring.mixins.dev/etcd/

## Issues Found
- Replaced deprecated `etcdctl snapshot status` with `etcdutl snapshot status`. Kubernetes and etcd documentation note that `etcdctl snapshot status` is deprecated in etcd v3.5.x and recommend `etcdutl`.
- Replaced deprecated `etcdctl snapshot restore` with `etcdutl snapshot restore`. Official Kubernetes restore guidance recommends `etcdutl` because `etcdctl` restore is deprecated in etcd v3.5.x and slated for removal in v3.6.
- Updated the restore comment to say to stop all API servers and etcd before restoring. Kubernetes explicitly cautions against restoring etcd while API servers are running.
- Changed the key inspection comment from "Check which keys are using space" to "Count keys by Kubernetes resource type" because the command counts key prefixes and does not measure storage usage by key.
- Replaced the `EtcdInsufficientMembers` PromQL expression with the etcd monitoring mixin's quorum-based expression. The previous expression counted the presence of `etcd_server_has_leader` series and did not accurately model insufficient live members.

## Review Notes
The post is technically relevant and mostly accurate for kubeadm-managed etcd on Kubernetes with etcd v3.5. The sample commands assume certificate paths and static Pod names from typical kubeadm clusters; external etcd deployments or customized kubeadm manifests may require adjusted endpoints, names, and paths.
