# How to Tune Network Ring Buffer Sizes and Interrupt Coalescing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Network Tuning, Ring Buffer, Interrupt Coalescing, Performance

Description: Learn how to tune network interface ring buffer sizes and interrupt coalescing on RHEL to optimize packet processing and reduce latency or improve throughput.

---

Network interface cards (NICs) use ring buffers to queue packets between the hardware and the kernel. Adjusting ring buffer sizes and interrupt coalescing can reduce packet drops under load or improve latency.

## Checking Current Ring Buffer Settings

```bash
# View current and maximum ring buffer sizes
ethtool -g ens192

# Output shows:
# Pre-set maximums (hardware limits)
# Current hardware settings
```

## Increasing Ring Buffer Sizes

```bash
# Set RX and TX ring buffer sizes to their maximum
sudo ethtool -G ens192 rx 4096 tx 4096

# Verify the change
ethtool -g ens192
```

## Making Ring Buffer Changes Persistent

```bash
# Create a NetworkManager dispatcher script
cat << 'DISPATCH' | sudo tee /etc/NetworkManager/dispatcher.d/99-ring-buffer.sh
#!/bin/bash
if [ "$1" = "ens192" ] && [ "$2" = "up" ]; then
    ethtool -G ens192 rx 4096 tx 4096
fi
DISPATCH

sudo chmod +x /etc/NetworkManager/dispatcher.d/99-ring-buffer.sh
```

## Checking Interrupt Coalescing

```bash
# View current coalescing settings
ethtool -c ens192
```

## Tuning Interrupt Coalescing

Coalescing reduces CPU overhead by batching interrupts, at the cost of added latency.

```bash
# For throughput optimization (higher coalescing)
sudo ethtool -C ens192 rx-usecs 100 tx-usecs 100

# For latency optimization (lower coalescing)
sudo ethtool -C ens192 rx-usecs 10 tx-usecs 10

# Enable adaptive coalescing (lets the NIC driver decide)
sudo ethtool -C ens192 adaptive-rx on adaptive-tx on
```

## Monitoring Packet Drops

```bash
# Check for ring buffer overruns
ethtool -S ens192 | grep -i "drop\|miss\|error\|overrun"

# Monitor interface statistics
ip -s link show ens192
```

## Persistent Coalescing Settings

```bash
# Add coalescing to the dispatcher script
cat << 'DISPATCH' | sudo tee /etc/NetworkManager/dispatcher.d/99-nic-tuning.sh
#!/bin/bash
if [ "$1" = "ens192" ] && [ "$2" = "up" ]; then
    ethtool -G ens192 rx 4096 tx 4096
    ethtool -C ens192 adaptive-rx on adaptive-tx on
fi
DISPATCH

sudo chmod +x /etc/NetworkManager/dispatcher.d/99-nic-tuning.sh
```

Larger ring buffers help absorb traffic bursts but consume more kernel memory. Start with maximum ring buffer sizes and tune coalescing based on whether your workload prioritizes throughput or latency.
