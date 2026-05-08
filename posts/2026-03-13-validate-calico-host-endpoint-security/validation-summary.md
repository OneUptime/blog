# Validation Summary: Validate Calico Host Endpoint Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- Calico Felix
- Kubernetes
- iptables
- eBPF dataplane concepts

## Sources Consulted
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoint overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico Kubernetes node host endpoint documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico staged policy documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico log rule documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Enterprise iptables policy audit mode documentation: https://docs.tigera.io/calico-enterprise/latest/observability/iptables
- calicoctl user reference and get command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/overview and https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Felix/calico-node liveness probe documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Project Calico source constants for host endpoint iptables chain names: https://github.com/projectcalico/calico/blob/master/felix/rules/rule_defs.go
- Project Calico source rule rendering for forwarded host endpoint chains: https://github.com/projectcalico/calico/blob/master/felix/rules/static.go

## Issues Found
- The iptables section only listed forwarded host endpoint chains and labeled them as generic inbound/outbound packet paths. Updated the text and diagram to distinguish forwarded traffic chains (`cali-from-hep-forward`, `cali-to-hep-forward`) from locally terminated host traffic chains (`cali-from-host-endpoint`, `cali-to-host-endpoint`), and added commands to inspect both local host endpoint chains.
- The Calico pod log and exec examples did not specify the `calico-node` container. Added `-c calico-node` so the commands work reliably in multi-container Calico pods.
- The in-cluster kubelet connectivity example used BusyBox `wget` without a URL scheme against port 10250. Replaced it with a `curlimages/curl` command using HTTPS, `-k`, and a connection timeout against `/healthz`, which better matches kubelet's secure port behavior.
- The policy audit section incorrectly referred to an open-source audit mode and zero-match policy checks. Updated it to distinguish Calico Enterprise policy audit/recommendation features from Calico Open Source log rules and staged policies, and replaced the misleading "zero-match" grep command with a full policy inspection command.

## Review Notes
- The post remains intentionally version-neutral. Calico chain names are implementation details of the iptables dataplane and may vary in future releases, so production validation should also include dataplane-appropriate checks for eBPF deployments.
