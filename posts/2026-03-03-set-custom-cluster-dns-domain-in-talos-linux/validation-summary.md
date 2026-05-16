# Validation Summary: How to Set Custom Cluster DNS Domain in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl)
- Kubernetes
- CoreDNS
- kubelet
- kube-apiserver certificates / SANs
- ExternalDNS
- Helm
- DNS / resolv.conf

## Sources Consulted
- Talos Linux talosctl CLI reference: https://www.talos.dev/v1.7/reference/cli/
- Talos Linux v1alpha1 config reference (cluster.network.dnsDomain): https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- CoreDNS Kubernetes plugin docs: https://coredns.io/plugins/kubernetes/
- CoreDNS forward plugin docs: https://coredns.io/plugins/forward/
- kubeadm-generated apiserver certificate SANs (defaults include `kubernetes.default.svc.<dnsDomain>`)
- ExternalDNS project docs: https://github.com/kubernetes-sigs/external-dns

## Issues Found
No technical issues found.

Verified items:
- `talosctl gen config --dns-domain="..."` flag exists and defaults to `cluster.local`.
- The machine config path `cluster.network.dnsDomain` is correct.
- The `--config-patch @file.yaml` syntax with the `@` prefix is supported by talosctl.
- The CoreDNS Corefile `kubernetes <domain> in-addr.arpa ip6.arpa { pods insecure; fallthrough in-addr.arpa ip6.arpa }` is valid for the Kubernetes plugin.
- The forward plugin used in the multi-cluster Corefile (`forward . <ip>`) is correct.
- The standard apiserver certificate includes `kubernetes.default.svc.<dnsDomain>` as a default SAN, so changing the cluster DNS domain propagates to that SAN.
- Pod `/etc/resolv.conf` contents (`search default.svc.<domain> svc.<domain> <domain>` and `options ndots:5`) match documented Kubernetes pod DNS behavior.
- CoreDNS pods carry the `k8s-app=kube-dns` label for kube-dns compatibility (intentional).
- `kubectl run ... --rm -it --restart=Never` syntax is correct.

## Review Notes
- The post correctly emphasizes that `dnsDomain` is set at cluster generation time and cannot be changed in-place without recreating the cluster.
- The ExternalDNS image `registry.k8s.io/external-dns/external-dns:v0.14.0` is a valid pinned version; readers may want a newer release at the time of use.
- The multi-cluster CoreDNS example uses a stub-zone server block (`k8s-west.example.com:53 { forward . ... }`) which is valid CoreDNS syntax; in practice operators often combine this with `cache` and proper health-checking, but the simplified example is appropriate for a tutorial.
- The troubleshooting `talosctl ... get machineconfig | grep -A 5 "network:"` works best on control plane nodes, since worker nodes don't carry the full `cluster.network` section — not an error, just a usage caveat.
