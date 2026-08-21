# Calculate Flannel VXLAN MTU for Clouds, VLANs, and VPNs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, VXLAN, MTU, VPN, Cloud Networking

Description: Calculate, configure, and validate a Flannel VXLAN pod MTU when the node underlay crosses cloud networks, VLANs, tunnels, or VPNs.

---

## Introduction

An incorrect MTU often looks like an application problem. Small pings work, but TLS handshakes, gRPC streams, or large HTTP responses stall. With Flannel VXLAN, a pod packet is carried inside an inner Ethernet frame, a VXLAN header, UDP, and an outer IP packet. The encapsulated packet must fit the real node-to-node path.

For the common Linux IPv4 VXLAN path, the added headers total 50 bytes: 14 bytes of inner Ethernet, 8 bytes of VXLAN, 8 bytes of UDP, and 20 bytes of outer IPv4. A 1500-byte effective outer IP MTU therefore yields a 1450-byte pod MTU.

That number is not universal. Outer IPv6, an additional VPN, nested overlays, provider gateways, and custom backend versions can change the budget. Measure the path and inspect the exact Flannel release rather than copying 1450 blindly.

## Identify the Actual Underlay Path

First confirm the interface Flannel selected. Run the host-level `ip`, `tracepath`, `ping`, and `/run/flannel` checks in this guide on the relevant Kubernetes node, or in an equivalent privileged node-debug session, rather than on the operator workstation:

```bash
kubectl -n kube-flannel logs daemonset/kube-flannel-ds \
  --all-pods=true -c kube-flannel --tail=300 --prefix \
  | grep -E 'Using interface|external address|VXLAN config'

ip route get <peer-node-underlay-ip>
ip -d link show <selected-underlay-interface>
ip -d link show flannel.1
```

Do not assume the physical NIC carries the packet directly. The selected route may traverse a VLAN subinterface, WireGuard device, IPsec policy, cloud virtual router, or site-to-site VPN.

Record the effective Layer 3 MTU on every segment:

```bash
ip link show <selected-underlay-interface>
ip link show <vlan-or-vpn-interface>
tracepath -n <peer-node-underlay-ip>
```

The limiting value is the minimum Layer 3 MTU across the complete node-to-node path—the largest IP packet that can traverse it without fragmentation—not necessarily the MTU displayed by the physical NIC.

## Measure With Don't-Fragment Probes

For an IPv4 underlay, an ICMP echo request adds 20 bytes of IPv4 header and 8 bytes of ICMP header. To test a 1500-byte IP packet:

```bash
ping -4 -M do -s 1472 -c 3 <peer-node-underlay-ip>
```

If it fails, test smaller values and find the largest successful payload:

```bash
ping -4 -M do -s 1372 -c 3 <peer-node-underlay-ip>  # tests 1400 bytes
```

Some networks filter ICMP or mishandle Path MTU Discovery, so a failed probe is not sufficient by itself. Compare interface counters and packet captures, and test the production transport as well. For IPv6, use IPv6-aware tooling; a 40-byte IPv6 base header replaces the 20-byte IPv4 header, making the common VXLAN budget 70 bytes before any IPv6 extension headers.

Run the test in both directions and between nodes in different zones or sites. The worst supported path determines a cluster-wide MTU unless you deliberately manage per-node differences.

## Calculate the Pod MTU

For a simple IPv4 VXLAN path:

```text
pod MTU <= effective outer IPv4 path MTU - 50
```

Examples:

| Effective outer path | IPv4 VXLAN budget | Candidate pod MTU |
|---:|---:|---:|
| 1500 | 50 | 1450 |
| 1450 | 50 | 1400 |
| 1400 | 50 | 1350 |

Leave a small operational margin when the path is uncertain. An unnecessarily low MTU adds packet overhead, but a value even a few bytes too high can create black holes.

Avoid double subtraction. If Flannel selects a VPN interface whose configured MTU already accounts for the VPN's outer headers, treat that interface MTU as the available outer VXLAN packet size and subtract only the VXLAN overhead. If Flannel selects a physical interface while routing later applies a VPN with a smaller effective MTU, use the VPN path limit as the backend input.

A VLAN tag does not always mean Linux's IP MTU must be reduced by four bytes; many networks carry tagged Ethernet frames with a correspondingly larger Layer 2 frame. Trust the provider contract and measured IP path rather than subtracting every possible header mechanically.

## Understand Flannel's MTU Setting

Flannel's current backend documentation defines `Backend.MTU` as the desired MTU for outgoing packets; if omitted, Flannel uses the selected external interface MTU. In Flannel v0.28.9, the Linux VXLAN implementation uses a fixed 50-byte deduction when it sets the VXLAN interface MTU and reports the default workload MTU through `/run/flannel/subnet.env`.

