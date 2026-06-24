# How to Configure IPv6 for DSL/PPPoE Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DSL, PPPoE, DSLAM, ISP, Prefix Delegation

Description: Configure IPv6 for DSL networks using PPPoEv6 with prefix delegation, including DSLAM configuration and subscriber address management.

## IPv6 Over PPPoE Architecture

PPPoE does not have a separate "PPPoEv6" variant; IPv6 runs over the PPP session using IPv6CP, and delegated prefixes are typically delivered with DHCPv6-PD. DSL subscribers typically receive:
- Link-local addresses on the PPP link
- Optionally, a global unicast /128 or routed /64 for the WAN side
- A /56 or /48 delegated prefix for the LAN

## PPPoE Server (BNG/BRAS) Configuration on Linux

Use `accel-ppp` as a PPPoE server with IPv6CP and DHCPv6-PD support:

```text
# /etc/accel-ppp.conf

[modules]
log_file
pppoe
auth_mschap_v2
radius
ipv6pool
ipv6_dhcp

[core]
thread-count=4

[ppp]
ipv4=require
ipv6=require

[pppoe]
interface=eth1    # DSL-facing interface
ipv6-pool-delegate=default

[ipv6-pool]
# Pool of /56 prefixes to delegate

delegate=2001:db8:1000::/40,56,name=default

[ipv6-dns]
dns=2001:db8:53::1
dns=2001:db8:53::2

[radius]
server=2001:db8:100::10,secret123
auth-port=1812
acct-port=1813
```

Enable IPv6 forwarding on the Linux server:

```bash
sysctl -w net.ipv6.conf.all.forwarding=1
```

Start accel-ppp:

```bash
accel-pppd -d -p /var/run/accel-ppp.pid -c /etc/accel-ppp.conf
```

## Customer Router (CPE) IPv6 Over PPPoE Configuration

On the customer router running OpenWrt:

```text
# /etc/config/network

config interface 'wan'
    option device   'eth0.2'
    option proto    'pppoe'
    option username 'user@isp.com'
    option password 'password'
    option ipv6     '1'

config interface 'wan6'
    option device   '@wan'
    option proto    'dhcpv6'
    option reqprefix '56'

config interface 'lan'
    option device   'br-lan'
    option proto    'static'
    option ip6assign '64'
```

## RADIUS for IPv6 Attribute Assignment

FreeRADIUS returns IPv6 prefix assignment for each subscriber:

```text
# /etc/freeradius/3.0/users
user@isp.com Cleartext-Password := "password"
    Framed-Protocol = PPP,
    Framed-IPv6-Prefix = "2001:db8:1234:12::/64",
    Delegated-IPv6-Prefix = "2001:db8:1234::/56"
```

## DSLAM IPv6 Configuration

On a Layer 2 DSLAM, IPv6 over PPPoE is normally forwarded transparently to the PPPoE server. Because DHCPv6-PD runs inside the PPP session, DHCPv6 snooping on the access bridge is not what enables prefix delegation. On Huawei access switches that support PPPoE+, the uplink toward the PPPoE server can be marked as trusted:

```text
! Huawei access switch / DSL aggregation example
pppoe intermediate-agent information enable

interface GigabitEthernet 0/0/0
  pppoe uplink-port trusted
```

## Monitoring IPv6 PPPoE Sessions

```bash
# On accel-ppp server: list active IPv6 sessions
accel-cmd show sessions ifname,username,ip6,ip6-dp,type

# Show specific session detail
accel-cmd show sessions ifname,username,ip6,ip6-dp,type match username '^user@isp\.com$'
```

## Common Issues

- **PPPoE session negotiates but no IPv6 address**: Check that RADIUS returns the correct IPv6 attributes and that the PPPoE server has IPv6 enabled with the appropriate pools configured.
- **Prefix delegation not working**: Ensure the CPE is requesting PD (check `reqprefix` option) and the server has PD pools available.
- **IPv6 connectivity but no DNS**: Verify the server is sending IPv6 DNS information via DHCPv6 and that the CPE is advertising those resolvers downstream.

## Conclusion

IPv6 on DSL/PPPoE networks uses PPP for session establishment, IPv6CP for IPv6 link negotiation, and DHCPv6-PD for prefix delegation. The `accel-ppp` server on Linux handles this cleanly with RADIUS integration for per-subscriber configuration. Verify RADIUS attribute support on your AAA server to ensure proper IPv6 prefix delivery.
