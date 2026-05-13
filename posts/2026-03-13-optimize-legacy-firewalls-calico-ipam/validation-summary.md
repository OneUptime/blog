# Validation Summary: How to Optimize Legacy Firewall Integration with Calico IPAM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (CNI plugin for Kubernetes)
- Calico IPAM
- Calico IPPool resource (projectcalico.org/v3)
- Calico IPReservation resource (projectcalico.org/v3)
- `calicoctl` CLI
- Kubernetes pod annotations (`cni.projectcalico.org/ipAddrs`)
- kubectl
- tcpdump / netcat (`nc`) for connectivity verification
- Mermaid diagrams

## Sources Consulted
- Calico project documentation for IPPool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico project documentation for IPReservation resource: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico IPAM and pod IP assignment documentation: https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico release notes (for IPReservation introduction in v3.21)
- Kubernetes Pod annotations reference
- tcpdump and netcat (`nc`) man pages

## Issues Found
- **Prerequisite Calico version was incorrect.** The post listed "Calico v3.20+" as a prerequisite, but the `IPReservation` custom resource used in Step 3 was introduced in Calico v3.21. Updated the prerequisite to "Calico v3.21+ with Calico IPAM (IPReservation requires v3.21 or later)" so readers using v3.20 do not hit unrecognized-resource errors when applying the Step 3 manifests.

## Review Notes
- The IPPool spec fields used (`cidr`, `blockSize`, `nodeSelector`, `ipipMode`, `natOutgoing`) are all valid for `projectcalico.org/v3`. The combination `ipipMode: Never` plus `natOutgoing: false` is the correct configuration for making real pod source IPs visible to upstream legacy firewalls, provided the underlay network is configured to route the pod CIDRs (typically via BGP peering or static routes). The post does not explicitly mention this routing prerequisite — readers should be aware that firewalls outside the cluster need a route back to pod CIDRs for return traffic to work.
- The CIDRs used in the examples (10.50.0.0/18, 10.50.64.0/20, 10.50.80.0/22) do not overlap, which is correct (10.50.0.0/18 covers 10.50.0.0–10.50.63.255; 10.50.64.0/20 covers 10.50.64.0–10.50.79.255; 10.50.80.0/22 covers 10.50.80.0–10.50.83.255).
- The annotation `cni.projectcalico.org/ipAddrs` with a JSON array value is correct for requesting a specific IP for a pod with Calico IPAM. The IP must come from an existing IPPool and (when used together with IPReservation) the reservation ensures Calico will not auto-allocate that IP to other pods.
- The Mermaid diagram uses `\n` for line breaks inside node labels. Newer Mermaid versions render line breaks with `<br>` instead; `\n` still works in many renderers but may render literally in some. This is a rendering concern, not a technical inaccuracy, so it was left as-is.
- The `tcpdump -c5` form (no space between `-c` and the count) is accepted by tcpdump's getopt-style parser; the more idiomatic form is `-c 5`, but the existing form is functionally correct.
- `natOutgoing: false` on a pool only suppresses SNAT when the destination is outside all configured Calico IP pools; this matches the post's intent for traffic leaving the cluster toward firewall-protected resources.
