# How to Configure Collectd for IPv6 Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Collectd, IPv6, Metric, Monitoring, Linux, System Metrics

Description: A guide to configuring Collectd to collect IPv6 network statistics and send them to Graphite or other backends for visualization.

Collectd is a lightweight system statistics daemon widely used in network monitoring. Its `interface` and `ping` plugins can collect per-interface traffic statistics (covering both IPv4 and IPv6 traffic) and probe IPv6 targets respectively.

## Step 1: Configure Collectd for Interface Statistics

```xml
# /etc/collectd/collectd.conf - IPv6 metrics collection

Hostname "web-01.example.com"
BaseDir "/var/lib/collectd"
PIDFile "/var/run/collectd.pid"
Interval 10

# Load required plugins
LoadPlugin interface
LoadPlugin ping
LoadPlugin network
LoadPlugin logfile

# Interface plugin - collects per-interface stats (IPv4+IPv6 combined)
<Plugin interface>
    # Collect metrics from eth0 (includes both IPv4 and IPv6 traffic)
    Interface "eth0"
    Interface "eth1"
    # Exclude virtual/loopback interfaces
    IgnoreSelected false
</Plugin>
```

## Step 2: Configure the Ping Plugin for IPv6

```xml
# Ping plugin - ICMPv6 probes to IPv6 targets
<Plugin ping>
    # IPv6 target hosts
    Host "2001:4860:4860::8888"
    Host "2606:4700:4700::1111"
    Host "ipv6.google.com"

    # Ping settings
    Interval 60.0
    Timeout 0.9
    TTL 255

    # Source address (optional: force from specific IPv6 interface)
    # SourceAddress "2001:db8::10"
</Plugin>
```

## Step 3: Collect TCP Socket Statistics (including IPv6)

```xml
# tcpconns plugin - TCP connection counts including IPv6
LoadPlugin tcpconns
<Plugin tcpconns>
    # Count connections for these local service ports (IPv4 + IPv6)
    LocalPort "80"
    LocalPort "443"
    LocalPort "22"
</Plugin>
```

## Step 4: Send Metrics to Graphite/Carbon (with IPv6 Support)

```xml
# Write to a Graphite/Carbon server over IPv6
LoadPlugin write_graphite
<Plugin write_graphite>
    <Node "graphite-ipv6">
        # Connect to Graphite via IPv6
        Host "2001:db8::10"
        Port "2003"
        Prefix "collectd."
        Postfix ""
        SeparateInstances true
        StoreRates false
        AlwaysAppendDS false
    </Node>
</Plugin>
```

## Step 5: Send Metrics to an InfluxDB OSS v1 Collectd Listener over IPv6

```xml
# Network plugin - send collectd native packets over UDP
<Plugin network>
    # Send metrics to an InfluxDB OSS v1 collectd listener on IPv6
    <Server "2001:db8::20" "25826">
        SecurityLevel "None"
    </Server>
</Plugin>
```

## Step 6: Configure the Unixsock Plugin for Local Metric Queries

```xml
# unixsock plugin - query collectd locally
LoadPlugin unixsock
<Plugin unixsock>
    SocketFile "/var/run/collectd.sock"
    SocketGroup "www-data"
    SocketPerms "0660"
</Plugin>
```

## Step 7: Test the Configuration

```bash
# Test collectd config syntax
collectd -t -C /etc/collectd/collectd.conf

# Run collectd in foreground to see metrics
collectd -f -C /etc/collectd/collectd.conf 2>&1 | head -30

# Query collected metrics via unixsock
collectdctl -s /var/run/collectd.sock listval | grep -i interface

# Verify IPv6 ping metrics are being collected
collectdctl -s /var/run/collectd.sock getval "web-01.example.com/ping/ping-2001:4860:4860::8888"
```

## Step 8: Start Collectd

```bash
sudo systemctl enable collectd
sudo systemctl start collectd

# Verify it's collecting metrics
sudo systemctl status collectd
journalctl -u collectd -n 30
```

## Key IPv6 Metrics Collected

| Metric | Description |
|---|---|
| `interface/if_octets` | Bytes in/out per interface (all protocols) |
| `interface/if_packets` | Packets in/out per interface |
| `ping/ping-<ipv6-host>` | Round-trip time to IPv6 target |
| `ping/ping_stddev-<ipv6-host>` | RTT standard deviation |
| `ping/ping_droprate-<ipv6-host>` | Packet drop rate to IPv6 target |

Collectd's lightweight footprint and native IPv6 support make it an excellent choice for continuous IPv6 metrics collection in environments where a minimal agent overhead is required.
