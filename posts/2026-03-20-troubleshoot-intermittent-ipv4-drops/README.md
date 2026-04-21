# How to Troubleshoot Intermittent IPv4 Connectivity Drops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Connectivity Drops, Packet Loss, Troubleshooting, mtr, Linux

Description: Learn a systematic approach to diagnose intermittent IPv4 connectivity drops by measuring packet loss at each network hop, identifying hardware faults, and correlating drops with system events.

## Intermittent Drops: Why They're Hard to Diagnose

Intermittent drops are challenging because:
- They may not be reproducible on demand
- Physical layer issues (cable, transceiver) often cause random drops
- CPU overload on routers creates sporadic drops
- DHCP lease changes or failed renewals can cause brief interruptions
- STP topology changes can cause brief reconvergence and MAC relearning

## Step 1: Measure Packet Loss Continuously

```bash
# mtr - combines ping and traceroute with continuous loss measurement

# Run for 5 minutes to capture intermittent drops
mtr --report --report-cycles 300 8.8.8.8

# Interpret results:
# Loss%  Snt  Last  Avg  Best  Wrst  StDev
#   0.0%  300  1.2  1.3   0.9   3.1   0.2   <- Healthy
#  15.3%  300  1.2  1.5   0.9  15.3   2.1   <- Significant loss at this hop

# If loss only at a specific hop but not at later hops:
# The router at that hop likely rate-limits ICMP (not a real problem)

# Loss at ALL hops from a specific router onwards = real packet loss
```

## Step 2: Check Physical Layer

```bash
# Check for physical errors on the NIC
ethtool -S eth0 | grep -E "error|drop|miss|overflow"

# Check interface statistics
ip -s -s link show eth0
# Look for: RX errors, frame/CRC errors, TX errors, dropped packets

# Frame/CRC errors suggest cable/connector problems:
# Example:
# RX errors:  length    crc   frame    fifo overrun
#                  0    152       0       0       0  <- CRC errors = check cable/SFP

# Check cable/SFP
ethtool eth0 | grep -i "link detected\|speed\|duplex"
# "Link detected: yes" should always be yes
# Auto-negotiation failures cause intermittent drops
```

## Step 3: Check for Duplex Mismatch

```bash
# Duplex mismatch: one side is full-duplex, other is half-duplex
# Causes: collisions, slow throughput, intermittent drops

ethtool eth0 | grep Duplex
# Should show: Duplex: Full

# Fix: make both ends match; prefer auto-negotiation where supported
sudo ethtool -s eth0 autoneg on

# Or on switch (Cisco):
# interface GigabitEthernet0/1
#  speed auto
#  duplex auto

# If you must hard-code a legacy 10/100 link, set both ends identically
sudo ethtool -s eth0 speed 100 duplex full autoneg off
# Cisco:
#  speed 100
#  duplex full
```

## Step 4: Check System Resources

```bash
# High CPU can cause packet drops
top -bn1 | head -5
vmstat 1 5

# Check for softirq drops (CPU or softnet backlog can't process packets fast enough)
cat /proc/net/softnet_stat | head -5
# Values are hexadecimal; column 1: processed, column 2: dropped, column 3: time_squeeze
# Increasing column 2 or 3 = softnet backlog drops or CPU packet-processing pressure

# Check NIC ring buffer drops
ethtool -S eth0 | grep -E "rx_dropped|rx_missed|rx_no_buffer"

# Increase ring buffer if dropping
sudo ethtool -G eth0 rx 4096
```

## Step 5: Correlate with System Events

```bash
# Check system logs around the time of drops
journalctl --since "1 hour ago" | grep -iE "link|eth0|network|dhcp"

# Look for DHCP lease changes or failed renewals causing brief drops
journalctl -u NetworkManager | grep -E "renew|lease|state"

# Check for STP topology changes on the switch
# (Cisco switch logs)
# show log | include STP|topology
# Topology changes can accelerate MAC aging or flush learned entries,
# causing brief flooding/relearning during reconvergence

# Check for interface flaps
dmesg | grep -E "eth0|Link is|carrier"
# "eth0: Link is Down" followed by "Link is Up" = cable/transceiver issue
```

## Step 6: Monitor with Continuous Ping and Logging

```bash
#!/bin/bash
# /usr/local/bin/connectivity-monitor.sh
# Logs drops with timestamps

TARGET="8.8.8.8"
LOG="/var/log/connectivity.log"
CONSECUTIVE_LOSS=0

while true; do
    if ping -c 1 -W 2 $TARGET &>/dev/null; then
        if [ $CONSECUTIVE_LOSS -gt 0 ]; then
            echo "$(date): RESTORED after $CONSECUTIVE_LOSS drops" >> $LOG
            CONSECUTIVE_LOSS=0
        fi
    else
        CONSECUTIVE_LOSS=$((CONSECUTIVE_LOSS + 1))
        echo "$(date): DROP #$CONSECUTIVE_LOSS to $TARGET" >> $LOG
    fi
    sleep 5
done
```

```bash
# Run as background service
sudo chmod +x /usr/local/bin/connectivity-monitor.sh

sudo tee /etc/systemd/system/connectivity-monitor.service > /dev/null << 'EOF'
[Unit]
Description=Connectivity Monitor
After=network.target

[Service]
ExecStart=/usr/local/bin/connectivity-monitor.sh
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now connectivity-monitor.service
sudo tail -f /var/log/connectivity.log
```

## Step 7: Check for QoS/Policing Drops

```bash
# Check for traffic shaping/qdisc drops
tc -s qdisc show dev eth0
# Look for: dropped packets in qdisc statistics

# If using HTB/fq_codel:
# qdisc fq_codel: dropped 1234  <- Traffic being dropped by qdisc

# Check traffic rate vs interface capacity
sar -n DEV 1 10 | grep eth0
# rxkB/s and txkB/s - compare against max bandwidth
```

## Conclusion

Intermittent IPv4 drops require time-series measurement with `mtr --report --report-cycles 300` to capture statistical patterns. Check physical errors with `ethtool -S eth0`, resource drops with `cat /proc/net/softnet_stat`, and correlate with system logs via `journalctl`. Common causes include cable/transceiver faults (ethtool errors), NIC RX ring buffer overflow (increase rx ring buffer), DHCP lease changes or failed renewals (check lease timing), and STP topology changes (enable STP PortFast on access ports where appropriate).
