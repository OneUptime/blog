# How to Configure MTU Settings in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MTU, Networking, Performance, Kubernetes

Description: Learn how to configure MTU settings in Talos Linux to optimize network performance and avoid fragmentation issues in your cluster.

---

MTU (Maximum Transmission Unit) is the largest packet size that a network interface can send without fragmenting the data. Getting MTU right is one of those network settings that is invisible when correct and causes mysterious problems when wrong. Packets that are too large get fragmented or dropped, leading to slow transfers, connection timeouts, and degraded application performance.

This post covers how to configure MTU in Talos Linux, when to change it, and how to troubleshoot MTU-related issues in your Kubernetes cluster.

## What Is MTU

The MTU determines the maximum size of a single network frame (in bytes). The standard Ethernet MTU is 1500 bytes. This means each frame can carry up to 1500 bytes of payload (the IP packet), plus Ethernet headers.

When a packet exceeds the MTU, one of two things happens:
- The packet is **fragmented** into smaller pieces (if the "Don't Fragment" flag is not set)
- The packet is **dropped** and an ICMP "Fragmentation Needed" message is sent back (if the DF flag is set)

Most modern TCP implementations use Path MTU Discovery (PMTUD) to find the right packet size, but this does not always work (especially when ICMP is blocked by firewalls).

## Default MTU in Talos

Talos Linux uses the standard 1500-byte MTU by default for all interfaces. This works for most environments. You only need to change MTU when:

- Your network supports jumbo frames (9000-byte MTU) and you want the performance benefit
- You are using overlay networking (VXLAN, Geneve) that adds encapsulation headers
- You are using VPN tunnels (WireGuard, IPsec) that add tunnel headers
- Your cloud provider's virtual network has a non-standard MTU

## Configuring MTU on an Interface

Set the MTU in the interface configuration:

```yaml
# machine-config.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        mtu: 9000
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

The `mtu` field accepts any valid MTU value. Common values are:
- **1500** - Standard Ethernet (default)
- **9000** - Jumbo frames (common for storage networks)
- **1450** - Common for VXLAN overlay networks (1500 minus VXLAN header)
- **1420** - Common for WireGuard tunnels (1500 minus WireGuard header)

## Jumbo Frames for Storage Traffic

Jumbo frames (MTU 9000) are commonly used for storage traffic. The larger frame size reduces per-packet overhead, which improves throughput for large data transfers:

```yaml
machine:
  network:
    interfaces:
      # Regular traffic interface - standard MTU
      - interface: eth0
        mtu: 1500
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
      # Storage interface - jumbo frames
      - interface: eth1
        mtu: 9000
        addresses:
          - 10.10.0.10/24
```

Every device on the storage network path must support jumbo frames - the servers, the switches, and any other network equipment in between. If even one device has a lower MTU, jumbo frames will be fragmented or dropped.

## MTU for Overlay Networks

Kubernetes CNI plugins that use overlay networking (like Flannel with VXLAN, or Calico with VXLAN) add encapsulation headers to every packet. These headers take up space within the MTU, reducing the effective payload size.

For VXLAN, the overhead is approximately 50 bytes (8 bytes VXLAN header + 8 bytes UDP header + 20 bytes outer IP header + 14 bytes outer Ethernet header). So if your physical MTU is 1500, the overlay MTU should be around 1450:

```yaml
# If your CNI uses VXLAN overlay, the node MTU affects pod MTU
machine:
  network:
    interfaces:
      - interface: eth0
        mtu: 1500  # Physical MTU
        addresses:
          - 192.168.1.10/24
```

Most CNI plugins automatically calculate the overlay MTU based on the host interface MTU. Check your CNI documentation for specifics. If you set the host interface to 9000 (jumbo frames), the overlay MTU can be larger too, which benefits pod-to-pod traffic.

## MTU for WireGuard Tunnels

WireGuard adds approximately 60-80 bytes of overhead per packet. If your physical interface has MTU 1500, the WireGuard interface should have a lower MTU:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        mtu: 1500
        addresses:
          - 192.168.1.10/24
      - interface: wg0
        mtu: 1420
        wireguard:
          privateKey: "..."
          listenPort: 51820
          peers:
            - publicKey: "..."
              endpoint: "remote:51820"
              allowedIPs:
                - 10.0.0.0/24
        addresses:
          - 10.0.0.1/24
```

