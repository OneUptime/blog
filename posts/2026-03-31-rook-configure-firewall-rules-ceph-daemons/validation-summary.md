# Validation Summary: How to Configure Firewall Rules for All Ceph Daemons

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph (MON, OSD, MGR, MDS, RGW daemons)
- Rook (Ceph operator for Kubernetes)
- firewalld (RHEL/Rocky/AlmaLinux)
- iptables
- Kubernetes NetworkPolicy

## Sources Consulted
- Ceph official documentation on network configuration and port references: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph documentation on monitor (MON) ports: msgr2 protocol on 3300/tcp, legacy msgr1 on 6789/tcp
- Ceph documentation on OSD/MGR/MDS daemon port range: 6800-7300/tcp
- Ceph Dashboard documentation: default HTTPS on port 8443
- Ceph MGR Prometheus module documentation: default metrics port 9283
- Ceph RGW (RADOS Gateway) documentation: default HTTP on 7480
- firewalld predefined service definitions for `ceph` and `ceph-mon`
- iptables manual for port range syntax (colon-separated ranges with `--dport`)
- Kubernetes NetworkPolicy API reference (networking.k8s.io/v1): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#networkpolicy-v1-networking-k8s-io
- Kubernetes NetworkPolicy `endPort` field (GA since Kubernetes 1.25): https://kubernetes.io/docs/concepts/services-networking/network-policies/#targeting-a-range-of-ports

## Issues Found
- **Missing OSD port range in Kubernetes NetworkPolicy**: The intra-namespace ingress rule only allowed MON ports (3300, 6789) from the `rook-ceph` namespace. OSD ports (6800-7300) were not included, which would block OSD-to-OSD replication traffic and client I/O to OSDs, effectively breaking the Ceph cluster. Fixed by adding a port entry with `port: 6800` and `endPort: 7300` to the first ingress rule. The `endPort` field is supported since Kubernetes 1.22 (beta) and GA in 1.25, which aligns with Rook's Kubernetes version requirements.

## Review Notes
- The port reference table, firewalld commands, iptables script, role-based firewall functions, and testing commands are all technically accurate.
- The `iptables-save > /etc/sysconfig/iptables` path is specific to RHEL-based systems; Debian/Ubuntu would use `/etc/iptables/rules.v4`, but the post explicitly targets RHEL/Rocky/AlmaLinux, so this is correct in context.
- The egress rule in the NetworkPolicy is very permissive (allows all outbound to any namespace without port restrictions). This is functional but could be tightened in a production environment. Not changed since it is not incorrect, just broadly scoped for an example.
- The NetworkPolicy does not include a rule for Prometheus metrics port 9283 from external monitoring namespaces. This is a potential gap for monitoring setups but not an error in the firewall configuration itself.
