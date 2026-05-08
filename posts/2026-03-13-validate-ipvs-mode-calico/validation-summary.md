# Validation Summary: How to Validate IPVS Mode with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes Services
- kube-proxy
- IPVS
- ipvsadm
- kubectl
- Linux kernel modules

## Sources Consulted
- Kubernetes documentation: Virtual IPs and Service Proxies, including kube-proxy `ipvs` mode behavior and IPVS kernel module requirement: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kube-proxy configuration API, including supported Linux proxy modes and `mode` field: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes kube-proxy command reference, including IPVS-related options: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes kubectl reference for `kubectl create deployment`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes kubectl reference for `kubectl expose`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl reference for `kubectl run`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico documentation: Use IPVS kube-proxy, including Calico IPVS auto-detection and calico-node restart requirement after changing kube-proxy mode: https://docs.tigera.io/calico/latest/networking/configuring/use-ipvs
- ipvsadm manual page, including `-l/--list` and `-n/--numeric` behavior: https://www.mankier.com/8/ipvsadm
- modprobe manual page, including syntax for loading a module by module name: https://www.mankier.com/8/modprobe

## Issues Found
- The original `modprobe ip_vs ip_vs_rr ip_vs_wrr ip_vs_sh` command could be interpreted as one module name followed by parameters rather than reliably loading each module. Changed it to loop over each IPVS-related module and `nf_conntrack`.
- The original kube-proxy restart step omitted Calico's documented requirement to restart `calico-node` when kube-proxy is changed to IPVS mode in a running cluster, because Calico detects IPVS mode when calico-node starts. Added a `kubectl rollout restart daemonset -n kube-system calico-node` command.
- The original service count command used `kubectl get svc -A | wc -l`, which includes the table header and counts headless services that are not represented by a ClusterIP virtual service. Changed it to exclude the header and headless services, and clarified that services with multiple ports create multiple IPVS virtual services.
- The conclusion said to validate that all services are represented in the IPVS table. Changed this to `kube-proxy-managed services` because headless and other non-proxied service forms are not represented the same way.
- The Mermaid diagram labeled the Calico path as `Calico eBPF/iptables`, which could imply Calico eBPF is part of the same kube-proxy IPVS service path. Changed it to the more accurate `Calico routing/network policy`.
- The Mermaid diagram label used `O1 lookup`; changed it to `O(1) lookup`.
- The original description promised validation of load distribution, but the post does not include a load distribution test. Updated the description to match the actual validation steps.

## Review Notes
- The command examples are generally valid for current Kubernetes: `kubectl create deployment --replicas`, `kubectl expose deployment --port --type=ClusterIP`, `kubectl run ... -- [args]`, and `kubectl rollout restart daemonset` are current kubectl patterns.
- Current Kubernetes documentation includes `nftables` as a stable Linux kube-proxy mode in addition to `iptables` and `ipvs`; this does not invalidate the IPVS-specific guidance.
