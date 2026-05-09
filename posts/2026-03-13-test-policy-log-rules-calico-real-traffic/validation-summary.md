# Validation Summary: How to Test Calico Policy Log Rules with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- `calicoctl`
- `kubectl`
- Calico policy logging

## Sources Consulted
- Calico documentation: Use log rules to test network policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: `calicoctl apply`: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: `calicoctl get`: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Troubleshooting commands for network policies: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands

## Issues Found
- The original NetworkPolicy did not include any `action: Log` rules, so it did not actually test Calico policy log rules. I added ingress and egress `Log` rules.
- The original example placed only final `Allow` rules in the policy. Calico continues evaluating rules after `Log`, while `Allow` and `Deny` are final, so I paired each `Log` rule with an explicit matching `Allow` rule after it.
- The original egress policy allowed only DNS over UDP, but the implementation tested HTTP traffic to port 8080. I added TCP/8080 egress log and allow rules so the curl test aligns with the policy.
- The original implementation generated traffic but did not show how to inspect Calico policy log output. I added a `journalctl` command for the standard Linux data plane, consistent with Calico's logging documentation.

## Review Notes
- Calico log output location depends on the configured data plane and node OS. The `journalctl` command is appropriate for common iptables-backed Linux deployments; eBPF deployments use trace pipe output instead.
- Leaving broad log rules enabled can add significant cluster overhead. The post already advises validating outside production and maintaining logging visibility, but future revisions could mention removing temporary log rules after testing.
