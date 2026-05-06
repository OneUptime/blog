# Validation Summary: How to Calico eBPF Mode with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico eBPF dataplane
- IPv6
- Kubernetes
- Tigera Operator
- `kubectl`

## Sources Consulted
- Calico Documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Documentation: Install in eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Documentation: Configure dual stack or IPv6 only - https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico Documentation: Configure IP autodetection - https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico Documentation: Installation reference - https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes Documentation: IPv4/IPv6 dual-stack - https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Documentation: Cluster Networking - https://kubernetes.io/docs/concepts/cluster-administration/networking/

## Issues Found
- Replaced the generic Python subnet-filter example with an actual Calico operator `Installation` example. The original code did not configure Calico at all and also used invalid IPv6 literals such as `2001:db8:trusted::/48`, which cannot be parsed.
- Removed the dependency-install commands for `ipaddress`, `netaddr`, and `ipaddr.js`. They are not part of enabling Calico eBPF mode, `ipaddress` is already in Python's standard library, and the extra packages were unused.
- Replaced the placeholder `ipv6:` YAML block with documented Calico configuration fields: `linuxDataplane`, `bpfNetworkBootstrap`, `kubeProxyManagement`, `nodeAddressAutodetectionV6`, and `ipPools`.
- Replaced the nonexistent `python3 configure.py --config config.yaml` flow with the documented operator-based `kubectl create` and `kubectl patch` commands used to apply or switch to the BPF dataplane.
- Replaced the verification and monitoring steps with documented Calico commands: `watch kubectl get tigerastatus` and `calico-node -bpf` inspection commands for NAT, conntrack, and counters.
- Corrected the conclusion so it reflects Calico's actual IPv6 and eBPF workflow instead of referring to a missing Python module.

## Review Notes
- The post now documents the Tigera Operator workflow for self-managed clusters. Manifest-based installs and some managed Kubernetes distributions require different eBPF enablement steps.
- The configuration example is IPv6-only. Dual-stack clusters need both an IPv4 pool and an IPv6 pool.
- Automatic `kube-proxy` management is appropriate only when `kube-proxy` is not being reconciled by another tool and the cluster meets Calico's documented eBPF prerequisites.
