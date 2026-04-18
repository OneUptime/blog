# Validation Summary: How to Troubleshoot NodePort Service IPv4 Accessibility in Kubernetes

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Kubernetes Services (NodePort)
- kubectl CLI
- kube-proxy (iptables mode)
- iptables
- UFW (Uncomplicated Firewall)
- firewalld
- Cloud security groups (AWS, GCP, Azure)
- alpine/busybox wget

## Sources Consulted
- Kubernetes official Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes NodePort range documentation (default 30000-32767, configurable via `--service-node-port-range`): https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes external traffic policy documentation: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/#preserving-the-client-source-ip
- kube-proxy iptables chains reference (KUBE-NODEPORTS, KUBE-SVC-*): https://kubernetes.io/docs/reference/networking/virtual-ips/
- kubectl reference for `get`, `run`, `exec`, `patch`: https://kubernetes.io/docs/reference/kubectl/
- iptables, UFW, and firewalld official man pages

## Issues Found
No technical issues found.

Verified specifically:
- Default NodePort range 30000-32767 is correct.
- `kubectl get nodes -o wide` column 6 is INTERNAL-IP, so the awk extraction is accurate.
- `kubectl get pods -o wide` column 7 is NODE, so the awk extraction is accurate.
- `KUBE-NODEPORTS` chain in the `nat` table is the correct chain installed by kube-proxy in iptables mode.
- `externalTrafficPolicy` values `Local` and `Cluster` are valid.
- The `kubectl patch` JSON merge patch syntax for updating `externalTrafficPolicy` is valid.
- `alpine` image's busybox `wget` supports the `-qO-` shorthand used in Step 2.

## Review Notes
- The `kubectl get endpoints` command in Step 5 still works but has been superseded by EndpointSlices (`kubectl get endpointslices`) in modern Kubernetes versions; the legacy Endpoints API remains supported for backwards compatibility, so this is not flagged as an error.
- Step 4's `iptables -L INPUT -n -v | grep 31234` may not show kube-proxy's NodePort handling because kube-proxy installs DNAT rules in the `nat` table (not the `filter` INPUT chain). The check is still valid for spotting host-firewall blocks against the port, which is the stated intent.
- Post applies to kube-proxy in iptables mode. Clusters using IPVS or nftables-based kube-proxy (or alternative dataplanes like Cilium with kube-proxy replacement) will have different chain layouts; this is an acceptable scoping choice for the guide.
