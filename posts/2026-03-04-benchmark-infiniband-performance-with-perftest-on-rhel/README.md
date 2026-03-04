# How to Benchmark InfiniBand Performance with perftest on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, InfiniBand, perftest, Benchmarking, RDMA

Description: Use the perftest suite on RHEL to measure InfiniBand and RDMA latency, bandwidth, and message rate to validate network performance.

---

The perftest package provides a set of micro-benchmarks for measuring InfiniBand and RDMA performance. It tests latency, bandwidth, and message rate for different RDMA operations including write, read, send, and atomic operations.

## Install perftest

```bash
# Install the perftest package
sudo dnf install -y perftest

# Verify available tools
rpm -ql perftest | grep bin
```

The package includes tools like `ib_write_bw`, `ib_write_lat`, `ib_read_bw`, `ib_read_lat`, `ib_send_bw`, and `ib_send_lat`.

## Bandwidth Tests

Run bandwidth tests between two nodes. Start the server first, then the client.

### Write Bandwidth

```bash
# Server (node1)
ib_write_bw -d mlx5_0 --report_gbits

# Client (node2) - connect to server IP
ib_write_bw -d mlx5_0 10.0.0.1 --report_gbits
```

### Read Bandwidth

```bash
# Server
ib_read_bw -d mlx5_0 --report_gbits

# Client
ib_read_bw -d mlx5_0 10.0.0.1 --report_gbits
```

### Send Bandwidth

```bash
# Server
ib_send_bw -d mlx5_0 --report_gbits

# Client
ib_send_bw -d mlx5_0 10.0.0.1 --report_gbits
```

## Latency Tests

### Write Latency

```bash
# Server
ib_write_lat -d mlx5_0

# Client
ib_write_lat -d mlx5_0 10.0.0.1

# Output shows latency in microseconds for different message sizes
```

### Send Latency

```bash
# Server
ib_send_lat -d mlx5_0

# Client
ib_send_lat -d mlx5_0 10.0.0.1
```

## Advanced Options

Test with specific parameters:

```bash
# Test with a specific message size (e.g., 4096 bytes)
ib_write_bw -d mlx5_0 -s 4096 --report_gbits 10.0.0.1

# Run for a specific duration (10 seconds)
ib_write_bw -d mlx5_0 -D 10 --report_gbits 10.0.0.1

# Test with multiple queue pairs
ib_write_bw -d mlx5_0 -q 4 --report_gbits 10.0.0.1

# Use a specific port on the adapter
ib_write_bw -d mlx5_0 -p 1 --report_gbits 10.0.0.1

# Test all message sizes
ib_write_bw -d mlx5_0 -a --report_gbits 10.0.0.1
```

## Interpret the Results

A typical bandwidth output looks like:

```text
 #bytes     #iterations    BW peak[Gb/sec]    BW average[Gb/sec]   MsgRate[Mpps]
 65536      5000           98.12              97.85                0.186712
```

For HDR InfiniBand (200 Gb/s), expect around 190+ Gb/s for large messages. For EDR (100 Gb/s), expect around 95+ Gb/s.

## Message Rate Test

```bash
# Test small message throughput (important for MPI workloads)
ib_send_bw -d mlx5_0 -s 2 --report_gbits 10.0.0.1

# High message rates indicate good small-message performance
```

## Save Results to File

```bash
# Redirect output to a file for later analysis
ib_write_bw -d mlx5_0 -a --report_gbits 10.0.0.1 > /tmp/ib_bw_results.txt 2>&1
```

Regular benchmarking with perftest helps verify that your InfiniBand fabric on RHEL is performing at expected levels and can detect cable, switch, or configuration issues.
