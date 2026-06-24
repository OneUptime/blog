# How to Disable IPv6 and Use IPv4 Only with nmcli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, nmcli, NetworkManager, IPv6, IPv4, Networking

Description: Disable IPv6 on Linux network interfaces using nmcli, forcing connections to use IPv4 only by setting the IPv6 method to disabled or ignore.

## Introduction

Disabling IPv6 with NetworkManager is done per-connection using `ipv6.method`. Setting it to `disabled` prevents any IPv6 configuration on the interface for that connection. By contrast, `ignore` leaves IPv6 configuration unchanged on the interface. You can also disable IPv6 system-wide via sysctl for a more thorough approach.

## Disable IPv6 on a Single Connection

```bash
# Disable IPv6 on a specific connection

nmcli connection modify "Wired connection 1" \
    ipv6.method disabled

# Apply
nmcli connection up "Wired connection 1"
```

## Verify IPv6 is Disabled

```bash
# Should show no inet6 addresses on the interface
ip -6 addr show dev eth0

# Should show no IPv6 routes for the interface
ip -6 route show dev eth0
```

## Disable IPv6 on All Connections

```bash
# Loop through all connections and disable IPv6
nmcli -t -f UUID connection show | while IFS= read -r uuid; do
    nmcli connection modify uuid "$uuid" ipv6.method disabled
done

# Restart NetworkManager to apply
systemctl restart NetworkManager
```

## ipv6.method Options

| Method | Behavior |
|---|---|
| `auto` | Accept IPv6 via SLAAC/DHCPv6 |
| `dhcp` | Request IPv6 via DHCPv6 only |
| `manual` | Use configured static IPv6 address |
| `ignore` | Leave IPv6 configuration unchanged; does not force IPv4-only |
| `shared` | Share IPv6 connectivity with downstream clients |
| `link-local` | Assign only a random IPv6 link-local address |
| `disabled` | Disable IPv6 for this connection profile |

## Disable IPv6 System-Wide via sysctl

```bash
# Disable IPv6 globally (affects all interfaces)
cat > /etc/sysctl.d/99-disable-ipv6.conf << 'EOF'
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF

# Apply immediately
sysctl -p /etc/sysctl.d/99-disable-ipv6.conf
```

## Re-enable IPv6 on a Connection

```bash
# Re-enable IPv6 on a connection
nmcli connection modify "Wired connection 1" \
    ipv6.method auto

nmcli connection up "Wired connection 1"
```

## Check IPv6 Disable Status

```bash
# Verify IPv6 is disabled at the sysctl level
cat /proc/sys/net/ipv6/conf/eth0/disable_ipv6
# 1 = disabled, 0 = enabled

# Check via nmcli
nmcli connection show "Wired connection 1" | grep ipv6.method
```

## Conclusion

Disabling IPv6 with nmcli uses `ipv6.method disabled`. This cleanly disables IPv6 for the connection profile. For system-wide IPv6 disabling, combine nmcli settings with sysctl `net.ipv6.conf.all.disable_ipv6=1`. Verify with `ip -6 addr show dev eth0` to confirm no `inet6` addresses appear on that interface.
