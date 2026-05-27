# Validation Summary: How to Fix MetalLB L2 Leader Election Bouncing Between Nodes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- MetalLB Layer 2 mode
- MetalLB speaker DaemonSet
- MetalLB `L2Advertisement` and `ServiceL2Status` resources
- Kubernetes `NetworkPolicy`
- ARP, NDP, and gratuitous ARP
- `kubectl`

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB troubleshooting guide: https://metallb.io/troubleshooting/index.html
- MetalLB API reference: https://metallb.io/apis/
- MetalLB FAQ on service advertisement status: https://metallb.io/faq/
- MetalLB installation requirements and manifests: https://metallb.io/installation/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- HashiCorp memberlist package documentation: https://pkg.go.dev/github.com/hashicorp/memberlist

## Issues Found
- The post described MetalLB L2 election as "memberlist-based" leadership. MetalLB documents the L2 announcer selection as a stateless hash over `node + VIP`, while memberlist is used to determine active speakers. I corrected the explanation.
- The post used fictional `leaderChanged` speaker log examples and suggested healthy output should show a single startup election. MetalLB documentation points users to service events and `ServiceL2Status` for the current L2 announcer, so I replaced the example with `kubectl get servicel2statuses -w`, service events, and speaker log filters for announce/withdraw/memberlist messages.
- The network section implied memberlist traffic is simply pod-to-pod. Current MetalLB manifests run speaker pods with `hostNetwork: true`; I clarified that port 7946 TCP/UDP must be open between nodes and that standard `NetworkPolicy` may not be sufficient where node firewall, security group, or CNI host-network policy controls traffic.
- The clock-skew section claimed memberlist uses timestamps in a way that can cause false failure detection. The consulted memberlist and MetalLB docs support failures from network delay/loss and slow processing, but not that wall-clock skew is a MetalLB L2 announcer-bouncing cause. I replaced that section with documented eligibility causes: node readiness, node labels, local endpoints, and `node.kubernetes.io/exclude-from-external-load-balancers`.
- The verification section watched logs for "leader" changes. I changed it to watch `ServiceL2Status`, which is the documented status resource for L2 traffic ownership.

## Review Notes
The remaining Kubernetes YAML and commands are syntactically plausible and use current APIs. `kubectl` was not installed in the local workspace, so CLI flags were checked against the official generated Kubernetes reference instead of local `--help` output.
