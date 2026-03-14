# How to Use networkctl to Manage Network Interfaces on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Networkctl, Systemd-networkd, Systemd

Description: A practical reference for using networkctl to inspect and manage network interfaces on Ubuntu systems running systemd-networkd.

---

`networkctl` is the command-line interface for `systemd-networkd`, the network manager that Ubuntu server installations use by default. It lets you query interface status, trigger reconfiguration, and view detailed link information - all without touching configuration files directly.

If your system uses NetworkManager instead of `systemd-networkd`, some of these commands will work in a limited capacity. This guide assumes `systemd-networkd` is active, which is the default for Ubuntu server installations and cloud images.

## Checking systemd-networkd Status

First, confirm that `systemd-networkd` is running:

```bash
systemctl status systemd-networkd
```

If it is not active, start it:

```bash
sudo systemctl enable --now systemd-networkd
```

## Basic networkctl Usage

### Listing All Network Links

```bash
networkctl
# or
networkctl list
```

Sample output:

```text
IDX LINK    TYPE     OPERATIONAL SETUP
  1 lo      loopback carrier     unmanaged
  2 eth0    ether    routable    configured
  3 eth1    ether    off         unmanaged
  4 bond0   bond     routable    configured

4 links listed.
```

The columns tell you:
- **IDX** - kernel interface index
- **LINK** - interface name
- **TYPE** - interface type (ether, bond, vlan, etc.)
- **OPERATIONAL** - link state from the kernel's perspective
- **SETUP** - configuration state from `systemd-networkd`'s perspective

### Operational States

- `off` - no carrier (cable unplugged or interface is down)
- `no-carrier` - interface is up but no physical link
- `dormant` - interface is up and has carrier but not authenticated (e.g., 802.1X)
- `degraded` - connected but not fully configured
- `carrier` - has carrier but no address
- `routable` - has carrier and a routable address assigned

### Setup States

- `unmanaged` - networkd is not managing this interface
- `configuring` - configuration in progress
- `configured` - fully configured
- `failed` - configuration failed

## Inspecting a Specific Interface

```bash
# Show detailed information about eth0
networkctl status eth0
```

Output includes:

```text
* 2: eth0
       Link File: /usr/lib/systemd/network/99-default.link
    Network File: /etc/systemd/network/20-wired.network
            Type: ether
           State: routable (configured)
  Online State: online
          Address: 192.168.1.100/24 (DHCP4)
                   fe80::5054:ff:feab:cdef/64
          Gateway: 192.168.1.1 (TP-Link Technologies)
              DNS: 8.8.8.8
                   8.8.4.4
         DHCP4 Client ID: IAID:0x1abc2345/DUID
         DHCP Lease: ...
    Activation Policy: up
  Required For Online: yes
```

This shows the network file managing the interface, the current address, gateway, DNS servers, and DHCP lease information.

To see all interfaces with details:

```bash
networkctl status
```

## Viewing Link Properties

For hardware-level details like speed, duplex, and driver:

```bash
networkctl lldp
# Shows LLDP neighbors if LLDP is enabled

networkctl status eth0 | grep -E "Speed|Duplex|Driver|Firmware"
```

Or use `networkctl show`:

```bash
# Show all properties of an interface
networkctl show eth0
```

This dumps all properties including link-layer information, operational state history, and network configuration parameters.

## Reloading Configuration

When you change a `.network` file in `/etc/systemd/network/`, you can reload without restarting the entire networkd service:

```bash
# Reload all .network and .netdev files without dropping connections
sudo networkctl reload
```

This picks up configuration changes and applies them to managed interfaces. It is safer than restarting `systemd-networkd` because it does not tear down existing connections.

## Reconfiguring a Specific Interface

To force a specific interface to re-apply its configuration:

```bash
# Reconfigure eth0 specifically
sudo networkctl reconfigure eth0
```

This is useful after manually modifying the interface's `.network` file.

## Renewing DHCP Leases

```bash
# Force a DHCP renew on eth0
sudo networkctl renew eth0

# Renew all DHCP-configured interfaces
sudo networkctl renew
```

## Bringing Interfaces Up and Down

```bash
# Administratively bring down eth1
sudo networkctl down eth1

# Bring it back up
sudo networkctl up eth1
```

Note: `networkctl down` sets the activation policy of the interface and does not permanently disable it. After a reload or reconfigure, the interface comes back up according to its `.network` file policy.

## Checking Online Status

systemd-networkd maintains an "online" state that determines when the network is considered ready. The `systemd-networkd-wait-online` service waits for this state during boot:

```bash
# Check overall online status
networkctl status | grep "Online State"

# Check what is required for online
networkctl status eth0 | grep "Required For Online"
```

To configure which interfaces are required for "online" status, set `RequiredForOnline=` in the interface's `.network` file:

```ini
# /etc/systemd/network/20-wired.network
[Match]
Name=eth0

[Network]
DHCP=yes

[Link]
RequiredForOnline=yes
```

## LLDP (Link Layer Discovery Protocol)

If LLDP is configured, `networkctl` can show neighbor information:

```bash
# Show LLDP neighbors
networkctl lldp

# Enable LLDP in a network file
# [Network]
# LLDP=yes
# EmitLLDP=nearest-bridge
```

LLDP information is useful for mapping physical network topology.

## networkctl and Netplan

On Ubuntu systems that use Netplan, the Netplan configuration generates `systemd-networkd` files in `/run/systemd/network/`. You generally do not edit those files directly, but `networkctl` still reflects the state of the interfaces configured by Netplan.

After changing a Netplan file:

```bash
sudo netplan apply
# This regenerates the systemd-networkd files and triggers a reload
```

You can then use `networkctl` to verify the result:

```bash
networkctl status eth0
```

## Scripting with networkctl

For automation, the JSON output mode is useful:

```bash
# Get interface list as JSON
networkctl --json=short list

# Parse with jq to get routable interfaces
networkctl --json=short list | jq -r '.Interfaces[] | select(.OperationalState == "routable") | .Name'
```

Available JSON verbosity levels: `short`, `pretty`, `off` (default text).

## Common Troubleshooting Scenarios

### Interface Stuck in "configuring"

```bash
# Check networkd logs for the specific interface
sudo journalctl -u systemd-networkd | grep eth0

# Force reconfiguration
sudo networkctl reconfigure eth0
```

### Interface Showing "unmanaged"

If a `.network` file exists but the interface is shown as unmanaged, the Match section may not be matching correctly:

```bash
# Check which network files exist
ls /etc/systemd/network/
ls /run/systemd/network/

# Check network file content
cat /etc/systemd/network/20-wired.network

# Look for networkd debug logs
sudo journalctl -u systemd-networkd -p debug
```

### DNS Not Working

```bash
# Check DNS configuration through networkd
networkctl status eth0 | grep DNS

# Also check systemd-resolved
resolvectl status
```

`networkctl` is a clean and consistent tool for network interface management on Ubuntu. Once you're familiar with its output, it provides faster and more informative feedback than digging through `ip` command output alone.
