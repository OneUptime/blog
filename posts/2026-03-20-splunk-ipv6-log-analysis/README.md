# How to Configure Splunk for IPv6 Log Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Splunk, Log Analysis, SIEM, Network Security

Description: Configure Splunk to receive IPv6 syslog data, extract IPv6 address fields, and build searches and dashboards for IPv6 traffic analysis and security monitoring.

## Introduction

Splunk can receive logs from IPv6-addressed sources via UDP/TCP syslog inputs, and its search language (SPL) supports regex extraction and comparison for IPv6 addresses. This guide covers Splunk Universal Forwarder IPv6 configuration, field extraction, and SPL queries for IPv6 analysis.

## Step 1: Configure Splunk Inputs for IPv6

```ini
# $SPLUNK_HOME/etc/system/local/inputs.conf

# Listen on IPv6 for syslog on port 514

[udp://514]
connection_host = dns
sourcetype = syslog
index = network
listenOnIPv6 = only
disabled = false

[tcp://514]
connection_host = dns
sourcetype = syslog
index = network
listenOnIPv6 = only
disabled = false

# Optional: accept only a specific IPv6 sender
# acceptFrom = 2001:db8::10
```

## Step 2: Configure Universal Forwarder to Send over IPv6

```ini
# $SPLUNK_HOME/etc/system/local/outputs.conf on the forwarder

[tcpout]
defaultGroup = indexers

[tcpout:indexers]
# Send to Splunk indexer via IPv6
server = [2001:db8::20]:9997
```

## Step 3: Field Extraction for IPv6 Addresses

```ini
# $SPLUNK_HOME/etc/system/local/transforms.conf

[extract-nginx-ipv6]
REGEX = ^(?<client_ip>[0-9a-fA-F:\.]+) - (?<user>\S+) \[(?<http_time>[^\]]+)\] "(?<http_method>\S+) (?<uri>\S+)
SOURCE_KEY = _raw
FORMAT = client_ip::$1 user::$2 http_time::$3 http_method::$4 uri::$5

[extract-sshd-ipv6]
REGEX = from (?<src_ip>[0-9a-fA-F:\.]{3,45}) port (?<src_port>\d+)
SOURCE_KEY = _raw
```

```ini
# props.conf
[source::/var/log/nginx/access.log]
REPORT-nginx = extract-nginx-ipv6

[syslog]
REPORT-sshd = extract-sshd-ipv6
```

## Step 4: SPL Queries for IPv6 Analysis

```splunk
# Find all events with IPv6 source addresses
index=network | regex client_ip="[0-9a-fA-F:]{3,39}:[0-9a-fA-F]{0,4}"

# Top IPv6 source IPs
index=network | regex client_ip=":"
| top client_ip limit=20

# IPv6 traffic volume over time
index=network | regex client_ip=":"
| timechart count span=1h by client_ip limit=10

# Find specific IPv6 subnet
index=network
| where cidrmatch("2001:db8::/32", client_ip)
| stats count by client_ip

# IPv6 vs IPv4 traffic split
index=network
| eval ip_version=if(match(client_ip, ":"), "IPv6", "IPv4")
| timechart count by ip_version

# Failed SSH logins from IPv6
index=os sourcetype=linux_secure "Failed password"
| rex "from (?<src_ip>[0-9a-fA-F:\.]+) port"
| where match(src_ip, ":")
| stats count by src_ip
| sort -count
| head 20
```

## Step 5: IPv6 Security Dashboard Searches

```splunk
# Brute force detection: IPv6 sources with > 10 failed logins in 5min
index=os sourcetype=linux_secure "Failed password"
| rex "from (?<src_ip>[0-9a-fA-F:\.]+) port"
| where match(src_ip, ":")
| bucket _time span=5m
| stats count by _time, src_ip
| where count > 10
| sort -count

# New IPv6 sources not seen in the previous 30 days
index=network earliest=-1h latest=now | regex client_ip=":"
| search NOT [
    search index=network earliest=-30d latest=-1h | regex client_ip=":"
    | stats count by client_ip
    | fields client_ip
]
| stats min(_time) as first_seen by client_ip

# IPv6 scanning behavior (many destination ports from one source)
index=firewall | regex src_ip=":"
| stats dc(dest_port) as unique_ports by src_ip
| where unique_ports > 50
| sort -unique_ports
```

## Step 6: IPv6 CIDR Lookup Table

Create `$SPLUNK_HOME/etc/apps/network/lookups/ipv6_subnets.csv`:

```csv
network,description,category
2001:db8::/32,Documentation prefix,documentation
fe80::/10,Link-local,link_local
fc00::/7,Unique local,ula
::1/128,Loopback,loopback
2001::/32,Teredo,tunnel
2002::/16,6to4,tunnel
```

```ini
# $SPLUNK_HOME/etc/apps/network/local/transforms.conf
[ipv6_subnets]
filename = ipv6_subnets.csv
match_type = CIDR(network)
```

```splunk
# Enrich logs with subnet information
index=network | lookup ipv6_subnets network as client_ip OUTPUT description category
```

## Conclusion

Splunk handles IPv6 log collection by enabling IPv6 on UDP/TCP syslog inputs and configuring Universal Forwarders to send to IPv6 indexers. Field extractions using REGEX transforms in `transforms.conf` pull IPv6 addresses from various log formats. SPL's `match()`, `where`, `regex`, and `cidrmatch()` commands and functions enable flexible IPv6 filtering, and `timechart` provides time-series analysis by IPv6 source. For subnet enrichment, CSV lookups can use `match_type = CIDR(...)` so IPv6 CIDR blocks map cleanly to descriptions and categories.
