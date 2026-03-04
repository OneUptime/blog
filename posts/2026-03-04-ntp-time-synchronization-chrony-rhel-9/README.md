# How to Set Up NTP Time Synchronization with Chrony on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NTP, Chrony, Time Synchronization, Linux

Description: A practical guide to configuring NTP time synchronization with Chrony on RHEL, covering chrony.conf, chronyc commands, NTP pools, hardware timestamping, and monitoring.

---

Accurate time is not optional on modern servers. Kerberos authentication fails if clocks are off by more than five minutes. TLS certificate validation breaks with incorrect timestamps. Distributed databases like CockroachDB and Cassandra require tight clock synchronization to maintain consistency. RHEL uses Chrony as its default NTP implementation, and it's one of the best NTP clients available. This guide covers how to configure it properly.

## Why Chrony Over ntpd

Red Hat replaced ntpd with Chrony starting in RHEL 8, and for good reason:

- **Faster synchronization.** Chrony can sync the clock in minutes rather than the hours ntpd sometimes needs.
- **Better for intermittent connections.** Chrony handles laptops, VMs, and servers that don't have constant network access.
- **Lower resource usage.** Chrony uses less memory and CPU than ntpd.
- **Better accuracy.** Chrony achieves sub-millisecond accuracy on a local network with hardware timestamping.

## Installing and Enabling Chrony

Chrony comes installed by default on RHEL. If it's not there for some reason:

```bash
# Install chrony
sudo dnf install chrony -y

# Enable and start the chronyd service
sudo systemctl enable --now chronyd

# Verify it's running
systemctl status chronyd
```

Make sure the old ntpd is not running (it conflicts with chronyd):

```bash
# Check if ntpd is installed or running
rpm -q ntp
systemctl is-active ntpd

# If ntpd is running, stop and disable it
sudo systemctl disable --now ntpd
```

## Understanding chrony.conf

The main configuration file is `/etc/chrony.conf`. Let's walk through the important directives.

```bash
# View the default configuration
cat /etc/chrony.conf
```

Here's a well-commented configuration with the settings you'll most commonly adjust:

```bash
# Use Red Hat's NTP pool (default on RHEL)
# The "iburst" option sends 4 requests in quick succession at startup
# for faster initial synchronization
pool 2.rhel.pool.ntp.org iburst

# Or specify individual NTP servers (useful for internal servers)
# server ntp1.internal.example.com iburst
# server ntp2.internal.example.com iburst
# server ntp3.internal.example.com iburst

# Record the rate at which the system clock gains or loses time
# This file is used to compensate for drift when NTP is unavailable
driftfile /var/lib/chrony/drift

# Allow the system clock to be stepped (jumped) in the first three
# updates if the offset is larger than 1 second.
# After that, chrony will only slew (gradually adjust) the clock.
makestep 1.0 3

# Enable kernel synchronization of the real-time clock (RTC)
rtcsync

# Enable hardware timestamping on all interfaces that support it
# This significantly improves accuracy on supported hardware
hwtimestamp *

# Serve time to clients on the local network (optional)
# allow 192.168.1.0/24

# Specify the file for the authentication keys
keyfile /etc/chrony.keys

# Specify the directory for log files
logdir /var/log/chrony

# Select which information is logged
# log measurements statistics tracking
```

After editing the configuration, restart chronyd:

```bash
# Restart chrony to apply configuration changes
sudo systemctl restart chronyd
```

## Using Internal NTP Servers

In enterprise environments, you typically point servers at internal NTP servers rather than public pools. This reduces external dependencies and keeps your internal clocks consistent.

Edit `/etc/chrony.conf` and replace the pool line:

```bash
# Comment out the default pool
# pool 2.rhel.pool.ntp.org iburst

# Add your internal NTP servers
# The "prefer" option makes chrony favor this server over others
server ntp1.corp.example.com iburst prefer
server ntp2.corp.example.com iburst
server ntp3.corp.example.com iburst
```

If your internal NTP servers are also Chrony servers, you can set them up to serve time by adding to their configuration:

```bash
# On the NTP server: allow clients from this network
allow 10.0.0.0/8

# Serve time even when not synchronized to an external source
# (useful if this server has a GPS clock or other reference)
local stratum 10
```

## chronyc - The Chrony Command Line Client

`chronyc` is your primary tool for monitoring and managing Chrony at runtime.

### Checking NTP Sources

```bash
# Show current NTP sources and their status
chronyc sources

# Verbose output with column explanations
chronyc sources -v
```

The output columns mean:

| Column | Meaning |
|--------|---------|
| M | Mode: ^ = server, = = peer, # = local clock |
| S | State: * = current best, + = combined, - = not combined, ? = unreachable |
| Name | Source hostname or IP |
| Stratum | NTP stratum of the source |
| Poll | Polling interval (log2 seconds) |
| Reach | Reachability register (octal, 377 = all recent attempts succeeded) |
| LastRx | Seconds since last good sample |
| Last sample | Offset and margin of the last measurement |

