# Validation Summary: How to Migrate to VXLAN in Calico Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- VXLAN
- IP-in-IP
- BGP
- Linux networking tools
- Mermaid diagrams

## Sources Consulted
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Node resource documentation: https://docs.tigera.io/calico/latest/reference/resources/node
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- RFC 7348, Virtual eXtensible Local Area Network (VXLAN): https://www.rfc-editor.org/rfc/rfc7348
- Linux `ip-neighbour(8)` manual page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html

## Issues Found
- The description claimed zero-downtime migration. Calico documentation warns that switching encapsulation modes can disrupt in-progress connections, so the wording was changed to "while minimizing disruption for running workloads."
- The introduction described VXLAN as the preferred encapsulation mode for cloud environments. Calico recommends avoiding overlays when possible and using cross-subnet encapsulation to minimize overhead, so the wording was softened to "useful."
- The VTEP neighbor check used `arp -n | grep "vxlan"`, which is not a reliable way to query neighbor entries for a specific VXLAN device. It was changed to `ip neigh show dev vxlan.calico`.
- The Calico VTEP information command used `kubectl get nodes`, which normally returns Kubernetes core Node objects rather than Calico Node resources. It was changed to `calicoctl get nodes -o yaml`.
- The Mermaid subgraph syntax used unquoted titles with spaces and hyphens, which can fail to parse. The diagram was updated to use explicit subgraph IDs with quoted labels.
- The conclusion did not mention the disruption risk from changing encapsulation modes. A short warning was added while preserving the original structure.

## Review Notes
The IPPool fields `vxlanMode`, `ipipMode`, and `natOutgoing` are valid Calico v3 fields, and UDP 4789 plus the 50-byte VXLAN overhead are consistent with the Calico documentation and RFC 7348. For production migrations, a future revision could add a staged rollout procedure, MTU verification commands, and guidance for operator-managed installations, but those additions were outside the scope of this technical correction pass.
