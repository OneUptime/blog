# How to Configure RDMA over Converged Ethernet (RoCE) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RoCE, RDMA, Networking, High Performance

Description: Set up RDMA over Converged Ethernet (RoCE) on RHEL to get RDMA performance over standard Ethernet infrastructure without InfiniBand switches.

---

RoCE (RDMA over Converged Ethernet) brings RDMA capabilities to standard Ethernet networks. RoCE v2 runs over UDP/IP, making it routable across subnets. This is a cost-effective alternative to InfiniBand for low-latency workloads.

## Prerequisites

You need a NIC that supports RoCE (most Mellanox/NVIDIA ConnectX-4 and later, Broadcom, and Intel E810 adapters). The network should support Priority Flow Control (PFC) or ECN for lossless operation.

## Install RDMA Packages

```bash
# Install RDMA core libraries and tools
sudo dnf install -y rdma-core libibverbs libibverbs-utils \
    librdmacm-utils perftest

# Enable the RDMA service
sudo systemctl enable --now rdma
```

## Verify RoCE Support

```bash
# List RDMA devices
ibv_devices

# Check device details and GID table
ibv_devinfo -v

# View RoCE GIDs (look for RoCEv2 entries)
cat /sys/class/infiniband/mlx5_0/ports/1/gids/*
# Non-zero entries indicate active GIDs
```

## Configure the Ethernet Interface

```bash
# Set up the Ethernet interface with an IP
sudo nmcli connection modify enp1s0 ipv4.addresses 10.0.0.1/24 ipv4.method manual
sudo nmcli connection up enp1s0

# Set MTU to 9000 for jumbo frames (recommended for RoCE)
sudo nmcli connection modify enp1s0 802-3-ethernet.mtu 9000
sudo nmcli connection up enp1s0
```

## Configure Priority Flow Control (PFC)

PFC prevents packet drops, which is critical for RDMA:

```bash
# Install the Data Center Bridging tools
sudo dnf install -y lldpad

# Enable DCBX and PFC on priority 3
sudo dcbtool sc enp1s0 dcb on
sudo dcbtool sc enp1s0 pfc e:1 a:1 w:1

# Enable PFC on priority 3
sudo mlnx_qos -i enp1s0 --pfc 0,0,0,1,0,0,0,0
```

## Set RoCE Mode

Configure the adapter for RoCEv2 (recommended for routable RDMA):

```bash
# Check current RoCE mode
cat /sys/class/infiniband/mlx5_0/ports/1/gid_attrs/types/0

# Set default RoCE mode to v2 via cma_roce_mode
sudo cma_roce_mode -d mlx5_0 -p 1 -m 2
```

## Test RDMA Connectivity

On the server:

```bash
# Run an RDMA bandwidth server
ib_write_bw -d mlx5_0 --report_gbits
```

On the client:

```bash
# Connect and run bandwidth test
ib_write_bw -d mlx5_0 10.0.0.1 --report_gbits
```

## Test with rping

```bash
# Server
rping -s -a 10.0.0.1 -v -C 10

# Client
rping -c -a 10.0.0.1 -v -C 10
```

## Enable ECN (Alternative to PFC)

ECN marks packets instead of dropping them:

```bash
# Enable ECN on the interface
sudo sysctl -w net.ipv4.tcp_ecn=1

# Set ECN for RoCE traffic class
sudo mlnx_qos -i enp1s0 --trust dscp
```

## Firewall Rules

RoCE v2 uses UDP port 4791:

```bash
sudo firewall-cmd --permanent --add-port=4791/udp
sudo firewall-cmd --reload
```

RoCE on RHEL provides RDMA performance over existing Ethernet infrastructure, ideal for storage clusters and HPC workloads where InfiniBand is not available.
