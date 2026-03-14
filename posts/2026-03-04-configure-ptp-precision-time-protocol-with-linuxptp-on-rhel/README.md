# How to Configure PTP (Precision Time Protocol) with linuxptp on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PTP, Linuxptp, Time Synchronization, Networking

Description: Set up PTP time synchronization on RHEL using the linuxptp package to achieve sub-microsecond clock accuracy for applications requiring precise timing.

---

PTP (IEEE 1588) provides far more accurate time synchronization than NTP, achieving sub-microsecond precision. The linuxptp package on RHEL implements PTP with hardware timestamping support.

## Install linuxptp

```bash
# Install the linuxptp package
sudo dnf install -y linuxptp

# Verify installation
ptp4l -v
```

## Check Hardware Timestamping Support

PTP works best with NICs that support hardware timestamping:

```bash
# Check if your NIC supports hardware timestamping
ethtool -T enp1s0

# Look for "hardware-transmit" and "hardware-receive" in the output
# If both are listed, your NIC supports hardware timestamping
```

## Configure ptp4l

Edit the PTP configuration file:

```bash
sudo vi /etc/ptp4l.conf
```

Key settings for a PTP slave (client) configuration:

```ini
[global]
# Use hardware timestamping
time_stamping           hardware

# Logging settings
logging_level           6
verbose                 1

# Clock servo settings
step_threshold          1.0
first_step_threshold    0.00002

# Transport mode
network_transport       UDPv4

[enp1s0]
# Specify the network interface
```

## Run ptp4l as a Slave

```bash
# Run ptp4l in slave mode on a specific interface
sudo ptp4l -i enp1s0 -s -f /etc/ptp4l.conf

# -i specifies the interface
# -s runs in slave-only mode
# -f specifies the config file
```

## Run ptp4l as a Grandmaster (Master)

On the reference clock server:

```bash
# Run as grandmaster clock
sudo ptp4l -i enp1s0 -f /etc/ptp4l.conf -m
```

## Synchronize the System Clock with phc2sys

ptp4l synchronizes the NIC hardware clock. Use phc2sys to sync the system clock:

```bash
# Sync system clock from the PTP hardware clock
sudo phc2sys -s enp1s0 -c CLOCK_REALTIME -w

# -s source (PTP hardware clock on enp1s0)
# -c target (system clock)
# -w waits for ptp4l to sync first
```

## Enable as systemd Services

```bash
# Enable and start ptp4l
sudo systemctl enable --now ptp4l

# Enable and start phc2sys
sudo systemctl enable --now phc2sys
```

## Verify Synchronization

```bash
# Check ptp4l status through the management client
sudo pmc -u -b 0 'GET CURRENT_DATA_SET'

# Check the offset from the master
journalctl -u ptp4l -f
# Look for "master offset" values - should be under 100 nanoseconds with hardware timestamping
```

## Firewall Rules

```bash
# PTP uses UDP ports 319 and 320
sudo firewall-cmd --permanent --add-port=319/udp
sudo firewall-cmd --permanent --add-port=320/udp
sudo firewall-cmd --reload
```

PTP with linuxptp gives RHEL systems nanosecond-level time accuracy, essential for financial trading, telecom, and industrial control systems.
