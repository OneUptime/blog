# Validation Summary: How to Test VXLAN in Calico with Live Workloads

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- VXLAN
- IPPool resources
- calicoctl
- kubectl
- Linux iproute2, bridge, and tcpdump
- Mermaid diagrams

## Sources Consulted
- Calico documentation: Overlay networking, including VXLAN behavior, cross-subnet encapsulation, and BGP requirements: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: IPPool resource fields, including `vxlanMode`, `ipipMode`, and `natOutgoing`: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Node resource fields, including `ipv4VXLANTunnelAddr` and `vxlanTunnelMACAddr`: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico documentation: Kubernetes system and network requirements, including `vxlan.calico` management and UDP 4789: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: MTU sizing for VXLAN overlays: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Kubernetes documentation: `kubectl run` generated command reference and `--overrides` usage: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: `kubectl exec` generated command reference and command separator usage: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Mermaid documentation: Flowchart subgraph syntax and quoting special characters: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- The IPPool example set both `vxlanMode: Always` and `ipipMode: Never`. Current Calico IPPool documentation says `ipipMode` and `vxlanMode` cannot be set at the same time, so `ipipMode: Never` was removed from the VXLAN example.
- The VTEP verification command used `kubectl get nodes`, but `vxlanTunnelMACAddr` is a Calico Node resource field, not a standard Kubernetes Node field. The command was changed to `calicoctl get node -o yaml`.
- The neighbor-table example used `arp -n | grep "vxlan"`, which is less accurate for VXLAN device neighbor entries. It was changed to `ip neigh show dev vxlan.calico`.
- The `kubectl run --overrides` examples omitted `apiVersion`, while the current generated kubectl reference shows override JSON including `apiVersion`. The examples were updated to include `"apiVersion":"v1"`.
- The Mermaid subgraph titles included spaces, hyphens, and CIDR slashes without explicit subgraph IDs or quoted titles. The diagram was updated to use explicit IDs with quoted titles and HTML line breaks in node labels.
- The tcpdump command did not specify that it should be run on a node. The comment was clarified to avoid implying it should run inside one of the test pods.

## Review Notes
The post uses placeholder node names (`node-subnet-a` and `node-subnet-b`) and a placeholder node interface (`eth0`); readers must replace these with real node names and the correct underlay interface for their cluster.
