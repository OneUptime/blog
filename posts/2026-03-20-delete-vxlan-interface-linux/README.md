# How to Delete a VXLAN Interface on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, Linux, Ip link, Cleanup, Overlay Networking, Interface Management

Description: Learn how to delete VXLAN interfaces on Linux, including detaching from bridges, removing associated routes, and cleaning up persistent configuration files.

---

Deleting a VXLAN interface requires detaching it from any bridge, removing the interface, and cleaning up configuration files to prevent recreation on reboot.

## Deleting a VXLAN Interface

```bash
# Simple deletion (if not attached to a bridge)

ip link del vxlan10

# Verify deletion
ip link show vxlan10
# Error: Device "vxlan10" does not exist.
```

## Detaching from Bridge Before Deletion

```bash
# Remove VXLAN from bridge first
ip link set vxlan10 nomaster

# Then delete
ip link del vxlan10

# Verify
ip link show master br-vxlan   # vxlan10 should no longer appear
ip link show vxlan10           # Should show error
```

## Bringing Down and Deleting

```bash
# Bring down first (optional - ip link del works on running interfaces too)
ip link set vxlan10 down
ip link del vxlan10
```

## Batch Deletion: Delete All VXLAN Interfaces

```bash
# List all VXLAN interfaces
ip -d link show type vxlan

# Delete all VXLAN interfaces
ip -d link show type vxlan | grep "^[0-9]" | awk '{print $2}' | tr -d ':' | \
  while read iface; do
    echo "Deleting VXLAN: $iface"
    ip link set "$iface" nomaster 2>/dev/null  # Detach from bridge
    ip link del "$iface"
  done
```

## Removing Persistent Configuration

### systemd-networkd

```bash
# Remove .netdev and .network files
rm /etc/systemd/network/vxlan10.netdev
rm /etc/systemd/network/vxlan10.network

# Reload networkd to reflect changes
networkctl reload
```

### /etc/network/interfaces (Debian)

```bash
# Remove vxlan entries from /etc/network/interfaces
# Then bring down the interface if still up
ifdown vxlan10 2>/dev/null
ip link del vxlan10 2>/dev/null
```

### NetworkManager

```bash
# List VXLAN connections
nmcli connection show | grep vxlan

# Delete connection
nmcli connection delete vxlan10-connection
```

## Verifying Complete Cleanup

```bash
# Interface is gone
ip link show vxlan10

# Not in bridge
ip link show master br-vxlan

# No FDB entries for deleted interface
bridge fdb show | grep vxlan10

# No routes through deleted interface
ip route show | grep vxlan10
```

## Key Takeaways

- Detach the VXLAN from its bridge with `ip link set vxlan10 nomaster` before deletion.
- `ip link del vxlan10` removes the interface immediately; routes associated with it are removed by the kernel.
- For systemd-networkd, delete both `.netdev` and `.network` files and run `networkctl reload`.
- After deletion, verify with `ip -d link show type vxlan` that no VXLAN interfaces remain.
