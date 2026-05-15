# How to Set Up PTP Hardware Timestamping on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PTP, Hardware Timestamping, Linuxptp, Networking

Description: Enable and verify PTP hardware timestamping on RHEL network interfaces to achieve nanosecond-level time accuracy using NIC hardware clocks.

---

Hardware timestamping records the exact time a PTP packet is sent or received at the NIC hardware level, reducing kernel and software delays in the timing measurement. This is a key requirement for sub-microsecond or nanosecond-scale accuracy with PTP on supported networks.

## Check NIC Hardware Timestamping Capabilities

```bash
# Install ethtool and linuxptp if not present

sudo dnf install -y ethtool linuxptp

# Query timestamping capabilities
ethtool -T enp1s0
```

Look for these capabilities in the output:

```text
Capabilities:
    hardware-transmit     (SOF_TIMESTAMPING_TX_HARDWARE)
    hardware-receive      (SOF_TIMESTAMPING_RX_HARDWARE)
    hardware-raw-clock    (SOF_TIMESTAMPING_RAW_HARDWARE)
PTP Hardware Clock: 0
```

If a non-negative `PTP Hardware Clock` value, such as `0` or higher, is shown, the NIC has a hardware clock (PHC).

## Verify the PTP Hardware Clock Device

```bash
# List PTP clock devices
ls /dev/ptp*

# Get details about the PTP clock
sudo cat /sys/class/ptp/ptp0/clock_name

# Check which NIC is associated with ptp0
ethtool -T enp1s0 | grep "PTP Hardware Clock"
```

## Configure ptp4l for Hardware Timestamping

Edit `/etc/ptp4l.conf`:

```ini
[global]
# Use hardware timestamping (not software)
time_stamping           hardware

# Clock servo parameters
step_threshold          1.0
first_step_threshold    0.00002
max_frequency           900000000

# Delay mechanism
delay_mechanism         E2E

# Logging
logging_level           6
summary_interval        1

[enp1s0]
```

## Start ptp4l with Hardware Timestamping

```bash
# Start ptp4l in slave mode with hardware timestamping
sudo ptp4l -H -s -f /etc/ptp4l.conf -m

# -H explicitly selects hardware timestamping
# -f reads the interface from the [enp1s0] section in /etc/ptp4l.conf
# -m prints messages to stdout for verification
```

## Sync the System Clock from the PHC

The system clock and the NIC hardware clock are independent. Use phc2sys to keep them in sync:

```bash
# Sync system clock (CLOCK_REALTIME) from NIC's PHC
sudo phc2sys -s enp1s0 -c CLOCK_REALTIME -w -m

# Monitor the offset - good hardware and a PTP-aware network can reach sub-microsecond accuracy
```

## Verify Hardware Timestamping is Active

```bash
# Check the ptp4l log for the selected PTP clock
journalctl -u ptp4l | grep -E "selected .* as PTP clock"
# Should show a selected PTP clock, for example: "selected /dev/ptp0 as PTP clock"

# Check master offset values
journalctl -u ptp4l -f
# With hardware timestamping, offsets are reported in nanoseconds and can converge to sub-microsecond values on a suitable network
```

## Compare with Software Timestamping

For reference, you can temporarily switch to software timestamping:

```bash
# Run with software timestamping to see the difference
sudo ptp4l -i enp1s0 -S -s -m
# Offsets are typically larger, often in the microsecond range
```

## Troubleshooting

```bash
# If hardware timestamping fails, check the driver
sudo dmesg | grep -i ptp

# Verify the NIC driver supports PTP
modinfo <driver_name> | grep -i ptp

# Check for IRQ coalescing (can hurt precision)
ethtool -c enp1s0
# Consider disabling coalescing if you need the lowest possible latency variation
sudo ethtool -C enp1s0 rx-usecs 0 tx-usecs 0
```

Hardware timestamping is the foundation of high-precision PTP. Without it, PTP accuracy typically degrades from sub-microsecond or nanosecond-scale accuracy to microseconds.
