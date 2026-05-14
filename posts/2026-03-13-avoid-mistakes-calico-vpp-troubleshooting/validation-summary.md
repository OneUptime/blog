# Validation Summary: Common Mistakes to Avoid When Troubleshooting Calico VPP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico VPP dataplane
- VPP CLI (`vppctl`)
- Kubernetes `kubectl`
- Linux networking tools (`tcpdump`, `iptables`, `ip route`)
- Mermaid diagrams

## Sources Consulted
- Calico documentation: VPP data plane troubleshooting: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico documentation: VPP data plane implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico documentation: VPP implementation details and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/specifics
- FD.io VPP documentation: Using the trace command: https://docs.fd.io/vpp/25.06/gettingstarted/progressivevpp/traces.html
- FD.io VPP documentation: Data to include in bug reports: https://docs.fd.io/vpp/25.10/contributing/reportingissues/reportingissues.html
- Kubernetes documentation: kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post described VPP packet traces as something that can be left enabled indefinitely. VPP `trace add` captures a configured number of packets and then stops, while the trace buffer remains until cleared. Updated the wording to focus on capturing too many packets and clearing trace buffers.
- The post stated that VPP error counters are cumulative since VPP started. VPP supports clearing error counters with `clear error`, so counters are cumulative since process start or the last clear. Updated the comment accordingly.

## Review Notes
The Kubernetes command structure and VPP commands used in the examples are consistent with the consulted documentation. `kubectl` was not installed in the local environment, so Kubernetes CLI syntax was verified against the official Kubernetes command reference instead of local `--help` output.
