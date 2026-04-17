# How to Use Wireshark Coloring Rules for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, Coloring Rules, Packet Analysis, Display, Visualization

Description: A guide to creating and using Wireshark coloring rules to visually distinguish different types of IPv6 traffic in the packet list for faster analysis.

Wireshark coloring rules apply background and foreground colors to packets based on display filter expressions. Creating IPv6-specific coloring rules makes it immediately apparent which packets are IPv6, NDP, DHCPv6, or carry anomalies - without having to read each row carefully.

## Accessing Coloring Rules

1. Go to **View → Coloring Rules**
2. The dialog shows a list of rules applied top-to-bottom (first match wins)
3. Use the **+** button to add new rules
4. Drag rules to change their priority order

## Recommended IPv6 Coloring Rules

### Rule 1: IPv6 DAD (Duplicate Address Detection)

```wireshark
# Filter: DAD Neighbor Solicitations (source = ::)

icmpv6.type == 135 && ipv6.src == ::
# Color: Yellow background, black text
# Purpose: Immediately spot DAD probes
```

### Rule 2: Router Advertisements

```wireshark
# Filter: Router Advertisements
icmpv6.type == 134
# Color: Light blue background
# Purpose: Spot RA messages without filtering
```

### Rule 3: DHCPv6 Exchanges

```wireshark
# Filter: All DHCPv6 traffic
dhcpv6
# Color: Orange background, black text
# Purpose: Highlight address assignment traffic
```

### Rule 4: IPv6 Fragmented Packets

```wireshark
# Filter: IPv6 fragmented packets
ipv6.fraghdr
# Color: Purple background, white text
# Purpose: Instantly see fragmentation issues
```

### Rule 5: IPv6 ICMPv6 Errors

```wireshark
# Filter: ICMPv6 error messages (Destination Unreachable, etc.)
icmpv6.type == 1 || icmpv6.type == 2 || icmpv6.type == 3 || icmpv6.type == 4
# Color: Red background, white text
# Purpose: Flag error conditions immediately
```

### Rule 6: IPv6 Link-Local Traffic

```wireshark
# Filter: Link-local source or destination
ipv6.src == fe80::/10 || ipv6.dst == fe80::/10
# Color: Light green background
# Purpose: Distinguish link-local from global traffic
```

### Rule 7: General IPv6 (Global Unicast)

```wireshark
# Filter: Global unicast IPv6
ipv6 && ipv6.src == 2000::/3
# Color: Light grey background
# Purpose: Baseline coloring for all global IPv6 traffic
```

## Importing Coloring Rules

Save coloring rules to a file and share with your team:

```bash
# Export current coloring rules
# In Wireshark: View → Coloring Rules → Export
# Saves to a .colorfilters file

# The file format is plain text:
# @Rule Name@filter expression@[bg_r,bg_g,bg_b][fg_r,fg_g,fg_b]
# RGB values are 16-bit decimal (0-65535).
# Example:
# @IPv6 DAD@icmpv6.type == 135 && ipv6.src == ::@[65535,65535,0][0,0,0]
```

## Creating Coloring Rules via Command Line

```bash
# Wireshark stores coloring rules in ~/.config/wireshark/colorfilters
# Format: @name@filter@[bg_r,bg_g,bg_b][fg_r,fg_g,fg_b] with 16-bit decimal RGB values
cat >> ~/.config/wireshark/colorfilters << 'EOF'
@IPv6 DAD@icmpv6.type == 135 && ipv6.src == ::@[65535,65535,0][0,0,0]
@Router Advertisement@icmpv6.type == 134@[41120,50372,65535][0,0,0]
@DHCPv6@dhcpv6@[65535,52428,39321][0,0,0]
@IPv6 Fragmented@ipv6.fraghdr@[52428,26214,65535][65535,65535,65535]
@ICMPv6 Errors@icmpv6.type <= 4@[65535,0,0][65535,65535,65535]
EOF
```

## Temporary Coloring During Analysis

For ad-hoc analysis, use **View → Colorize Conversation** to temporarily color all packets in a conversation the same color:

1. Right-click any IPv6 packet
2. Select **Colorize Conversation → IPv6**
3. Choose a color
4. All packets in that IPv6 conversation are now colored

Clear temporary colorization: **View → Reset Colorization** or Ctrl+Space

## Using the Color Toolbar

Enable the **Colorize Packet List** button in the toolbar (the red/yellow/green circle icon) to toggle all coloring on/off quickly - useful when you need a clean view without color distractions.

Well-designed IPv6 coloring rules reduce analysis time significantly by making protocol categories, error conditions, and anomalies visible at a glance without requiring constant filter changes.
