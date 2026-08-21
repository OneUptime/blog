# Debug Cross-Node Flannel VXLAN Traffic on UDP 8472

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, VXLAN, UDP 8472, Firewall, Troubleshooting

Description: Diagnose Flannel networking that works within one node but fails between nodes by testing the VXLAN interface, routes, peer state, and UDP 8472 underlay path.

---

## Introduction

Same-node pod traffic and cross-node pod traffic use different paths. With the usual Flannel CNI delegate, two pods on one host can exchange frames through `cni0` without ever traversing the underlay. With the default Linux VXLAN backend, traffic for a remote node is encapsulated and sent between node addresses over UDP.

The upstream Flannel backend documentation currently recommends VXLAN and documents Linux's default VXLAN port as UDP 8472. That port is configurable, however, and Windows VXLAN uses different requirements. Always inspect the running backend before changing a firewall.

## Prove the Failure With Pod IPs

Create or select one ordinary pod in the same namespace on each of two Linux nodes whose selected client container includes `ping`:

```bash
kubectl get pods --all-namespaces -o wide

POD_A=client-a
POD_B=server-b
NS=default

POD_B_IP=$(kubectl -n "$NS" get pod "$POD_B" \
  -o jsonpath='{.status.podIP}')
kubectl -n "$NS" exec "$POD_A" -- ping -c 3 "$POD_B_IP"
```

Use a real application port if ICMP is intentionally filtered. Test the destination Pod IP directly, not its ClusterIP. A ClusterIP adds Service proxying (usually kube-proxy) and Service endpoints to the investigation.

Confirm that same-node pod-to-pod traffic works and that the failed pair really resides on different nodes:

```bash
kubectl -n "$NS" get pods "$POD_A" "$POD_B" -o wide
```

## Confirm the Active Flannel Backend and Port

```bash
kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.net-conf\.json}'
echo

kubectl -n kube-flannel logs daemonset/kube-flannel-ds \
  -c kube-flannel --all-pods=true --tail=200 --prefix \
  | grep -E 'VXLAN config|Using interface|external address|Backend type'
```

A default Linux configuration resembles:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan"
  }
}
```

With no `Port` override, the Linux kernel default used by Flannel is currently 8472. If `Port` is set, test that value instead. UDP backend uses 8285; `host-gw` does not use a VXLAN UDP tunnel; WireGuard has its own configured listen ports. `flannel.1` and UDP 8472 are therefore not universal Flannel health checks. The examples below use the default VNI 1 device and port; substitute the device and port shown by the running configuration when they differ.

## Check the VXLAN Device and Remote Routes

Run on each affected node:

```bash
ip -d link show flannel.1
ip -4 address show dev flannel.1
ip -4 route show
bridge fdb show dev flannel.1
ip neigh show dev flannel.1
```

`ip -d link` reveals the VNI, local underlay address, and destination port. For a peer using VXLAN, the remote node's Pod CIDR should have a route through `flannel.1` via a synthetic next hop at the remote Pod CIDR's base address. The VXLAN forwarding database should map the remote VTEP MAC to that node's advertised underlay IP, and the neighbor table should map the synthetic next hop to its VTEP MAC. With `DirectRouting` enabled, an on-link peer instead has a direct route via its advertised underlay IP, and no FDB or neighbor entry on `flannel.1` is expected for that peer.

Compare those values with Kubernetes:

```bash
kubectl get nodes -o wide
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,PODCIDR:.spec.podCIDR,INTERNAL_IP:.status.addresses[?(@.type=="InternalIP")].address'
```

Flannel may select a different address from Kubernetes `InternalIP` on a multi-NIC host. The startup log and Node annotations show what it actually advertised. Every other node must be able to route to that address.

## Use Packet Capture Instead of a UDP Handshake

UDP has no connection handshake, so a successful-looking `nc -u` command does not prove the return path. Capture a real failed pod packet.

On the source node, identify the selected underlay interface:

```bash
ip route get <destination-node-underlay-ip>
```

Then capture while repeating the pod test:

```bash
# Terminal 1 on the source node: inner traffic leaving the overlay device.
sudo tcpdump -ni flannel.1 "host <destination-pod-ip>"

