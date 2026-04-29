# Validation Summary: How to Configure kube-proxy in iptables Mode for IPv4 Service Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kube-proxy
- iptables
- IPv4 service routing
- kubeadm

## Sources Consulted
- Kubernetes: Virtual IPs and Service Proxies - https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes: kube-proxy Configuration (v1alpha1) - https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes: kube-proxy command reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes: Using Source IP - https://kubernetes.io/docs/tutorials/services/source-ip
- Kubernetes: Reconfiguring a kubeadm cluster - https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/
- Kubernetes: kubectl rollout restart - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The opening explanation overgeneralized the default proxy mode. I changed it to say that `iptables` is the default when `mode` is unspecified on Linux, which matches the current kube-proxy config API reference.
- The original mode-verification commands were brittle: `grep mode` on the full ConfigMap YAML can match unrelated fields, and log-grepping is not the documented way to confirm the running mode. I changed this to a `jsonpath` lookup of `data.config.conf` and the documented `curl http://localhost:10249/proxyMode` check from a node shell.
- The configuration example listed the wrong default for `iptables.minSyncPeriod` and described `syncPeriod` imprecisely. I corrected the defaults to `minSyncPeriod: 1s` and `syncPeriod: 30s`, and fixed the comments to reflect their documented meanings.
- The ConfigMap editing instructions implied a generic workflow. I clarified that this specific `kube-proxy` ConfigMap workflow applies to kubeadm-managed clusters and that the component config lives under `data.config.conf`.
- The rule-count example claimed to count kube-proxy rules, but the command actually counts all iptables rules on the node. I corrected the description to match what the command does.
- The performance guidance used outdated thresholds and outdated tuning advice. I changed the sizing guidance to the current Kubernetes documentation language around very large clusters, replaced log-grep sync checks with the documented kube-proxy metrics endpoint, and changed the tuning example to adjust `minSyncPeriod` rather than inflating `syncPeriod`.
- The stale-rule cleanup section suggested `iptables-restore < /dev/null`, which would wipe rules indiscriminately. I replaced that with the supported `kube-proxy --cleanup` option from the official kube-proxy command reference.
- The final recommendation to migrate to IPVS for scale is outdated. Current Kubernetes documentation deprecates IPVS and recommends `nftables` as the replacement path for large Linux clusters that support it, so I updated that guidance.

## Review Notes
- The post still references `KUBE-*` iptables chains for inspection and debugging. That is currently useful in `iptables` mode, but Kubernetes does not treat generated iptables chains as a stable API, so future versions or other proxy backends may differ.
- `nftables` mode requires Linux kernel 5.13 or later, and Kubernetes recommends checking network plugin compatibility before switching.
