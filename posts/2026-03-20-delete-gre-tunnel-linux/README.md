# How to Delete a GRE Tunnel Interface on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GRE, Tunnel, Linux, Ip tunnel, Ip link, Cleanup, Networking

Description: Learn how to delete GRE tunnel interfaces on Linux using ip tunnel and ip link commands, including cleanup of associated routes and persistent configuration removal.

---

Deleting a GRE tunnel requires removing the tunnel interface and any associated routes. The method depends on whether the tunnel was created with `ip tunnel` or by a network manager like NetworkManager/systemd-networkd.

## Deleting a Manually Created GRE Tunnel

```bash
# Method 1: using ip tunnel (works for tunnels created with ip tunnel add)

ip tunnel del gre1

# Method 2: using ip link (generic, works for all interfaces)
ip link del gre1

# Verify
ip link show gre1
# Error: Device "gre1" does not exist. (expected)
```

## Cleaning Up Routes Before Deletion

```bash
# List routes using the tunnel
ip route show dev gre1

# Remove specific routes through the tunnel
ip route del 192.168.2.0/24 dev gre1

# Or flush all routes on the tunnel interface at once
ip route flush dev gre1

# Now delete the tunnel
ip link del gre1
```

## Removing NetworkManager GRE Connections

```bash
# List GRE tunnel connections
nmcli connection show | grep tunnel

# Delete the connection
nmcli connection delete gre-tunnel-1

# Verify deletion
nmcli connection show | grep tunnel
```

## Removing systemd-networkd GRE Tunnel

```bash
# Remove the .netdev and .network files
rm /etc/systemd/network/gre1.netdev
rm /etc/systemd/network/gre1.network

# Reload networkd to remove the interface
networkctl reload

# Or bring down and delete manually
ip link del gre1
```

## Batch Cleanup: Delete All GRE Tunnels

```bash
# List all GRE tunnel interfaces
ip -d link show type gre
ip -d link show type gretap

# Delete all GRE tunnels
ip -d link show type gre | grep "^[0-9]" | awk '{print $2}' | tr -d ':' | cut -d'@' -f1 | while read iface; do
  echo "Deleting $iface"
  ip link del "$iface"
done
```

## Verifying Complete Cleanup

```bash
# Confirm interface is gone
ip link show gre1

# Confirm routes are gone
ip route show | grep "gre1"

# Confirm no tunnel in ip tunnel list
ip tunnel list | grep gre1

# Confirm kernel module can be unloaded (if no tunnels remain)
ip -d link show type gre 2>/dev/null | wc -l
# 0 means no GRE tunnels remain
lsmod | grep ip_gre
# If 0 tunnels exist, module can be unloaded
rmmod ip_gre   # optional
```

## Key Takeaways

- `ip link del gre1` or `ip tunnel del gre1` removes the tunnel interface immediately.
- Routes associated with the deleted interface are removed automatically by the kernel.
- For NetworkManager-managed tunnels, use `nmcli connection delete` to prevent the tunnel from re-creating on reboot.
- Remove systemd-networkd `.netdev` and `.network` files and run `networkctl reload` to persistently delete tunnels.
