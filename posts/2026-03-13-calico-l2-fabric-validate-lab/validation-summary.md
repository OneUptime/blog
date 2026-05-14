# Validation Summary: How to Validate L2 Interconnect Fabric with Calico in a Lab Cluster

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- VXLAN
- IP-in-IP
- Linux networking tools (`ip`, `bridge`, `tcpdump`, `ping`)
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The VXLAN tcpdump example captured on `vxlan.calico` while expecting to see the outer UDP/4789 header. I changed the capture to use the node underlay interface, which is where the encapsulated packet and outer header are visible.
- The `kubectl run --overrides` examples omitted `apiVersion`, while the current Kubernetes reference documents `--overrides` as requiring a valid `apiVersion`. I added `"apiVersion":"v1"` to the override JSON examples.
- The VXLAN FDB explanation said entries map a remote node's pod CIDR MAC to the node IP. I corrected this to the remote node's VXLAN tunnel MAC, matching Calico's node VXLAN tunnel fields.
- The FDB entry count used the IPPool default `/26` block size as the CrossSubnet exclusion boundary. I corrected this to refer to the node subnet used by CrossSubnet behavior.
- The CrossSubnet validation used same-node pods, which does not validate CrossSubnet routing between nodes on the same subnet. I changed the example to use pods on two nodes in the same node subnet.
- The examples generated traffic before waiting for pods to be ready. I added `kubectl wait` commands to make the workflow reliable.
- The examples used `wget` from the netshoot pod. I changed these to `curl`, which is expected in the netshoot troubleshooting image.
- The best-practice note claimed VXLAN FDB entry count should be monitored via Prometheus. I removed the unsupported Prometheus-specific claim and kept the validation advice tied to comparing required FDB entries.

## Review Notes
The guide remains lab-oriented and assumes node names such as `worker-1` and `worker-2`, plus an underlay interface default of `eth0`. Users may need to substitute their actual node names and node-to-node interface.
