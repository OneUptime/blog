# How to Configure Wake-on-LAN (WoL) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Wake-on-LAN, Power Management, Netplan

Description: Configure Wake-on-LAN on Ubuntu to remotely power on machines from sleep or shutdown using magic packets, covering both server and desktop setups.

---

Wake-on-LAN (WoL) lets you power on a machine remotely by sending a "magic packet" to its network interface. This is useful for machines that need to be available on demand but should not run continuously - development workstations, lab machines, or home servers.

Setting it up requires configuration at three levels: the BIOS/UEFI firmware, the network card, and the operating system.

## How Wake-on-LAN Works

A WoL-capable network interface card stays in a low-power listening state even when the host is shut down or suspended, as long as the machine remains plugged into power. When it receives a "magic packet" - a broadcast UDP packet containing the target MAC address repeated 16 times - it signals the motherboard to power on.

The magic packet is sent from another machine on the same network (or from outside via port forwarding if your router supports it).

## Step 1: Enable WoL in BIOS/UEFI

WoL must be enabled in firmware before the OS configuration matters. The setting varies by manufacturer but is typically found under:

- Power Management
- Advanced
- Network Boot / PXE Boot
- Deep Sleep / S5 WoL support

Look for options like "Wake on LAN", "Wake on PME", or "Power on by PCI device". Enable it and save.

This step has no command-line equivalent - you must do it in the BIOS setup during boot.

## Step 2: Check Current WoL Status

Install `ethtool` if not present:

```bash
sudo apt install ethtool
```

Check the current WoL setting for your interface (replace `eth0` with your actual interface):

```bash
sudo ethtool eth0 | grep -i wake
```

Output:

```
Supports Wake-on: pumbg
Wake-on: d
```

The first line shows supported modes, the second shows the currently active mode.

WoL mode codes:
- `p` - Wake on PHY activity
- `u` - Wake on unicast messages
- `m` - Wake on multicast messages
- `b` - Wake on broadcast messages
- `a` - Wake on ARP
- `g` - Wake on magic packet (this is what you want)
- `d` - Disabled (common default)

If `Wake-on: d`, WoL is disabled. You need to enable `g` mode.

## Step 3: Enable WoL with ethtool

Enable magic packet WoL:

```bash
sudo ethtool -s eth0 wol g
```

Verify:

```bash
sudo ethtool eth0 | grep -i wake
# Should now show: Wake-on: g
```

This setting does not survive a reboot - the NIC resets to its default. You need to make it persistent.

## Step 4: Make WoL Persistent

### Using Netplan (Recommended for Server)

Netplan has a built-in option for Wake-on-LAN:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
      # Enable Wake-on-LAN
      wakeonlan: true
```

Apply the configuration:

```bash
sudo netplan apply
```

Verify it took effect:

```bash
sudo ethtool eth0 | grep -i wake
```

### Using a systemd Service (Alternative)

If Netplan's WoL option does not work with your NIC (some NICs need specific flags), create a service:

```bash
sudo tee /etc/systemd/system/wol@.service <<'EOF'
[Unit]
Description=Wake-on-LAN for %i
Requires=network.target
After=network.target

[Service]
ExecStart=/usr/sbin/ethtool -s %i wol g
Type=oneshot
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Enable the service for your interface
sudo systemctl enable wol@eth0.service
sudo systemctl start wol@eth0.service
```

Check its status:

```bash
sudo systemctl status wol@eth0.service
```

### Using NetworkManager (Desktop)

On desktop Ubuntu with NetworkManager, enable WoL via the GUI or command line:

```bash
# Find the connection name
nmcli connection show

# Enable WoL for the connection
nmcli connection modify "Wired connection 1" 802-3-ethernet.wake-on-lan magic

# Verify
nmcli connection show "Wired connection 1" | grep wake-on-lan
```

### Using networkd-dispatcher

If you need WoL enabled when the interface comes up:

```bash
sudo mkdir -p /etc/networkd-dispatcher/routable.d/

sudo tee /etc/networkd-dispatcher/routable.d/wol.sh <<'EOF'
#!/bin/bash
# Enable Wake-on-LAN when interface becomes routable
if [ "$IFACE" = "eth0" ]; then
    /usr/sbin/ethtool -s eth0 wol g
fi
EOF

sudo chmod +x /etc/networkd-dispatcher/routable.d/wol.sh
```

## Step 5: Note Your MAC Address

You need the MAC address of the target machine to send magic packets:

```bash
# Get MAC address of eth0
ip link show eth0 | grep "link/ether" | awk '{print $2}'
# or
cat /sys/class/net/eth0/address
```

Save this - you will need it to wake the machine later.

## Step 6: Sending Magic Packets

From another machine on the same network, install a WoL tool:

```bash
# Ubuntu/Debian
sudo apt install wakeonlan

# Or use etherwake
sudo apt install etherwake
```

Send the magic packet:

```bash
# Using wakeonlan
wakeonlan AA:BB:CC:DD:EE:FF

# Using etherwake (requires interface specification)
sudo etherwake -i eth0 AA:BB:CC:DD:EE:FF

# Using a Python one-liner if no tools are available
python3 -c "
import socket, struct
mac = 'AA:BB:CC:DD:EE:FF'
mac_bytes = bytes.fromhex(mac.replace(':', ''))
magic = b'\xff' * 6 + mac_bytes * 16
with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
    s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    s.sendto(magic, ('255.255.255.255', 9))
print('Magic packet sent')
"
```

## Troubleshooting WoL

### Machine Does Not Wake Up

Work through these checks in order:

**1. BIOS not configured.** Reboot and re-enter BIOS to confirm WoL is enabled. Some firmware calls it "Deep Sleep" control or "Wake on PME."

**2. WoL not enabled at OS level.**

```bash
sudo ethtool eth0 | grep "Wake-on"
# Must show: Wake-on: g
```

**3. Magic packet not reaching the machine.** Capture packets to verify:

```bash
# On the sleeping machine (before shutdown), run tcpdump
sudo tcpdump -i eth0 udp port 9

# Then from another machine, send a WoL packet
# Check if tcpdump sees it
```

**4. Switch blocking broadcast.** Some managed switches block broadcasts between VLANs or ports. Try sending from a machine on the exact same switch port/VLAN.

**5. Power-off state vs suspend.** WoL works most reliably when the machine is suspended (S3) or halted (S5). Some NICs only support one or the other. Check the BIOS WoL setting - "WoL from S5" specifically enables wake from full power-off.

**6. NIC does not maintain power.** Some USB NICs and cheap onboard NICs do not maintain standby power correctly. Check if the NIC link light stays on after shutdown - it should.

### Testing Without Full Shutdown

Test WoL while the machine is running to confirm packets are arriving before dealing with the full shutdown/wake cycle:

```bash
# On the target, watch for magic packets without shutting down
sudo tcpdump -i eth0 -n 'ether proto 0x0842' or 'udp port 9'
```

Then send a magic packet from another machine and verify it appears in tcpdump output.

## WoL Over the Internet

To wake a machine from outside your local network, configure port forwarding on your router:

- Forward UDP port 9 to the broadcast address of your subnet (e.g., 192.168.1.255)
- Some routers forward to a specific IP instead - check your router's documentation

Then send the magic packet to your public IP:

```bash
wakeonlan -i your.public.ip AA:BB:CC:DD:EE:FF
```

This works when the machine is on the same physical network as the router. VPNs are a more reliable solution for remote WoL since they give you direct LAN access.

WoL saves power and reduces wear on hardware for machines that only need to be on occasionally. The configuration is a one-time setup that pays off every time you need to access a machine remotely without leaving it running around the clock.
