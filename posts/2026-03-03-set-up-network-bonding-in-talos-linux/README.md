# How to Set Up Network Bonding in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Bonding, High Availability, Networking, Infrastructure

Description: Learn how to set up network bonding in Talos Linux for improved redundancy, bandwidth, and fault tolerance on your Kubernetes nodes.

---

Network bonding combines multiple physical network interfaces into a single logical interface. This provides two main benefits: redundancy (if one link fails, traffic continues over the remaining links) and potentially increased bandwidth (multiple links can carry traffic simultaneously). For production Kubernetes clusters running on bare metal, bonding is a standard practice for ensuring network reliability.

This post walks through how to configure network bonding in Talos Linux, the available bonding modes, and practical considerations for different deployment scenarios.

## What Is Network Bonding

A network bond (also called a link aggregation group or LAG) takes two or more physical NICs and presents them as a single interface to the operating system. The Linux kernel's bonding driver manages the traffic distribution across the physical links.

For example, if you have two 10GbE interfaces (`eth0` and `eth1`), you can bond them into a single `bond0` interface. Depending on the bonding mode, this gives you either failover capability, load balancing, or both.

## Bonding Modes

Linux supports several bonding modes. The ones most commonly used with Talos Linux are:

- **balance-rr (mode 0)** - Round-robin. Packets are transmitted sequentially across all interfaces. Provides load balancing and fault tolerance. Requires switch support for best results.
- **active-backup (mode 1)** - Only one interface is active at a time. If it fails, another takes over. No switch configuration needed. This is the safest default choice.
- **balance-xor (mode 2)** - Transmit based on a hash of source and destination MAC addresses. Provides load balancing and fault tolerance.
- **802.3ad (mode 4)** - IEEE 802.3ad dynamic link aggregation (LACP). Requires switch support for LACP. Provides the best combination of load balancing and fault tolerance.
- **balance-tlb (mode 5)** - Adaptive transmit load balancing. Does not require switch support.
- **balance-alb (mode 6)** - Adaptive load balancing. Includes both transmit and receive load balancing.

## Basic Bond Configuration

Here is how to configure a basic active-backup bond in Talos Linux:

```yaml
# machine-config.yaml
machine:
  network:
    interfaces:
      # Define the bond interface
      - interface: bond0
        bond:
          mode: active-backup
          interfaces:
            - eth0
            - eth1
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
```

This creates a `bond0` interface that combines `eth0` and `eth1` in active-backup mode. If `eth0` goes down, traffic automatically switches to `eth1` with no manual intervention.

## LACP Bond Configuration

For environments where the network switches support LACP (Link Aggregation Control Protocol), mode 4 provides the best performance:

```yaml
machine:
  network:
    interfaces:
      - interface: bond0
        bond:
          mode: 802.3ad
          lacpRate: fast
          xmitHashPolicy: layer3+4
          interfaces:
            - eth0
            - eth1
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

The additional options:
- **lacpRate** - How often LACP PDUs are sent. `fast` sends every second, `slow` every 30 seconds. Use `fast` for quicker failover detection.
- **xmitHashPolicy** - How traffic is distributed across links. `layer3+4` hashes based on IP addresses and ports, providing good distribution for varied traffic patterns.

Remember that LACP mode requires the switch ports to also be configured for LACP. Without matching switch configuration, the bond will not form.

## Bond with Device Selectors

Instead of using interface names (which can change), you can use device selectors to identify the physical interfaces:

```yaml
machine:
  network:
    interfaces:
      - interface: bond0
        bond:
          mode: active-backup
          deviceSelectors:
            - hardwareAddr: "aa:bb:cc:dd:ee:01"
            - hardwareAddr: "aa:bb:cc:dd:ee:02"
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

Using MAC addresses ensures the correct physical interfaces are always bonded together, regardless of how the kernel names them.

## Bond with DHCP

You can also use DHCP on a bonded interface:

```yaml
machine:
  network:
    interfaces:
      - interface: bond0
        bond:
          mode: active-backup
          interfaces:
            - eth0
            - eth1
        dhcp: true
```

## Advanced Bond Options

Talos supports additional bonding parameters for fine-tuning:

