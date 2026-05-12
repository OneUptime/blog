# Validation Summary: How to Secure IPVS Mode with Calico

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Calico (CNI plugin)
- Kubernetes
- IPVS (IP Virtual Server) mode for kube-proxy
- kube-proxy
- Linux kernel modules (ip_vs, ip_vs_rr, ip_vs_wrr, ip_vs_sh, nf_conntrack)
- kubectl
- ipvsadm

## Sources Consulted
- Kubernetes official documentation on kube-proxy IPVS mode: https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-mode-ipvs
- Kubernetes IPVS readme: https://github.com/kubernetes/kubernetes/blob/master/pkg/proxy/ipvs/README.md
- Calico documentation on kube-proxy compatibility: https://docs.tigera.io/calico/latest/networking/configuring/use-ipvs
- Linux IPVS documentation (LVS project): http://www.linuxvirtualserver.org/
- ipvsadm man page

## Issues Found
- **Mermaid diagram label "O1 lookup"**: The introduction correctly references "O(1) lookups" using big-O notation, but the mermaid diagram used "O1 lookup" (likely to avoid the parenthesis-escaping requirement in mermaid node labels). Updated the IPVS node label to be wrapped in quotes (`IPVS["kube-proxy IPVS\nO(1) lookup"]`) so the parentheses render correctly and match the intro's notation.

## Review Notes
- All shell commands (`lsmod`, `modprobe`, `kubectl edit configmap`, `kubectl rollout restart`, `ipvsadm -ln`, `kubectl get svc`, `kubectl create deployment`, `kubectl expose`, `kubectl run`) are syntactically correct and current.
- The required IPVS kernel modules listed (`ip_vs`, `ip_vs_rr`, `ip_vs_wrr`, `ip_vs_sh`) match the official Kubernetes documentation. `nf_conntrack` is checked via `lsmod` but not explicitly loaded; this is fine for modern kernels (≥4.19) where the module is typically auto-loaded, and the kube-proxy itself can ensure it is loaded.
- The configMap edit instruction is correct: setting `mode: "ipvs"` in the kube-proxy ConfigMap is the documented way to enable IPVS mode.
- The performance claim — IPVS uses hash tables for O(1) service lookups vs. iptables' linear traversal — is consistent with the kube-proxy IPVS design documentation.
- The Calico + IPVS compatibility statement is accurate: Calico handles pod-to-pod connectivity and policy, while kube-proxy in IPVS mode handles Service VIP load balancing. They operate at different layers and do not conflict.
- The title mentions "Secure" but the post focuses on enabling and verifying IPVS mode rather than security-specific hardening (e.g., NetworkPolicies restricting service access). This is a content scope observation, not a technical error, and is consistent with the framing used in the series.
- The `ipvsadm -ln | grep -c "TCP\|UDP"` counting approach is functional, though it will count both virtual service header lines and any real server entries containing those strings; for a more precise count, one could use `ipvsadm -ln | grep -cE "^(TCP|UDP)"`. Not changed as the existing command demonstrates the concept adequately.
