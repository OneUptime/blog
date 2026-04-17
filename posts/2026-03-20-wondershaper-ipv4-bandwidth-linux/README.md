# How to Use wondershaper to Limit IPv4 Bandwidth on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wondershaper, IPv4, Linux, Bandwidth, QoS, Traffic Shaping

Description: Install and use wondershaper to quickly apply download and upload bandwidth limits with interactive traffic prioritization on a Linux network interface.

Wondershaper is a simple bash script that wraps tc commands to apply bandwidth limiting with automatic VoIP/interactive traffic prioritization. It is ideal for quick bandwidth shaping without deep tc expertise.

## Installation

```bash
# Install from package manager (Ubuntu/Debian)

sudo apt install wondershaper -y

# Or install from source for the latest version
git clone https://github.com/magnific0/wondershaper.git
cd wondershaper
sudo make install
```

## Basic Usage

```bash
# Syntax: wondershaper [-a adapter] [-d download_kbps] [-u upload_kbps]
# Rates are in kilobits per second (kbps)

# Limit eth0 to 10 Mbps download and 5 Mbps upload
sudo wondershaper -a eth0 -d 10240 -u 5120

# Limit to 1 Mbps (simulating a slow connection)
sudo wondershaper -a eth0 -d 1024 -u 512

# Limit a WireGuard interface
sudo wondershaper -a wg0 -d 20480 -u 10240
```

## What Wondershaper Does Internally

Wondershaper applies a tc HTB qdisc with several classes:

- **High priority**: Interactive traffic (ACKs, DNS, SSH, small packets)
- **Normal**: Standard web traffic
- **Bulk**: Large transfers (prioritized last)

You can inspect the rules it creates:

```bash
# After applying wondershaper, view the tc rules
sudo tc qdisc show dev eth0
sudo tc class show dev eth0
sudo tc filter show dev eth0
```

## Removing Bandwidth Limits

```bash
# Clear all wondershaper limits on an interface
sudo wondershaper -c -a eth0
```

## Checking Status

```bash
# View current wondershaper status
sudo wondershaper -s -a eth0
# or inspect the underlying tc qdisc directly
sudo tc -s qdisc show dev eth0
```

## Persisting Wondershaper Settings

Wondershaper settings don't survive reboots. Add them to a systemd service:

```ini
# /etc/systemd/system/wondershaper.service
[Unit]
Description=Wondershaper bandwidth limiter
After=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/sbin/wondershaper -a eth0 -d 10240 -u 5120
ExecStop=/usr/sbin/wondershaper -c -a eth0

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable wondershaper
sudo systemctl start wondershaper
```

Or use the conf file shipped with the magnific0 package together with the bundled `wondershaper.service` (which runs `wondershaper -p`):

```conf
# /etc/systemd/wondershaper.conf
[wondershaper]
# Interface to shape
IFACE="eth0"
# Download in Kbps
DSPEED="10240"
# Upload in Kbps
USPEED="5120"
```

## Testing the Bandwidth Limit

```bash
# Apply a 5 Mbps limit
sudo wondershaper -a eth0 -d 5120 -u 2048

# Test download speed (should max out near 5 Mbps)
wget -O /dev/null http://speedtest.wdc01.softlayer.com/downloads/test10.zip

# Or with speedtest-cli
speedtest --simple
```

Wondershaper is excellent for quick bandwidth tests, simulating constrained environments, or applying simple limits without configuring tc directly.
