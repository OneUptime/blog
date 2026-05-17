# Validation Summary: How to Configure Host DNS in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration)
- Host DNS proxy / `dns-resolve-cache` service
- CoreDNS (Kubernetes cluster DNS)
- `talosctl` CLI (apply-config, get resolvers, get hostdnsstatus, read, logs, pcap, services)
- DHCP networking on Talos
- Kubernetes DNS resolution

## Sources Consulted
- Talos Linux Host DNS documentation (v1.9): https://docs.siderolabs.com/talos/v1.9/networking/host-dns/
- Talos Linux Host DNS documentation (v1.7): https://docs.siderolabs.com/talos/v1.7/networking/host-dns/
- Talos `v1alpha1` machine configuration reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos GitHub discussion on `talosctl pcap` and BPF filters: https://github.com/siderolabs/talos/discussions/8915
- Talos GitHub discussion on starting Host DNS (#9434): https://github.com/siderolabs/talos/discussions/9434
- CoreDNS Corefile documentation (forward, cache plugins): https://coredns.io/plugins/

## Issues Found
1. **Incorrect version claim for host DNS feature.** The post originally stated "Talos Linux v1.6 and later supports host DNS forwarding". According to the official Talos documentation, the host DNS feature was introduced in v1.7.0, and `forwardKubeDNSToHost` was added/enabled-by-default in v1.8.0. Updated the wording to: "Talos Linux v1.7 introduced the host DNS feature, and v1.8 and later supports host DNS forwarding".

## Review Notes
- The `machine.network.nameservers`, `searchDomains`, and `extraHostEntries` (with `ip` + `aliases`) fields are all correct against the v1alpha1 schema.
- The `machine.features.hostDNS.enabled` and `forwardKubeDNSToHost` fields are correct.
- The host DNS proxy listening address `127.0.0.53` is correct; the link-local address `169.254.116.108` mentioned in the verification grep is what gets allocated when `forwardKubeDNSToHost` is enabled.
- `talosctl get resolvers`, `talosctl get hostdnsstatus`, `talosctl read`, `talosctl services`, `talosctl logs dns-resolve-cache`, and `talosctl pcap --interface --bpf-filter --duration -o` commands and flags all match the official CLI reference.
- The CoreDNS Corefile sample (errors / health / kubernetes / forward . /etc/resolv.conf / cache / loop / reload / loadbalance) is standard and syntactically valid.
- The "Performance Tuning" section's first YAML snippet only shows `enabled` and `forwardKubeDNSToHost` (no additional tuning knobs). Talos's hostDNS only exposes `enabled`, `forwardKubeDNSToHost`, and `resolveMemberNames` — there are no extra cache/connection knobs on the host DNS side, so the snippet is accurate but the section's framing slightly oversells what host DNS itself offers. Considered a style/clarity nit rather than a factual error, so left as-is.
- The host DNS proxy is technically part of `machined`; the post's "Talos init system" wording is informally correct.
