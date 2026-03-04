# How to Configure Receive Packet Steering (RPS) and Transmit Packet Steering (XPS) on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking

Description: Step-by-step guide on configure receive packet steering (rps) and transmit packet steering (xps) on rhel 9 with practical examples and commands.

---

Receive Packet Steering (RPS) and Transmit Packet Steering (XPS) distribute network processing across CPU cores on RHEL 9.

## Check Current CPU Affinity

```bash
# View IRQ affinity
cat /proc/interrupts | grep eth0
cat /proc/irq/<irq_number>/smp_affinity_list
```

## Configure RPS

RPS distributes received packet processing across CPUs:

```bash
# Enable RPS on all cores for eth0 queue 0
# For 8 CPUs: ff (binary 11111111)
echo "ff" | sudo tee /sys/class/net/eth0/queues/rx-0/rps_cpus
```

For multiple queues:

```bash
for queue in /sys/class/net/eth0/queues/rx-*; do
  echo "ff" | sudo tee "$queue/rps_cpus"
done
```

## Configure RPS Flow Table

```bash
# Set flow entries (should be >= active connections)
echo 32768 | sudo tee /proc/sys/net/core/rps_sock_flow_entries

for queue in /sys/class/net/eth0/queues/rx-*; do
  echo 4096 | sudo tee "$queue/rps_flow_cnt"
done
```

## Configure XPS

XPS maps transmit queues to specific CPUs:

```bash
# Map tx queue 0 to CPU 0, queue 1 to CPU 1, etc.
echo "1" | sudo tee /sys/class/net/eth0/queues/tx-0/xps_cpus
echo "2" | sudo tee /sys/class/net/eth0/queues/tx-1/xps_cpus
echo "4" | sudo tee /sys/class/net/eth0/queues/tx-2/xps_cpus
echo "8" | sudo tee /sys/class/net/eth0/queues/tx-3/xps_cpus
```

## Make Settings Persistent

```bash
sudo tee /etc/NetworkManager/dispatcher.d/99-rps-xps <<'EOF'
#!/bin/bash
if [ "$1" = "eth0" ] && [ "$2" = "up" ]; then
    for q in /sys/class/net/eth0/queues/rx-*; do
        echo "ff" > "$q/rps_cpus"
        echo 4096 > "$q/rps_flow_cnt"
    done
    echo 32768 > /proc/sys/net/core/rps_sock_flow_entries
fi
EOF
sudo chmod +x /etc/NetworkManager/dispatcher.d/99-rps-xps
```

## Verify

```bash
cat /sys/class/net/eth0/queues/rx-0/rps_cpus
cat /sys/class/net/eth0/queues/tx-0/xps_cpus
```

## Conclusion

RPS and XPS on RHEL 9 distribute network processing across CPU cores, preventing single-core bottlenecks on high-traffic servers. Configure them for NICs with fewer hardware queues than CPU cores.

