# How to Configure NVMe over Fabrics on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NVMe, Storage, NVMeoF, Performance

Description: Configure NVMe over Fabrics (NVMeoF) on Ubuntu using TCP transport to expose NVMe storage over a network with low latency and high throughput.

---

NVMe over Fabrics (NVMeoF) extends the NVMe protocol over network transports, allowing remote NVMe SSDs to be accessed with latency approaching local NVMe performance. Where traditional iSCSI adds significant overhead through SCSI translation layers, NVMeoF uses the NVMe command set natively over the network. For storage-intensive workloads - databases, analytics, AI training pipelines - the difference in latency and IOPS is measurable.

Ubuntu supports NVMeoF over several transports:
- **TCP** - Standard Ethernet, no special hardware required
- **RDMA (RoCE/InfiniBand)** - Lower latency, requires RDMA-capable NICs
- **Fibre Channel (FC-NVMe)** - For existing FC infrastructure

This guide covers TCP transport, which works on any Ubuntu server with standard NICs.

## Architecture

- Target (storage server): 192.168.1.10 - has local NVMe SSDs to export
- Host (client): 192.168.1.20 - will access the remote NVMe devices

## Setting Up the NVMeoF Target

### Load Required Kernel Modules

```bash
# On the target server
# Load the NVMe target core modules
sudo modprobe nvmet
sudo modprobe nvmet-tcp

# For RDMA transport (if applicable)
# sudo modprobe nvmet-rdma

# Make module loading persistent
cat << 'EOF' | sudo tee /etc/modules-load.d/nvmet.conf
nvmet
nvmet-tcp
EOF
```

### Configure the NVMeoF Target via configfs

The NVMeoF target is configured through the configfs filesystem (usually mounted at `/sys/kernel/config`):

```bash
# Check if configfs is mounted
mount | grep configfs
# If not: sudo mount -t configfs none /sys/kernel/config

# Create a subsystem (the NVMe namespace identifier)
SUBSYS_NQN="nqn.2026-03.com.example:nvme.storage01"

# Create the subsystem directory
sudo mkdir -p /sys/kernel/config/nvmet/subsystems/${SUBSYS_NQN}

# Allow any host to connect (set to 1)
# For production, use specific host NQNs instead
echo 1 | sudo tee /sys/kernel/config/nvmet/subsystems/${SUBSYS_NQN}/attr_allow_any_host

# Create a namespace within the subsystem
sudo mkdir -p /sys/kernel/config/nvmet/subsystems/${SUBSYS_NQN}/namespaces/1

# Point the namespace to a local NVMe device
echo "/dev/nvme0n1" | sudo tee /sys/kernel/config/nvmet/subsystems/${SUBSYS_NQN}/namespaces/1/device_path

# Enable the namespace
echo 1 | sudo tee /sys/kernel/config/nvmet/subsystems/${SUBSYS_NQN}/namespaces/1/enable
```

### Create a TCP Port

```bash
# Create a TCP port for connections
sudo mkdir -p /sys/kernel/config/nvmet/ports/1

# Set transport type to TCP
echo "tcp" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_trtype

# Set the target IP address
echo "192.168.1.10" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_traddr

# Set the address family (IPv4)
echo "ipv4" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_adrfam

# Set the NVMeoF port (default: 4420)
echo "4420" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_trsvcid

# Link the subsystem to this port
sudo ln -s /sys/kernel/config/nvmet/subsystems/${SUBSYS_NQN} \
  /sys/kernel/config/nvmet/ports/1/subsystems/${SUBSYS_NQN}
```

### Using nvmetcli for Easier Configuration

The `nvmetcli` tool provides a targetcli-like interface for NVMeoF:

```bash
sudo apt install nvmetcli -y

# Launch the interactive shell
sudo nvmetcli

# Inside nvmetcli:
# ls                - list current configuration
# cd subsystems
# create nqn.2026-03.com.example:nvme.storage01
# cd nqn.2026-03.com.example:nvme.storage01
# cd namespaces
# create 1
# cd 1
# set device_path /dev/nvme0n1
# enable
# cd /ports
# create 1
# cd 1
# set addr_trtype tcp
# set addr_traddr 192.168.1.10
# set addr_adrfam ipv4
# set addr_trsvcid 4420
# cd subsystems
# create nqn.2026-03.com.example:nvme.storage01
# saveconfig /etc/nvmet/config.json
```

### Make Configuration Persistent

```bash
# Save current configuration
sudo nvmetcli saveconfig /etc/nvmet/config.json

# Create a systemd service to restore on boot
cat << 'EOF' | sudo tee /etc/systemd/system/nvmet.service
[Unit]
Description=NVMe-oF Target Configuration
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/nvmetcli restore /etc/nvmet/config.json
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now nvmet.service
```

