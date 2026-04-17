# How to Use Wireshark Coloring Rules to Highlight IPv4 Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, Coloring Rules, IPv4, Network Analysis, Troubleshooting

Description: Learn how to configure Wireshark coloring rules to visually highlight IPv4 errors, TCP problems, and network anomalies, making it easier to spot issues in packet captures at a glance.

## Why Coloring Rules Matter

In large packet captures with thousands of frames, finding problems manually is time-consuming. Wireshark's coloring rules automatically highlight packets based on filter expressions, so errors visually stand out - red for TCP problems, yellow for warnings, etc.

## Step 1: Access Coloring Rules

```text
In Wireshark:
View → Coloring Rules...

The Coloring Rules dialog shows:
- Rule name
- Filter expression
- Foreground/background color
- Order (rules apply top to bottom, first match wins)
```

## Step 2: Built-in Default Coloring Rules

```text
Wireshark ships with these default rules:

Bad TCP        → tcp.analysis.flags          (black on red)
HSRP State     → hsrp.state != 8 and hsrp.state != 16
Spanning Tree  → stp                          (green)
OSPF           → ospf                         (yellow)
ARP            → arp                          (green)
ICMP           → icmp                         (orange/cyan)
HTTP           → http || tcp.port == 80       (light green)
TCP RST        → tcp.flags.reset == 1         (red)
```

## Step 3: Create Custom Coloring Rules for IPv4 Errors

```text
To add a new rule:
1. Open Coloring Rules (View → Coloring Rules)
2. Click "+" or "New"
3. Enter name and filter expression
4. Click the foreground/background color buttons
5. Drag to reorder (top rules match first)
6. Click OK

Recommended rules for IPv4 troubleshooting:
```

```text
Rule: TCP Retransmission
Filter: tcp.analysis.retransmission
Background: #FF4444 (bright red)
Foreground: white
Meaning: Packet loss detected

Rule: TCP Zero Window
Filter: tcp.analysis.zero_window
Background: #FF8800 (orange)
Foreground: white
Meaning: Receiver buffer full

Rule: TCP Window Full
Filter: tcp.analysis.window_full
Background: #FFCC00 (yellow)
Foreground: black
Meaning: Sender held back by receiver window

Rule: TCP RST
Filter: tcp.flags.reset == 1
Background: #CC0000 (dark red)
Foreground: white
Meaning: Connection forcefully terminated

Rule: ICMP Unreachable
Filter: icmp.type == 3
Background: #FF6600 (dark orange)
Foreground: white
Meaning: Destination unreachable

Rule: DHCP Failure (NAck)
Filter: dhcp.option.dhcp == 6
Background: #FF0000 (red)
Foreground: white
Meaning: DHCP assignment denied
```

## Step 4: Export and Import Coloring Rules

```python
Export rules for sharing with team:
View → Coloring Rules → Export...
Save as: network-troubleshooting.colorfilters

Import rules from file:
View → Coloring Rules → Import...
Select: network-troubleshooting.colorfilters
```

```text
# Wireshark stores coloring rules in:

# Linux: ~/.config/wireshark/colorfilters
# macOS: ~/.config/wireshark/colorfilters
# Windows: %APPDATA%\Wireshark\colorfilters

# Example colorfilters file format:
@TCP Retransmission@tcp.analysis.retransmission@[63488,0,0][65535,65535,65535]
@TCP RST@tcp.flags.reset == 1@[52428,0,0][65535,65535,65535]
@Zero Window@tcp.analysis.zero_window@[65535,32896,0][65535,65535,65535]
```

## Step 5: Apply Temporary Color Rules with View → Colorize Conversation

```text
Quick temporary coloring (no rule needed):
1. Click on a packet from a specific host
2. View → Colorize Conversation → IP
   → Colors all packets from/to that IP

Or:
2. Right-click packet → Colorize Conversation → TCP
   → Colors all packets in that TCP stream

Colors assigned automatically (up to 10 conversations)
Clear with: View → Colorize Conversation → Reset Coloring
```

## Step 6: Combine Coloring with Other Analysis

```text
Scenario: Finding slow HTTP responses with color:

Rule: Slow HTTP Response
Filter: http.time > 1.0
Background: #FFFF00 (yellow)
Foreground: black
Meaning: HTTP response took more than 1 second

Rule: Failed HTTP
Filter: http.response.code >= 500
Background: #FF4444 (red)
Foreground: white
Meaning: HTTP server error

Rule: HTTP Success
Filter: http.response.code == 200
Background: #CCFFCC (light green)
Foreground: black
Meaning: Successful HTTP response
```

## Step 7: Useful IPv4 Coloring Rule Set

```text
Complete set for IPv4 network troubleshooting:

Priority 1 (Red - Critical):
  tcp.analysis.retransmission    → "TCP Retransmission"
  tcp.flags.reset == 1           → "TCP RST"
  icmp.type == 3                 → "ICMP Unreachable"
  dns.flags.rcode != 0           → "DNS Error"

Priority 2 (Orange - Warning):
  tcp.analysis.zero_window       → "Zero Window"
  tcp.analysis.window_full       → "Window Full"
  icmp.type == 11                → "TTL Exceeded (Loop)"
  dhcp.option.dhcp == 6         → "DHCP NAck"

Priority 3 (Yellow - Info):
  tcp.analysis.duplicate_ack     → "Duplicate ACK"
  tcp.analysis.out_of_order      → "Out of Order"
  arp.duplicate-address-detected → "ARP Conflict"

Priority 4 (Green - Normal):
  http.response.code == 200      → "HTTP OK"
  dns.flags.rcode == 0           → "DNS Success"
  tcp.flags.syn == 1 and tcp.flags.ack == 0 → "New Connection"
```

## Conclusion

Wireshark coloring rules transform packet analysis by making errors visually obvious. Configure critical rules for `tcp.analysis.retransmission` (red), `tcp.analysis.zero_window` (orange), and `tcp.flags.reset == 1` (dark red). Export rule sets with View → Coloring Rules → Export to share with team members. Use temporary `View → Colorize Conversation → IP` to quickly highlight traffic for a specific host. The combination of coloring rules and display filters lets you instantly spot IPv4 communication problems across thousands of packets.
