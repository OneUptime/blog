# How to Configure PTP (Precision Time Protocol) with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PTP, IEEE 1588, IPv6, Time Synchronization, Linuxptp, Network Precision

Description: Configure Precision Time Protocol (PTP/IEEE 1588) over IPv6 for sub-microsecond time synchronization in high-precision networks, using linuxptp tools.

---

PTP (Precision Time Protocol, IEEE 1588) achieves nanosecond-level time synchronization, far more precise than NTP. It's used in financial trading, industrial automation, and 5G networks. PTP supports IPv6 through the UDP/IPv6 transport mode.

## Understanding PTP Transport Modes

PTP supports three transport modes:
- **L2 (Ethernet)** - Direct Ethernet frames, no IP layer.
- **UDPv4** - PTP over UDP/IPv4.
- **UDPv6** - PTP over UDP/IPv6.

For IPv6 networks, use the UDPv6 transport mode.

## Installing linuxptp

```bash
# Ubuntu/Debian

sudo apt install linuxptp -y

# RHEL/CentOS/AlmaLinux
sudo dnf install linuxptp -y

# Verify installation
ptp4l --version
phc2sys --version
```

## Configuring ptp4l for IPv6 (Master Clock)

Create a PTP master configuration with IPv6 transport:

```bash
# /etc/ptp4l-master.conf

[global]
# Use UDP/IPv6 transport
network_transport     UDPv6

# Clock domain
domainNumber          0

# Hardware timestamping (preferred for accuracy)
# tx_timestamp_timeout  10

# Logging
logging_level         6
verbose               1
summary_interval      0

# Priority for master election (lower = higher priority)
priority1             128
priority2             128

[eth0]
# Interface to use for PTP
```

Start ptp4l in master mode:

```bash
# Start ptp4l as master on interface eth0 with IPv6 transport
sudo ptp4l -i eth0 \
  -f /etc/ptp4l-master.conf \
  --masterOnly 1 \
  --network_transport UDPv6 \
  --verbose

# Or run as a service
sudo systemctl start ptp4l
```

## Configuring ptp4l for IPv6 (Slave/Client)

```bash
# /etc/ptp4l-slave.conf

[global]
# Use UDP/IPv6 transport
network_transport     UDPv6

# Domain (must match master)
domainNumber          0

# Slave only mode
slaveOnly             1

# Logging
logging_level         6
verbose               1

[eth0]
# Interface to use for PTP
```

Start ptp4l in slave mode:

```bash
# Start ptp4l as slave
sudo ptp4l -i eth0 \
  -f /etc/ptp4l-slave.conf \
  --network_transport UDPv6 \
  --verbose

# Check PTP synchronization status
sudo pmc -u -b 0 'GET CURRENT_DATA_SET'
sudo pmc -u -b 0 'GET TIME_STATUS_NP'
```

## Setting Up phc2sys for System Clock Sync

After PTP hardware clock (PHC) is synchronized, sync the system clock:

```bash
# Sync system clock from PTP hardware clock
sudo phc2sys -s eth0 -c CLOCK_REALTIME -O 0 -w

# With logging
sudo phc2sys -s eth0 -c CLOCK_REALTIME -O 0 -w \
  --verbose --summary_interval 60

# Systemd service for phc2sys
sudo systemctl start phc2sys
```

## Verifying PTP over IPv6

```bash
# Check PTP traffic on IPv6
sudo tcpdump -i eth0 -n 'ip6 and (udp port 319 or udp port 320)'

# PTP uses:
# UDP port 319 for event messages (Sync, Delay_Req)
# UDP port 320 for general messages (Announce, Follow_Up)

# Check PTP status
sudo pmc -u -b 0 'GET PORT_DATA_SET'
sudo pmc -u -b 0 'GET PARENT_DATA_SET'

# View PTP clock offset
sudo ptp4l -i eth0 --network_transport UDPv6 -m 2>&1 | grep offset
```

## PTP Multicast Addresses for IPv6

PTP uses specific multicast addresses for IPv6:

```bash
# PTP primary multicast address for IPv6
FF0E::181    # PTP primary multicast (all PTP nodes; domain is set in the message header)
FF02::6B     # PTP peer delay multicast (link-local, used in P2P delay mechanism)

# Check if multicast is working
ip -6 maddr show eth0 | grep "FF0E"

# Join PTP IPv6 multicast group manually (usually done by ptp4l)
ip -6 maddr add FF0E::181 dev eth0
```

## systemd Service Configuration

```ini
# /etc/systemd/system/ptp4l.service
[Unit]
Description=Precision Time Protocol (PTP) service
After=network.target

[Service]
Type=simple
ExecStart=/usr/sbin/ptp4l \
  -i eth0 \
  --network_transport UDPv6 \
  --domainNumber 0 \
  --verbose \
  --summary_interval 60
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ptp4l
sudo systemctl status ptp4l
```

PTP over IPv6 provides nanosecond-precision time synchronization for demanding applications, and linuxptp's UDPv6 transport mode makes deploying high-accuracy time synchronization straightforward on IPv6 infrastructure.
