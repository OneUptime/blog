# How to Configure NVMe-oF (NVMe over Fabrics) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NVMe, NVMe-oF, Storage, Networking, Performance

Description: Set up NVMe over Fabrics on RHEL to access remote NVMe storage over the network using RDMA or TCP transport, providing near-local performance for remote storage.

---

NVMe over Fabrics (NVMe-oF) extends the NVMe protocol over a network, allowing remote storage to be accessed with very low latency. RHEL supports NVMe-oF over both RDMA and TCP transports.

## Target (Storage Server) Configuration

### Install the NVMe Target Tools

```bash
# Install the nvme-cli and target tools
sudo dnf install -y nvmetcli nvme-cli

# Load the required kernel modules
sudo modprobe nvmet
sudo modprobe nvmet-tcp   # For TCP transport
# sudo modprobe nvmet-rdma  # For RDMA transport
```

### Configure the NVMe Target

```bash
# Create a target subsystem
sudo mkdir -p /sys/kernel/config/nvmet/subsystems/nqn.2025-01.com.example:storage

# Allow any host to connect (for testing)
echo 1 | sudo tee /sys/kernel/config/nvmet/subsystems/nqn.2025-01.com.example:storage/attr_allow_any_host

# Create a namespace and link it to a block device
sudo mkdir -p /sys/kernel/config/nvmet/subsystems/nqn.2025-01.com.example:storage/namespaces/1
echo "/dev/sdb" | sudo tee /sys/kernel/config/nvmet/subsystems/nqn.2025-01.com.example:storage/namespaces/1/device_path
echo 1 | sudo tee /sys/kernel/config/nvmet/subsystems/nqn.2025-01.com.example:storage/namespaces/1/enable

# Create a TCP port
sudo mkdir -p /sys/kernel/config/nvmet/ports/1
echo "tcp" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_trtype
echo "192.168.1.10" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_traddr
echo "4420" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_trsvcid
echo "ipv4" | sudo tee /sys/kernel/config/nvmet/ports/1/addr_adrfam

# Link the subsystem to the port
sudo ln -s /sys/kernel/config/nvmet/subsystems/nqn.2025-01.com.example:storage \
  /sys/kernel/config/nvmet/ports/1/subsystems/nqn.2025-01.com.example:storage
```

## Open the Firewall on the Target

```bash
sudo firewall-cmd --permanent --add-port=4420/tcp
sudo firewall-cmd --reload
```

## Initiator (Client) Configuration

```bash
# Install nvme-cli on the client
sudo dnf install -y nvme-cli

# Load the client module
sudo modprobe nvme-tcp

# Discover available targets
sudo nvme discover -t tcp -a 192.168.1.10 -s 4420

# Connect to the remote NVMe target
sudo nvme connect -t tcp -n nqn.2025-01.com.example:storage \
  -a 192.168.1.10 -s 4420

# Verify the connection
sudo nvme list
lsblk
```

The remote NVMe device appears as a local `/dev/nvmeXnY` device. You can format it, mount it, and use it like any local disk.

## Disconnect

```bash
# Disconnect from the remote target
sudo nvme disconnect -n nqn.2025-01.com.example:storage
```

For persistent connections across reboots, save the configuration using `nvmetcli` on the target side and use `/etc/nvme/discovery.conf` on the initiator.
