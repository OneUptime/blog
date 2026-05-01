# How to Enable Generic Receive Offload (GRO) and TCP Segmentation Offload (TSO)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GRO, TSO, Linux, Network Performance, ethtool, Offload

Description: Learn how to enable GRO and TSO network offloads on Linux to reduce CPU overhead for high-throughput network workloads.

## What Are GRO and TSO?

Linux networking and modern NICs can offload or defer CPU-intensive packet processing:

- **TSO (TCP Segmentation Offload)** - The kernel sends large chunks of data to the NIC, which splits them into MTU-sized segments. Without TSO, the kernel CPU does the splitting.

- **GRO (Generic Receive Offload)** - The kernel combines multiple incoming packets from the same flow into a larger buffer before passing them up the stack. This reduces per-packet overhead on receives.

These offloads can improve throughput and reduce CPU cycles spent on packet processing, especially on busy servers.

## Step 1: Check Current Offload Status

Viewing features usually works as an unprivileged user, but changing them requires root (or `sudo`).

```bash
# View all offload settings for an interface

ethtool -k eth0

# Key offloads to check:
# tx-checksumming: on
# scatter-gather: on
# tcp-segmentation-offload: on
# generic-segmentation-offload: on
# generic-receive-offload: on
# large-receive-offload: off [fixed]   # optional; may be unsupported or fixed
# rx-vlan-offload: on

# Quick check for the important ones
ethtool -k eth0 | grep -E "tcp-seg|generic-seg|generic-rec|large-rec|scatter"
```

## Step 2: Enable TSO

TSO reduces CPU usage for large TCP sends:

```bash
# Enable TSO
ethtool -K eth0 tso on

# TSO normally depends on transmit checksum offload,
# and many devices also require scatter-gather support
ethtool -K eth0 tx on
ethtool -K eth0 sg on    # Scatter-gather is commonly needed for TSO

# Verify
ethtool -k eth0 | grep "tcp-segmentation-offload"
# tcp-segmentation-offload: on
```

## Step 3: Enable GRO

GRO reduces CPU usage on receive-heavy workloads:

```bash
# Enable GRO
ethtool -K eth0 gro on

# Some drivers/NICs also expose LRO (Large Receive Offload)
# Unlike GRO, LRO is generally avoided on systems that route or bridge traffic
ethtool -K eth0 lro on 2>/dev/null && echo "LRO enabled" || echo "LRO not supported or cannot be changed"

# Verify GRO
ethtool -k eth0 | grep "generic-receive-offload"
# generic-receive-offload: on
```

## Step 4: Enable Full Offload Suite

```bash
# Enable a common related offload set if the driver supports it
IFACE=eth0

ethtool -K "$IFACE" \
  tso on \
  gso on \
  gro on \
  tx on \
  sg on

# Check result
ethtool -k "$IFACE" | grep -E "tcp-seg|generic-seg|generic-rec|scatter"
```

## Step 5: Verify Impact with ethtool Statistics

```bash
# Driver-specific stat names vary, so grep for TSO/GRO/LRO if present
ethtool -S eth0 | grep -Ei "tso|gro|lro"

# Or use /proc/net/dev for overall stats
cat /proc/net/dev | grep eth0

# On the host being tested
iperf3 -s &
mpstat 1 30 | awk '/Average/ {print "CPU idle:", $NF "%"}'
# From another machine, during that sample window:
iperf3 -c <server-ip-on-eth0> -t 30
# To test transmit-side TSO on this host, run the client here instead
# iperf3 -c <remote-server-ip> -t 30
```

## Step 6: TSO and GRO Interaction with Virtualization

In VMs, TSO and GRO depend on the virtual NIC driver and the hypervisor's capabilities:

```bash
# For KVM guests using virtio-net, check the exposed offloads
ethtool -k eth0 | grep -E "segmentation|offload"

# If running as a router/bridge, disable LRO to avoid routing issues
# LRO combines packets before routing decisions, causing issues
ethtool -K eth0 lro off

# For DPDK or XDP workloads, all offloads should be checked for compatibility
```

## Step 7: Make Offloads Persistent

```bash
# Method 1: udev rules
cat > /etc/udev/rules.d/99-net-offload.rules << 'EOF'
ACTION=="add", SUBSYSTEM=="net", KERNEL=="eth0", \
  RUN+="/sbin/ethtool -K eth0 tso on gso on gro on sg on"
EOF

# Method 2: NetworkManager dispatcher
cat > /etc/NetworkManager/dispatcher.d/99-offloads << 'EOF'
#!/bin/sh
IFACE="$1"
EVENT="$2"
ETHTOOL=/usr/sbin/ethtool
[ -x "$ETHTOOL" ] || ETHTOOL=/sbin/ethtool
if [ "$EVENT" = "up" ] && [ "$IFACE" = "eth0" ]; then
    "$ETHTOOL" -K "$IFACE" tso on gso on gro on sg on
fi
EOF
chmod +x /etc/NetworkManager/dispatcher.d/99-offloads
```

## Conclusion

TSO and GRO are important offloads for high-throughput Linux servers. TSO lets the NIC handle TCP segmentation instead of the CPU, and GRO batches incoming packets for more efficient processing. Start with `ethtool -K eth0 tso on gro on` and verify related checksum and scatter-gather features remain enabled. On VMs, verify the virtual NIC driver supports these offloads. These settings often reduce CPU usage for network-intensive workloads, but the exact impact depends on the NIC, driver, kernel, MTU, and traffic pattern.
