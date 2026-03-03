# How to Configure PTP (Precision Time Protocol) on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, PTP, Precision Time Protocol, Time Synchronization, Kubernetes, Infrastructure

Description: A guide to configuring Precision Time Protocol on Talos Linux for sub-microsecond time synchronization accuracy in demanding environments.

---

NTP is good enough for most Kubernetes clusters, delivering synchronization accuracy in the low millisecond range. But some workloads demand better. Financial trading systems, telecommunications infrastructure, scientific computing, and industrial control systems all need sub-microsecond time accuracy. That is where PTP (Precision Time Protocol, IEEE 1588) comes in.

PTP achieves its superior accuracy by using hardware timestamping at the network interface level, eliminating the jitter introduced by the software stack. Configuring PTP on Talos Linux requires a few specific steps, but the result is time synchronization that is orders of magnitude more precise than NTP.

## Understanding PTP vs NTP

Before diving into configuration, it helps to understand the fundamental differences:

| Feature | NTP | PTP |
|---------|-----|-----|
| Typical accuracy | 1-10 ms | 10-100 ns |
| Timestamping | Software | Hardware |
| Network support | Any IP network | Requires PTP-aware switches (for best results) |
| Complexity | Simple | Higher |
| Standard | RFC 5905 | IEEE 1588 |

NTP timestamps packets in software, which means the time between when the packet arrives at the NIC and when the timestamp is recorded includes variable delays from interrupt handling, kernel scheduling, and buffer management. PTP moves the timestamping to the network interface hardware, eliminating these sources of jitter.

## Prerequisites for PTP on Talos

PTP requires hardware support. Before proceeding, verify:

1. **Network interface card** - The NIC must support hardware timestamping. Most modern server-grade NICs (Intel i210, i350, X710, Mellanox ConnectX series) support this.

2. **Network infrastructure** - For the best PTP accuracy, your network switches should be PTP-aware (boundary clocks or transparent clocks). Without PTP-aware switches, you can still get good results, but accuracy will be limited by switch queuing delay.

3. **PTP grandmaster** - You need a PTP time source (grandmaster clock) on your network. This could be a GPS-synchronized PTP appliance or a server with a GPS receiver acting as a grandmaster.

## Installing PTP Support on Talos

PTP support on Talos Linux comes through system extensions. You need the `ptp` extension which includes `ptp4l` (the PTP daemon) and `phc2sys` (which synchronizes the system clock to the PTP hardware clock):

```yaml
# Machine configuration with PTP extension
machine:
  install:
    image: ghcr.io/siderolabs/installer:v1.7.0
    extensions:
      - image: ghcr.io/siderolabs/ptp:latest
```

For existing clusters, add the extension through an upgrade:

```bash
# Upgrade with PTP extension included
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<schematic-with-ptp>:v1.7.0
```

## Configuring ptp4l

The `ptp4l` daemon handles the PTP protocol - communicating with the grandmaster, measuring delay, and disciplining the NIC's hardware clock:

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/ptp:latest
  files:
    - content: |
        [global]
        # Clock servo parameters
        twoStepFlag 1
        socket_priority 0
        priority1 128
        priority2 128
        domainNumber 0
        clockClass 248
        clockAccuracy 0xFE
        offsetScaledLogVariance 0xFFFF
        free_running 0
        freq_est_interval 1
        dscp_event 0
        dscp_general 0
        dataset_comparison G.8275.x
        G.8275.defaultDS.localPriority 128
        maxStepsRemoved 255
        logAnnounceInterval 1
        logSyncInterval 0
        logMinDelayReqInterval 0
        logMinPdelayReqInterval 0
        announceReceiptTimeout 3
        syncReceiptTimeout 0
        delay_mechanism E2E
        network_transport UDPv4
        transportSpecific 0x0
        ptp_dst_mac 01:1B:19:00:00:00
        p2p_dst_mac 01:80:C2:00:00:0E
        udp_ttl 1
        udp6_scope 0x0E
        tx_timestamp_timeout 10
        check_fup_sync 0
        clock_servo pi
        pi_proportional_const 0.0
        pi_integral_const 0.0
        pi_proportional_scale 0.0
        pi_proportional_exponent -0.3
        pi_proportional_norm_max 0.7
        pi_integral_scale 0.0
        pi_integral_exponent 0.4
        pi_integral_norm_max 0.3
        step_threshold 0.0
        first_step_threshold 0.00002
        max_frequency 900000000
        sanity_freq_limit 200000000
        ntpshm_segment 0
        msg_interval_request 0
        servo_num_offset_values 10
        servo_offset_threshold 0
        write_phase_mode 0
        [eth0]
      path: /etc/ptp4l.conf
      permissions: 0644
      op: create
```

For most environments, a simpler configuration works well:

```yaml
machine:
  files:
    - content: |
        [global]
        twoStepFlag 1
        domainNumber 0
        logAnnounceInterval 1
        logSyncInterval -4
        logMinDelayReqInterval -4
        network_transport UDPv4
        delay_mechanism E2E
        tx_timestamp_timeout 10
        clock_servo pi
        [eth0]
      path: /etc/ptp4l.conf
      permissions: 0644
      op: create
