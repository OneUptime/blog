# How to Configure Zeek (Bro) for IPv6 Network Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Zeek, Bro, IPv6, Network Analysis, Security Monitoring, NSM, Linux

Description: Configure Zeek (formerly Bro) network security monitor to analyze IPv6 traffic, generate logs for IPv6 connections, and detect anomalies in IPv6 network behavior.

---

Zeek (formerly known as Bro) is a powerful network analysis framework that generates structured logs from network traffic. It has full IPv6 support and provides detailed visibility into IPv6 connections, protocols, and security events.

## Installing Zeek

```bash
# Ubuntu/Debian

sudo apt install zeek -y

# Or from the Zeek project repository
echo 'deb http://download.opensuse.org/repositories/security:/zeek/xUbuntu_22.04/ /' \
  | sudo tee /etc/apt/sources.list.d/zeek.list
curl -fsSL https://download.opensuse.org/repositories/security:/zeek/xUbuntu_22.04/Release.key \
  | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/zeek.gpg > /dev/null
sudo apt update && sudo apt install zeek -y

# Check version
zeek --version
```

## Configuring Zeek for IPv6

```bash
# /opt/zeek/etc/node.cfg
[zeek]
type=standalone
host=localhost
interface=eth0

# For multiple interfaces
# [zeek1]
# type=worker
# host=localhost
# interface=eth0
# [manager]
# type=manager
# host=localhost
```

```bash
# /opt/zeek/etc/networks.cfg
# Define local IPv6 networks
10.0.0.0/8       Private subnet
192.168.0.0/16   Private subnet
172.16.0.0/12    Private subnet
2001:db8::/32    Documentation IPv6 (replace with your range)
fd00::/8         ULA IPv6 addresses
fe80::/10        Link-local IPv6
```

## IPv6-Specific Zeek Scripts

```zeek
# /opt/zeek/share/zeek/site/ipv6-monitor.zeek

# Track IPv6 connection statistics
module IPv6Monitor;

export {
  redef enum Log::ID += { LOG };

  type Info: record {
    ts:         time   &log;
    src_ip:     addr   &log;
    dst_ip:     addr   &log;
    proto:      string &log;
    is_ipv6:    bool   &log;
  };
}

event zeek_init() &priority=5
{
  Log::create_stream(IPv6Monitor::LOG, [$columns=Info, $path="ipv6_monitor"]);
}

event connection_established(c: connection)
{
  if (is_v6_addr(c$id$orig_h)) {
    local info: Info = [
      $ts = network_time(),
      $src_ip = c$id$orig_h,
      $dst_ip = c$id$resp_h,
      $proto = cat(c$id$resp_p),
      $is_ipv6 = T
    ];
    Log::write(IPv6Monitor::LOG, info);
  }
}
```

```bash
# Load custom script
echo "@load site/ipv6-monitor" >> /opt/zeek/share/zeek/site/local.zeek
```

## ICMPv6 Analysis with Zeek

```zeek
# /opt/zeek/share/zeek/site/icmpv6-monitor.zeek

module ICMPv6Monitor;

export {
  redef enum Notice::Type += {
    Router_Advertisement_Flood,
  };
}

# Detect ICMPv6 Router Advertisement storms
global ra_count: table[addr] of count &create_expire=10secs;

event icmp_router_advertisement(c: connection, info: icmp_info, \
                                  cur_hop_limit: count, managed: bool, \
                                  other: bool, home_agent: bool, pref: count, \
                                  proxy: bool, rsv: count, \
                                  router_lifetime: interval, \
                                  reachable_time: interval, \
                                  retrans_timer: interval, \
                                  options: icmp6_nd_options)
{
  local src = c$id$orig_h;
  if (src !in ra_count)
    ra_count[src] = 0;

  ++ra_count[src];
  if (ra_count[src] > 10)
    NOTICE([$note=ICMPv6Monitor::Router_Advertisement_Flood,
            $src=src,
            $msg=fmt("Router Advertisement flood from %s", src)]);
}
```

## Running and Managing Zeek

```bash
# Deploy Zeek
sudo zeekctl deploy

# Check status
sudo zeekctl status

# View logs
ls /opt/zeek/logs/current/
# conn.log, http.log, dns.log, ssl.log, notice.log

# Filter IPv6 connections
cat /opt/zeek/logs/current/conn.log | zeek-cut id.orig_h id.resp_h proto | \
  awk '$1 ~ /:/' | head -20

# IPv6 DNS queries
cat /opt/zeek/logs/current/dns.log | zeek-cut id.orig_h query qtype_name | \
  awk '$3 == "AAAA"'
```

## Detecting IPv6 Anomalies

```bash
# Find IPv6 addresses making many connections
cat /opt/zeek/logs/current/conn.log | zeek-cut id.orig_h | \
  awk '/:/' | sort | uniq -c | sort -rn | head -10

# Find unusual IPv6 protocol usage
cat /opt/zeek/logs/current/conn.log | zeek-cut id.orig_h proto service | \
  awk '/:/' | sort | uniq -c | sort -rn

# Identify IPv6 tunneling
cat /opt/zeek/logs/current/tunnel.log 2>/dev/null | head -20
```

Zeek's structured logging approach provides rich visibility into IPv6 traffic patterns, with the `conn.log` file capturing all IPv6 connections and the scripting language enabling custom detection logic tailored to your IPv6 network topology and threat model.