## MTU on VLANs

VLAN tagging adds 4 bytes to each frame. On most modern switches and NICs, this is handled transparently and you do not need to reduce the VLAN interface MTU. However, if you encounter issues, you can set it explicitly:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        mtu: 1500
        vlans:
          - vlanId: 100
            mtu: 1500  # Usually same as parent
            addresses:
              - 10.100.0.10/24
```

## MTU on Bonded Interfaces

For bonded interfaces, set the MTU on the bond, not on the member interfaces. Talos handles propagating the MTU to the members:

```yaml
machine:
  network:
    interfaces:
      - interface: bond0
        mtu: 9000
        bond:
          mode: 802.3ad
          interfaces:
            - eth0
            - eth1
        addresses:
          - 192.168.1.10/24
```

## Applying MTU Changes

For new clusters:

```bash
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '{"machine": {"network": {"interfaces": [{"interface": "eth0", "mtu": 9000, "addresses": ["192.168.1.10/24"], "routes": [{"network": "0.0.0.0/0", "gateway": "192.168.1.1"}]}]}}}'
```

For existing nodes:

```bash
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"network": {"interfaces": [{"interface": "eth0", "mtu": 9000, "addresses": ["192.168.1.10/24"], "routes": [{"network": "0.0.0.0/0", "gateway": "192.168.1.1"}]}]}}}'
```

MTU changes take effect without a reboot, but there may be brief connectivity disruption as the interface reconfigures.

## Testing MTU

After changing the MTU, verify it is set correctly and that the path supports the new size:

```bash
# Check interface MTU
talosctl get links --nodes 192.168.1.10
```

To test end-to-end path MTU, send a ping with a specific size and the Don't Fragment flag:

```bash
# Test from another machine - send a 8972-byte payload
# (8972 + 28 bytes headers = 9000 bytes total)
ping -M do -s 8972 192.168.1.10
```

If the path supports MTU 9000, the ping succeeds. If any device along the path has a smaller MTU, the ping fails with a "message too long" error.

## Cloud Provider MTU

Different cloud providers have different default MTUs for their virtual networks:

- **AWS** - Default MTU is 9001 for instances in the same VPC (jumbo frames supported). Inter-region traffic is limited to 1500.
- **GCP** - Default MTU is 1460 (1500 minus GCP overhead). Jumbo frames (8896) are available on some instance types.
- **Azure** - Default MTU is 1500. Accelerated networking supports higher MTUs on some instance types.

Check your cloud provider's documentation and adjust Talos MTU settings accordingly:

```yaml
# AWS configuration example
machine:
  network:
    interfaces:
      - interface: eth0
        mtu: 9001
        dhcp: true
```

## Troubleshooting MTU Issues

**Slow TCP transfers but ping works** - Classic MTU mismatch symptom. Small ping packets fit within any MTU, but TCP segments at full size get fragmented or dropped. Test with large pings using the DF flag.

**Connection hangs after handshake** - TCP handshake uses small packets that work fine. Data transfer uses larger packets that exceed the path MTU. If ICMP is blocked somewhere, PMTUD fails and the connection hangs. This is sometimes called a "black hole" MTU problem.

**Intermittent packet loss** - May indicate MTU mismatch at one hop in the path. Use tracepath or traceroute with MTU discovery to find the bottleneck.

**Storage performance issues** - If your storage network does not support jumbo frames but the interface is configured for MTU 9000, storage traffic will be fragmented, destroying performance. Verify jumbo frame support on every device in the storage path.

## Best Practices

Do not change MTU unless you have a specific reason. The default of 1500 works correctly in most environments.

If you enable jumbo frames, verify support end-to-end. Every switch, router, and NIC in the path must support the larger MTU.

Keep MTU consistent across all nodes in the cluster. Mismatched MTUs between nodes cause intermittent, hard-to-debug connectivity issues.

When using overlay networking, let the CNI plugin handle the overlay MTU calculation. Only change the host interface MTU.

## Conclusion

MTU configuration in Talos Linux is a single field in the interface definition, but its impact on network performance can be significant. For most deployments, the default 1500 is correct. Change it when you have a specific need - jumbo frames for storage, reduced MTU for tunnels, or cloud-specific requirements. Always test the path MTU after making changes, and keep the setting consistent across your cluster. A few minutes of MTU validation saves hours of debugging mysterious network issues later.
