# How to Renew a DHCP Lease on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Linux, Networking, Network Diagnostics, Sysadmin

Description: Renewing a DHCP lease on Linux can be done with dhclient, nmcli, or by restarting the networking service, depending on which network management stack is in use.

## Method 1: dhclient (Direct, if installed)

```bash
# Release current lease

sudo dhclient -r eth0

# Request a new lease
sudo dhclient eth0

# Verbose output showing the DHCP exchange
sudo dhclient -v eth0

# For a specific interface (replace eth0 with yours)
sudo dhclient -r enp3s0
sudo dhclient enp3s0
```

## Method 2: NetworkManager (nmcli)

Many modern desktop Linux distributions use NetworkManager:

```bash
# Find the connection name
nmcli connection show

# Deactivate and reactivate to renew lease
nmcli connection down "Wired connection 1"
nmcli connection up "Wired connection 1"

# Or reconnect by interface name
nmcli device disconnect eth0
nmcli device connect eth0

# View current lease information
nmcli device show eth0 | grep -i dhcp
```

## Method 3: systemd-networkd

On systems using systemd-networkd:

```bash
# Restart networking to trigger renewal
sudo systemctl restart systemd-networkd

# Or use networkctl
sudo networkctl renew eth0

# View lease info
networkctl status eth0
```

## Method 4: Restart Networking Service

```bash
# Debian/Ubuntu (legacy ifupdown)
sudo ifdown eth0 && sudo ifup eth0

# NetworkManager-managed systems
sudo systemctl restart NetworkManager
```

## Viewing Current Lease

```bash
# dhclient lease file (common Debian/Ubuntu path)
sudo cat /var/lib/dhcp/dhclient.leases

# NetworkManager DHCP info
nmcli -f DHCP4 device show eth0

# systemd-networkd runtime lease files
sudo cat /run/systemd/netif/leases/*
```

## Flushing DNS After Renewal

```bash
# If using systemd-resolved
sudo resolvectl flush-caches

# If using nscd
sudo nscd -i hosts
```

## Key Takeaways

- Use the command that matches your network stack: `dhclient` for dhclient-managed interfaces, `nmcli` for NetworkManager, and `networkctl` for systemd-networkd.
- On NetworkManager systems, `nmcli connection down/up` or `nmcli device disconnect/connect` is preferred.
- Use `dhclient -v` to see verbose DHCP logs for debugging.
- Check the dhclient lease file to inspect current and past lease information; on Debian/Ubuntu this is commonly `/var/lib/dhcp/dhclient.leases`.
