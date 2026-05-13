# Validation Summary: How to Debug Calico GlobalNetworkPolicy When Traffic Is Blocked

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico `projectcalico.org/v3` API
- Kubernetes
- `calicoctl`
- `kubectl`
- Felix Prometheus metrics
- Calico policy logging

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico network policy default deny behavior: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny

## Issues Found
- The GlobalNetworkPolicy used `selector: all()` without a namespace selector, which also selects non-namespaced host endpoints if present. Added `namespaceSelector: has(projectcalico.org/name)` so the example matches the post's stated focus on Kubernetes workloads across namespaces.
- The verification section claimed `felix_denied` was a policy hit counter. The documented Felix Prometheus metrics do not include that metric in current Calico Open Source documentation, so the command now checks `felix_active_local_policies` as a valid Felix policy metric.
- The post suggested denied traffic would appear in `/var/log/calico/felix.log`. Calico packet-level policy logs require `Log` rules and are emitted through dataplane-specific logging paths, not Felix's process log. Added `Log` rules for unmatched traffic and updated the verification commands to use kernel logs for the iptables dataplane and `bpftool prog tracelog` for the eBPF dataplane.

## Review Notes
Local `calicoctl` and `kubectl` binaries were not installed in the review workspace, so CLI syntax was validated against official Calico and Kubernetes-compatible command documentation rather than local `--help` output. The example remains version-appropriate for the stated Calico v3.26+ prerequisite.
