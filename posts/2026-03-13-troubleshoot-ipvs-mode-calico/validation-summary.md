# Validation Summary: How to Troubleshoot IPVS Mode with Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Services
- kube-proxy IPVS mode
- Calico networking
- Linux IPVS kernel modules
- kubectl
- ipvsadm

## Sources Consulted
- Kubernetes documentation: Virtual IPs and Service Proxies, https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kubectl reference: kubectl rollout, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes kubectl reference: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl reference: kubectl expose, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl reference: kubectl create deployment, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Calico documentation: Use IPVS kube-proxy, https://docs.tigera.io/calico/latest/networking/configuring/use-ipvs
- Debian ipvsadm man page, https://manpages.debian.org/bookworm/ipvsadm/ipvsadm.8.en.html

## Issues Found
- The post described IPVS as a broadly superior replacement for iptables mode. Kubernetes v1.35+ documentation marks IPVS proxy mode deprecated and recommends nftables mode as the replacement where supported, so the wording was changed to say IPVS can improve performance at scale while noting the current deprecation.
- The post said Calico works with IPVS without mentioning Calico's documented detection behavior. Added that Calico automatically enables IPVS support when detected and that calico-node should be restarted after switching kube-proxy mode in a running cluster.
- The kube-proxy restart command was changed to the canonical `daemonset/kube-proxy` resource form used by kubectl rollout examples.
- The IPVS verification command compared IPVS virtual-service lines to the raw number of Kubernetes Service objects. That is misleading because multi-port Services and NodePorts can create multiple IPVS entries. The check now counts protocol header lines and asks readers to compare against Service details rather than a raw `wc -l`.
- The test client command created a persistent pod by default. Added `--rm -i --restart=Never` so the command behaves as a one-shot connectivity probe.
- The diagram label used `O1`; corrected it to `O(1)`.

## Review Notes
The Calico namespace varies by installation, so the restart example now discovers the namespace before restarting `calico-node`. Managed Kubernetes offerings may also manage kube-proxy configuration outside the editable ConfigMap workflow shown here.
