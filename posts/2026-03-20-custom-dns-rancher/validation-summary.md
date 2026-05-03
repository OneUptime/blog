# Validation Summary: How to Configure Custom DNS Providers in Rancher - A Practical Guide

## Status
not-technically-relevant

## Post Type
Tutorial / Guide (mislabeled template content)

## Technologies Covered
- Rancher (claimed)
- CoreDNS (claimed in tags/description, but never actually covered)
- Kubernetes
- CNI (Container Network Interface)
- NetworkPolicy
- kubectl
- Calico (referenced)
- Prometheus / PrometheusRule
- node-exporter metrics

## Sources Consulted
- Rancher v2.7+ documentation: https://ranchermanager.docs.rancher.com/
- CoreDNS official docs: https://coredns.io/manual/toc/
- Kubernetes DNS customization: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- CNI specification: https://github.com/containernetworking/cni/blob/main/SPEC.md
- Calico CLI reference (calicoctl): https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Prometheus Operator PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
The post is template/placeholder content where the title and topic do not match the body. Rather than attempt to fix wrong-topic content piecemeal, the post is being marked as not-technically-relevant. Specific problems:

1. **Title vs content mismatch**: The title and tags promise a guide to "Custom DNS Providers in Rancher" with CoreDNS configuration. The body contains no DNS provider configuration, no CoreDNS Corefile / `kube-dns` ConfigMap overrides, no Rancher cluster-level DNS settings, no upstream nameserver / forwarding setup, and no `dnsConfig` / `dnsPolicy` examples. The only DNS-adjacent content is one `nslookup kubernetes.default.svc.cluster.local` command in the troubleshooting section.

2. **Template artifacts in prose**:
   - Introduction reads "How to Configure Custom DNS Providers in Rancher is an important networking capability..." which is the title literally inserted into a sentence template.
   - Conclusion reads "How to Configure Custom DNS Providers in Rancher configuration in Rancher requires..." with the title duplicated/concatenated awkwardly with "configuration in Rancher", demonstrating mechanical template substitution.

3. **Fabricated CNI plugin example (Step 2)**: The ConfigMap uses `"type": "main-cni-plugin"` which is not a real CNI plugin — it is an obvious placeholder. Additionally, the overall pattern of putting CNI configuration in a Kubernetes ConfigMap named `network-config` in `kube-system` is not how CNI configuration actually works in Kubernetes; CNI configurations are read from `/etc/cni/net.d/` on each node by the kubelet/container runtime, not from a generic ConfigMap.

4. **Non-existent Calico command (Steps 5 and 7)**: The post uses `calico-node -show-status` to check Calico status. This is not a documented or real command. The actual command for Calico node status is `calicoctl node status` (using the `calicoctl` CLI). Running `calico-node -show-status` inside the calico-node pod would not work as written.

5. **Misleading comment (Step 1)**: The comment `# Check current CNI plugin` precedes `kubectl get configmap -n kube-system kube-proxy -o yaml | grep mode`, which actually inspects kube-proxy mode (iptables vs IPVS), not the CNI plugin.

6. **Off-topic Step 6**: A PrometheusRule with `up{job="network-probe"} == 0` and `node_network_transmit_errs_total` is generic node/network monitoring; it has no relation to DNS providers in Rancher.

Because the body has essentially no salvageable content tied to the stated topic ("Custom DNS Providers in Rancher" / CoreDNS overrides), correcting the technical errors would not produce a post that delivers on its title — it would still be a generic networking guide under a DNS-themed title. A correct version of this post would need to be rewritten from scratch covering, e.g., editing the `coredns` ConfigMap in `kube-system`, configuring forward plugins to upstream resolvers, using `NodeLocalDNSCache`, customizing `dnsConfig`/`dnsPolicy` on workloads, or Rancher-specific cluster.yml `dns:` provider stanza for RKE.

## Review Notes
None.
