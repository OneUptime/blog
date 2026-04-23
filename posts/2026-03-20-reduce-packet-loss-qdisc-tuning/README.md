# How to Reduce IPv4 Packet Loss with Queue Discipline (qdisc) Tuning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Qdisc, tc, Traffic Control, Linux, Packet Loss, QoS, FQ-CoDel

Description: Learn how to configure Linux traffic control queue disciplines (qdiscs) to reduce packet loss, latency, and bufferbloat on network interfaces.

## What Is a Queue Discipline?

Every network interface on Linux has a queue discipline (qdisc) that controls how packets are queued and transmitted. The kernel default for new devices is `pfifo_fast`, but distros may override this with `net.core.default_qdisc`, physical multiqueue NICs often use `mq` as the root qdisc, and virtual devices such as `lo` typically use `noqueue`.

Problems with default qdisc:
- Fixed queue depth can cause bursts of packet loss
- No active queue management (AQM) leads to bufferbloat
- No fairness between flows

## Step 1: Check Current qdisc Configuration

```bash
# View current qdisc for all interfaces

tc qdisc show

# Output varies by interface and distro; you may see fq_codel, pfifo_fast, mq, or noqueue.

# Check queue statistics (drops, backlog)
tc -s qdisc show dev eth0
# Output includes: Sent, dropped, overlimits, backlog
```

## Step 2: Switch to FQ-CoDel (Best General Purpose)

FQ-CoDel (Fair Queue Controlled Delay) is the recommended qdisc for most systems. It:
- Provides fair bandwidth between flows
- Actively manages queue depth (CoDel AQM)
- Drastically reduces bufferbloat
- Is included in Linux kernel 3.5+

```bash
# Replace the current qdisc with fq_codel
sudo tc qdisc replace dev eth0 root fq_codel

# Verify
tc qdisc show dev eth0
# qdisc fq_codel 8001: root refcnt 2 limit 10240 flows 1024 quantum 1514 target 5ms interval 100ms memory_limit 32Mb ecn drop_batch 64

# Check statistics after running some traffic
tc -s qdisc show dev eth0
```

## Step 3: Configure CAKE (Modern Alternative to FQ-CoDel)

CAKE (Common Applications Kept Enhanced) is a newer AQM that also handles shaping:

```bash
# Load CAKE if it is built as a module
# CAKE is included in kernel 4.19+
sudo modprobe sch_cake

# Apply CAKE with bandwidth limiting (replace 100mbit with your uplink speed)
sudo tc qdisc replace dev eth0 root cake bandwidth 100mbit

# CAKE configuration options:
# - bandwidth 100mbit: your uplink bandwidth
# - besteffort: no diffserv classification
# - ack-filter: filter redundant ACKs
# - nat: improve fairness between hosts behind NAT
sudo tc qdisc replace dev eth0 root cake \
  bandwidth 100mbit \
  besteffort \
  ack-filter \
  nat

# Verify
tc qdisc show dev eth0
```

## Step 4: Increase pfifo_fast Queue Length (Simple Fix)

If you need a quick fix without changing the qdisc type and can tolerate more queueing latency:

```bash
# Check current queue length
ip link show eth0 | grep qlen

# Increase queue length (txqueuelen)
sudo ip link set eth0 txqueuelen 10000

# Verify
ip link show eth0 | grep qlen
# ... qlen 10000 ...

# Make persistent
echo 'ACTION=="add", SUBSYSTEM=="net", KERNEL=="eth0", ATTR{tx_queue_len}="10000"' | \
  sudo tee /etc/udev/rules.d/99-txqueuelen.rules > /dev/null
```

## Step 5: Configure Per-Flow Fairness with FQ

The `fq` qdisc provides per-flow fairness without active queue management and is commonly paired with BBR because it provides efficient pacing:

```bash
# fq is commonly paired with BBR because it provides pacing efficiently
sudo sysctl -w net.core.default_qdisc=fq
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr

# Or apply manually to an interface
sudo tc qdisc replace dev eth0 root fq

# fq automatically creates per-flow queues and provides pacing
tc qdisc show dev eth0
```

## Step 6: Diagnose Packet Drops with tc Statistics

```bash
# Monitor qdisc drops in real time
watch -n 1 "tc -s qdisc show dev eth0 | grep -E 'Sent|drop|backlog'"

# Output:
# Sent 123456789 bytes 98765 pkt (dropped 0, overlimits 0 requeues 5)
# backlog 0b 0p requeues 5

# High "dropped" count = qdisc is dropping due to queue overflow
# High "backlog" count = queue is filling up (risk of drops and latency)

# Compare with NIC-level drops
ethtool -S eth0 | grep -i drop
```

## Step 7: Set Default qdisc System-Wide

```bash
# Set default qdisc for all new interfaces
echo "net.core.default_qdisc = fq_codel" | sudo tee /etc/sysctl.d/99-qdisc.conf > /dev/null
sudo sysctl --load /etc/sysctl.d/99-qdisc.conf

# Apply fq_codel to all existing interfaces
for iface in $(ip -o link show | awk -F': ' '{print $2}' | cut -d@ -f1 | grep -v '^lo$'); do
  sudo tc qdisc replace dev "$iface" root fq_codel
  echo "Applied fq_codel to $iface"
done
```

## Conclusion

The Linux qdisc controls packet queuing behavior and is a key factor in packet loss and latency. Use `fq_codel` for better bufferbloat handling and fair bandwidth distribution, or use `fq` alongside BBR when you want efficient pacing. Set the system-wide default for new interfaces with `net.core.default_qdisc = fq_codel` in sysctl and monitor drop counts with `tc -s qdisc show`. For bandwidth-limited uplinks, CAKE provides combined shaping and AQM in a single qdisc.
