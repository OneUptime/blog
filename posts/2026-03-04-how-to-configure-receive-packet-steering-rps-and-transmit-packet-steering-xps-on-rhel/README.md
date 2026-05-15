# How to Configure Receive Packet Steering (RPS) and XPS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RPS, XPS, Network Performance, Packet Steering, Linux

Description: Learn how to configure RPS and XPS on RHEL to distribute network packet processing across multiple CPU cores for improved performance.

---

Receive Packet Steering (RPS) and Transmit Packet Steering (XPS) are software-based techniques that distribute network packet processing across multiple CPU cores. They are especially useful for NICs that have fewer hardware queues than available CPU cores.

## Understanding RPS and XPS

- **RPS**: Distributes incoming (RX) packet processing across CPUs using a hash on packet headers.
- **XPS**: Maps TX queues to specific CPUs to reduce lock contention on transmit.

## Checking Current Queue Configuration

```bash
# Check the number of hardware queues

ethtool -l ens192

# List the RX and TX queues
ls /sys/class/net/ens192/queues/
```

## Configuring RPS

```bash
# View current RPS setting for queue 0
cat /sys/class/net/ens192/queues/rx-0/rps_cpus

# Set RPS to use all CPUs (hex bitmask)
# For an 8-core system: ff (binary 11111111)
echo "ff" | sudo tee /sys/class/net/ens192/queues/rx-0/rps_cpus

# Set for all RX queues
for rxq in /sys/class/net/ens192/queues/rx-*/rps_cpus; do
    echo "ff" | sudo tee "$rxq"
done
```

## Configuring RFS Flow Table Size

```bash
# Set the global RFS flow table size
sudo sysctl -w net.core.rps_sock_flow_entries=32768

# Increase the per-queue flow table size
# For a single RX queue, use the same value as rps_sock_flow_entries.
echo 32768 | sudo tee /sys/class/net/ens192/queues/rx-0/rps_flow_cnt

# For multiple RX queues, divide rps_sock_flow_entries by the number of RX queues.
RX_QUEUES=$(ls -d /sys/class/net/ens192/queues/rx-* | wc -l)
FLOW_CNT=$((32768 / RX_QUEUES))
for rxq in /sys/class/net/ens192/queues/rx-*/rps_flow_cnt; do
    echo "$FLOW_CNT" | sudo tee "$rxq"
done
```

## Configuring XPS

```bash
# Map TX queue 0 to CPU 0, queue 1 to CPU 1, etc.
echo "01" | sudo tee /sys/class/net/ens192/queues/tx-0/xps_cpus
echo "02" | sudo tee /sys/class/net/ens192/queues/tx-1/xps_cpus
echo "04" | sudo tee /sys/class/net/ens192/queues/tx-2/xps_cpus
echo "08" | sudo tee /sys/class/net/ens192/queues/tx-3/xps_cpus
```

## Making Changes Persistent

```bash
# Persist the global RFS table size
echo "net.core.rps_sock_flow_entries = 32768" | sudo tee /etc/sysctl.d/99-network-tuning.conf
sudo sysctl --system

# Create a NetworkManager dispatcher script to apply queue settings when the interface comes up
cat << 'TUNE' | sudo tee /etc/NetworkManager/dispatcher.d/99-rps-xps-tuning
#!/bin/bash
IFACE="ens192"
CPU_MASK="ff"
RFS_ENTRIES=32768

[ "$1" = "$IFACE" ] || exit 0
[ "$2" = "up" ] || exit 0

for rxq in /sys/class/net/$IFACE/queues/rx-*/rps_cpus; do
    echo "$CPU_MASK" > "$rxq"
done

RX_QUEUES=$(ls -d /sys/class/net/$IFACE/queues/rx-* 2>/dev/null | wc -l)
if [ "$RX_QUEUES" -gt 0 ]; then
    FLOW_CNT=$((RFS_ENTRIES / RX_QUEUES))
else
    FLOW_CNT=0
fi

for rxq in /sys/class/net/$IFACE/queues/rx-*/rps_flow_cnt; do
    echo "$FLOW_CNT" > "$rxq"
done

for txq in /sys/class/net/$IFACE/queues/tx-*/xps_cpus; do
    queue=${txq%/xps_cpus}
    queue=${queue##*-}
    printf "%x\n" $((1 << queue)) > "$txq"
done
TUNE

sudo chmod +x /etc/NetworkManager/dispatcher.d/99-rps-xps-tuning
```

RPS is most beneficial on systems where the NIC has fewer hardware queues than available CPU cores. If your NIC already supports RSS (Receive Side Scaling) with enough queues, hardware-based distribution is preferred over RPS.
