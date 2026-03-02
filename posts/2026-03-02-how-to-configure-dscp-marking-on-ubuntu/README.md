# How to Configure DSCP Marking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, QoS, Linux

Description: Configure DSCP (Differentiated Services Code Point) packet marking on Ubuntu using iptables and tc to enable end-to-end QoS across your network infrastructure.

---

DSCP (Differentiated Services Code Point) is a 6-bit field in the IP header's ToS (Type of Service) byte that marks packets with a priority level. Network devices - routers, switches, and Linux tc - can read this mark and apply different handling (queuing, rate limiting, or dropping policies) based on the DSCP value. This enables end-to-end Quality of Service across a network without per-flow state in intermediate devices.

## Understanding DSCP Values

DSCP uses 6 bits, giving 64 possible values. The most commonly used are:

| Class | DSCP Name | Binary | Decimal | Hex | ToS byte |
|-------|-----------|--------|---------|-----|----------|
| Best Effort | BE (CS0) | 000000 | 0 | 0x00 | 0x00 |
| Expedited Forwarding | EF | 101110 | 46 | 0x2e | 0xb8 |
| Assured Forwarding 11 | AF11 | 001010 | 10 | 0x0a | 0x28 |
| Assured Forwarding 21 | AF21 | 010010 | 18 | 0x12 | 0x48 |
| Assured Forwarding 31 | AF31 | 011010 | 26 | 0x1a | 0x68 |
| Assured Forwarding 41 | AF41 | 100010 | 34 | 0x22 | 0x88 |
| Class Selector 6 | CS6 | 110000 | 48 | 0x30 | 0xc0 |

The ToS byte value is DSCP shifted left by 2 bits (the lower 2 bits are ECN).

## Checking Current DSCP Markings

```bash
# Capture packets and display DSCP values
sudo apt install tcpdump -y

# Show TOS field for all traffic on eth0
sudo tcpdump -i eth0 -n -v ip 2>/dev/null | grep -i tos

# More detailed: show DSCP in decimal
sudo tcpdump -i eth0 -n '(ip)' -v 2>/dev/null | awk '/tos/ {print}'

# Use tshark for cleaner output
sudo apt install tshark -y
sudo tshark -i eth0 -T fields -e ip.dsfield.dscp -e ip.src -e ip.dst -e tcp.dstport
```

## Marking Packets with iptables

`iptables` can set DSCP values on outgoing packets using the `DSCP` target in the `mangle` table.

```bash
# Mark all SSH traffic as EF (Expedited Forwarding, value 46)
sudo iptables -t mangle -A OUTPUT \
    -p tcp --dport 22 \
    -j DSCP --set-dscp 46

# Mark HTTP traffic as AF21 (Assured Forwarding, value 18)
sudo iptables -t mangle -A OUTPUT \
    -p tcp --dport 80 \
    -j DSCP --set-dscp 18

sudo iptables -t mangle -A OUTPUT \
    -p tcp --dport 443 \
    -j DSCP --set-dscp 18

# Mark DNS as CS6 (Network control class)
sudo iptables -t mangle -A OUTPUT \
    -p udp --dport 53 \
    -j DSCP --set-dscp 48

# Mark database traffic as AF31
sudo iptables -t mangle -A OUTPUT \
    -p tcp --dport 5432 \
    -j DSCP --set-dscp 26

# Mark backup traffic as Best Effort (clear any marking)
sudo iptables -t mangle -A OUTPUT \
    -p tcp --dport 873 \
    -j DSCP --set-dscp 0

# View the rules you have set
sudo iptables -t mangle -L OUTPUT -n -v
```

## Using --set-dscp-class for Readable Syntax

iptables supports named DSCP classes instead of raw numbers.

```bash
# Use class names instead of numeric values
sudo iptables -t mangle -A OUTPUT \
    -p tcp --dport 22 \
    -j DSCP --set-dscp-class ef

sudo iptables -t mangle -A OUTPUT \
    -p tcp --dport 80 \
    -j DSCP --set-dscp-class af21

sudo iptables -t mangle -A OUTPUT \
    -p tcp --dport 443 \
    -j DSCP --set-dscp-class af21

sudo iptables -t mangle -A OUTPUT \
    -p tcp --dport 5432 \
    -j DSCP --set-dscp-class af31

# Available classes: cs0-cs7, af11, af12, af13, af21, af22, af23, af31, af32, af33, af41, af42, af43, ef
```

## Marking Forwarded Traffic (Router Use Case)

For a Linux machine acting as a router, mark packets in the FORWARD chain.

