# How to Renew a DHCP Lease on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, macOS, Networking, Network Diagnostics, Sysadmin

Description: Renewing a DHCP lease on macOS can be done through System Settings, the ipconfig command, or by using networksetup to toggle DHCP off and on for the target interface.

## Method 1: System Settings (GUI)

1. Open **System Settings → Network**.
2. Select the active network interface (e.g., Wi-Fi or Ethernet).
3. Click **Details** (macOS Ventura+).
4. Go to the **TCP/IP** tab.
5. Click **Renew DHCP Lease**.
6. Click **OK**.

## Method 2: Command Line (scutil and ipconfig)

```bash
# Show current DHCP lease information
ipconfig getpacket en0

# Renew the current interface configuration
sudo scutil --renew en0

# Request DHCP configuration on the interface
# Note: ipconfig is intended for test/debug use and creates a temporary service
sudo ipconfig set en0 DHCP

# List network interfaces
ifconfig -l | tr ' ' '\n' | grep '^en'
```

## Method 3: networksetup (CLI)

```bash
# Set the network service to use DHCP
sudo networksetup -setdhcp "Wi-Fi"

# List network services
networksetup -listallnetworkservices
```

## Method 4: Disable and Re-Enable Interface

```bash
# Bring down and bring up the interface
# This resets the link; if the service uses DHCP, macOS may reacquire configuration
sudo ifconfig en0 down
sleep 2
sudo ifconfig en0 up
```

## Viewing Current Lease Details

```bash
# Detailed DHCP packet info (shows server IP, lease time, all options)
ipconfig getpacket en0

# Current IP configuration summary
ipconfig getsummary en0

# Or
ifconfig en0
```

## Flushing DNS Cache After Renewal

```bash
# Optional: flush the local DNS cache if you specifically need to clear cached lookups
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

## Troubleshooting

```bash
# Check DHCP logs in Console app or:
log show --predicate 'process == "configd"' --last 1h | grep -i dhcp

# Verify which DHCP server responded
ipconfig getpacket en0 | grep server_identifier
```

## Key Takeaways

- The GUI renewal button in System Settings is the simplest method for most users.
- `sudo scutil --renew en0` asks macOS to immediately re-evaluate configuration on that interface.
- `sudo ipconfig set en0 DHCP` can request DHCP on an interface, but Apple documents `ipconfig` as a test/debug tool that creates a temporary service.
- Use `ipconfig getpacket en0` to see all DHCP options including the server IP and lease time.
- Flushing the DNS cache is optional and separate from renewing the DHCP lease.
