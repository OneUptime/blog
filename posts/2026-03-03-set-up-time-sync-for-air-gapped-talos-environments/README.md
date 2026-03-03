# How to Set Up Time Sync for Air-Gapped Talos Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Air-Gapped, Time Synchronization, NTP, Kubernetes, Security, Infrastructure

Description: Learn how to configure reliable time synchronization for Talos Linux clusters in air-gapped environments where public NTP servers are not accessible.

---

Air-gapped environments present unique challenges for time synchronization. By definition, these networks have no connectivity to the public internet, which means public NTP pools like time.cloudflare.com or pool.ntp.org are off the table. Yet accurate time is just as critical - perhaps more so - in air-gapped clusters, because these environments often run sensitive workloads where log integrity, certificate validity, and audit trails are non-negotiable.

This guide covers the complete setup of time synchronization infrastructure for Talos Linux clusters in air-gapped networks.

## The Air-Gap Time Sync Challenge

In a normal Talos deployment, nodes sync their clocks to public NTP servers over the internet. In an air-gapped environment, you need to:

1. Provide an internal NTP server that Talos nodes can reach
2. Give that NTP server a reliable time reference
3. Configure Talos to use the internal server instead of public pools
4. Handle the case where the NTP server itself might fail

The key question is: where does the internal NTP server get its time from, if not from the internet?

## Option 1: GPS-Based Time Reference

The gold standard for air-gapped time synchronization is a GPS receiver. GPS satellites broadcast highly accurate time signals that do not require internet connectivity. A GPS receiver connected to your NTP server provides stratum 1 accuracy.

### Setting Up a GPS-Synced NTP Server

You need a server (physical or VM) that has a GPS receiver attached. Common options include USB GPS receivers with PPS (Pulse Per Second) output.

```bash
# On your internal NTP server (a standard Linux machine)
# Install chrony and gpsd
apt-get install chrony gpsd gpsd-clients

# Configure gpsd for the GPS receiver
# /etc/default/gpsd
DEVICES="/dev/ttyUSB0"
GPSD_OPTIONS="-n"

# Configure chrony to use GPS as a reference
# /etc/chrony/chrony.conf

# GPS reference clock via shared memory
refclock SHM 0 refid GPS precision 1e-1 offset 0.0 delay 0.2
refclock SHM 1 refid PPS precision 1e-9

# Allow clients on the local network
allow 10.0.0.0/8
allow 192.168.0.0/16

# Serve time even when GPS is temporarily unavailable
local stratum 3 orphan

# Log statistics
logdir /var/log/chrony
log tracking measurements statistics
```

### Configuring Talos to Use the GPS NTP Server

Once your GPS-synced NTP server is running, point Talos nodes to it:

```yaml
machine:
  time:
    disabled: false
    servers:
      - 10.0.1.50   # GPS-synced NTP server
      - 10.0.1.51   # Backup NTP server
```

Apply to your nodes:

```bash
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "replace",
    "path": "/machine/time",
    "value": {
      "disabled": false,
      "servers": [
        "10.0.1.50",
        "10.0.1.51"
      ]
    }
  }
]'
```

## Option 2: Rubidium or OCXO Oscillator

For environments where GPS signals are not available (underground facilities, heavily shielded rooms), a high-stability oscillator can serve as the time reference. Rubidium atomic clocks and oven-controlled crystal oscillators (OCXO) can maintain accurate time for extended periods without an external reference.

These devices connect to your NTP server and provide a stable frequency reference:

```bash
# /etc/chrony/chrony.conf for OCXO/rubidium reference

# Local hardware clock as reference
refclock PHC /dev/ptp0 poll 0 precision 1e-7

# Or use the system's RTC as a reference
# (less accurate but works without special hardware)
refclock RTC precision 1e-3

# Allow network clients
allow 10.0.0.0/8

local stratum 4 orphan
```

## Option 3: Manual Time Set with NTP Distribution

In the simplest air-gapped scenario, you manually set the time on one server and distribute it via NTP to the rest of the network. This is the least accurate option but requires no special hardware.

```bash
# On the NTP server
# Manually set the time (do this periodically or during maintenance windows)
date -s "2026-03-03 12:00:00"
hwclock --systohc

# /etc/chrony/chrony.conf
# No upstream servers - this is the time authority
local stratum 5 orphan

# Allow clients
allow 10.0.0.0/8
allow 192.168.0.0/16

# Drift file helps maintain accuracy between manual corrections
driftfile /var/lib/chrony/drift
```

Then configure Talos nodes to use this server:

```yaml
machine:
  time:
    servers:
      - 10.0.1.50
```

## Building Redundant NTP Infrastructure

For production air-gapped environments, a single NTP server is a single point of failure. Build redundancy:

```text
GPS Receiver 1 --> NTP Server A (10.0.1.50)
GPS Receiver 2 --> NTP Server B (10.0.1.51)
                                              --> Talos Nodes
NTP Server A  <-- Cross-peers --> NTP Server B
```