### Checking Synchronization Status

```bash
# Show detailed tracking information
chronyc tracking
```

Key fields in the tracking output:

- **Reference ID** - The source currently being used
- **Stratum** - Our stratum (source stratum + 1)
- **System time** - Current offset from NTP time
- **Last offset** - Offset of the last clock update
- **RMS offset** - Long-term average of the offset
- **Frequency** - Rate at which the system clock gains/loses time
- **Root delay** - Total network delay to the stratum-1 source
- **Root dispersion** - Total dispersion to the stratum-1 source
- **Leap status** - Normal, insert second, delete second, or not synchronized

### Other Useful chronyc Commands

```bash
# Show statistics about each NTP source
chronyc sourcestats

# Show the current NTP clients (if this server serves time)
chronyc clients

# Force an immediate sync attempt
chronyc makestep

# Add a new NTP server at runtime (doesn't survive restart)
chronyc add server ntp4.example.com iburst

# Check if chrony thinks time is synchronized
chronyc waitsync 1 0 0 0
# Returns 0 if synchronized, 1 if not
```

## Hardware Timestamping

Hardware timestamping lets the network card apply timestamps to NTP packets at the hardware level, bypassing kernel and software delays. This can improve accuracy from milliseconds to microseconds on supported hardware.

```bash
# Check if your NIC supports hardware timestamping
ethtool -T eth0 | grep -i hardware
```

If supported, enable it in `/etc/chrony.conf`:

```bash
# Enable hardware timestamping on all interfaces
hwtimestamp *

# Or on a specific interface
# hwtimestamp eth0
```

Verify it's working:

```bash
# Check if hardware timestamping is active
chronyc sources -v
# Look for "HW" in the source mode column
```

Hardware timestamping is most useful in environments where microsecond-level accuracy matters, like financial trading systems or certain distributed databases.

## Monitoring Time Synchronization

### Quick Health Check

Here's a one-liner to check if time sync is healthy:

```bash
# Check NTP sync status via timedatectl
timedatectl show --property=NTPSynchronized --value
# Returns "yes" if synchronized
```

### Monitoring with chronyc

```bash
# Check the current offset (should be well under 1 second)
chronyc tracking | grep "System time"

# Verify sources are reachable (reach should be 377 for reliable sources)
chronyc sources | grep -E '^\^'
```

### Setting Up Log Monitoring

Enable Chrony logging for long-term monitoring:

```bash
# Add to /etc/chrony.conf
log measurements statistics tracking
logdir /var/log/chrony
```

```bash
# View the tracking log
cat /var/log/chrony/tracking.log

# Monitor real-time tracking changes
tail -f /var/log/chrony/tracking.log
```

## The makestep Directive

The `makestep` directive controls when Chrony is allowed to step (jump) the clock versus slewing (gradually adjusting) it:

```bash
makestep 1.0 3
```

This means: step the clock if the offset is larger than 1.0 seconds, but only during the first 3 clock updates after chronyd starts. After that, only slew.

Stepping the clock is necessary when the time is way off (like after a reboot), but it can cause problems for running applications that don't expect time to jump. The default `makestep 1.0 3` is a good compromise for most environments.

For environments where the clock should never be stepped after initial sync:

```bash
makestep 1.0 3
```

For environments that need to handle large time corrections at any point (VMs that might be paused/resumed):

```bash
makestep 1.0 -1
```

The `-1` means always allow stepping, regardless of how many updates have occurred.

## Firewall Configuration

If your RHEL server needs to serve NTP to other machines, open the NTP port:

```bash
# Allow NTP traffic through the firewall
sudo firewall-cmd --add-service=ntp --permanent
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-services
```

NTP uses UDP port 123.

## Troubleshooting

**Chrony shows "Not synchronised" after startup.** Give it a few minutes. Check `chronyc sources` to see if it's reaching the NTP servers. If the reach column is all zeros, you likely have a firewall or network issue.

**Large offset that won't correct.** If the offset is larger than the `makestep` threshold and you've exceeded the update limit, manually step the clock:

```bash
sudo chronyc makestep
```

**All sources show "?" state.** The sources are unreachable. Check DNS resolution, firewall rules, and network connectivity:

```bash
# Test connectivity to the NTP server
ping pool.ntp.org

# Check if UDP 123 is open
sudo ss -ulnp | grep 123
```

**Clock drifts when VM is paused and resumed.** Use `makestep 1.0 -1` in chrony.conf to allow stepping at any time.

## Wrapping Up

Chrony is a solid NTP implementation that works well out of the box on RHEL. For most setups, the default configuration with the Red Hat NTP pool is sufficient. If you're running an enterprise environment, point Chrony at internal NTP servers, enable hardware timestamping where supported, and monitor the sync status as part of your standard health checks. Accurate time is one of those things you don't think about until it breaks something, so set it up right from the start and let it run.
