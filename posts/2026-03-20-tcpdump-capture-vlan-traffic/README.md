# How to Capture Packets on a Specific VLAN with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, VLAN, 802.1Q, Packet Capture, Linux

Description: Learn how to capture packets on a specific VLAN using tcpdump on Linux, including filtering by VLAN ID on trunk interfaces, creating VLAN subinterfaces for capture, and analyzing 802.1Q tagged...

## VLAN Traffic and 802.1Q Tags

VLANs use 802.1Q tagging - a 4-byte tag inserted into the Ethernet frame containing the VLAN ID. On trunk ports (carrying multiple VLANs), tagged VLAN frames have a tag, though some trunks can also carry an untagged/native VLAN. On access ports (single VLAN), frames are untagged at the port.

## Step 1: Capture Tagged VLAN Traffic on Trunk Interface

```bash
# Capture all VLAN-tagged traffic (802.1Q)

sudo tcpdump -i eth0 -n vlan

# Capture traffic on a specific VLAN (VLAN 100)
sudo tcpdump -i eth0 -n 'vlan 100'

# Capture VLAN 100 with host filter
sudo tcpdump -i eth0 -n 'vlan 100 and host 192.168.100.50'

# Capture VLAN 100 TCP traffic
sudo tcpdump -i eth0 -n 'vlan 100 and tcp'

# Show VLAN tag details (verbose)
sudo tcpdump -i eth0 -n -v 'vlan 100' | head -20
# Output shows: vlan 100, p 0, ethertype IPv4 (0x0800)
```

## Step 2: Create a VLAN Subinterface for Capture

```bash
# Create a VLAN subinterface to capture only VLAN 100 traffic
# This is cleaner than filtering on the trunk interface

# Load 802.1Q kernel module
sudo modprobe 8021q

# Create VLAN subinterface
sudo ip link add link eth0 name eth0.100 type vlan id 100

# Bring it up
sudo ip link set eth0.100 up

# Capture on the subinterface (no VLAN filter needed)
sudo tcpdump -i eth0.100 -n -w /tmp/vlan100.pcap

# Verify VLAN interface
ip link show eth0.100
```

## Step 3: Configure Persistent VLAN Interface

```bash
# NetworkManager - create VLAN profile
nmcli con add type vlan \
    con-name "vlan100" \
    ifname eth0.100 \
    dev eth0 \
    id 100

# Bring up the VLAN interface
nmcli con up "vlan100"

# Verify
ip link show eth0.100
ip addr show eth0.100
```

```yaml
# Netplan configuration (/etc/netplan/01-netcfg.yaml)
network:
  version: 2
  vlans:
    eth0.100:
      id: 100
      link: eth0
      dhcp4: false
      addresses:
        - 192.168.100.200/24
```

## Step 4: Capture Multiple VLANs

```bash
# Capture on multiple outer VLAN IDs
sudo tcpdump -i eth0 -n 'vlan and (ether[14:2] & 0x0fff == 100 or ether[14:2] & 0x0fff == 200 or ether[14:2] & 0x0fff == 300)'

# Capture any VLAN traffic to or from a specific host
sudo tcpdump -i eth0 -n 'vlan and host 192.168.100.50'

# Capture all VLAN traffic and save to PCAP
sudo tcpdump -i eth0 -n -w /tmp/all-vlans.pcap 'vlan'

# Later, filter specific VLAN from saved PCAP
tcpdump -r /tmp/all-vlans.pcap 'vlan 100'
```

## Step 5: Analyze VLAN Traffic in Wireshark

```text
In Wireshark:

1. Filter for specific VLAN:
   vlan.id == 100

2. Filter for VLAN range:
   vlan.id in {100..200}

3. Show VLAN priority (QoS):
   vlan.priority

4. Filter non-VLAN tagged traffic:
   not vlan

5. VLAN traffic statistics:
   Apply vlan.id == 100, then use Statistics → Conversations → Ethernet
   Shows Ethernet conversations for the displayed VLAN traffic

6. Double-tagged (QinQ) traffic:
   vlan.id#1 == 100 and vlan.id#2 == 200
   (Match outer VLAN 100, inner VLAN 200)
```

## Step 6: Capture VLAN Traffic on a Switch (via SPAN)

```bash
# If you have a SPAN port mirroring trunk traffic:
# Configure the SPAN destination to preserve or tag VLAN encapsulation
# otherwise some switches may send mirrored traffic untagged

# On the capture device (connected to SPAN destination)
# List all VLANs seen
sudo tcpdump -i eth0 -l -n -e 'vlan' | awk '{for (i=1; i<=NF; i++) if ($i == "vlan") {gsub(",", "", $(i+1)); print $(i+1)}}' | sort -n | uniq -c | sort -rn
# Counts frames per VLAN ID

# Capture SPAN traffic filtered to VLAN 100
sudo tcpdump -i eth0 -n -w /tmp/vlan100-span.pcap 'vlan 100'

# See source and destination MAC addresses in VLAN 100
sudo tcpdump -i eth0 -l -n -e 'vlan 100' | awk '{src=$2; dst=$4; gsub(",", "", dst); print src, dst}' | sort | uniq
```

## Step 7: Script to Capture Multiple VLANs Simultaneously

```bash
#!/bin/bash
# Capture each VLAN to a separate file

INTERFACE="eth0"
VLANS=(100 200 300 400)
CAPTURE_DIR="/tmp/vlan-captures"

mkdir -p "$CAPTURE_DIR"

for VLAN in "${VLANS[@]}"; do
    echo "Starting capture for VLAN $VLAN..."
    sudo tcpdump -i "$INTERFACE" -n \
        -w "${CAPTURE_DIR}/vlan${VLAN}-$(date +%Y%m%d-%H%M%S).pcap" \
        "vlan $VLAN" &
    echo "  PID: $!"
done

echo "All captures running. Press Enter to stop..."
read

# Stop all tcpdump processes
sudo killall tcpdump
echo "Captures saved to $CAPTURE_DIR"
ls -lh "$CAPTURE_DIR"/*.pcap
```

## Conclusion

Capture VLAN-tagged traffic with `sudo tcpdump -i eth0 -n 'vlan 100'` on trunk interfaces. For cleaner captures, create a VLAN subinterface with `ip link add link eth0 name eth0.100 type vlan id 100` and capture on `eth0.100` without needing VLAN filters. In Wireshark, use `vlan.id == 100` as the display filter. For SPAN-mirrored trunk traffic, use the same VLAN filter syntax to isolate traffic from specific VLANs in captures that include all VLAN traffic.
