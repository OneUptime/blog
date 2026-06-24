# How to Detect TCP Congestion Collapse in Your Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Congestion, Networking, Performance, Monitoring, Linux

Description: Identify TCP congestion collapse where network utilization drops dramatically due to excessive retransmissions, and apply congestion management to restore throughput.

## Introduction

TCP congestion collapse is a state where useful throughput drops to a small fraction of normal even though links are 100% utilized - because much of the traffic is retransmissions of lost data rather than new data delivery. It was a major problem in early internet history and can still occur in heavily overloaded networks. Detection requires monitoring retransmission rates, goodput (useful throughput), and queueing delay simultaneously.

## Signs of Congestion Collapse

```bash
# Sign 1: Interface counters climbing rapidly but application throughput very low

watch -n 1 "ip -s link show dev eth0 | sed -n '/TX:/,+1p'"

# Compare interface byte counter growth vs application data rate:
# If TX bytes climb quickly but applications deliver little useful data, suspect collapse

# Sign 2: Very high TCP retransmission rate
watch -n 1 "nstat TcpRetransSegs TcpOutSegs"
# Compare TcpRetransSegs to TcpOutSegs; sustained ratios in the tens of percent are a serious warning sign

# Sign 3: RTT increasing dramatically under load
ping -c 100 -i 0.1 10.20.0.5 | tail -3
# Compare against your baseline RTT
# Sharp sustained increases under load usually mean queues are building

# Sign 4: CWND oscillating rapidly
watch -n 0.5 "ss -tin state established | grep -oE 'cwnd:[0-9]+' | cut -d: -f2"
# Look for repeated sharp reductions, especially RTO-driven resets to 1
```

## Measuring Goodput vs. Throughput

```bash
# Throughput = total bytes sent including retransmissions
# Goodput = useful bytes actually delivered

# Use iperf3 to compare sender vs receiver rates
iperf3 -c 10.20.0.5 -t 30
# If sender rate >> receiver rate: retransmissions eating bandwidth

# Monitor retransmissions during a test using absolute kernel counters
read RETRANS_BEFORE OUT_BEFORE < <(nstat -az TcpRetransSegs TcpOutSegs | awk '/TcpRetransSegs/{r=$2} /TcpOutSegs/{o=$2} END{print r, o}')
iperf3 -c 10.20.0.5 -t 30 &>/dev/null
read RETRANS_AFTER OUT_AFTER < <(nstat -az TcpRetransSegs TcpOutSegs | awk '/TcpRetransSegs/{r=$2} /TcpOutSegs/{o=$2} END{print r, o}')
DELTA_RETRANS=$((RETRANS_AFTER - RETRANS_BEFORE))
DELTA_OUT=$((OUT_AFTER - OUT_BEFORE))
awk -v r="$DELTA_RETRANS" -v o="$DELTA_OUT" 'BEGIN { if (o > 0) printf "Retransmission ratio during test: %.2f%%\n", r/o*100; else print "Retransmission ratio during test: 0.00%" }'
```

## Detecting Using Kernel Counters

```bash
#!/bin/bash
# Monitor for congestion collapse indicators

nstat -n TcpRetransSegs TcpOutSegs 2>/dev/null
PREV_RX_DROPS=$(ip -s link show dev eth0 | awk '/RX:/{getline; print $4}')

while true; do
    sleep 5
    RETRANS=$(nstat -z TcpRetransSegs TcpOutSegs 2>/dev/null | awk '/TcpRetransSegs/{r=$2} /TcpOutSegs/{o=$2}
      END{if(o>0) printf "%.1f%%", r/o*100; else print "0.0%"}')
    CUR_RX_DROPS=$(ip -s link show dev eth0 | awk '/RX:/{getline; print $4}')
    DELTA_RX_DROPS=$((CUR_RX_DROPS - PREV_RX_DROPS))
    PREV_RX_DROPS=$CUR_RX_DROPS
    echo "$(date +%H:%M:%S) Retrans: $RETRANS  RX drop delta: $DELTA_RX_DROPS"
done
```

## Causes of Congestion Collapse

```bash
# Cause 1: Insufficient queue management (no AQM)
# Fix: enable Active Queue Management (AQM) on the bottleneck interface
tc qdisc replace dev eth0 root fq_codel   # FQ-CoDel reduces latency under load
# or
tc qdisc replace dev eth0 root cake bandwidth 1Gbit  # CAKE with rate limiting

# Cause 2: Single bottleneck link overwhelmed by too many flows
# Fix: use fair queueing
tc qdisc replace dev eth0 root fq

# Cause 3: Applications not respecting TCP backpressure
# Fix: add flow control in applications, use connection pooling
```

## Preventing Congestion Collapse

```bash
# Make fq the default qdisc for new devices/leaves and apply it to the current bottleneck interface
sysctl -w net.core.default_qdisc=fq
tc qdisc replace dev eth0 root fq
sysctl -w net.ipv4.tcp_congestion_control=bbr   # if BBR is available

# Enable ECN so routers can signal congestion before dropping
sysctl -w net.ipv4.tcp_ecn=1

# For edge devices, deploy fq_codel or cake on bottleneck interfaces
tc qdisc replace dev wan0 root fq_codel target 5ms interval 100ms
```

## Conclusion

TCP congestion collapse is diagnosed through simultaneous monitoring of retransmission rates and goodput. High interface utilization with low application throughput is the key signal. Prevention focuses on active queue management (fq_codel, cake), fair queueing, ECN, and, where available, paced congestion control such as BBR.
