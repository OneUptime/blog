# How to Configure NVMe-oF (NVMe over Fabrics) on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Storage

Description: Step-by-step guide on configure nvme-of (nvme over fabrics) on rhel 9 with practical examples and commands.

---

NVMe over Fabrics (NVMe-oF) extends NVMe performance to remote storage on RHEL 9, providing low-latency access over network fabrics.

## Install NVMe-oF Packages

On the target (storage server):

```bash
sudo dnf install -y nvme-cli nvmet-cli
```

On the initiator (client):

```bash
sudo dnf install -y nvme-cli
```

## Configure the NVMe-oF Target

Load the required kernel modules:

```bash
sudo modprobe nvmet
sudo modprobe nvmet-tcp
```

Create a subsystem and namespace:

```bash
# Create subsystem
sudo mkdir -p /sys/kernel/config/nvmet/subsystems/nvme-target1
echo 1 | sudo tee /sys/kernel/config/nvmet/subsystems/nvme-target1/attr_allow_any_host

# Create namespace
sudo mkdir -p /sys/kernel/config/nvmet/subsystems/nvme-target1/namespaces/1
echo /dev/sdb | sudo tee /sys/kernel/config/nvmet/subsystems/nvme-target1/namespaces/1/device_path
echo 1 | sudo tee /sys/kernel/config/nvmet/subsystems/nvme-target1/namespaces/1/enable

# Create port
sudo mkdir -p /sys/kernel/config/nvmet/ports/1
echo "10.0.1.100" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_traddr
echo "tcp" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_trtype
echo "4420" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_trsvcid
echo "ipv4" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_adrfam

# Link subsystem to port
sudo ln -s /sys/kernel/config/nvmet/subsystems/nvme-target1 \
  /sys/kernel/config/nvmet/ports/1/subsystems/nvme-target1
```

## Configure Firewall on Target

```bash
sudo firewall-cmd --permanent --add-port=4420/tcp
sudo firewall-cmd --reload
```

## Connect from the Initiator

Discover available targets:

```bash
sudo nvme discover -t tcp -a 10.0.1.100 -s 4420
```

Connect to the target:

```bash
sudo nvme connect -t tcp -a 10.0.1.100 -s 4420 -n nvme-target1
```

## Verify the Connection

```bash
sudo nvme list
lsblk
```

## Configure Persistent Connections

```bash
sudo tee /etc/nvme/discovery.conf <<EOF
--transport=tcp --traddr=10.0.1.100 --trsvcid=4420
EOF
```

## Monitor NVMe-oF Performance

```bash
sudo nvme smart-log /dev/nvme1n1
sudo nvme io-passthru /dev/nvme1n1 --opcode=0x02 --data-len=4096
```

## Disconnect

```bash
sudo nvme disconnect -n nvme-target1
```

## Conclusion

NVMe-oF on RHEL 9 provides near-local NVMe performance over TCP networks. This is ideal for high-performance storage workloads that require low latency and high throughput remote storage access.