Configure the NTP servers to peer with each other:

```bash
# /etc/chrony/chrony.conf on NTP Server A

# GPS reference
refclock SHM 0 refid GPS precision 1e-1

# Peer with Server B
peer 10.0.1.51

# Allow clients
allow 10.0.0.0/8
local stratum 3 orphan
```

```bash
# /etc/chrony/chrony.conf on NTP Server B

# GPS reference
refclock SHM 0 refid GPS precision 1e-1

# Peer with Server A
peer 10.0.1.50

# Allow clients
allow 10.0.0.0/8
local stratum 3 orphan
```

Then configure Talos to use both:

```yaml
machine:
  time:
    servers:
      - 10.0.1.50
      - 10.0.1.51
```

## Configuring Talos for Air-Gapped NTP

Here is a complete machine configuration snippet for air-gapped time sync:

```yaml
machine:
  time:
    disabled: false
    servers:
      - 10.0.1.50    # Primary NTP server
      - 10.0.1.51    # Secondary NTP server
  # Make sure DNS points to internal resolvers
  # (or use IP addresses for NTP servers to avoid DNS dependency)
  network:
    nameservers:
      - 10.0.1.10    # Internal DNS
      - 10.0.1.11
```

Apply across all cluster nodes:

```bash
#!/bin/bash
# configure-airgap-ntp.sh

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"

for node in $NODES; do
  echo "Configuring $node..."
  talosctl -n "$node" patch machineconfig -p '[
    {
      "op": "replace",
      "path": "/machine/time",
      "value": {
        "disabled": false,
        "servers": [
          "10.0.1.50",
          "10.0.1.51"
        ]
      }
    }
  ]'
done

# Verify sync status
echo ""
echo "Verifying time sync..."
for node in $NODES; do
  echo "=== $node ==="
  talosctl -n "$node" get timestatus
done
```

## Monitoring Time Sync in Air-Gapped Environments

Monitoring is even more important in air-gapped environments because you cannot easily reach external references to detect drift:

```bash
#!/bin/bash
# airgap-time-monitor.sh

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"
NTP_SERVERS="10.0.1.50 10.0.1.51"

echo "=== NTP Server Health ==="
for server in $NTP_SERVERS; do
  if nc -zvu "$server" 123 2>&1 | grep -q "open"; then
    echo "$server: Reachable"
  else
    echo "$server: UNREACHABLE"
  fi
done

echo ""
echo "=== Node Sync Status ==="
for node in $NODES; do
  synced=$(talosctl -n "$node" get timestatus -o yaml 2>/dev/null | \
    grep "synced:" | awk '{print $2}')
  echo "$node: synced=$synced"
done

echo ""
echo "=== Time Comparison ==="
for node in $NODES; do
  time_out=$(talosctl -n "$node" time 2>/dev/null)
  echo "$node: $time_out"
done
```

## Handling NTP Server Maintenance

In air-gapped environments, NTP server maintenance needs careful planning:

1. **Never take both NTP servers offline at the same time** - Always maintain at least one operational server.

2. **Verify sync after maintenance** - After bringing an NTP server back, confirm it has the correct time before clients reconnect.

3. **Monitor drift during outages** - If one NTP server is down, the remaining server should keep nodes synced. Monitor closely during this period.

```bash
# Before maintenance on NTP Server A
# Verify Server B is healthy
chronyc tracking  # Run on Server B

# After maintenance on Server A
# Verify Server A has correct time
chronyc tracking  # Run on Server A

# Then verify all Talos nodes are synced
for node in $NODES; do
  talosctl -n "$node" get timestatus
done
```

## Leap Second Handling

In air-gapped environments, leap second announcements need special attention. GPS receivers handle this automatically, but if you are using manual time setting, you need to apply leap seconds yourself:

```bash
# Download leap second file before air-gapping
# https://www.ietf.org/timezones/data/leap-seconds.list

# Copy to your NTP servers
# Configure chrony to use it
# /etc/chrony/chrony.conf
leapsectz right/UTC
```

## Testing Your Air-Gapped NTP Setup

Before going live, test failure scenarios:

```bash
# Test 1: Disconnect one NTP server
# Verify nodes continue syncing to the other

# Test 2: Restart the time service on a node
talosctl -n 192.168.1.10 service timed restart
talosctl -n 192.168.1.10 get timestatus

# Test 3: Verify drift over time
# Record node times at intervals and check for drift
for i in 1 2 3; do
  echo "Check $i at $(date -u):"
  talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 time
  sleep 3600  # Wait an hour
done
```

Setting up time sync for air-gapped Talos environments requires more upfront planning than internet-connected clusters, but the principles are the same: provide reliable time sources, configure Talos to use them, build in redundancy, and monitor continuously. With GPS-based references and redundant NTP servers, your air-gapped cluster can achieve the same time accuracy as any internet-connected deployment.
