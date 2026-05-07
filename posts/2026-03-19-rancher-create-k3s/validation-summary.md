# Validation Summary: How to Create a K3s Cluster in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- K3s
- Kubernetes
- `kubectl`
- Linux node preparation
- Container registry mirroring

## Sources Consulted
- Rancher docs: Launching Kubernetes on Existing Custom Nodes — https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes
- Rancher docs: K3s Cluster Configuration Reference — https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/k3s-cluster-configuration
- K3s docs: Requirements — https://docs.k3s.io/installation/requirements
- K3s docs: Basic Network Options — https://docs.k3s.io/networking/basic-network-options
- K3s docs: Cluster Datastore — https://docs.k3s.io/datastore
- K3s docs: Server CLI Reference — https://docs.k3s.io/cli/server
- K3s docs: Private Registry Configuration — https://docs.k3s.io/installation/private-registry
- K3s docs: Resource Profiling — https://docs.k3s.io/reference/resource-profiling
- Kubernetes docs: Swap memory management — https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Kubernetes docs: Linux Node Swap Behaviors — https://kubernetes.io/docs/reference/node/swap-behavior/
- Kubernetes docs: `kubectl create deployment` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes docs: `kubectl expose` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes docs: generated kubectl commands (`top`) — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
1. The node sizing guidance was too low. The post said 1 GB RAM / 1 CPU minimum, but current K3s requirements distinguish server and agent nodes, with server nodes requiring 2 CPU cores and 2 GB RAM minimum. I updated the prerequisites accordingly.
2. The swap guidance was misleading. The post described disabling swap as optional for K3s, but Kubernetes still requires explicit kubelet configuration to tolerate swap. I changed the comment to say swap should be disabled unless Kubernetes has been explicitly configured for swap support.
3. The port table was oversimplified. Port 10250 is specifically needed for kubelet metrics/API access and is required when using metrics-server, and port 6443 is used for the K3s supervisor as well as the Kubernetes API. I corrected those descriptions.
4. The Rancher cluster creation steps used unstable UI wording. Current Rancher docs describe the flow simply as `Cluster Management` -> `Create` -> `Custom`. I updated the wording to match the official flow without depending on a version-specific section label.
5. The networking section implied Canal and Calico are built-in K3s choices in Rancher. Official K3s docs describe Flannel as the default and require disabling Flannel with `flannel-backend: none` before installing a custom CNI, typically alongside `disable-network-policy`. I corrected the section to reflect that.
6. The datastore section was incomplete. K3s supports embedded SQLite, embedded etcd, and supported external datastores such as etcd, MySQL/MariaDB, and PostgreSQL. I updated the text and HA recommendation.
7. The disable-components example location was inaccurate. The post referred to "additional server args" in Rancher, while the documented Rancher path for arbitrary K3s settings is cluster configuration/YAML. I corrected the explanatory text.
8. The private registry mirror YAML was wrong. The `rewrite` rule was attached to the mirror registry name instead of the mirrored upstream registry entry. I moved `rewrite` under `mirrors.docker.io`, matching the official K3s format.
9. The node registration guidance was incomplete for Rancher custom clusters. Rancher requires at least one node with each role (`etcd`, `control plane`, and `worker`) before provisioning completes. I updated the combined-role example to include `--worker` and clarified the single-node / compact HA guidance.
10. The verification and troubleshooting sections understated resource usage and assumed metrics would always be available. I made `metrics-server` conditional in the pod list, changed the `kubectl top` commands to run only when metrics-server is enabled, aligned them with current kubectl docs, and corrected the memory baseline from 500-700 MB to the current K3s profiling range of roughly 1.4-1.6 GB for server nodes.

## Review Notes
- The log commands shown in the post are now explicitly scoped to systemd-based nodes. The post still mentions OpenRC as supported, but OpenRC users would need to use their distro-specific service logging commands instead of `journalctl`.
- The node preparation snippet is valid for common Linux/K3s setups, but exact kernel module and sysctl requirements can still vary based on the chosen CNI and whether the cluster uses IPv4-only, dual-stack, or IPv6-only networking.
