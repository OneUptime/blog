# Validation Summary: How to Fix Calico iptables Rules Not Applied

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Felix
- Kubernetes
- iptables
- Linux networking

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico component logs: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Linux iptables manual page: https://man7.org/linux/man-pages/man8/iptables.8.html

## Issues Found
- The post used `kube-system` for every `calico-node` command. Calico's official troubleshooting docs use `calico-system` for operator-managed installs and note that `kube-system` applies to manifest-based installs. I added a `CALICO_NAMESPACE` variable and a comment explaining which namespace to choose, then updated the namespace-sensitive commands to use it.
- The post recommended removing `/run/xtables.lock` as a stale lock. The iptables manual documents this file as the xtables lock file, and removing it while another iptables process is running can break lock coordination. I replaced the removal command with guidance to wait for or stop the process holding the lock.
- The "Force iptables save/restore" heading was inaccurate because the snippet did not run `iptables-save` or `iptables-restore`; it restarted Calico so Felix could reprogram rules. I renamed the heading to match the actual procedure.

## Review Notes
The Felix `iptablesBackend` field and values `Auto`, `Legacy`, and `NFT` match the official Calico FelixConfiguration schema. The Kubernetes `--field-selector spec.nodeName=<node-name>` usage is valid for Pods. The guide assumes the standard Linux iptables dataplane; clusters using Calico eBPF or nftables mode may need dataplane-specific verification commands.
