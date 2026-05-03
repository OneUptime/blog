# How to Debug NetBIOS Broadcast Issues on Mixed Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NetBIOS, Broadcast, Window, Linux, Samba, Troubleshooting

Description: Debug NetBIOS name service broadcast failures on mixed Windows and Linux networks by capturing NBT traffic, configuring WINS, and adjusting node types to reduce broadcast dependency.

## Introduction

NetBIOS over TCP/IP (NBT) uses UDP broadcasts on port 137 for name resolution on Windows networks. On mixed networks with Linux (Samba), these broadcasts generate noise and often fail across subnets. Understanding NBT node types and WINS configuration resolves most issues.

## NetBIOS Node Types

Windows clients use different resolution strategies based on their **node type**:

| Node Type | Code | Behavior |
|---|---|---|
| B-node (Broadcast) | 0x01 | Broadcasts for name resolution |
| P-node (Point-to-Point) | 0x02 | Queries WINS server only |
| M-node (Mixed) | 0x04 | Broadcasts first, then WINS |
| H-node (Hybrid) | 0x08 | WINS first, then broadcasts |

H-node is the recommended type for most networks.

## Capturing NetBIOS Broadcasts

```bash
# Capture all NetBIOS name service traffic on UDP port 137

sudo tcpdump -i eth0 -n -v "udp port 137"
```

Example output:

```text
14:00:01.123 IP 192.168.1.50.137 > 192.168.1.255.137: NBT UDP PACKET(137): QUERY
  NMB Name Query REQ for FILESERVER<20>
```

This shows a Windows host broadcasting a name query for `FILESERVER`. If the target is on a different subnet, this will never resolve via broadcast.

## Using nmblookup to Test NetBIOS Resolution

```bash
# Install Samba tools
sudo apt install samba-common-bin

# Query for a NetBIOS name via broadcast
nmblookup FILESERVER

# Query a specific WINS server directly (bypass broadcast)
nmblookup -R -U 192.168.1.10 FILESERVER

# List all NetBIOS names registered on the local segment
nmblookup -B 192.168.1.255 '*'
```

## Setting Up WINS on Samba

Configure a Samba WINS server to replace broadcast-based resolution:

```bash
# Edit /etc/samba/smb.conf
sudo tee -a /etc/samba/smb.conf << 'EOF'
[global]
   wins support = yes
   name resolve order = wins host bcast
EOF

sudo systemctl restart smbd nmbd
```

## Pointing Windows Clients to WINS

Configure WINS via DHCP option 44 to avoid manual configuration on each Windows host:

In `isc-dhcp-server` (`/etc/dhcp/dhcpd.conf`):

```text
subnet 192.168.1.0 netmask 255.255.255.0 {
  range 192.168.1.100 192.168.1.200;
  option routers 192.168.1.1;
  option netbios-name-servers 192.168.1.10;   # WINS server IP
  option netbios-node-type 8;                  # H-node
}
```

## Reducing NetBIOS Broadcasts

If WINS is configured and working, suppress additional broadcasts:

On Linux with Samba:

```ini
# /etc/samba/smb.conf
[global]
   name resolve order = wins host bcast
   disable netbios = no
```

## Blocking NetBIOS Broadcasts at Subnet Boundaries

```bash
# On a Linux router - block NetBIOS broadcasts from being forwarded
sudo iptables -A FORWARD -p udp --dport 137 -d 255.255.255.255 -j DROP
sudo iptables -A FORWARD -p udp --dport 138 -d 255.255.255.255 -j DROP
```

## Conclusion

Most NetBIOS broadcast issues on mixed networks are solved by deploying a WINS server (Samba or Windows Server) and configuring clients as H-node via DHCP. This eliminates cross-subnet broadcast failures and dramatically reduces broadcast traffic volume.