### Open Firewall

```bash
sudo ufw allow 4420/tcp
```

## Setting Up the NVMeoF Host

### Load Host Modules

```bash
# On the client/host machine
sudo modprobe nvme-tcp

# Persistent loading
echo "nvme-tcp" | sudo tee /etc/modules-load.d/nvme-tcp.conf
```

### Discover Available Subsystems

```bash
# Discover NVMeoF targets on the storage server
sudo nvme discover -t tcp -a 192.168.1.10 -s 4420
```

Expected output:
```text
Discovery Log Number of Records 1, Generation counter 1
=====Discovery Log Entry 0======
trtype:  tcp
adrfam:  ipv4
subtype: nvme subsystem
treq:    not required
portid:  1
trsvcid: 4420
subnqn:  nqn.2026-03.com.example:nvme.storage01
traddr:  192.168.1.10
```

### Connect to the NVMeoF Target

```bash
# Connect to the subsystem
sudo nvme connect -t tcp -a 192.168.1.10 -s 4420 -n nqn.2026-03.com.example:nvme.storage01

# List connected NVMe devices
sudo nvme list

# The remote NVMe should appear as /dev/nvmeXn1
ls -la /dev/nvme*
```

### Verify Connection

```bash
# Show all subsystems (local and remote)
sudo nvme list-subsys

# Get device information
sudo nvme id-ctrl /dev/nvme1

# Check connection transport type
cat /sys/class/nvme/nvme1/transport
```

### Perform a Basic I/O Test

```bash
# Run a quick performance check with fio
sudo apt install fio -y

# Sequential read test
sudo fio --name=nvmeof-read --filename=/dev/nvme1n1 --rw=read --bs=128k \
  --direct=1 --numjobs=4 --size=1G --time_based --runtime=30 \
  --group_reporting

# Random read IOPS test
sudo fio --name=nvmeof-randrw --filename=/dev/nvme1n1 --rw=randrw --bs=4k \
  --direct=1 --numjobs=8 --size=1G --time_based --runtime=30 \
  --group_reporting
```

## Using the Remote NVMe Device

Once connected, the remote NVMe device works like a local device:

```bash
# Create a filesystem
sudo mkfs.xfs /dev/nvme1n1

# Mount it
sudo mkdir -p /mnt/nvmeof
sudo mount /dev/nvme1n1 /mnt/nvmeof

# For persistent mounting, use the device path approach
# since NVMe device numbers can change on reconnect
# Use the UUID instead:
sudo blkid /dev/nvme1n1
# UUID=xxxx-xxxx /mnt/nvmeof xfs defaults,_netdev 0 0
```

## Persistent Host Connections

```bash
# Create a persistent connect configuration
cat << 'EOF' | sudo tee /etc/nvme/discovery.conf
-t tcp
-a 192.168.1.10
-s 4420
EOF

# Enable the nvme-connect-all service
sudo systemctl enable nvme-connect-all.service
```

## Monitoring NVMeoF

```bash
# On the target - check connected hosts
ls /sys/kernel/config/nvmet/ports/1/subsystems/

# Check namespace status
cat /sys/kernel/config/nvmet/subsystems/nqn.2026-03.com.example:nvme.storage01/namespaces/1/enable

# On the host - check path statistics
cat /sys/class/nvme/nvme1/transport_type
cat /sys/class/nvme/nvme1/address

# View I/O queue information
ls /sys/class/nvme/nvme1/

# Monitor device I/O with iostat
iostat -xz /dev/nvme1n1 2
```

## Reconnect Configuration

```bash
# Set reconnect behavior on the host
# Check current ctrl_loss_tmo (seconds before giving up on reconnect)
cat /sys/class/nvme/nvme1/ctrl_loss_tmo

# Adjust reconnect timer (in seconds, -1 for infinite retry)
echo 600 | sudo tee /sys/class/nvme/nvme1/ctrl_loss_tmo
```

## Troubleshooting

```bash
# If discovery fails - check that nvmet-tcp module is loaded on target
lsmod | grep nvmet
cat /sys/kernel/config/nvmet/ports/1/addr_trtype

# Connection refused
nc -zv 192.168.1.10 4420

# Host can't see device after connect
dmesg | grep -i nvme | tail -20

# Disconnect a specific controller
sudo nvme disconnect -n nqn.2026-03.com.example:nvme.storage01

# Disconnect all
sudo nvme disconnect-all
```

NVMeoF over TCP delivers meaningful latency improvements over iSCSI for NVMe-backed storage, particularly for workloads doing many small random I/Os. For latency-critical applications, consider RDMA (RoCE v2) transport which reduces CPU overhead further and brings latency even closer to local NVMe.