```

The `[eth0]` section at the end tells ptp4l which interface to use. Replace `eth0` with your actual interface name.

## Configuring phc2sys

The `ptp4l` daemon synchronizes the NIC's hardware clock (PHC - PTP Hardware Clock) with the network grandmaster. But applications use the system clock, not the hardware clock. The `phc2sys` daemon bridges this gap by synchronizing the system clock to the PHC:

```yaml
machine:
  files:
    - content: |
        # phc2sys configuration
        # -s eth0: source is the PHC on eth0
        # -c CLOCK_REALTIME: target is the system clock
        # -O 0: zero offset (PTP uses TAI, not UTC)
        # -R 16: update rate in Hz
        PHC2SYS_OPTS="-s eth0 -c CLOCK_REALTIME -O 0 -R 16"
      path: /etc/phc2sys.conf
      permissions: 0644
      op: create
```

## Disabling NTP

When running PTP, you should disable the default NTP synchronization to avoid two time sources fighting over the system clock:

```yaml
machine:
  time:
    disabled: true
```

Apply this alongside your PTP configuration:

```bash
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "replace",
    "path": "/machine/time/disabled",
    "value": true
  }
]'
```

## Verifying PTP Operation

After configuration, check that PTP is working:

```bash
# Check PTP extension service status
talosctl -n 192.168.1.10 services | grep ptp

# View ptp4l logs
talosctl -n 192.168.1.10 logs ext-ptp4l

# View phc2sys logs
talosctl -n 192.168.1.10 logs ext-phc2sys
```

In the `ptp4l` logs, look for messages about clock state changes:

```
ptp4l: master offset   -12 s2 freq  +3245 path delay   1234
ptp4l: master offset    -5 s2 freq  +3241 path delay   1231
ptp4l: master offset     2 s2 freq  +3243 path delay   1233
```

The "master offset" value shows the difference between the local clock and the grandmaster in nanoseconds. Values in the single digits indicate excellent synchronization.

The `s2` indicates the clock is in "locked" state:
- `s0` = unlocked (not synced)
- `s1` = clock step (making a large adjustment)
- `s2` = locked (steady-state tracking)

## Checking Hardware Timestamping Support

Before troubleshooting PTP issues, verify that your NIC supports hardware timestamping:

```bash
# Check hardware timestamping capabilities
talosctl -n 192.168.1.10 read /proc/net/ptp0

# Or check through ethtool (if available via extension)
# ethtool -T eth0
```

If hardware timestamping is not available, `ptp4l` will fall back to software timestamping, which significantly reduces accuracy.

## PTP Network Topologies

Your network architecture affects PTP accuracy:

### Boundary Clock Mode

PTP-aware switches act as boundary clocks, terminating and re-originating PTP messages. This gives the best accuracy because each network segment has its own PTP session:

```
Grandmaster --> Switch (Boundary Clock) --> Talos Node
```

### Transparent Clock Mode

Switches add their residence time to PTP messages, allowing end nodes to compensate for switch delay:

```
Grandmaster --> Switch (Transparent Clock) --> Talos Node
```

### End-to-End Without PTP Switches

Without PTP-aware switches, accuracy depends on how stable the switch queuing delay is. For many environments, this still provides microsecond-level accuracy:

```
Grandmaster --> Regular Switch --> Talos Node
```

## Monitoring PTP in Production

For production environments, monitor PTP offset and state:

```bash
#!/bin/bash
# ptp-monitor.sh

NODES="192.168.1.10 192.168.1.11 192.168.1.12"

for node in $NODES; do
  echo "Node: $node"

  # Check for the latest offset value in ptp4l logs
  offset=$(talosctl -n "$node" logs ext-ptp4l 2>/dev/null | \
    tail -1 | grep -oP 'master offset\s+\K[-0-9]+')

  if [ -n "$offset" ]; then
    echo "  PTP offset: ${offset}ns"
    if [ "${offset#-}" -gt 1000 ]; then
      echo "  WARNING: Offset exceeds 1 microsecond"
    fi
  else
    echo "  WARNING: Could not read PTP offset"
  fi
done
```

## Best Practices

1. **Validate hardware support first** - PTP without hardware timestamping is not much better than NTP. Confirm your NICs support it before investing in PTP infrastructure.

2. **Use PTP-aware network gear when possible** - Boundary clocks or transparent clocks significantly improve accuracy.

3. **Disable NTP** - Never run NTP and PTP simultaneously. They will fight over the system clock and neither will work well.

4. **Monitor continuously** - PTP accuracy can degrade if network conditions change. Set up alerting on offset values.

5. **Test failover** - Know what happens when the grandmaster becomes unreachable. Configure backup grandmasters for redundancy.

PTP on Talos Linux gives you the time accuracy needed for the most demanding workloads while maintaining the security and simplicity of the Talos operating model. The setup requires more effort than NTP, but the precision improvement is substantial.
