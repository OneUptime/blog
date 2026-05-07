# How to Add a Static ARP Entry with ip neigh add

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ip command, iproute2, ARP, Static ARP, Networking, Security

Description: Add static ARP entries on Linux using ip neigh add to permanently map IP addresses to MAC addresses, preventing ARP spoofing and ensuring consistent resolution.

## Introduction

Static ARP entries permanently map an IP address to a MAC address. Unlike dynamic entries that expire and require re-resolution, static entries persist (until the system reboots or they are manually removed). They are used to prevent ARP spoofing and ensure reliable resolution for critical hosts.

## Add a Static ARP Entry

```bash
# Add a permanent ARP entry mapping IP to MAC

ip neigh add 192.168.1.50 lladdr aa:bb:cc:dd:ee:ff dev eth0 nud permanent

# Verify
ip neigh show 192.168.1.50
```

## Verify the Static Entry

```bash
# Show the entry
ip neigh show 192.168.1.50

# Output should show:
# 192.168.1.50 dev eth0 lladdr aa:bb:cc:dd:ee:ff PERMANENT
```

## Add Multiple Static Entries

```bash
ip neigh add 10.0.0.2 lladdr 00:11:22:33:44:55 dev eth0 nud permanent
ip neigh add 10.0.0.3 lladdr 00:11:22:33:44:66 dev eth0 nud permanent
ip neigh add 10.0.0.4 lladdr 00:11:22:33:44:77 dev eth0 nud permanent
```

## Replace an Existing ARP Entry

```bash
# Use 'replace' to update an existing entry or create it if not present
ip neigh replace 192.168.1.50 lladdr ff:ee:dd:cc:bb:aa dev eth0 nud permanent
```

## nud States for Manual Entries

```bash
# PERMANENT - never expires, never refreshed
ip neigh add 10.0.0.1 lladdr aa:bb:cc:dd:ee:ff dev eth0 nud permanent

# NOARP - valid entry without neighbor validation; unlike PERMANENT, it can expire
ip neigh add 10.0.0.1 lladdr aa:bb:cc:dd:ee:ff dev eth0 nud noarp
```

## Delete a Static ARP Entry

```bash
ip neigh del 192.168.1.50 dev eth0
```

## Make Static ARP Entries Persistent

`ip neigh add` changes are not persistent. Add to startup scripts or use systemd:

```bash
# /etc/rc.local (add before exit 0)
ip neigh add 192.168.1.50 lladdr aa:bb:cc:dd:ee:ff dev eth0 nud permanent
```

Or using a systemd service:

```bash
# Create a systemd service
cat > /etc/systemd/system/static-arp.service << 'EOF'
[Unit]
Description=Static ARP entries
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/ip neigh add 192.168.1.50 lladdr aa:bb:cc:dd:ee:ff dev eth0 nud permanent
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl enable --now static-arp.service
```

## Security Use Case: Prevent ARP Spoofing

```bash
# Add permanent ARP for the gateway to prevent ARP poisoning
ip neigh add 192.168.1.1 lladdr 00:1a:2b:3c:4d:5e dev eth0 nud permanent
```

## Conclusion

`ip neigh add <ip> lladdr <mac> dev <interface> nud permanent` creates a static ARP entry that never expires. Use `replace` to update existing entries. For persistence across reboots, create a systemd service or add to a startup script. Static ARP entries are a defense against ARP spoofing attacks.
