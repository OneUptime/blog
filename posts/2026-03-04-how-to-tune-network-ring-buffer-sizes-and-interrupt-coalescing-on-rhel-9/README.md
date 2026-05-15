# How to Tune Network Ring Buffer Sizes and Interrupt Coalescing on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking

Description: Step-by-step guide on tune network ring buffer sizes and interrupt coalescing on rhel 9 with practical examples and commands.

---

Tuning network ring buffers and interrupt coalescing on RHEL 9 can reduce CPU overhead and improve throughput for high-traffic servers.

## View Current Ring Buffer Settings

```bash
ethtool -g eth0
```

Use values at or below the `Pre-set maximums` shown by `ethtool -g`.

## Increase Ring Buffer Sizes

```bash
sudo ethtool -G eth0 rx 4096 tx 4096
```

## Make Ring Buffer Changes Persistent

```bash
CONNECTION=$(nmcli -g GENERAL.CONNECTION device show eth0)
sudo nmcli connection modify "$CONNECTION" ethtool.ring-rx 4096 ethtool.ring-tx 4096
sudo nmcli connection up "$CONNECTION"
```

## View Interrupt Coalescing Settings

```bash
ethtool -c eth0
```

## Configure Interrupt Coalescing

```bash
sudo ethtool -C eth0 rx-usecs 100 tx-usecs 100
```

For latency-sensitive workloads:

```bash
sudo ethtool -C eth0 rx-usecs 0 tx-usecs 0
```

For throughput-optimized workloads:

```bash
sudo ethtool -C eth0 rx-usecs 250 tx-usecs 250 rx-frames 64 tx-frames 64
```

## Monitor Interface Statistics

```bash
ethtool -S eth0 | grep -E "drop|error|miss"
```

## Conclusion

Ring buffer and interrupt coalescing tuning on RHEL 9 balances CPU usage and network throughput. Increase ring buffers to help reduce packet drops and adjust coalescing based on your latency vs. throughput requirements.
