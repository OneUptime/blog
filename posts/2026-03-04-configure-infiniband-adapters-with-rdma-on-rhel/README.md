# How to Configure InfiniBand Adapters with RDMA on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, InfiniBand, RDMA, High Performance Computing, Networking

Description: Install and configure InfiniBand adapters with RDMA support on RHEL for high-performance, low-latency networking in HPC and storage environments.

---

InfiniBand with RDMA (Remote Direct Memory Access) provides extremely low latency and high throughput by allowing network adapters to read and write memory directly without involving the CPU. This is essential for HPC clusters, high-frequency trading, and distributed storage.

## Install InfiniBand and RDMA Packages

```bash
# Install the RDMA core packages and InfiniBand utilities
sudo dnf install -y rdma-core libibverbs libibverbs-utils \
    infiniband-diags perftest librdmacm-utils

# Install the InfiniBand subnet manager (if this node is the SM)
sudo dnf install -y opensm
```

## Load and Verify Kernel Modules

```bash
# Load InfiniBand kernel modules
sudo modprobe ib_core
sudo modprobe ib_uverbs
sudo modprobe mlx5_ib    # For Mellanox/NVIDIA ConnectX adapters

# Verify modules are loaded
lsmod | grep ib_

# Check for InfiniBand devices
ibstat
```

## Check Adapter Status

```bash
# View detailed adapter information
ibstat

# Example output shows port state, link speed, and LID
# State should be "Active" and Physical state "LinkUp"

# List all RDMA devices
ibv_devices

# Get detailed device info
ibv_devinfo
```

## Start the Subnet Manager

If your InfiniBand fabric does not have a dedicated subnet manager, run OpenSM on one node:

```bash
# Enable and start the subnet manager
sudo systemctl enable --now opensm

# Check the SM status
sudo sminfo
```

## Configure the InfiniBand Interface

```bash
# View the IB interface
ip link show ib0

# Assign an IP address using nmcli
sudo nmcli connection add type infiniband ifname ib0 con-name ib0 \
    ipv4.addresses 10.0.0.1/24 ipv4.method manual

# Bring up the connection
sudo nmcli connection up ib0
```

## Test RDMA Connectivity

Use the built-in RDMA ping tool:

On the server:

```bash
# Start the RDMA CM server
rping -s -v -C 10
```

On the client:

```bash
# Connect to the RDMA server
rping -c -a 10.0.0.1 -v -C 10
```

## Verify with ibping

```bash
# On the server (use the LID from ibstat)
ibping -S

# On the client
ibping -L 1    # Replace 1 with the server's LID
```

## Enable RDMA Service

```bash
# Enable the RDMA service for persistent configuration
sudo systemctl enable --now rdma
```

## Firewall Considerations

InfiniBand typically runs on a dedicated fabric and does not go through the standard firewall. If you need to allow IPoIB traffic:

```bash
sudo firewall-cmd --permanent --zone=trusted --add-interface=ib0
sudo firewall-cmd --reload
```

With InfiniBand and RDMA configured, your RHEL system is ready for high-performance workloads that require low-latency data transfer.
