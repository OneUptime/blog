# How to Set Up PTP Hardware Timestamping on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PTP, Hardware Timestamping, Linuxptp, Networking

Description: Enable and verify PTP hardware timestamping on RHEL network interfaces to achieve nanosecond-level time accuracy using NIC hardware clocks.

---

Hardware timestamping records the exact time a PTP packet is sent or received at the NIC hardware level, removing kernel and software delays from the timing measurement. This is the key to achieving nanosecond-level accuracy with PTP.

## Check NIC Hardware Timestamping Capabilities

```bash
# Install ethtool if not present
sudo dnf install -y ethtool

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

If `PTP Hardware Clock: 0` or higher is shown, the NIC has a hardware clock (PHC).

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
sudo ptp4l -i enp1s0 -H -s -f /etc/ptp4l.conf -m

# -H explicitly selects hardware timestamping
# -m prints messages to stdout for verification
```

## Sync the System Clock from the PHC

The system clock and the NIC hardware clock are independent. Use phc2sys to keep them in sync:

```bash
# Sync system clock (CLOCK_REALTIME) from NIC's PHC
sudo phc2sys -s enp1s0 -c CLOCK_REALTIME -w -m

# Monitor the offset - should be under 100ns with good hardware
```

## Verify Hardware Timestamping is Active

```bash
# Check the ptp4l log for hardware timestamp confirmation
journalctl -u ptp4l | grep "time stamping"
# Should show: "selected /dev/ptp0 as PTP clock"

# Check master offset values
journalctl -u ptp4l -f
# With hardware timestamping, offsets should be under 100 nanoseconds
```

## Compare with Software Timestamping

For reference, you can temporarily switch to software timestamping:

```bash
# Run with software timestamping to see the difference
sudo ptp4l -i enp1s0 -S -s -m
# Offsets will be in the microsecond range instead of nanosecond
```

## Troubleshooting

```bash
# If hardware timestamping fails, check the driver
sudo dmesg | grep -i ptp

# Verify the NIC driver supports PTP
modinfo <driver_name> | grep ptp

# Check for IRQ coalescing (can hurt precision)
ethtool -c enp1s0
# Disable coalescing for best results
sudo ethtool -C enp1s0 rx-usecs 0 tx-usecs 0
```

Hardware timestamping is the foundation of high-precision PTP. Without it, PTP accuracy degrades from nanoseconds to microseconds.
