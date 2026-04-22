# How to Monitor IPv6 Network Health with Smokeping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Smokeping, IPv6, Network Health, Latency, Packet Loss, Monitoring

Description: A guide to configuring Smokeping to probe IPv6 targets for latency and packet loss monitoring, providing long-term network health visualization.

Smokeping is a network latency measurement tool that graphs RTT and packet loss trends over time. It supports IPv6 targets natively through its `FPing6` probe, making it ideal for monitoring long-term IPv6 network health.

## Step 1: Install Smokeping and IPv6 Dependencies

```bash
# Install Smokeping and fping on Ubuntu/Debian

sudo apt update
sudo apt install smokeping fping

# Verify fping can send IPv6 probes
fping -6 -c 3 2001:4860:4860::8888
```

## Step 2: Configure Smokeping for IPv6 Targets

```perl
# /etc/smokeping/config.d/Probes - Probe configuration
# FPing6 probe for IPv6 ICMP probing

*** Probes ***

+ FPing
binary = /usr/bin/fping
# IPv4 probe settings
offset = 0%
step = 300
pings = 20

+ FPing6
binary = /usr/bin/fping6
# IPv6 probe settings
offset = 50%
step = 300
pings = 20
```

## Step 3: Define IPv6 Targets

```perl
# /etc/smokeping/config.d/Targets - Target configuration
*** Targets ***

probe = FPing6

# Root menu entry
menu = IPv6 Network Health
title = IPv6 Network Health Monitoring
alerts = ipv6-loss-alert,ipv6-latency-alert

+ GoogleDNS
menu = Google DNS
title = Google Public DNS IPv6

++ IPv6DNS1
host = 2001:4860:4860::8888
title = Google DNS 8888 (IPv6)
probe = FPing6

++ IPv6DNS2
host = 2001:4860:4860::8844
title = Google DNS 8844 (IPv6)
probe = FPing6

+ CloudflareDNS
menu = Cloudflare DNS
title = Cloudflare DNS IPv6

++ CF_DNS
host = 2606:4700:4700::1111
title = Cloudflare 1.1.1.1 IPv6
probe = FPing6

+ InternalServers
menu = Internal Servers
title = Internal IPv6 Infrastructure

# 2001:db8::/32 is reserved for documentation; replace with real internal IPv6 addresses.
++ WebServer01
host = 2001:db8::10
title = Web Server 01 IPv6
probe = FPing6

++ WebServer02
host = 2001:db8::11
title = Web Server 02 IPv6
probe = FPing6
```

## Step 4: Configure Smokeping Alerts for IPv6

```perl
# /etc/smokeping/config.d/Alerts - Alert configuration
*** Alerts ***

to = admin@example.com
from = smokeping@example.com

+ ipv6-loss-alert
type = loss
# Alert when packet loss transitions from 0% to above 20% for 3 consecutive measurements
pattern = ==0%,==0%,==0%,==0%,>20%,>20%,>20%
comment = IPv6 packet loss exceeded 20%

+ ipv6-latency-alert
type = rtt
# Alert when latency transitions from below 200ms to above 200ms for 5 consecutive measurements
pattern = <200,<200,<200,<200,>200,>200,>200,>200,>200
comment = IPv6 latency exceeded 200ms
```

## Step 5: Configure Smokeping Web Interface

```perl
# /etc/smokeping/config.d/General - General settings
*** General ***

owner = Network Operations
contact = noc@example.com
mailhost = localhost
sendmail = /usr/sbin/sendmail
imgcache = /var/cache/smokeping/images
imgurl = /smokeping/images
datadir = /var/lib/smokeping
piddir = /run/smokeping
cgiurl = http://your-server/smokeping/smokeping.cgi
smokemail = /etc/smokeping/smokemail
tmail = /etc/smokeping/tmail
syslogfacility = local0
```

## Step 6: Start Smokeping

```bash
# Validate configuration
sudo smokeping --check

# Start Smokeping daemon
sudo systemctl enable smokeping
sudo systemctl start smokeping

# Verify it's running and probing IPv6
sudo systemctl status smokeping
sudo journalctl -u smokeping -f
```

## Step 7: Access the IPv6 Dashboard

```bash
# Smokeping web interface (served by Apache/nginx)
# Default Debian/Ubuntu CGI URL: http://your-server/smokeping/smokeping.cgi
firefox "http://your-server/smokeping/smokeping.cgi?target=InternalServers.WebServer01"
```

## Common IPv6 Issues Caught by Smokeping

| Pattern | Likely Cause |
|---|---|
| Intermittent 100% loss | IPv6 routing loop or BGP instability |
| Gradual latency increase | IPv6 path change / suboptimal routing |
| Consistent partial loss | IPv6 QoS policy or rate limiting |
| Complete loss to one target | IPv6 firewall blocking ICMP or host down |

Smokeping's long-term RTT and loss graphing for IPv6 targets provides invaluable historical data for diagnosing transient IPv6 network degradation and demonstrating IPv6 vs IPv4 path quality differences.
