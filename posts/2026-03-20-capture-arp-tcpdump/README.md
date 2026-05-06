# How to Capture ARP Packets with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, tcpdump, Packet Capture

Description: Learn how to capture and filter ARP packets using tcpdump to diagnose ARP issues and detect anomalies.

## Basic ARP Capture

```bash
# Capture all ARP packets on auto-selected interface

sudo tcpdump -n -e arp

# Specify an interface
sudo tcpdump -n -e -i eth0 arp

# Capture with verbose packet details
sudo tcpdump -n -e -v -i eth0 arp
```

Sample output:

```text
14:32:01.123 aa:bb:cc:dd:ee:01 > ff:ff:ff:ff:ff:ff, ethertype ARP (0x0806), length 42:
  Request who-has 192.168.1.20 tell 192.168.1.10, length 28

14:32:01.125 00:11:22:33:44:55 > aa:bb:cc:dd:ee:01, ethertype ARP (0x0806), length 60:
  Reply 192.168.1.20 is-at 00:11:22:33:44:55, length 46
```

## Filtering ARP Packet Types

ARP packets contain an opcode at offset 6 (2 bytes):

```bash
# Capture only ARP Requests (opcode = 1)
sudo tcpdump -n -e -i eth0 'arp[6:2] = 1'

# Capture only ARP Replies (opcode = 2)
sudo tcpdump -n -e -i eth0 'arp[6:2] = 2'
```

## Filtering by IP Address

```bash
# Capture ARP involving a specific IP
sudo tcpdump -n -e -i eth0 'arp and (arp[14:4] = 0xc0a80114 or arp[24:4] = 0xc0a80114)'
# 0xc0a80114 = 192.168.1.20 in hex
```

A simpler approach is to capture all ARP and grep:

```bash
sudo tcpdump -n -e -l arp 2>&1 | grep "192.168.1.20"
```

## Saving ARP Captures to File

```bash
# Write to pcap file
sudo tcpdump -i eth0 -w /tmp/arp_capture.pcap arp

# Read back the capture
sudo tcpdump -n -e -r /tmp/arp_capture.pcap arp

# Read with verbose detail
sudo tcpdump -n -e -v -r /tmp/arp_capture.pcap
```

## Detecting Gratuitous ARP

A common gratuitous ARP form is an ARP Request where the sender IP and target IP are the same. For Ethernet/IPv4 ARP, filter requests where Sender IP (offset 14) = Target IP (offset 24):

```bash
sudo tcpdump -n -e -i eth0 'arp[6:2] = 1 and arp[14:4] = arp[24:4]'
```

## Monitoring ARP Activity in Real Time

```bash
# Count ARP activity by IP in real time
sudo tcpdump -n -l arp 2>/dev/null | awk '
/Request/ {
    gsub(/,/, "", $7)
    count[$5]++
    count[$7]++
    printf("%7d %s\n%7d %s\n\n", count[$5], $5, count[$7], $7)
}
/Reply/ {
    count[$4]++
    printf("%7d %s\n\n", count[$4], $4)
}'
```

## Detecting ARP Anomalies

```bash
#!/bin/bash
# Monitor ARP requests and alert
echo "Monitoring ARP on eth0..."
sudo tcpdump -n -l -i eth0 arp 2>/dev/null | while IFS= read -r line; do
    if echo "$line" | grep -q "Request"; then
        IP=$(echo "$line" | awk '{print $5}')
        FROM=$(echo "$line" | awk '{gsub(/,/, "", $7); print $7}')
        echo "[ARP REQUEST] $(date +%H:%M:%S) $FROM asked for $IP"
    fi
done
```

## ARP Offset Reference

For Ethernet/IPv4 ARP packets:

| Offset | Length | Field |
|--------|--------|-------|
| 0 | 2 | Hardware type |
| 2 | 2 | Protocol type |
| 4 | 1 | Hardware addr length |
| 5 | 1 | Protocol addr length |
| 6 | 2 | Operation (1=request, 2=reply) |
| 8 | 6 | Sender MAC |
| 14 | 4 | Sender IP |
| 18 | 6 | Target MAC |
| 24 | 4 | Target IP |

## Key Takeaways

- `tcpdump -n -e arp` captures all ARP with MAC addresses shown.
- Use `arp[6:2] = 1` for requests and `arp[6:2] = 2` for replies.
- Save captures to pcap files for offline analysis with Wireshark.
- For Ethernet/IPv4 ARP, offset 6 contains the opcode; offset 14 and 24 are sender/target IPs.

**Related Reading:**

- [How to Analyze ARP Traffic with Wireshark](https://oneuptime.com/blog/post/2026-03-20-analyze-arp-wireshark/view)
- [How to Detect ARP Spoofing Attacks on Your Network](https://oneuptime.com/blog/post/2026-03-20-arp-spoofing-detection-scapy-ipv4/view)
- [How to Troubleshoot ARP Resolution Failures](https://oneuptime.com/blog/post/2026-03-20-troubleshoot-arp-resolution/view)