```bash
# Mark forwarded VoIP traffic (RTP, typically UDP 16384-32767)
sudo iptables -t mangle -A FORWARD \
    -p udp --dport 16384:32767 \
    -j DSCP --set-dscp-class ef

# Mark bulk traffic from a specific host
sudo iptables -t mangle -A FORWARD \
    -s 10.0.0.50 \
    -j DSCP --set-dscp-class be

# Mark by interface (e.g., all traffic from the guest WiFi interface)
sudo iptables -t mangle -A FORWARD \
    -i wlan1 \
    -j DSCP --set-dscp 0
```

## Marking with tc (Traffic Control)

You can also apply DSCP marks using tc filters with the `skbedit` action.

```bash
# Mark packets matching a tc filter with DSCP EF (priority 0xb8 in ToS)
tc filter add dev eth0 parent 1: protocol ip prio 1 u32 \
    match ip dport 22 0xffff \
    action skbedit priority 0x6
    # action dsmark - alternative for DSCP marking

# Using the dsmark qdisc (dedicated DSCP marking qdisc)
tc qdisc add dev eth0 root handle 1: dsmark \
    indices 64 \
    default_index 0

tc filter add dev eth0 parent 1: protocol ip prio 1 u32 \
    match ip dport 22 0xffff \
    classid 1:46

# Set DSCP value for classid 1:46 (EF = 46)
tc class change dev eth0 parent 1: classid 1:46 dsmark \
    value 0xb8 mask 0x03
```

## Acting on DSCP Marks with tc Filters

Once packets are marked (either by iptables or by the sender), tc can route them to HTB classes based on the DSCP value.

```bash
IFACE=eth0

# Set up HTB with classes
tc qdisc add dev $IFACE root handle 1: htb default 30
tc class add dev $IFACE parent 1: classid 1:1 htb rate 100mbit
tc class add dev $IFACE parent 1:1 classid 1:10 htb rate 20mbit ceil 100mbit prio 0
tc class add dev $IFACE parent 1:1 classid 1:20 htb rate 50mbit ceil 100mbit prio 1
tc class add dev $IFACE parent 1:1 classid 1:30 htb rate 20mbit ceil 80mbit prio 2

tc qdisc add dev $IFACE parent 1:10 handle 10: fq_codel
tc qdisc add dev $IFACE parent 1:20 handle 20: fq_codel
tc qdisc add dev $IFACE parent 1:30 handle 30: fq_codel

# Now add filters that match DSCP values and route to HTB classes

# EF (0xb8 in ToS byte, mask 0xfc ignores the ECN bits) -> high priority
tc filter add dev $IFACE parent 1: protocol ip prio 1 u32 \
    match ip tos 0xb8 0xfc flowid 1:10

# AF31 (0x68 in ToS) -> medium priority
tc filter add dev $IFACE parent 1: protocol ip prio 2 u32 \
    match ip tos 0x68 0xfc flowid 1:20

# AF21 (0x48 in ToS) -> normal web traffic
tc filter add dev $IFACE parent 1: protocol ip prio 3 u32 \
    match ip tos 0x48 0xfc flowid 1:20

# BE / unmarked -> best effort
# (handled by HTB default 30)
```

## Making DSCP Rules Persistent

```bash
# Save iptables rules
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
# Rules saved to /etc/iptables/rules.v4 and rules.v6

# Verify they will be restored on boot
sudo systemctl status netfilter-persistent
```

## Verifying DSCP Marking Works

```bash
# Generate traffic and capture to verify DSCP values are being set

# Terminal 1: capture and show DSCP values
sudo tcpdump -i eth0 -n -v '(tcp port 22)' 2>/dev/null | grep tos

# Terminal 2: generate SSH traffic
ssh user@remote-server 'echo test'

# You should see the TOS value in the captured packets
# For EF, TOS should be 0xb8 = 184

# Or use ping with explicit DSCP marking
ping -Q 0xb8 remote-server  # -Q sets the TOS byte
```

## Stripping DSCP Marks (Trust Boundary)

At network trust boundaries, you may want to clear DSCP marks from external traffic before it enters your network.

```bash
# Clear all DSCP marks from incoming traffic on the external interface
# This prevents external parties from claiming high priority
sudo iptables -t mangle -A PREROUTING \
    -i eth0 \
    -j DSCP --set-dscp 0

# Then re-mark based on your own classification logic
# in subsequent rules
```

DSCP marking is most powerful when both your Linux hosts and your network equipment (switches, routers) are configured to respect and act on DSCP values. Even if the intermediate network does not honor DSCP, marking packets on the host provides a reliable classification signal for local tc-based queuing and rate limiting.
