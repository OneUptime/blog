# Validation Summary: How to Configure RKE2 Kubelet Arguments

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RKE2
- Kubernetes
- kubelet
- KubeletConfiguration
- systemd
- kubectl

## Sources Consulted
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Manual Upgrades / Restarting RKE2: https://docs.rke2.io/upgrades/manual
- Kubernetes kubelet command-line reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes Kubelet Configuration API v1beta1: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Node Shutdowns: https://kubernetes.io/docs/concepts/cluster-administration/node-shutdown/
- Kubernetes Reserve Compute Resources for System Daemons: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes Garbage Collection: https://kubernetes.io/docs/concepts/architecture/garbage-collection/
- Kubernetes CPU Management Policies: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes Topology Manager: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/

## Issues Found
- The graceful node shutdown example used `shutdown-grace-period` and `shutdown-grace-period-critical-pods` as direct kubelet arguments. Current Kubernetes documentation describes these as `KubeletConfiguration` fields (`shutdownGracePeriod` and `shutdownGracePeriodCriticalPods`), not kubelet command-line flags. I changed that section to create an RKE2 v1.32+ kubelet configuration drop-in under `/var/lib/rancher/rke2/agent/etc/kubelet.conf.d/` and removed the invalid direct shutdown flags from the full `kubelet-arg` example.
- The troubleshooting section only showed `rke2-server` logs. Since the article covers both server and agent nodes, I added the matching `rke2-agent` journal command.
- I added a brief note that RKE2 v1.32 and newer support kubelet configuration drop-ins for settings that are `KubeletConfiguration` fields.

## Review Notes
Current Kubernetes documentation marks many kubelet command-line flags as deprecated in favor of configuration through the kubelet config file. RKE2 still documents `kubelet-arg` as a supported direct flag mechanism, including for lower RKE2 minors, but RKE2 v1.32 and newer recommend kubelet configuration drop-ins where possible.