# Terminal 2 on the source node: outer VXLAN traffic.
sudo tcpdump -ni <underlay-interface> \
  "udp port <vxlan-port> and host <destination-node-underlay-ip>"
```

On the destination node:

```bash
sudo tcpdump -ni <underlay-interface> \
  "udp port <vxlan-port> and host <source-node-underlay-ip>"
sudo tcpdump -ni flannel.1 "host <source-pod-ip>"
```

Interpret the observations:

- Outer packets leave the source but never arrive at the destination: check cloud security groups, network ACLs, physical firewalls, and routing between node addresses.
- Packets arrive at the underlay but do not appear on `flannel.1`: check the configured port and VNI, host firewall, VXLAN kernel support, and Flannel peer state.
- The request reaches the destination pod but no reply returns: inspect the reverse route, reverse firewall policy, source selection, and asymmetric routing.
- No outer packet leaves and the peer is not using `DirectRouting`: inspect the source route, FDB, neighbor entry, interface choice, and Flannel logs.

Packet captures may display checksum warnings because of NIC offload. That alone does not prove corruption; compare what the receiving node sees. Flannel's troubleshooting guide documents disabling `tx-checksum-ip-generic` on `flannel.1` for a specific NAT-related checksum problem, not as a universal first step.

## Open the Port in the Correct Scope

Allow bidirectional UDP traffic on the configured VXLAN port between node underlay addresses only. Do not expose it to the internet.

For a host using firewalld, first identify the zone bound to the underlay interface:

```bash
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --zone=<node-zone> --list-all
```

Add a rich rule scoped to the trusted node underlay CIDR or to one peer `/32` at a time:

```bash
sudo firewall-cmd --permanent \
  --zone=<node-zone> \
  --add-rich-rule='rule family="ipv4" source address="<peer-node-cidr>" port port="<vxlan-port>" protocol="udp" accept'
sudo firewall-cmd --reload
sudo firewall-cmd --zone=<node-zone> --list-rich-rules
```

Repeat the rule for every required peer or use a reviewed CIDR that contains only trusted node addresses. A plain `--add-port=<vxlan-port>/udp` is acceptable only when the zone itself is exclusively scoped to those trusted peers. Opening the UDP port is not enough if forwarded Pod CIDR traffic is denied by zone policies. Inspect firewalld policies and the kernel FORWARD path separately. In a cloud, mirror the same narrowly scoped allowance in security groups and network ACLs for every node-to-node direction.

## Check Less Obvious Underlay Problems

If traffic on the configured VXLAN UDP port arrives but pod communication still fails, check:

```bash
sysctl net.ipv4.ip_forward
sysctl net.ipv4.conf.all.rp_filter
sysctl net/ipv4/conf/<underlay-interface>/rp_filter

ip -s link show flannel.1
ip -s link show <underlay-interface>
sudo journalctl -k -b | grep -iE 'vxlan|martian|drop|mtu'
```

Strict reverse-path filtering can reject traffic in intentionally asymmetric multi-homed designs. Do not disable it cluster-wide without proving that it is the drop point and reviewing the security tradeoff.

Small pings working while large transfers fail points to MTU, not a closed UDP port. Test the effective path MTU and compare it with `FLANNEL_MTU` and pod `eth0`.

## Verify the Repair

Test in increasing scope:

1. Node underlay IP to node underlay IP.
2. Cross-node Pod IP to Pod IP in both directions.
3. TCP or UDP application traffic with small and large payloads.
4. DNS and ClusterIP Services, which add Service proxying to the path.

Do not call the overlay fixed based only on `ping`; the production protocol and realistic packet sizes matter.

## Official Documentation

- [Flannel backend reference](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- [Flannel troubleshooting: firewalls and VXLAN](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md#firewalls)
- [Linux kernel VXLAN documentation](https://docs.kernel.org/networking/vxlan.html)
- [firewalld command reference](https://firewalld.org/documentation/man-pages/firewall-cmd)
- [Kubernetes cluster networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/)

## Conclusion

When same-node pod traffic works but cross-node traffic fails, test the remote Pod IP and follow its selected data path. Confirm the actual backend, VNI, port, advertised node addresses, routes, FDB, and neighbor entries, then capture the configured VXLAN UDP port on both underlay interfaces. Open only the configured node-to-node port and keep Service proxying out of the test until Pod IP routing works.
