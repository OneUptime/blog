# Validation Summary: How to Validate Calico eBPF Installation

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Calico Open Source
- Calico eBPF dataplane
- Tigera Operator
- Kubernetes
- kubectl
- Bash
- BusyBox
- curl

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Troubleshooting commands - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes documentation: kubectl run reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post claimed the script validated network policy enforcement and pod-to-pod connectivity, but the script only checked DNS and pod-to-service connectivity. I removed the unsupported network policy claim and changed pod-to-pod wording to pod-to-service.
- The prerequisites did not say the script assumes a Tigera Operator installation, even though it uses `tigerastatus`, `installation.operator.tigera.io`, and the `calico-system` namespace. I clarified the prerequisite.
- The eBPF check depended on `bpftool prog list | grep -c calico`, which is not the documented Calico inspection path and can be unreliable. I replaced it with checks for the operator `linuxDataplane: BPF` setting and Calico's documented `calico-node -bpf` tool.
- The `grep -c ... || echo 0` pattern could produce two zero values when no matches were found, breaking numeric comparison in Bash. I changed it to `grep -c ... || true`.
- The script described absence of Calico iptables rules as eBPF confirmation. Calico eBPF mode can still coexist with some iptables rules, so I changed that output to informational wording instead of treating it as confirmation.
- The `kubectl run` examples used `--timeout=30s`, which is the delete timeout for `kubectl run --rm`, not the pod startup timeout. I changed the examples to `--pod-running-timeout=30s`.
- The `kubectl run` examples did not use `--command`, so the requested executable could be passed as image arguments instead of replacing the image command. I added `--command --` to both ephemeral test pods.
- The DNS test used `-t`, which can fail in non-interactive CI environments. I removed TTY allocation and kept stdin attachment for `--rm`.
- The connectivity test used BusyBox `wget` against the Kubernetes API over HTTPS. That can fail because of TLS support or because HTTP error responses may produce a nonzero exit even when service routing works. I changed it to use `curlimages/curl` with `curl -skI`, which validates TCP/TLS/service routing without treating the expected API response as a failure.

## Review Notes
The script is now suitable for validating core eBPF dataplane and service-routing health for an operator-based Calico installation. It still does not validate Kubernetes NetworkPolicy behavior; that would require creating labeled test pods and policies, which is outside the current post's corrected scope.
