# How to Compare TCP CUBIC and BBR Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, BBR, CUBIC, Performance, Networking, Linux

Description: Systematically compare TCP CUBIC and BBR performance on your network using iperf3 benchmarks and Wireshark analysis to determine the best algorithm for your workload.

## Introduction

CUBIC and BBR take fundamentally different approaches to congestion control. CUBIC is primarily loss-based; BBR is model-based and estimates bottleneck bandwidth and RTT from the connection. The performance difference depends heavily on network characteristics - on clean low-latency LANs the results are often close, while on some high-BDP or random-loss paths BBR can maintain higher throughput and lower queueing delay.

## Setting Up the Comparison

```bash
# Install iperf3 on both server and client

sudo apt install iperf3

# Server side
iperf3 -s --daemon

# Ensure both CUBIC and BBR are available
sudo modprobe tcp_bbr
sysctl net.ipv4.tcp_available_congestion_control
```

## Benchmark Script

```bash
#!/bin/bash
# Compare CUBIC vs BBR under different network conditions

SERVER="10.20.0.5"
INTERFACE="eth0"
DURATION=30
RESULTS_FILE="/tmp/congestion_comparison.txt"
ORIGINAL_ALGO="$(sysctl -n net.ipv4.tcp_congestion_control)"

run_test() {
    local algo=$1
    local desc=$2
    sudo sysctl -w net.ipv4.tcp_congestion_control="$algo" >/dev/null
    RESULT=$(iperf3 -c "$SERVER" -t "$DURATION" -J 2>/dev/null | \
             python3 -c "
import sys, json
d = json.load(sys.stdin)
sent_bps = d['end']['sum_sent']['bits_per_second']
retr = d['end']['sum_sent']['retransmits']
print(f'{sent_bps/1e6:.1f}Mbps retrans={retr}')
")
    echo "$algo ($desc): $RESULT" | tee -a "$RESULTS_FILE"
}

echo "=== Without Network Impairment ===" | tee "$RESULTS_FILE"
run_test cubic "clean LAN"
run_test bbr "clean LAN"

# These netem rules affect only the client egress path.
# For symmetric RTT/loss, apply matching netem rules on the server path as well.
echo "=== With 50ms Client Egress Delay ===" | tee -a "$RESULTS_FILE"
sudo tc qdisc add dev "$INTERFACE" root netem delay 50ms
run_test cubic "50ms client egress delay"
run_test bbr "50ms client egress delay"
sudo tc qdisc del dev "$INTERFACE" root

echo "=== With 100ms Client Egress Delay + 1% Outbound Loss ===" | tee -a "$RESULTS_FILE"
sudo tc qdisc add dev "$INTERFACE" root netem delay 100ms loss 1%
run_test cubic "100ms+1% outbound loss"
run_test bbr "100ms+1% outbound loss"
sudo tc qdisc del dev "$INTERFACE" root

sudo sysctl -w net.ipv4.tcp_congestion_control="$ORIGINAL_ALGO" >/dev/null
cat "$RESULTS_FILE"
```

## Example Results

```text
Clean LAN (< 5ms RTT, 0% loss):
  CUBIC and BBR are often close; either can be slightly ahead.

50ms client egress delay, 0% loss:
  Results depend on bandwidth-delay product and queueing; test both algorithms on your actual path.

100ms client egress delay + 1% outbound loss:
  On random-loss paths, CUBIC can drop sharply, while BBR may retain much higher throughput.
```

## Latency Under Load Comparison

```bash
# Check if algorithm causes bufferbloat (latency spike during transfer)

# Measure latency during a CUBIC transfer
ping -c 30 -i 1 "$SERVER" > /tmp/ping_cubic.txt &
PING_PID=$!
sudo sysctl -w net.ipv4.tcp_congestion_control=cubic
iperf3 -c "$SERVER" -t 30
wait $PING_PID
awk -F'time=| ms' '/time=/{sum+=$2;n++}END{if(n) printf "%.2fms avg\n", sum/n}' /tmp/ping_cubic.txt

# Repeat with BBR
ping -c 30 -i 1 "$SERVER" > /tmp/ping_bbr.txt &
PING_PID=$!
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr
iperf3 -c "$SERVER" -t 30
wait $PING_PID
awk -F'time=| ms' '/time=/{sum+=$2;n++}END{if(n) printf "%.2fms avg\n", sum/n}' /tmp/ping_bbr.txt
```

## Conclusion

BBR often outperforms CUBIC on high-BDP or random-loss paths, but it is not a universal winner. For pure LAN with sub-millisecond RTT and zero loss, results are often close. On modern Linux kernels, BBR no longer strictly requires `net.core.default_qdisc=fq`, though `fq` can improve pacing on heavily loaded senders. Run the benchmark script in your own environment to confirm results - network characteristics, queueing, and path symmetry all influence the outcome.
