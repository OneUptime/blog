# Validation Summary: How to Configure DNS Nameservers in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config v1alpha1)
- talosctl CLI (`gen config`, `patch machineconfig`, `get resolvers`, `get addresses`, `image pull`, `service`)
- Kubernetes CoreDNS
- DHCP / static DNS configuration

## Sources Consulted
- Talos Linux configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos resolvers networking docs: https://docs.siderolabs.com/talos/v1.12/networking/configuration/resolvers
- Talos host DNS docs: https://docs.siderolabs.com/talos/v1.7/networking/host-dns/
- Talos config patching docs: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Talos CoreDNS customization discussion: https://github.com/siderolabs/talos/discussions/10012
- Talos release notes for v1.8 (`forwardKubeDNSToHost` default)

## Issues Found

1. **Inaccurate description of multi-resolver failover semantics.**
   The original post stated nameservers are "tried in order" with strict primary-then-secondary fallback. Talos's host DNS proxy (CoreDNS-style forwarder) does not guarantee strict sequential failover in user-listed order — it may select among healthy upstreams. Rewrote the relevant paragraph in the "Machine-Level DNS Configuration" section and the related "Slow DNS resolution" / "DNS server order matters" bullets in Troubleshooting to describe the actual behavior: the proxy tries other upstreams if one fails, and all listed nameservers should be ones you trust to respond promptly.

2. **Incorrect CoreDNS customization example.**
   The original post recommended creating a `coredns-custom` ConfigMap with a `custom.server` key in `kube-system`. That convention is specific to AKS (and a few other managed distributions) — stock Talos CoreDNS does not import it, so the example would have been silently ignored. Replaced the example with the correct Talos approach: editing the existing `coredns` ConfigMap (`kubectl -n kube-system edit configmap coredns`) and adding a server block to the Corefile, with a note that `cluster.coredns.disabled: true` is available for users who want to manage CoreDNS themselves.

## Review Notes

- The `talosctl service timed` command is current — Talos still uses the `timed` service for SNTP.
- The claim that CoreDNS uses the host node's DNS configuration as its upstream resolver is accurate as a default starting in Talos v1.8 (`forwardKubeDNSToHost` enabled by default). On pre-1.8 clusters the behavior depended on kubelet's resolver. The post does not mention a version, but the current default matches the description, so no change was made.
- `talosctl patch machineconfig` accepts both strategic merge patches (object form, as used in the post) and JSON Patch (RFC6902 array form) — auto-detected. The example is valid.
- Example IPs (10.0.0.2, 10.0.0.3, 192.168.1.x, 8.8.8.8, 1.1.1.1) are illustrative and appropriate.
