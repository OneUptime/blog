# How to Configure Receive Packet Steering (RPS) and Transmit Packet Steering (XPS) on RHEL

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

## Configuring RPS Flow Hash Table Size

```bash
# Increase the per-queue flow table size
echo 32768 | sudo tee /sys/class/net/ens192/queues/rx-0/rps_flow_cnt

# Set the global flow table size
sudo sysctl -w net.core.rps_sock_flow_entries=32768
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
# Create a systemd service for persistence
cat << 'SERVICE' | sudo tee /etc/systemd/system/network-tuning.service
[Unit]
Description=Network RPS/XPS Tuning
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/network-tuning.sh

[Install]
WantedBy=multi-user.target
SERVICE

# Create the tuning script
cat << 'TUNE' | sudo tee /usr/local/bin/network-tuning.sh
#!/bin/bash
IFACE="ens192"
CPU_MASK="ff"

for rxq in /sys/class/net/$IFACE/queues/rx-*/rps_cpus; do
    echo "$CPU_MASK" > "$rxq"
done

for rxq in /sys/class/net/$IFACE/queues/rx-*/rps_flow_cnt; do
    echo 32768 > "$rxq"
done
TUNE

sudo chmod +x /usr/local/bin/network-tuning.sh
sudo systemctl enable network-tuning
```

RPS is most beneficial on systems where the NIC has fewer hardware queues than available CPU cores. If your NIC already supports RSS (Receive Side Scaling) with enough queues, hardware-based distribution is preferred over RPS.
