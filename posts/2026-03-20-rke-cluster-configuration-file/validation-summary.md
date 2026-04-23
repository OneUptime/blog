# Validation Summary: How to Create an RKE Cluster Configuration File

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Rancher Kubernetes Engine (RKE1)
- Kubernetes
- Rancher cluster configuration
- RKE `cluster.yml`
- Canal, CoreDNS, NGINX ingress, metrics-server
- etcd snapshots and Kubernetes control plane component flags

## Sources Consulted
- RKE1 Kubernetes Configuration Options: https://rke.docs.rancher.com/config-options
- RKE1 Nodes configuration: https://rke.docs.rancher.com/config-options/nodes
- RKE1 Network Plug-ins: https://rke.docs.rancher.com/config-options/add-ons/network-plugins
- RKE1 Default Kubernetes Services: https://rke.docs.rancher.com/config-options/services
- RKE1 Audit Log configuration: https://rke.docs.rancher.com/config-options/audit-log
- RKE1 DNS providers: https://rke.docs.rancher.com/config-options/add-ons/dns
- RKE1 Metrics Server: https://rke.docs.rancher.com/config-options/add-ons/metrics-server
- RKE1 recurring etcd snapshots: https://rke.docs.rancher.com/etcd-snapshots/recurring-snapshots
- RKE v1.5.8 release notes: https://github.com/rancher/rke/releases/tag/v1.5.8
- RKE type definitions for native YAML keys: https://pkg.go.dev/github.com/rancher/rke/types
- Kubernetes kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kube-controller-manager command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- SUSE product lifecycle for RKE: https://www.suse.com/lifecycle/
- Official RKE CLI `--help` output from downloaded `v1.5.8` and `v1.8.13` release binaries

## Issues Found
- RKE1 is end-of-life as of July 31, 2025. Added a note that the guide is for maintaining existing RKE1 clusters and that new clusters should use RKE2 or another supported distribution.
- The Canal network example used `flannel_backend_type`, which applies to the Flannel provider. Changed it to RKE's Canal option `canal_flannel_backend_type`.
- The etcd image was `rancher/mirrored-coreos-etcd:v3.5.9`, but the RKE v1.5.8 image list for `v1.28.8-rancher1-1` uses `v3.5.10`. Updated the image tag.
- The etcd section mixed modern `backup_config` with legacy `snapshot`, `creation`, and `retention` settings. Removed the legacy fields because `backup_config` is the RKE v0.2.0+ recurring snapshot configuration.
- The audit logging example set kube-apiserver audit log flags directly but did not configure an audit policy file. Replaced it with RKE's native `audit_log.enabled: true`, which applies RKE's default policy and rotation settings.
- The admission plugin name `PodSecurityAdmission` was incorrect for kube-apiserver. Changed it to the valid plugin name `PodSecurity`.
- `pod-eviction-timeout` is not a valid kube-controller-manager flag for the stated Kubernetes v1.28 line. Removed it from the example.
- Native RKE `cluster.yml` DNS keys are `upstreamnameservers` and `reversecidrs`, not `upstream_nameservers` and `reverse_cidrs`. Corrected both keys.
- `rke config --print --name cluster.yml` does not validate an existing `cluster.yml`; it starts the config generator. Reworded the command comment and changed the command to `rke config --print --empty`.
- `rke up --dry-run` is not supported by the RKE CLI. Replaced it with `rke up --config cluster.yml` and clarified that RKE validates configuration and node access during the deployment run.
- The production HA shorthand examples omitted the SSH `user`. Added `user: ubuntu` to match RKE node configuration requirements and the full example.

## Review Notes
The post is technically valid after edits, but it remains a legacy RKE1 guide. RKE1 should not be recommended for new production clusters after its July 31, 2025 EOL date.
