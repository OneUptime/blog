# How to Interpret ICMP Redirect Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMP, Networking, Routing, IPv4, Security, Linux

Description: Understand how ICMP Redirect messages work to optimize routing paths, when they are legitimate, and how to disable them for security reasons.

## Introduction

ICMP Redirect (Type 5) is sent by a router to a host when it determines that the host is using a suboptimal path. The message tells the host "use this other gateway instead of me for this destination." While useful for automatic path optimization, ICMP Redirects can be exploited for man-in-the-middle attacks and are often disabled in security-conscious environments.

## ICMP Type 5 Codes

| Code | Name | Meaning |
|---|---|---|
| 0 | Redirect for Network | Use another gateway for this network |
| 1 | Redirect for Host | Use another gateway for this specific host |
| 2 | Redirect for ToS and Network | Redirect based on service type + network |
| 3 | Redirect for ToS and Host | Redirect based on service type + host |

## When ICMP Redirect Is Generated

```text
Host (192.168.1.10) sends packet to Router A (192.168.1.1)
Router A sees: "I can reach 10.20.0.5 via Router B (192.168.1.2)"
Router A sends: ICMP Redirect to Host, saying "use 192.168.1.2 for 10.20.0.5"
Host updates its routing information to use Router B directly
```

## Observing ICMP Redirects

```bash
# Capture ICMP redirect messages

tcpdump -i eth0 -n -v 'icmp[0] = 5'

# Example output:
# IP 192.168.1.1 > 192.168.1.10: ICMP redirect 10.20.0.5 to host 192.168.1.2
# -> Router 192.168.1.1 is telling our host to use 192.168.1.2 for 10.20.0.5
```

## Linux Response to ICMP Redirects

```bash
# Check if Linux accepts ICMP redirects
# (enabled by default on hosts, disabled when IPv4 forwarding is enabled)
sysctl net.ipv4.conf.all.accept_redirects
sysctl net.ipv4.conf.eth0.accept_redirects

# Show the route Linux will currently use for a destination
ip route get 10.20.0.5

# Compare `ip route get` output before and after a redirect on modern Linux.
# The IPv4 route cache was removed in Linux 3.6, so `ip route show cache`
# will not show IPv4 redirect entries on current kernels.
```

## Security: Disabling ICMP Redirects

ICMP redirects can be exploited to redirect traffic through an attacker-controlled router:

```bash
# Disable accepting ICMP redirects on all interfaces
sysctl -w net.ipv4.conf.all.accept_redirects=0
sysctl -w net.ipv4.conf.default.accept_redirects=0

# On a router: also disable sending redirects
sysctl -w net.ipv4.conf.all.send_redirects=0
sysctl -w net.ipv4.conf.default.send_redirects=0

# Make permanent
cat >> /etc/sysctl.conf << EOF
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.default.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
net.ipv4.conf.default.send_redirects=0
EOF
sysctl -p
```

## When Redirects Are Legitimate

ICMP redirects are beneficial in simple networks where hosts have a single default gateway but multiple routers exist on the same subnet. However, in most modern enterprise and cloud networks:

1. ICMP redirects are often disabled on routers as a hardening measure
2. Dynamic routing protocols handle path optimization instead
3. Host routing tables are configured correctly from the start

## Conclusion

ICMP Redirects are a legacy mechanism for dynamically optimizing host routing. While they work correctly in simple topologies, they represent a security risk in multi-tenant or public networks. Disable redirect acceptance on servers and disable redirect sending on routers as a security hardening measure. Use proper routing protocol configuration or static routes for path optimization instead.
