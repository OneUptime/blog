# How to Release a DHCP Lease

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Networking, Linux, Window, macOS, Network Diagnostics

Description: Releasing a DHCP lease sends a DHCPRELEASE message to the server, allowing it to return the IP to the available pool immediately rather than waiting for the lease to expire.

## What Happens During Release

1. Client sends a **DHCPRELEASE** message (unicast) to the DHCP server.
2. Server marks the IP as no longer allocated in its lease pool.
3. Client removes the DHCP-assigned IPv4 address from its interface.
4. The interface is left without that IPv4 address until a new lease is obtained.

## Linux: dhclient

```bash
# Release the lease for eth0

sudo dhclient -r eth0

# Verify the IP is removed
ip -4 addr show dev eth0
# The DHCP-assigned IPv4 address should no longer be listed
```

## Linux: NetworkManager

```bash
# Deactivate the connection
nmcli connection down "Wired connection 1"

# Or disconnect the device managed by NetworkManager
nmcli device disconnect eth0
```

## Windows: ipconfig

```cmd
REM Release lease for all adapters
ipconfig /release

REM Release lease for a specific adapter (replace with your adapter name)
ipconfig /release "Ethernet"
ipconfig /release "Wi-Fi"

REM Verify IP is removed
ipconfig
REM Should no longer show the DHCP-assigned IPv4 address
```

## macOS: ipconfig

```bash
# De-configure IPv4 on en0
sudo ipconfig set en0 NONE

# Verify
ifconfig en0 | grep 'inet '
# Should show no IPv4 address
```

## When to Release a Lease

- Before decommissioning a client that no longer needs its dynamically assigned IP.
- When moving to a different VLAN or network.
- When testing DHCP pool exhaustion behavior.
- When diagnosing IP conflict issues.
- Before changing from DHCP to static IP.

## DHCPRELEASE Message Format

```python
# Simulating what dhclient sends (conceptual)
# DHCPRELEASE uses the standard BOOTP/DHCP packet format with
# DHCP Message Type option (53) = 7
# Sent as unicast directly to the DHCP server (not broadcast)

# The server receives it and marks the address as no longer allocated:
# Lease 192.168.1.105: status -> NOT_ALLOCATED
```

## Key Takeaways

- When the server receives the DHCPRELEASE, it can return the IP to the pool immediately.
- On Linux: `sudo dhclient -r eth0`; Windows: `ipconfig /release`; macOS: `sudo ipconfig set en0 NONE`.
- For DHCPv4, DHCPRELEASE is sent unicast to the DHCP server - not broadcast.
- If the server is unreachable, the client still removes its IP locally, and the server will time out the lease naturally.
