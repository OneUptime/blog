# Validation Summary: How to Configure Firewall Ports 6789 and 3300 for Ceph Monitors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (monitors, msgr1/v1 and msgr2/v2 protocols)
- iptables
- firewalld
- Kubernetes NetworkPolicy
- kubectl CLI

## Sources Consulted
- Ceph official documentation on messenger v2 protocol: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph official documentation on monitor configuration: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Rook documentation on Ceph monitor configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#networkpolicy-v1-networking-k8s-io
- iptables man page for rule syntax
- firewall-cmd man page for firewalld commands
- Ceph configuration option reference for `ms_bind_msgr1`

## Issues Found
No technical issues found.

## Review Notes
- The `iptables-save > /etc/iptables/rules.v4` path is specific to Debian/Ubuntu systems using the `iptables-persistent` package. On RHEL/CentOS, the path would be `/etc/sysconfig/iptables` (or use `iptables-save > /etc/sysconfig/iptables`). The post covers firewalld separately for RHEL/CentOS, so this is an acceptable convention.
- The `ss -tlnp` command may not be available in all Ceph container images (it requires iproute2). Most official Ceph images include it, but minimal images may not.
- The connectivity test using `/dev/tcp/` is bash-specific and requires the OSD container to have bash installed. Ceph containers typically include bash, so this should work in practice.
- The NetworkPolicy uses `namespaceSelector: {}` which allows ingress from all namespaces. In production environments with strict network segmentation, users may want to restrict this to specific namespaces (e.g., only the rook-ceph namespace and application namespaces that use Ceph).
