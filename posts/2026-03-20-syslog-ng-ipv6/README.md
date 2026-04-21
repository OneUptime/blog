# How to Configure syslog-ng for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Syslog-ng, Syslog, Log Management, Linux

Description: Configure syslog-ng to accept log messages from IPv6 sources, define IPv6-aware sources and destinations, and filter logs by IPv6 source address ranges.

## Introduction

syslog-ng is a flexible syslog daemon that supports IPv6 natively. Sources can bind to IPv6 interfaces, destinations can forward to IPv6 servers, and filters can match based on source IP address including IPv6 addresses. This guide covers IPv6 source/destination configuration and network address-based filtering.

## Step 1: Configure IPv6 Syslog Sources

```syslog-ng
# /etc/syslog-ng/syslog-ng.conf

@version: 4.8
@include "scl.conf"

options {
    use-dns(no);
    use-fqdn(no);
    keep-hostname(yes);
    chain-hostnames(no);
};

# Source: accept UDP syslog on all IPv6 interfaces

source s_ipv6_udp {
    network(
        ip("::")
        port(5140)
        transport("udp")
        ip-protocol(6)    # 6 = IPv6
        flags(syslog-protocol)
    );
};

# Source: accept TCP syslog on all IPv6 interfaces
source s_ipv6_tcp {
    network(
        ip("::")
        port(5140)
        transport("tcp")
        ip-protocol(6)
        max-connections(100)
    );
};

# Source: dual-stack (accept both IPv4 and IPv6)
source s_dualstack {
    network(
        ip("::")
        port(514)
        transport("udp")
        ip-protocol(6)     # :: with ip-protocol(6) accepts both on Linux
    );
};

# Local system logs
source s_local {
    system();
    internal();
};
```

## Step 2: IPv6 Destinations

```syslog-ng
# Forward to a remote syslog server over IPv6
destination d_remote_ipv6 {
    network(
        "2001:db8::20"
        port(514)
        transport("tcp")
        ip-protocol(6)
    );
};

# Forward to Elasticsearch via HTTP over IPv6
destination d_elasticsearch {
    http(
        url("http://[2001:db8::10]:9200/syslog-_log/_doc")
        method("POST")
        headers("Content-Type: application/json")
        body("$(format-json --scope everything)\n")
    );
};

# Write to file with IPv6-tagged filename
destination d_ipv6_file {
    file("/var/log/ipv6/${HOST}/messages.log"
        create-dirs(yes)
        owner("root") group("adm") perm(0640)
    );
};
```

## Step 3: Filters for IPv6 Source Addresses

```syslog-ng
# Filter: match messages from any IPv6 source
filter f_from_ipv6 {
    netmask6("::/1") or netmask6("8000::/1");
};

# Filter: match from specific IPv6 subnet
filter f_from_2001_db8 {
    netmask6("2001:db8::/32");
};

# Filter: match link-local sources
filter f_from_link_local {
    netmask6("fe80::/10");
};

# Filter: exclude loopback
filter f_not_loopback {
    not netmask6("::1/128");
};

# Filter: combine IPv6 subnet and severity
filter f_ipv6_errors {
    netmask6("2001:db8::/32") and level(err..emerg);
};
```

## Step 4: Log Paths with IPv6 Routing

```syslog-ng
# Route IPv6 traffic to dedicated file and remote forwarder
log {
    source(s_ipv6_udp);
    source(s_ipv6_tcp);
    filter(f_from_ipv6);
    filter(f_not_loopback);
    destination(d_ipv6_file);
    destination(d_remote_ipv6);
};

# Route errors from specific IPv6 subnet to Elasticsearch
log {
    source(s_ipv6_udp);
    filter(f_ipv6_errors);
    destination(d_elasticsearch);
    flags(flow-control);
};

# Local system logs
log {
    source(s_local);
    destination(d_ipv6_file);
};
```

## Step 5: Add IPv6 Metadata to Messages

```syslog-ng
# Rewrite rules to add IPv6 metadata
rewrite r_add_ip_version {
    set("ipv6" value("IP_VERSION") condition(filter(f_from_ipv6)));
    set("ipv4" value("IP_VERSION") condition(not filter(f_from_ipv6)));
};

log {
    source(s_ipv6_udp);
    rewrite(r_add_ip_version);
    destination(d_elasticsearch);
};
```

## Step 6: Test and Verify

```bash
# Test syslog-ng configuration
syslog-ng --syntax-only

# Send a test syslog message to IPv6 source
logger -n "::1" -P 5140 -d --rfc5424 "Test IPv6 syslog message"

# Or use netcat
echo "<13>1 2026-03-20T10:00:00Z testhost app - - - Test IPv6 message" | \
    nc -6 -u -w 1 ::1 5140

# Check syslog-ng stats for IPv6 sources
syslog-ng-ctl stats | grep s_ipv6
```

## Conclusion

syslog-ng supports IPv6 by setting `ip-protocol(6)` in network source and destination definitions and binding to `::` for all-interface listening. The `netmask6()` filter function enables subnet-based routing of log messages from IPv6 address ranges. Use this to separate internal (ULA, link-local) and external (global unicast) traffic into different log files or forwarding destinations.
