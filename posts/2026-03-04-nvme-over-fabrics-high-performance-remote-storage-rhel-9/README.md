# How to Configure NVMe over Fabrics for High-Performance Remote Storage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NVMe, NVMe-oF, Storage, High Performance, Linux

Description: Set up NVMe over Fabrics on RHEL to access remote NVMe storage with near-local performance using RDMA or TCP transport.

---

NVMe over Fabrics (NVMe-oF) extends the NVMe protocol across a network, allowing remote NVMe storage to be accessed with latency and throughput close to local NVMe drives. Unlike iSCSI, which translates between SCSI and network protocols, NVMe-oF speaks NVMe natively, eliminating protocol translation overhead.

## Transport Options

NVMe-oF supports several transports:

- **RDMA (RoCE/InfiniBand)**: Lowest latency, highest throughput. Requires RDMA-capable NICs.
- **TCP**: Works over standard Ethernet. No special hardware required. Good enough for most workloads.
- **Fibre Channel**: NVMe over FC (FC-NVMe). Requires FC HBAs.

This guide covers NVMe/TCP, which is the most accessible option.

## Prerequisites

- Two RHEL servers (target and initiator)
- NVMe drive on the target server (or a block device to export)
- Network connectivity between the servers

## Setting Up the NVMe Target

### Install the Target Software

```bash
sudo dnf install -y nvme-cli nvmetcli
```

### Load the Kernel Modules

```bash
sudo modprobe nvmet
sudo modprobe nvmet-tcp
```

Make them persistent:

```bash
echo nvmet | sudo tee /etc/modules-load.d/nvmet.conf
echo nvmet-tcp | sudo tee -a /etc/modules-load.d/nvmet.conf
```

### Configure the Target Using sysfs

Create a subsystem:

```bash
SUBSYS="nqn.2024.com.example:nvme-target"
sudo mkdir -p /sys/kernel/config/nvmet/subsystems/$SUBSYS
echo 1 | sudo tee /sys/kernel/config/nvmet/subsystems/$SUBSYS/attr_allow_any_host
```

Create a namespace (map a block device):

```bash
sudo mkdir -p /sys/kernel/config/nvmet/subsystems/$SUBSYS/namespaces/1
echo /dev/nvme0n1 | sudo tee /sys/kernel/config/nvmet/subsystems/$SUBSYS/namespaces/1/device_path
echo 1 | sudo tee /sys/kernel/config/nvmet/subsystems/$SUBSYS/namespaces/1/enable
```

Create a port (network endpoint):

```bash
sudo mkdir -p /sys/kernel/config/nvmet/ports/1
echo 192.168.1.10 | sudo tee /sys/kernel/config/nvmet/ports/1/addr_traddr
echo 4420 | sudo tee /sys/kernel/config/nvmet/ports/1/addr_trsvcid
echo tcp | sudo tee /sys/kernel/config/nvmet/ports/1/addr_trtype
echo ipv4 | sudo tee /sys/kernel/config/nvmet/ports/1/addr_adrfam
```

Link the subsystem to the port:

```bash
sudo ln -s /sys/kernel/config/nvmet/subsystems/$SUBSYS /sys/kernel/config/nvmet/ports/1/subsystems/$SUBSYS
```

### Configure the Firewall

```bash
sudo firewall-cmd --permanent --add-port=4420/tcp
sudo firewall-cmd --reload
```

## Setting Up the NVMe Initiator

### Install the Client Software

```bash
sudo dnf install -y nvme-cli
```

### Load the Kernel Module

```bash
sudo modprobe nvme-tcp
echo nvme-tcp | sudo tee /etc/modules-load.d/nvme-tcp.conf
```

### Discover Available Targets

```bash
sudo nvme discover -t tcp -a 192.168.1.10 -s 4420
```

Output shows available subsystems:

```
Discovery Log Number of Records 1, Generation counter 1
=====Discovery Log Entry 0======
trtype:  tcp
adrfam:  ipv4
subtype: nvme subsystem
treq:    not required
portid:  1
trsvcid: 4420
subnqn:  nqn.2024.com.example:nvme-target
traddr:  192.168.1.10
```

### Connect to the Target

```bash
sudo nvme connect -t tcp -a 192.168.1.10 -s 4420 \
    -n nqn.2024.com.example:nvme-target
```

### Verify the Connection

```bash
# List NVMe devices
sudo nvme list

# Check the connected controllers
sudo nvme list-subsys
```

A new NVMe device (e.g., `/dev/nvme1n1`) should appear.

### Use the Device

```bash
sudo mkfs.xfs /dev/nvme1n1
sudo mkdir -p /mnt/nvme-remote
sudo mount /dev/nvme1n1 /mnt/nvme-remote
```

## Persistent Connection

To reconnect automatically at boot:

```bash
sudo tee /etc/nvme/discovery.conf << 'DISC'
--transport=tcp --traddr=192.168.1.10 --trsvcid=4420
DISC

# Enable the connect-all service
sudo systemctl enable --now nvmf-autoconnect.service
```

Or create a systemd service:

```bash
sudo tee /etc/systemd/system/nvme-connect.service << 'SVC'
[Unit]
Description=NVMe-oF Connect
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/nvme connect -t tcp -a 192.168.1.10 -s 4420 -n nqn.2024.com.example:nvme-target

[Install]
WantedBy=multi-user.target
SVC

sudo systemctl daemon-reload
sudo systemctl enable nvme-connect.service
```

## Disconnecting

```bash
# Disconnect a specific subsystem
sudo nvme disconnect -n nqn.2024.com.example:nvme-target

# Disconnect all
sudo nvme disconnect-all
```

## Performance Comparison

Typical performance characteristics:

| Access Method | Latency | Throughput |
|---|---|---|
| Local NVMe | ~10 us | ~3.5 GB/s |
| NVMe/TCP (25GbE) | ~50-100 us | ~2.5 GB/s |
| NVMe/RDMA (25GbE) | ~20-30 us | ~3.0 GB/s |
| iSCSI (25GbE) | ~100-200 us | ~2.0 GB/s |

## Conclusion

NVMe over Fabrics with TCP transport provides high-performance remote storage access without requiring special hardware. It is significantly faster than iSCSI for latency-sensitive workloads. For the absolute lowest latency, use RDMA transport with compatible network adapters. NVMe-oF is well-suited for disaggregated storage architectures and high-performance computing environments.
