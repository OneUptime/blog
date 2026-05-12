# Validation Summary: How to Test IPVS Mode with Calico with Live Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (CNI for Kubernetes)
- Kubernetes (kube-proxy, services, deployments)
- IPVS (IP Virtual Server)
- ipvsadm (Linux IPVS administration tool)
- Linux kernel modules (ip_vs, ip_vs_rr, ip_vs_wrr, ip_vs_sh, nf_conntrack)
- kubectl
- Mermaid (diagram rendering)

## Sources Consulted
- Kubernetes kube-proxy IPVS mode documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-mode-ipvs
- Kubernetes blog on IPVS-based in-cluster load balancing: https://kubernetes.io/blog/2018/07/09/ipvs-based-in-cluster-load-balancing-deep-dive/
- Calico documentation on kube-proxy compatibility: https://docs.tigera.io/calico/latest/networking/
- ipvsadm(8) man page (Linux Virtual Server administration utility)
- kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Mermaid diagram syntax documentation: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

All commands, kernel module names, configuration steps, and conceptual explanations were verified against authoritative sources:
- The four IPVS scheduler modules listed (`ip_vs_rr`, `ip_vs_wrr`, `ip_vs_sh`) along with the core `ip_vs` module are correct.
- `ipvsadm -ln` correctly lists the IPVS virtual server table in numeric format.
- The kube-proxy configmap edit instruction (`mode: "ipvs"`) reflects the current Kubernetes ConfigMap schema.
- `kubectl rollout restart daemonset -n kube-system kube-proxy` is the correct way to restart kube-proxy.
- The Calico/IPVS coexistence claim is accurate — Calico handles pod networking and policy while IPVS handles service load balancing.
- The IPVS vs iptables performance characterization (O(1) hash lookups vs linear iptables traversal) is consistent with the Kubernetes documentation and the original IPVS proposal.

## Review Notes
- The grep command `ipvsadm -ln | grep -c "TCP\|UDP"` relies on GNU grep's BRE extension for `\|` alternation; it works on Linux distributions using GNU grep but would be more portable as `grep -cE "TCP|UDP"`. This is a portability nit, not a correctness issue.
- `nf_conntrack` is referenced in the `lsmod` check but not in the `modprobe` line — on most modern kernels it is autoloaded, so this is acceptable, but operators on minimal kernels may also need to load it explicitly.
- The Mermaid node label uses `\n` for the line break and writes `O1 lookup` without parentheses. `\n` is supported by Mermaid for line breaks, and the parens are avoided because Mermaid requires quoting labels containing `(` or `)`. Both choices are valid workarounds, though `IPVS["kube-proxy IPVS<br/>O(1) lookup"]` would be more conventional.
- The `kubectl run test-client --image=busybox -- wget -O- http://${SVC_IP}/` line runs a one-shot pod that terminates after the wget; it is intentional for a quick connectivity check but does not persist for repeated testing.
