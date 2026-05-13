# Validation Summary: How to Monitor Forwarded Traffic Policies on Calico Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- calicoctl
- kubectl
- Linux iptables data plane and kernel logs

## Sources Consulted
- Calico documentation: Apply policy to forwarded traffic - https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico documentation: Apply on forwarded traffic - https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico documentation: HostEndpoint resource - https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Configuring calico/node - https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- The policy example allowed traffic but did not log it, so it did not directly support the post's monitoring goal. Added a matching `Log` rule before the `Allow` rule, consistent with Calico's documented behavior that processing continues after `Log`.
- The ingress rule matched destination ports without specifying a protocol. Added `protocol: TCP` to the log and allow rules so the example clearly applies to SSH, HTTPS, and Kubernetes API TCP ports.
- The operational command described viewing policy decisions with `iptables -L`, which only shows programmed chains and rules, not packet-level policy log output. Replaced it with a kernel log query for `calico-packet`, which is the documented iptables data plane log prefix for Calico `Log` actions.
- The Felix health command used `-felix-live`, but Calico documents the exec readiness flag as `-felix-ready`. Updated the command to use `/bin/calico-node -felix-ready`.

## Review Notes
- The `applyOnForward: true`, `preDNAT: false`, `HostEndpoint`, and `GlobalNetworkPolicy` fields are valid for current Calico documentation and are consistent with Calico v3.26+ behavior.
- The namespace for `calico-node` pods may be `kube-system` for manifest-based installs or `calico-system` for operator-based installs; the post uses `kube-system`, which is valid for some deployments.
