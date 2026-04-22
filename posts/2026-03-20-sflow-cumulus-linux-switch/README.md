# How to Configure sFlow on a Cumulus Linux Switch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: sFlow, Cumulus Linux, Networking, Monitoring, IPv4, Hsflowd, Traffic Analysis

Description: Learn how to configure sFlow packet sampling on a Cumulus Linux switch using hsflowd to export traffic statistics to an sFlow collector over IPv4.

---

sFlow is a packet sampling protocol that provides visibility into network traffic flows at line rate. On Cumulus Linux, the `hsflowd` daemon handles sFlow configuration and exports sampled data to a remote collector.

## Installing hsflowd

```bash
# Install the Host sFlow daemon

sudo apt update && sudo apt install hsflowd -y

# Verify installation
hsflowd -v
```

## Basic hsflowd Configuration

```ini
# /etc/hsflowd.conf

sflow {
    # sFlow agent interface (the switch's management interface)
    agent = eth0

    # Sampling rate: 1 in N packets will be sampled
    # For a 10 Gbps link, 1:10000 is typical
    sampling = 10000

    # Polling interval for counters (seconds)
    polling = 30

    # Collector: send sFlow records to this IPv4:port
    collector {
        ip = 10.0.0.50
        udpport = 6343
    }
}
```

## Specifying Speed-Based Sampling Rates

Different interface speeds may need different sampling rates.

```ini
# /etc/hsflowd.conf

sflow {
    agent = eth0

    # Default sampling rate for speeds not listed below
    sampling = 10000
    polling = 30

    collector {
        ip = 10.0.0.50
        udpport = 6343
    }

    # Sampling rates based on interface speed
    sampling.1G = 1000
    sampling.10G = 10000
    sampling.100G = 100000
}
```

For a specific switch port override, configure the Cumulus switch port settings.

```ini
# /etc/cumulus/switchd.conf

interface.swp1.sflow.enable = TRUE
interface.swp1.sflow.sample_rate.ingress = 1000
interface.swp49.sflow.enable = TRUE
interface.swp49.sflow.sample_rate.ingress = 100000
```

## Enabling sFlow on Cumulus Switch Ports

```bash
# Apply switch port overrides if you changed /etc/cumulus/switchd.conf
sudo systemctl reload switchd.service

# Apply hsflowd configuration
sudo systemctl enable hsflowd
sudo systemctl start hsflowd

# Verify sFlow is running
sudo systemctl status hsflowd

# Check that hsflowd is sending to the collector
sudo ss -unp | grep hsflowd
sudo tcpdump -i eth0 -nn udp port 6343 -c 5   # Capture outgoing sFlow packets
```

## Verifying Data at the Collector

```bash
# Use sflowtool on the collector server (10.0.0.50) to view incoming sFlow
sudo apt install sflowtool -y
sflowtool -l -p 6343    # Listen on UDP 6343 and print decoded sFlow records

# Example output:
# FLOW,10.0.0.1,2,2,001122334455,0066778899aa,0x0800,0,0,10.1.1.1,10.2.2.2,6,0x00,64,443,80,0x10,1500,1500,10000
```

## Using ntopng to Visualize sFlow Data

```bash
# Install ntopng and its sFlow receiver (nprobe)
sudo apt install ntopng nprobe -y

# Configure nProbe to receive sFlow from the switch
nprobe -i none -n none --collector-port 6343 \
       --zmq "tcp://*:5556" \
       -T "@NTOPNG@"

# Start ntopng to visualize
ntopng -i tcp://127.0.0.1:5556
```

Access ntopng at `http://10.0.0.50:3000` for real-time per-interface and per-flow statistics.

## Key Takeaways

- `hsflowd` is the standard sFlow agent for Cumulus Linux; configure it via `/etc/hsflowd.conf`.
- Set the sampling rate based on link speed: 1:1000 for 1G, 1:10000 for 10G, 1:100000 for 100G.
- sFlow collectors listen on UDP port 6343 by default; use `sflowtool` to verify incoming records.
- Unlike NetFlow, which exports flow records, sFlow samples packets and counters without maintaining per-flow state on the switch.
