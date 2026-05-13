# Validation Summary: How to Log and Audit Calico Host Endpoint Policies

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
- Felix
- Linux iptables policy logging

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoints overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico applyOnForward host endpoint policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico host forwarded traffic policy guide: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- The GlobalNetworkPolicy example did not actually log traffic, despite the post claiming to show logging and audit configuration. Added `action: Log` rules before the corresponding `Allow` rules because Calico continues processing after `Log`, while `Allow` is terminal.
- The ingress rules matched destination ports without an explicit protocol. Added `protocol: TCP` for the SSH, HTTPS, and Kubernetes API ports to make the intent unambiguous and align with Calico policy examples that pair port matches with a protocol.
- The operational command for viewing policy decisions used `iptables -L`, which shows programmed chains but not Calico log-rule output. Replaced it with `journalctl -k | grep calico-packet` for iptables-based deployments, matching Calico's documented log output behavior.
- The `calicoctl get` examples used plural `hostendpoints` and short `-o wide`. Updated them to the documented `calicoctl get hostEndpoint --output=wide` form.
- The Felix status command used a placeholder pod in `kube-system` and checked liveness. Updated it to a current `calico-system` DaemonSet exec example using the documented `/bin/calico-node -felix-ready` readiness check.

## Review Notes
- Calico namespaces can vary by installation method; operator-based installs commonly use `calico-system`, while some manifest-based installs use `kube-system`.
- The policy logs all egress traffic from the selected host endpoint. Calico documentation warns that log policies can add significant overhead and should be removed after testing or troubleshooting.
