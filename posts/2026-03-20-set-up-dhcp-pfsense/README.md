# How to Set Up DHCP on pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, pfSense, Networking, Firewall, Sysadmin

Description: pfSense's built-in DHCP server (based on ISC dhcpd) provides a web UI for configuring scopes, reservations, and options per interface, making it easy to manage DHCP alongside firewall and routing...

## Enabling DHCP via the Web UI

1. Log into pfSense WebGUI (default: https://192.168.1.1).
2. Go to **Services → DHCP Server**.
3. Select the interface (e.g., **LAN**).
4. Check **Enable DHCP server on LAN interface**.
5. Configure:
   - **Range**: Start and end IP (e.g., .100 to .200)
   - **DNS Servers**: Leave blank to use pfSense's automatic DNS behavior, such as the DNS Resolver or DNS Forwarder when enabled
   - **Gateway**: Leave blank for pfSense's interface IP
   - **Domain Name**: (optional)
   - **Default Lease Time**: 86400 (24 hours)
   - **Maximum Lease Time**: 604800 (7 days)
6. Click **Save**.

## pfSense CLI: DHCP Configuration File

When using the legacy ISC DHCP backend, pfSense stores the generated `dhcpd.conf` at `/var/dhcpd/etc/dhcpd.conf`. You can view it via SSH:

```bash
# Connect via SSH (if enabled in pfSense: System > Advanced > Admin Access)

ssh admin@192.168.1.1

# View the generated config
cat /var/dhcpd/etc/dhcpd.conf
```

## Adding a Static DHCP Mapping

Via Web UI:
1. **Services → DHCP Server → [Interface]**
2. Scroll to **DHCP Static Mappings**.
3. Click **Add**.
4. Enter MAC address and IP.
5. Save.

Via CLI:
```bash
# Use the GUI for static mappings when possible.
# pfSense also has a PHP shell for advanced config.xml changes:
pfSsh.php
```

## Additional DHCP Options in pfSense

When using the legacy ISC DHCP backend, in the DHCP Server settings, click **Display Advanced** in **Additional BOOTP/DHCP Options**:

```text
Number: 150
Type: IP address or host
Value: 10.0.0.100
```

This adds custom options like option 150 (TFTP server address) that aren't in the standard GUI. When using the Kea DHCP backend, use the Custom Configuration JSON field instead.

## Verifying Leases

1. Go to **Status → DHCP Leases**.
2. View active leases with MAC addresses, or click **Show all configured leases** to include inactive and expired leases.
3. Click **Add Static Mapping** next to a dynamic lease to create a static mapping from that lease.

Or via CLI:
```bash
# View active leases with the legacy ISC DHCP backend
grep -A5 "binding state active" /var/dhcpd/var/db/dhcpd.leases
```

## Troubleshooting DHCP on pfSense

```bash
# Check DHCP daemon status
/usr/local/sbin/dhcpd -t -chroot /var/dhcpd -cf /etc/dhcpd.conf  # Test legacy ISC config
ps aux | grep -E '[d]hcpd|kea-dhcp4'                             # Check if running

# View DHCP logs (Status > System Logs, DHCP tab)
# Or CLI:
tail -50 /var/log/dhcpd.log
```

## Key Takeaways

- pfSense's DHCP server is configured per-interface with an intuitive Web UI.
- Static mappings can be added from the Leases page by clicking existing leases.
- Use "Additional DHCP Options" on the legacy ISC backend, or Kea custom JSON configuration, for non-standard options like option 150 for Cisco phones.
- View live leases at Status → DHCP Leases to see current assignments.
