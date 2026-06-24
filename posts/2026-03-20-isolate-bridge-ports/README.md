# How to Isolate Bridge Ports from Each Other

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bridge, Port Isolation, Linux, Ebtables, Private VLAN, Networking, Security

Description: Learn how to isolate Linux bridge ports from communicating with each other while still allowing all ports to reach the upstream gateway, using ebtables or VLAN-based private isolation.

---

Port isolation prevents direct VM-to-VM or host-to-host communication between isolated bridge ports. In a topology where the only non-isolated path is the uplink/router, this forces inter-host traffic to go through the router. This is common in hosting environments and guest networks.

## Why Isolate Bridge Ports

- Prevent compromised VMs from attacking neighbors on the same bridge
- Enforce inter-VLAN routing for security policy enforcement
- Implement "private VLAN" behavior at Layer 2

## Method 1: ebtables Port Isolation

```bash
# Install ebtables

apt install ebtables -y

# Drop forwarding from isolated tap ports to any bridge port except the uplink

# Block forwarding between bridge ports
ebtables -A FORWARD --in-interface tap0 ! --out-interface eth0 -j DROP
ebtables -A FORWARD --in-interface tap1 ! --out-interface eth0 -j DROP

# Verify
ebtables -L FORWARD
```

## Method 2: nftables with Bridge Family

```bash
# /etc/nftables-bridge.conf
table bridge filter {
    chain forward {
        type filter hook forward priority 0;

        # Allow traffic from tap ports only to eth0 (uplink)
        iifname "tap0" oifname != "eth0" drop
        iifname "tap1" oifname != "eth0" drop
        iifname "tap2" oifname != "eth0" drop

        accept
    }
}
```

## Method 3: ip link Isolated Port Flag

```bash
# Set isolated flag on ports that should not communicate with each other
ip link set tap0 type bridge_slave isolated on
ip link set tap1 type bridge_slave isolated on
ip link set tap2 type bridge_slave isolated on

# The uplink (eth0) is NOT isolated - it can communicate with all ports
# Isolated ports cannot communicate with each other, only with non-isolated ports

# Verify
bridge link show | grep isolated
# tap0: ... isolated on
# tap1: ... isolated on
```

## Verifying Isolation

```bash
# From VM on tap0, try to ping VM on tap1
# Should FAIL with isolation enabled

# From VM on tap0, try to ping gateway
# Should SUCCEED (the gateway is reachable via eth0, which is not isolated)

# Test with tcpdump on tap1 to verify no traffic arrives from tap0
tcpdump -i tap1 -nn "host 192.168.1.11" &
# (No packets should appear from 192.168.1.10 when isolation is active)
```

## Method 4: Separate Linux Bridges per VM

The most complete isolation: each VM gets its own bridge with no shared Layer 2:

```bash
# Create separate bridge per VM
ip link add br-vm1 type bridge
ip link set tap0 master br-vm1
ip link set br-vm1 up

# VM1 connects through NAT only, not shared bridge
# Route through iptables MASQUERADE
```

## Key Takeaways

- The `isolated` bridge slave flag is the simplest method: set on all tenant ports, leave uplinks non-isolated.
- ebtables provides fine-grained Layer 2 filtering for older kernels.
- Isolated ports can still reach the gateway/router; they only cannot communicate with each other through the bridge.
- For complete isolation, give each VM its own bridge and route between them via an upstream router.
