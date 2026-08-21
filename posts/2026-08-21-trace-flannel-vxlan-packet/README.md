# Trace a Flannel VXLAN Packet on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, VXLAN, tcpdump, Linux Routing, Troubleshooting

Description: Follow one cross-node Flannel VXLAN packet through the pod bridge, node route, VXLAN neighbor and forwarding databases, UDP underlay, and destination pod.

---

## Introduction

A Flannel VXLAN packet crosses two logical networks. The inner packet carries pod IP addresses. The outer packet carries node underlay addresses and a UDP/VXLAN header. Linux routing chooses the remote pod subnet, the VXLAN neighbor table resolves the remote subnet gateway to a VTEP MAC, and the VXLAN forwarding database maps that MAC to a remote node address.

Tracing all of those objects for one known source and destination turns “the overlay is broken” into a precise failing hop. This guide assumes Flannel's Linux VXLAN backend. `host-gw`, WireGuard, IPIP, UDP, Windows, and VXLAN `DirectRouting` can take different paths.

## Choose One Reproducible Flow

Select two ordinary pods on different nodes and record every address before capturing:

```bash
NS=default
POD_A=client-a
POD_B=server-b

kubectl -n "$NS" get pods "$POD_A" "$POD_B" -o wide

POD_A_IP=$(kubectl -n "$NS" get pod "$POD_A" -o jsonpath='{.status.podIP}')
POD_B_IP=$(kubectl -n "$NS" get pod "$POD_B" -o jsonpath='{.status.podIP}')
NODE_A=$(kubectl -n "$NS" get pod "$POD_A" -o jsonpath='{.spec.nodeName}')
NODE_B=$(kubectl -n "$NS" get pod "$POD_B" -o jsonpath='{.spec.nodeName}')

kubectl get nodes "$NODE_A" "$NODE_B" -o wide
kubectl get nodes "$NODE_A" "$NODE_B" \
  -o custom-columns='NAME:.metadata.name,PODCIDR:.spec.podCIDR'
```

Generate a small, recognizable stream while tracing:

```bash
kubectl -n "$NS" exec "$POD_A" -- ping -n -i 1 "$POD_B_IP"
```

If ICMP is intentionally filtered, use a known TCP or UDP port on `POD_B`. Use the Pod IP, not a ClusterIP, so kube-proxy is not part of this trace.

## Stage 1: From the Source Pod to cni0

Inside the source pod:

```bash
kubectl -n "$NS" exec "$POD_A" -- ip address show
kubectl -n "$NS" exec "$POD_A" -- ip route show
kubectl -n "$NS" exec "$POD_A" -- ip route get "$POD_B_IP"
```

The pod should send the remote Pod IP through its CNI-provided default gateway. On `NODE_A`, the pod-side veth is connected to `cni0` in the normal Flannel bridge delegate configuration:

```bash
ip -br link show
ip link show master cni0
ip -4 address show dev cni0
sudo tcpdump -eni cni0 "host ${POD_A_IP} and host ${POD_B_IP}"
```

If the packet never reaches `cni0`, inspect the pod namespace, veth, local CNI state, and any host policy layer. `flannel.1` cannot fix a missing local attachment.

## Stage 2: Read the Remote-Subnet Route

On `NODE_A`:

```bash
ip route get "$POD_B_IP"
ip -4 route show table main
ip -s route show
```

For VXLAN without direct routing, a route for `NODE_B`'s Pod CIDR should use `flannel.1`, commonly through the remote subnet gateway. Compare the route prefix with `NODE_B.spec.podCIDR`.

If the route is absent, check Flannel's view of Node leases and its logs:

```bash
kubectl -n kube-flannel logs daemonset/kube-flannel-ds \
  -c kube-flannel --tail=300 --prefix

kubectl get node "$NODE_B" -o json \
  | jq '{podCIDRs:.spec.podCIDRs, flannel:(.metadata.annotations | with_entries(select(.key | startswith("flannel."))))}'
```

Do not add a permanent route by hand. Flannel owns these routes; a manual entry can hide bad Node CIDRs, stale annotations, or an API watch problem.

## Stage 3: Correlate Neighbor and FDB State

Inspect the VXLAN device:

```bash
ip -d link show flannel.1
ip -4 address show dev flannel.1
ip neigh show dev flannel.1
bridge fdb show dev flannel.1
```

These tables answer different questions:

