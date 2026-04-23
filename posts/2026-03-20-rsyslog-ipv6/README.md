# How to Configure rsyslog for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Rsyslog, Syslog, Linux, Log Management

Description: Configure rsyslog to accept log messages from IPv6 sources, forward logs to IPv6 servers, and use RainerScript to filter and route IPv6 log traffic.

## Introduction

rsyslog is the default syslog daemon on many Linux distributions including RHEL, Ubuntu, and Debian. It supports IPv6 input/output through its `imudp`, `imtcp`, and `omfwd` modules. This guide covers module configuration, IPv6 forwarding, and RainerScript-based filtering.

## Step 1: Enable IPv6 UDP and TCP Input

```ini
# /etc/rsyslog.conf or /etc/rsyslog.d/10-ipv6.conf

# Load input modules

module(load="imudp")
module(load="imtcp")

# UDP input - listen on IPv6 loopback
input(type="imudp"
      address="::1"
      port="514"
      name="udp-loopback")

# UDP input - all interfaces (IPv4 and IPv6)
input(type="imudp"
      port="5140"
      name="udp-all")

# TCP input - all IPv6 interfaces
input(type="imtcp"
      address="::"
      port="5140"
      name="tcp-ipv6")
```

## Step 2: Forward Logs to IPv6 Destinations

```ini
# Forward all logs to a remote server over IPv6 using UDP
*.* action(type="omfwd"
           Target="2001:db8::20"
           Port="514"
           Protocol="udp")

# Forward to remote server over IPv6 TCP with retries
*.* action(type="omfwd"
           Target="2001:db8::20"
           Port="514"
           Protocol="tcp"
           action.resumeRetryCount="-1"
           queue.type="linkedList"
           queue.size="10000"
           queue.filename="remote_ipv6_queue"
           queue.saveOnShutdown="on")

# Forward to Elasticsearch using omelasticsearch
module(load="omelasticsearch")
template(name="daily-syslog-index" type="string"
         string="syslog-%$year%.%$month%.%$day%")
*.* action(type="omelasticsearch"
           server="[2001:db8::10]"
           serverport="9200"
           template="RSYSLOG_StdJSONFmt"
           searchIndex="daily-syslog-index"
           dynSearchIndex="on"
           searchType="")
```

## Step 3: Define Custom Templates

```ini
# JSON template for structured logging
template(name="ipv6-json" type="list") {
    constant(value="{")
    constant(value="\"timestamp\":\"")   property(name="timereported" dateFormat="rfc3339")
    constant(value="\",\"host\":\"")     property(name="hostname" format="json")
    constant(value="\",\"program\":\"")  property(name="programname" format="json")
    constant(value="\",\"message\":\"")  property(name="msg" format="json")
    constant(value="\",\"fromhost\":\"") property(name="fromhost-ip" format="json")
    constant(value="\"}\n")
}

# Use template for file output
*.* action(type="omfile"
           file="/var/log/ipv6-syslog.json"
           template="ipv6-json")
```

## Step 4: Filter by IPv6 Source Address

```ini
# RainerScript: route messages from specific IPv6 subnet
if is_in_subnet($fromhost-ip, "2001:db8::/32") then {
    action(type="omfile" file="/var/log/remote/2001-db8.log")
    stop
}

# Route link-local IPv6 sources
if is_in_subnet($fromhost-ip, "fe80::/10") then {
    action(type="omfile" file="/var/log/remote/link-local.log")
    stop
}

# Discard loopback
if ($fromhost-ip == "::1") then {
    stop
}

# Route all IPv6 sources (contains colon) to dedicated log
if ($fromhost-ip contains ":") then {
    action(type="omfile" file="/var/log/remote/ipv6-all.log"
           template="ipv6-json")
}
```

## Step 5: IPv6 Source with TLS

```ini
# TLS certificate defaults for input and forwarding
global(
  DefaultNetstreamDriverCAFile="/etc/ssl/ca.pem"
  DefaultNetstreamDriverCertFile="/etc/ssl/rsyslog.pem"
  DefaultNetstreamDriverKeyFile="/etc/ssl/rsyslog.key"
)

input(type="imtcp"
      port="6514"
      address="::"
      name="tls-ipv6"
      StreamDriver.Name="gtls"
      StreamDriver.Mode="1"
      StreamDriver.AuthMode="x509/name"
      PermittedPeer="client.example.net")

# TLS forwarding to IPv6 server
*.* action(type="omfwd"
           Target="2001:db8::20"
           Port="6514"
           Protocol="tcp"
           StreamDriver="gtls"
           StreamDriverMode="1"
           StreamDriverAuthMode="x509/name"
           StreamDriverPermittedPeers="logs.example.net")
```

## Step 6: Verify and Test

```bash
# Test rsyslog config syntax
rsyslogd -N1

# Send test message to IPv6 UDP listener
logger --server ::1 --port 5140 --udp "Test IPv6 rsyslog message"

# Monitor incoming messages
tail -f /var/log/remote/ipv6-all.log

# Enable periodic rsyslog statistics in rsyslog.conf
# module(load="impstats" interval="60" severity="7")
# Stats appear as rsyslogd-pstats messages in syslog or in the configured logFile
```

## Conclusion

rsyslog supports IPv6 through its `imudp` and `imtcp` modules by specifying `address="::"` for IPv6 all-interface binding, and `omfwd` for forwarding to IPv6 destinations. RainerScript's `$fromhost-ip` property enables subnet-based routing using `is_in_subnet()` or simpler IPv6 checks with `contains`. For production deployments, combine IPv6 TCP forwarding with TLS and X.509 peer authentication using the `gtls` StreamDriver to secure log transport between rsyslog instances.
