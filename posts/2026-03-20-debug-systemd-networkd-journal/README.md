# How to Debug systemd-networkd with Journal Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: systemd-networkd, Debugging, Journal, Linux, journalctl, Network Troubleshooting

Description: Learn how to debug systemd-networkd configuration issues using journalctl, enabling debug logging, and interpreting common error messages.

---

systemd-networkd logs to the system journal. When network interfaces fail to configure, journal logs reveal configuration errors, DHCP failures, and routing issues.

## Basic Journal Inspection

```bash
# Show all systemd-networkd logs

journalctl -u systemd-networkd

# Follow live (like tail -f)
journalctl -u systemd-networkd -f

# Show last 100 lines
journalctl -u systemd-networkd -n 100

# Show logs since boot
journalctl -u systemd-networkd -b
```

## Enabling Debug Logging

```bash
# Method 1: Environment variable for a single run
SYSTEMD_LOG_LEVEL=debug /usr/lib/systemd/systemd-networkd

# Method 2: Persistent debug level via systemd override
mkdir -p /etc/systemd/system/systemd-networkd.service.d/
cat > /etc/systemd/system/systemd-networkd.service.d/debug.conf << 'EOF'
[Service]
Environment=SYSTEMD_LOG_LEVEL=debug
EOF

systemctl daemon-reload
systemctl restart systemd-networkd

# Disable after debugging:
rm /etc/systemd/system/systemd-networkd.service.d/debug.conf
systemctl daemon-reload
systemctl restart systemd-networkd
```

## Common Error Messages

```bash
# "Failed to open configuration file"
# Cause: File is unreadable (permissions) or path does not exist
# Fix: Check file mode, ownership, and that the path is correct

# "Failed to parse" / "Invalid section header"
# Cause: Syntax error in .network or .netdev file
# Fix: Reload and watch the journal for the offending line number

# "Could not find matching network"
# Cause: No .network file matches the interface
# Fix: Check [Match] section - name glob or MAC

# "DHCP timeout"
# Cause: DHCP server unreachable
# Fix: Check physical connectivity, DHCP server logs

# "Failed to set MTU"
# Cause: MTU value too large for hardware
# Fix: Lower MTUBytes value in .link or .network file
```

## Validating Configuration Files

systemd-networkd does not ship a standalone "verify" subcommand. To validate
`.network` and `.netdev` files, reload them and watch the journal — the parser
prints the file and line number for any syntax errors.

```bash
# Reload config files and watch for parse errors
networkctl reload
journalctl -u systemd-networkd -n 50 --no-pager

# Show the merged configuration that applies to an interface
networkctl cat eth0

# Show all drop-ins and the resulting effective config
networkctl status eth0
```

## Viewing Interface Status

```bash
# Show all interfaces and their networkd status
networkctl list

# Output:
# IDX LINK     TYPE     OPERATIONAL SETUP
#   1 lo       loopback carrier     unmanaged
#   2 eth0     ether    routable    configured
#   3 eth1     ether    degraded    configuring

# Show detailed status for one interface
networkctl status eth0

# Operational "degraded": link has carrier and a link-local address, but no routable address
# Setup "configuring": configuration is still being retrieved or applied (e.g., waiting for DHCP)
# Setup "configured": link has been configured successfully
```

## Reloading Without Restart

```bash
# Reload configuration files without dropping connections
networkctl reload

# Reconfigure a specific interface
networkctl reconfigure eth0
```

## Correlating with Kernel Messages

```bash
# View kernel and networkd entries together. Use "+" so journalctl
# treats the two match groups as a logical OR (AND would yield nothing,
# since kernel records are not tagged with a systemd unit).
journalctl -b _TRANSPORT=kernel + _SYSTEMD_UNIT=systemd-networkd.service \
  | grep -E "eth0|bond|vxlan"

# Check for kernel errors
dmesg | grep -E "eth0|nf_|bond" | tail -20
```

## Key Takeaways

- `journalctl -u systemd-networkd -f` provides real-time network configuration log monitoring.
- Enable debug logging with `SYSTEMD_LOG_LEVEL=debug` in a systemd override file to see detailed DHCP and routing events.
- To validate `.network` and `.netdev` files, run `networkctl reload` and watch the journal — there is no standalone verify subcommand.
- `networkctl list` shows operational status; `degraded` means the interface has carrier and a link-local address but no routable address.
