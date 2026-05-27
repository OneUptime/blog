# Validation Summary: Container Networking Deep Dive: From Namespaces to Overlay Networks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux network namespaces
- Linux veth pairs and bridge networking
- iproute2 and iptables
- Docker bridge, host, none, overlay, and macvlan networking
- Kubernetes pod networking model
- CNI plugins
- VXLAN overlay networking
- Kubernetes NetworkPolicy
- Calico, Cilium, Flannel, Weave Net, and Canal

## Sources Consulted
- Linux namespaces manual: https://man7.org/linux/man-pages/man7/namespaces.7.html
- Linux bridge kernel documentation: https://docs.kernel.org/networking/bridge.html
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker network create CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker inspect CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- Kubernetes network model documentation: https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes network plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- RFC 7348, Virtual eXtensible Local Area Network (VXLAN): https://www.rfc-editor.org/rfc/rfc7348
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Weave Net overview: https://rajch.github.io/weave/overview/
- OneUptime website: https://oneuptime.com/

## Issues Found
- The VXLAN Mermaid sequence diagram used participant names with spaces directly as sequence identifiers. Updated it to use valid participant IDs with display aliases so Mermaid can parse the diagram reliably.
- The CNI comparison table listed Cilium's overlay as "eBPF". eBPF is Cilium's datapath technology, while Cilium routing can use VXLAN, Geneve, or native routing. Updated the table entry accordingly.
- The Overlay Networks introduction implied overlays are the general mechanism for cross-node pod communication. Updated the wording to clarify that overlays are one common approach, since direct/native routing is also used by CNI implementations.

## Review Notes
- The shell commands and Docker CLI flags were checked against local `--help` output where available and Docker's official CLI documentation.
- The Kubernetes NetworkPolicy example is syntactically valid and intentionally selects frontend pods in the same namespace as the policy.
- The CNI comparison table is necessarily high-level; performance and complexity vary by configuration, kernel, cloud network, encryption, and policy settings.