```yaml
machine:
  network:
    interfaces:
      - interface: bond0
        bond:
          mode: active-backup
          interfaces:
            - eth0
            - eth1
          # Time in milliseconds between link checks
          miimon: 100
          # Time to wait before enabling a link after it comes up
          updelay: 200
          # Time to wait before disabling a link after it goes down
          downdelay: 200
          # Which interface is preferred as the primary
          primary: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

The `miimon` parameter sets how often the bond driver checks link status (in milliseconds). Lower values detect failures faster but add slightly more overhead. 100ms is a good balance.

The `updelay` and `downdelay` parameters add a delay before acting on link state changes. This prevents flapping when a link bounces briefly.

## Bond with VLANs

You can stack VLANs on top of a bonded interface:

```yaml
machine:
  network:
    interfaces:
      - interface: bond0
        bond:
          mode: 802.3ad
          interfaces:
            - eth0
            - eth1
        vlans:
          - vlanId: 100
            addresses:
              - 10.100.0.10/24
          - vlanId: 200
            addresses:
              - 10.200.0.10/24
```

This is common in data center deployments where different traffic types (management, storage, workload) are separated by VLANs but all travel over the same bonded physical links.

## Applying the Configuration

For new clusters:

```bash
# Generate config with bonding patch
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @bond-config.yaml
```

For existing nodes (be careful - network changes can disconnect you):

```bash
# Apply bond configuration to a running node
talosctl apply-config --nodes 192.168.1.10 \
  --file controlplane.yaml \
  --config-patch @bond-config.yaml
```

When changing network configuration on a running node, there is a risk of losing connectivity. Make sure you have out-of-band access (IPMI, iDRAC, iLO) to the machine in case the new configuration does not work.

## Verifying the Bond

After configuration, verify the bond is working:

```bash
# Check interface status
talosctl get links --nodes 192.168.1.10

# Check addresses on the bond interface
talosctl get addresses --nodes 192.168.1.10

# Check bond details
talosctl read /proc/net/bonding/bond0 --nodes 192.168.1.10
```

The `/proc/net/bonding/bond0` file shows detailed bond status including which interfaces are active, the current mode, and link status for each member.

## Testing Failover

To test that failover works, you need to physically disconnect one of the bonded cables (or disable the port on the switch). In active-backup mode:

1. Verify both links are up
2. Disconnect the primary link
3. Verify that traffic continues over the secondary link
4. Reconnect the primary link
5. Verify that the primary takes over again (if `primary_reselect` is set)

Monitor the bond status during the test:

```bash
# Watch bond status
talosctl read /proc/net/bonding/bond0 --nodes 192.168.1.10
```

## Choosing the Right Bonding Mode

For most production deployments, here is a simple decision guide:

- **No switch configuration possible** - Use `active-backup` (mode 1). It works without any switch support.
- **Switch supports LACP** - Use `802.3ad` (mode 4). It provides the best combination of performance and reliability.
- **Need load balancing without switch support** - Use `balance-alb` (mode 6). It provides transmit and receive load balancing without switch configuration.

When in doubt, start with `active-backup`. It is the most straightforward mode and provides reliable failover. You can always upgrade to LACP later if you need more bandwidth.

## Troubleshooting

**Bond interface has no address** - Check that the member interfaces exist and are physically connected. A bond with no active members cannot get an address.

**LACP bond not forming** - Verify that the switch ports are configured for LACP. The switch and the bond must agree on the LACP configuration.

**Poor performance** - If using LACP, check the `xmitHashPolicy`. The default policy may not distribute traffic well for your workload. `layer3+4` usually works best for mixed traffic.

**Frequent failovers** - If the bond keeps switching between interfaces, check cable quality and switch port errors. Adjust `miimon`, `updelay`, and `downdelay` to add stability.

## Conclusion

Network bonding in Talos Linux gives you redundancy and potentially increased bandwidth for your Kubernetes nodes. The configuration is declarative and lives in the machine config, making it easy to reproduce and manage. Start with active-backup mode if you are new to bonding, and move to LACP when your switch infrastructure supports it. Always test failover before putting the cluster into production, and keep out-of-band access available for when network changes go wrong.