- The IP route says which next-hop IP and device should carry the remote Pod CIDR.
- The neighbor table maps that next-hop IP to a VTEP MAC.
- The forwarding database maps that VTEP MAC to the remote node underlay IP.
- `ip -d link` shows the local VXLAN address, VNI, learning mode, and UDP destination port.

Flannel's current Linux VXLAN backend defaults to VNI 1, UDP 8472, and disabled kernel MAC learning unless configured otherwise. Treat live output and the pinned version as authoritative.

Find the relevant entries rather than judging the tables by their size:

```bash
ip neigh show dev flannel.1 | grep '<remote-subnet-gateway>'
bridge fdb show dev flannel.1 | grep '<remote-node-underlay-ip>'
```

A failed or missing neighbor entry with a present route points toward lease/annotation reconciliation. An FDB entry targeting an obsolete node address points toward interface selection, a stale public IP annotation, or an incomplete peer update.

Do not “repair” the cluster by adding permanent neighbor or FDB entries. They are useful as temporary laboratory experiments only; Flannel must converge them from cluster state.

## Stage 4: Capture Inner and Outer Packets Together

On `NODE_A`, run separate captures while the test flow is active:

```bash
sudo tcpdump -ni flannel.1 \
  "host ${POD_A_IP} and host ${POD_B_IP}"

sudo tcpdump -ni <node-a-underlay-interface> \
  "udp port 8472 and host <node-b-underlay-ip>"
```

On `NODE_B`:

```bash
sudo tcpdump -ni <node-b-underlay-interface> \
  "udp port 8472 and host <node-a-underlay-ip>"

sudo tcpdump -ni flannel.1 \
  "host ${POD_A_IP} and host ${POD_B_IP}"

sudo tcpdump -eni cni0 \
  "host ${POD_A_IP} and host ${POD_B_IP}"
```

Use `-c`, `-G`, or a tightly scoped BPF expression in production so captures do not run indefinitely or collect unrelated tenant traffic. Packet captures can contain sensitive payloads; protect and remove any saved files under your incident-data policy.

## Interpret the First Missing Observation

| Last place the request appears | Most likely next checks |
|---|---|
| Source pod only | Pod route, veth, CNI bridge attachment |
| Source `cni0` | Remote-subnet route and host forwarding/filtering |
| Source `flannel.1` only | FDB, neighbor entry, selected underlay interface |
| Source underlay only | Security group, ACL, firewall, underlay route, configured UDP port |
| Destination underlay only | VNI/port mismatch, VXLAN device, host filter, kernel support |
| Destination `flannel.1` only | Destination route, `cni0`, pod veth, local firewall |
| Destination pod, no reply | Reverse route/FDB/firewall, application or pod policy |

Run the same trace for the reply; overlays require symmetric reachability even when the original request is visible at the destination.

If no UDP packet appears but the route sends the Pod CIDR directly through the physical NIC, check `Backend.DirectRouting`. With that VXLAN option enabled, same-subnet nodes deliberately use host-gw-style direct routes and bypass encapsulation.

## Account for Offloads and MTU

```bash
ip -s link show cni0
ip -s link show flannel.1
ip -s link show <underlay-interface>
sudo ethtool -k <underlay-interface>
sudo ethtool -k flannel.1
```

Checksum warnings in a source-side capture can be artifacts of checksum offload because capture occurs before hardware fills the checksum. Compare the receiving capture before declaring corruption. Flannel separately documents a NAT-related VXLAN checksum workaround; apply it only when evidence matches that case.

If small packets complete every stage but large packets do not, compare the path MTU, `FLANNEL_MTU`, and pod `eth0` MTU.

## Official Documentation

- [Flannel VXLAN backend options](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md#vxlan)
- [Flannel troubleshooting guide](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md)
- [Linux kernel VXLAN documentation](https://docs.kernel.org/networking/vxlan.html)
- [iproute2 bridge and FDB manual](https://man7.org/linux/man-pages/man8/bridge.8.html)
- [iproute2 neighbor-table manual](https://man7.org/linux/man-pages/man8/ip-neighbour.8.html)
- [tcpdump manual](https://www.tcpdump.org/manpages/tcpdump.1.html)

## Conclusion

Trace one cross-node Pod IP flow in sequence: pod route, source bridge, remote-subnet route, VXLAN neighbor, FDB, outer UDP packet, destination VXLAN device, destination bridge, and reply. The first missing observation identifies the layer to repair. Leave routes, neighbors, and FDB entries under Flannel's control and use packet capture as evidence, not as a reason to make broad network changes.