Inspect the live values:

```bash
kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.net-conf\.json}'
echo

sudo cat /run/flannel/subnet.env
ip link show flannel.1
```

If the effective outer path is 1400, configure the VXLAN backend input as 1400 so the normal IPv4 VXLAN result is 1350:

```json
{
  "Network": "10.244.0.0/16",
  "Backend": {
    "Type": "vxlan",
    "MTU": 1400
  }
}
```

Validate this behavior against the pinned Flannel version, especially for IPv6 or nested encapsulation. Flannel v0.28.9 uses the same fixed 50-byte deduction for an IPv6 outer path, so compensate for IPv6's additional 20 bytes in the backend input. For example, set `Backend.MTU` to at most 1480 on a 1500-byte outer IPv6 path; at 1480, Flannel publishes a 1430-byte `FLANNEL_MTU`. A dual-stack setup must use one value that is safe for both families. `subnet.env` supplies the default MTU to the Flannel CNI plugin, but an explicit `delegate.mtu` in the CNI configuration overrides it.

## Roll Out an MTU Change Correctly

Apply the updated source manifest or run a Helm upgrade with the new values. For the standard `RollingUpdate` DaemonSet, restart Flannel so every node rewrites its subnet file:

```bash
kubectl -n kube-flannel rollout restart daemonset/kube-flannel-ds
kubectl -n kube-flannel rollout status daemonset/kube-flannel-ds \
  --timeout=5m
```

If the DaemonSet was customized to use the `OnDelete` update strategy, `rollout restart` only changes its pod template; replace the Flannel pods manually in controlled batches.

Confirm every node wrote the intended `FLANNEL_MTU` and inspect `flannel.1`, plus `flannel-v6.1` when IPv6 is enabled. Flannel v0.28.9 can reuse an existing VXLAN device without updating its MTU. If the device is stale, reconcile it with node networking tooling or use a controlled node restart before recreating workloads. For the default IPv4 VNI, for example:

```bash
sudo ip link set dev flannel.1 mtu <pod-mtu>
```

Updating `subnet.env` does not rewrite existing pod veth interfaces. Recreate workloads through their controllers so CNI applies the new MTU, using each controller's rollout strategy to preserve availability. PodDisruptionBudgets do not constrain controller-driven rollouts, and direct pod deletion bypasses them. After recreation, verify `cni0`, the host-side veths, and pod `eth0`; reconcile any persistent bridge MTU that remains stale.

For a canary node:

```bash
kubectl get pods --all-namespaces \
  --field-selector spec.nodeName=<canary-node> -o wide

kubectl -n <pod-namespace> exec <test-pod> -- ip link show eth0
```

Do not remove CNI state to change MTU. Controlled pod recreation is sufficient only after the subnet file, VXLAN device, any CNI delegate override, and persistent bridge MTU are correct.

## Validate With Real Traffic

Inside pods on different nodes:

```bash
kubectl -n <source-pod-namespace> exec <source-pod> -- ip link show eth0
kubectl -n <source-pod-namespace> exec <source-pod> -- \
  ping -4 -M do -s 1422 -c 3 <remote-ipv4-pod-ip>
```

For an IPv4 pod MTU of 1450, 1422 bytes of ICMP payload plus 28 bytes of headers reaches that MTU. Container images differ; BusyBox `ping` may not support every option.

Also test:

- TCP transfer larger than one segment.
- TLS and HTTP calls representative of production.
- Both directions and the longest network path.
- Retransmissions with `ss -ti`, packet capture, or application metrics.
- `ip -s link` counters on pod veth, `cni0`, `flannel.1`, and underlay devices.

If large direct Pod IP traffic to every EndpointSlice backend works but the same traffic through the ClusterIP fails, switch to Service, EndpointSlice, and service-proxy diagnosis—often kube-proxy; MTU is no longer the leading explanation.

## Official Documentation

- [Flannel backend options, including VXLAN MTU](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md#vxlan)
- [Flannel configuration reference](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)
- [Flannel troubleshooting: data-plane performance and MTU](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md#data-plane)
- [Linux kernel VXLAN documentation](https://docs.kernel.org/networking/vxlan.html)
- [Kubernetes network model](https://kubernetes.io/docs/concepts/services-networking/)

## Conclusion

Calculate Flannel's pod MTU from the smallest effective node-to-node IP MTU, then subtract the encapsulation used by the installed backend. For common IPv4 VXLAN that is 50 bytes, but VPNs, outer IPv6, and nested networks require their own accounting. Configure the backend, verify `FLANNEL_MTU` and the persistent network-interface MTUs, recreate pods so CNI applies the value, and validate with large real traffic in both directions.
