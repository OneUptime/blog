# How to Measure IPv6 Latency and Jitter - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Latency, Jitter, Performance, Ping6, Hping3

Description: Measure IPv6 latency and jitter using ping6, hping3, and custom Python scripts to baseline network performance and detect degradation.

## Introduction

Latency and jitter are fundamental metrics for any network. For IPv6, measuring them requires tools that explicitly send IPv6 traffic. Baseline measurements before production deployment allow anomaly detection later.

## Measuring Latency with ping

```bash
# Basic RTT measurement

ping -6 -c 100 2001:4860:4860::8888

# Statistics output:
# rtt min/avg/max/mdev = 10.234/11.456/15.678/1.234 ms
# mdev = population standard deviation of RTTs; useful for variability, but not a formal jitter metric

# Flood ping a host you control (root or equivalent capability required)
ping -6 -f -c 10000 2001:db8::1
```

## Measuring Jitter with fping

```bash
# fping for repeated IPv6 RTT sampling
# -6: IPv6, -C: collect RTTs, -p: period in ms, -q: quiet summary format
fping -6 -C 100 -p 10 -q 2606:4700:4700::1111 2>&1
# -p 10 = 10 ms between probes to the target

# Calculate jitter as the mean absolute delta between consecutive RTT samples
fping -6 -C 100 -p 10 -q 2606:4700:4700::1111 2>&1 | \
  awk -F' : ' '{
    n = split($2, samples, " ");
    for (i = 1; i <= n; i++) {
      if (samples[i] != "-") {
        rtt = samples[i] + 0;
        if (seen > 0) jitter += (rtt > prev ? rtt - prev : prev - rtt);
        prev = rtt; seen++
      }
    }
  }
  END {
    if (seen > 1) printf "Avg jitter: %.3f ms\n", jitter / (seen - 1);
    else print "Insufficient RTT samples"
  }'
```

## Python Latency and Jitter Tool

```python
import subprocess
import re
import statistics

def measure_ipv6_latency(target: str, count: int = 50) -> dict:
    """
    Measure IPv6 latency and jitter to a target.
    Returns min, avg, max, stddev, and jitter.
    """
    result = subprocess.run(
        ["ping", "-6", "-c", str(count), target],
        capture_output=True, text=True
    )

    # Extract individual RTT values
    rtts = []
    for line in result.stdout.splitlines():
        m = re.search(r'time=([\d.]+)', line)
        if m:
            rtts.append(float(m.group(1)))

    if not rtts:
        return {"error": "No RTT data collected"}

    # Jitter = mean absolute difference between consecutive samples
    jitter_values = [abs(rtts[i] - rtts[i-1]) for i in range(1, len(rtts))]

    return {
        "target": target,
        "count": len(rtts),
        "min_ms": min(rtts),
        "avg_ms": statistics.mean(rtts),
        "max_ms": max(rtts),
        "stddev_ms": statistics.pstdev(rtts) if len(rtts) > 1 else 0,
        "jitter_ms": statistics.mean(jitter_values) if jitter_values else 0,
        "packet_loss": (count - len(rtts)) / count * 100,
    }

if __name__ == "__main__":
    targets = [
        "2001:4860:4860::8888",  # Google
        "2606:4700:4700::1111",  # Cloudflare
    ]
    for t in targets:
        metrics = measure_ipv6_latency(t, count=20)
        print(f"\n{metrics['target']}:")
        for k, v in metrics.items():
            if k != "target":
                print(f"  {k}: {v:.3f}" if isinstance(v, float) else f"  {k}: {v}")
```

## Continuous Monitoring with fping

```bash
# fping for multi-target continuous measurement
while true; do
  fping -6 -C 1 -q 2001:4860:4860::8888 2606:4700:4700::1111 2>&1
  sleep 1
done >> /var/log/ipv6_latency.log
# -C 1: one probe per cycle, -q: parseable per-target RTT output

# Parse fping output for Prometheus
while read -r line; do
  target=$(echo "$line" | awk -F' : ' '{print $1}')
  rtt=$(echo "$line" | awk -F' : ' '{print $2}')
  if [ "$rtt" != "-" ]; then
    echo "ipv6_latency_ms{target=\"$target\"} $rtt"
  fi
done < /var/log/ipv6_latency.log
```

## Conclusion

Use `ping -6` for quick RTT snapshots, `fping -6` for repeated jitter measurement and multi-target collection, and custom Python scripts for structured baseline collection. Feed results into OneUptime to trigger alerts when latency or jitter exceeds thresholds.
