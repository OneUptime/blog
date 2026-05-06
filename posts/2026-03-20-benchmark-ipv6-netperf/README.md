# How to Benchmark IPv6 with netperf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Netperf, Benchmarking, TCP, UDP, Latency

Description: Use netperf to benchmark IPv6 TCP bulk throughput, request-response latency, and UDP stream performance between hosts.

## Introduction

netperf provides a wider variety of test types than iperf3, including request-response tests that model application behavior. It supports IPv6 via the `-6` flag and the `AF_INET6` address family.

## Installation and Setup

```bash
# Install netperf

apt-get install netperf       # Debian/Ubuntu
yum install netperf           # RHEL/CentOS

# Start netserver on target host with IPv6 enabled
netserver -6 -p 12865
# Or explicitly: netserver -6 -L :: -p 12865

# Verify listening
ss -6 -tlnp | grep 12865
```

## TCP Bulk Throughput Test

```bash
# TCP bulk throughput (equivalent to iperf3 TCP)
netperf -H 2001:db8::1 -6 -t TCP_STREAM -l 30
# -l 30: test duration 30 seconds

# Output:
# Recv   Send    Send
# Socket Socket  Message  Elapsed
# Size   Size    Size     Time     Throughput
# bytes  bytes   bytes    secs.    10^6bits/sec
# 87380  16384  16384    30.00    9412.34

# Control send/recv buffer sizes
netperf -H 2001:db8::1 -6 -t TCP_STREAM -l 30 -- \
  -s 4194304 -S 4194304
```

## Request-Response Tests (Application Latency)

```bash
# TCP request-response (models HTTP/DB query latency)
# Each transaction = send request + receive response
netperf -H 2001:db8::1 -6 -t TCP_RR -l 30
# Output: transaction rate (transactions/sec); use -v 2 for usec/Tran detail

# UDP request-response
netperf -H 2001:db8::1 -6 -t UDP_RR -l 30

# Vary request/response sizes to model real workloads
netperf -H 2001:db8::1 -6 -t TCP_RR -l 30 -- \
  -r 512,512       # 512-byte request, 512-byte response
```

## UDP Stream Test

```bash
# UDP unidirectional stream (measures raw UDP throughput)
netperf -H 2001:db8::1 -6 -t UDP_STREAM -l 30 -- -m 1400
# -m 1400: message size close to MTU

# Watch UDP socket summary on the server side simultaneously
ss -6 -u -s
```

## Automated Benchmark Script

```bash
#!/bin/bash
SERVER="2001:db8::1"
RESULTS=()

run_test() {
    local name="$1"
    local args="$2"
    result=$(netperf -H "$SERVER" -6 -P 0 -v 0 $args 2>/dev/null | tail -1 | awk '{print $NF}')
    echo "$name: $result"
    RESULTS+=("$name=$result")
}

run_test "TCP_STREAM_30s"  "-t TCP_STREAM -l 30"
run_test "UDP_STREAM_30s"  "-t UDP_STREAM -l 30 -- -m 1400"
run_test "TCP_RR_txn_sec"  "-t TCP_RR -l 30"
run_test "UDP_RR_txn_sec"  "-t UDP_RR -l 30"

# Write to metrics file for ingestion
printf '%s\n' "${RESULTS[@]}" > /tmp/netperf_ipv6_results.txt
```

## Comparing netperf vs iperf3

| Feature | netperf | iperf3 |
|---|---|---|
| Request-response tests | Yes (TCP_RR, UDP_RR) | No |
| Parallel streams | Limited | Yes (-P) |
| JSON output | No | Yes (-J) |
| UDP jitter reporting | No | Yes |
| Application latency modeling | Yes | No |

## Conclusion

netperf excels at request-response latency testing (TCP_RR, UDP_RR) that models real application behavior over IPv6. Use it alongside iperf3 for comprehensive benchmarking. Integrate results into OneUptime dashboards to track baseline performance changes after network upgrades.
