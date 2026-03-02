# How to Configure InfiniBand on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, InfiniBand, HPC, Networking, RDMA

Description: Step-by-step guide to configuring InfiniBand networking on Ubuntu for high-performance computing clusters with RDMA support.

---

InfiniBand is a high-speed, low-latency interconnect technology used in HPC clusters where standard Ethernet is too slow for the communication patterns of tightly coupled parallel workloads. Unlike Ethernet, InfiniBand supports Remote Direct Memory Access (RDMA), which allows nodes to directly read and write each other's memory without involving the CPU, dramatically reducing latency for MPI applications. This guide walks through installing the OFED stack, configuring InfiniBand devices, and verifying connectivity.

## Understanding the Stack

InfiniBand on Linux uses a software stack called OFED (OpenFabrics Enterprise Distribution). OFED includes:

- Kernel modules for InfiniBand hardware (mlx4, mlx5 for Mellanox/NVIDIA cards)
- User-space libraries (libibverbs, librdmacm)
- Management tools for subnet administration
- IP over InfiniBand (IPoIB) for running standard IP traffic over IB

Most modern InfiniBand hardware comes from NVIDIA (formerly Mellanox). The ConnectX-4/5/6/7 series are common in production clusters.

## Hardware Verification

Before configuring software, confirm the hardware is detected:

```bash
# Check if the IB adapter is recognized by the kernel
lspci | grep -i mellanox

# Check if the inbox kernel modules loaded
lsmod | grep -E 'mlx4|mlx5|ib_core'

# If modules are loaded, check IB devices
ls /dev/infiniband/
```

## Installing Mellanox OFED

While Ubuntu ships inbox RDMA drivers, the vendor-provided MLNX_OFED stack is recommended for production systems because it includes additional performance tuning, firmware tools, and bug fixes.

Download MLNX_OFED from NVIDIA's website and install:

```bash
# Example with MLNX_OFED 23.10 for Ubuntu 22.04
tar xvf MLNX_OFED_LINUX-23.10-0.5.5.0-ubuntu22.04-x86_64.tgz
cd MLNX_OFED_LINUX-23.10-0.5.5.0-ubuntu22.04-x86_64

# Install with all components
sudo ./mlnxofedinstall --all --without-32bit

# Reload the OpenSM and OpenIB services
sudo /etc/init.d/openibd restart
```

Alternatively, use the Ubuntu inbox OFED packages:

```bash
# Install inbox OFED packages
sudo apt update
sudo apt install rdma-core ibverbs-utils infiniband-diags perftest \
    libmlx5-1 mlnx-tools

# Load required kernel modules
sudo modprobe ib_uverbs
sudo modprobe ib_core
sudo modprobe mlx5_core
sudo modprobe mlx5_ib

# Make modules persistent
cat << 'EOF' | sudo tee /etc/modules-load.d/infiniband.conf
ib_uverbs
ib_core
mlx5_core
mlx5_ib
rdma_ucm
ib_umad
EOF
```

## Configuring the Subnet Manager

InfiniBand requires a Subnet Manager (SM) to assign LIDs (Local Identifiers) to nodes and manage the fabric. In small clusters, you can run the OpenSM software SM. In large clusters, a dedicated SM switch is common.

Install and configure OpenSM:

```bash
# Install OpenSM
sudo apt install opensm

# Configure OpenSM to start on boot
sudo systemctl enable opensm
sudo systemctl start opensm

# Check that OpenSM is discovering the fabric
sudo journalctl -u opensm | tail -20
```

Only run one SM per InfiniBand subnet. If using a managed IB switch with built-in SM, disable the software SM on your nodes.

## Verifying Port Status

After the SM is running, check the port status:

```bash
# Show InfiniBand device information
ibv_devinfo

# Show port details for a specific device
ibv_devinfo -d mlx5_0

# Check port state and speed
ibstat

# List all IB ports with their state
ibv_devinfo | grep -E 'device|port|state|max_mr_size|max_qp|active_mtu'
```

The port should show `PORT_ACTIVE` and an MTU of 4096 for most configurations.

## Configuring IP over InfiniBand

For applications that use standard IP networking, configure IPoIB to run IP traffic over the IB fabric:

```bash
# IPoIB interface names are typically ib0, ib1, etc.
# Check if the interface is already visible
ip link show | grep ib

# Configure a static IP for the IB interface
sudo nano /etc/netplan/02-infiniband.yaml
```

```yaml
# /etc/netplan/02-infiniband.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ib0:
      addresses:
        - 192.168.100.1/24  # Use a dedicated subnet for IB
      mtu: 65520            # Use jumbo frames for better IPoIB performance
```

Apply the configuration:

```bash
sudo netplan apply

# Verify the interface is up
ip addr show ib0
```

Set the IPoIB mode to Connected mode for better performance (vs Datagram mode):

```bash
# Enable connected mode
echo connected | sudo tee /sys/class/net/ib0/mode

# Make it persistent with udev rule
cat << 'EOF' | sudo tee /etc/udev/rules.d/70-infiniband.rules
ACTION=="add", SUBSYSTEM=="net", KERNEL=="ib*", RUN+="/bin/sh -c 'echo connected > /sys/class/net/%k/mode'"
EOF
```

## Performance Testing

Use the perftest utilities to benchmark the InfiniBand connection:

```bash
# On the server node - start the bandwidth test receiver
ib_send_bw

# On the client node - run the test against the server
ib_send_bw -d mlx5_0 server_hostname

# Test RDMA bandwidth
ib_read_bw server_hostname
ib_write_bw server_hostname

# Test latency
ib_send_lat server_hostname

# Test using IPoIB (IP-based)
ib_send_bw -R server_hostname
```

Expected results for a 100Gb/s HDR InfiniBand link:
- Bandwidth: ~12 GB/s for large messages
- Latency: 1-2 microseconds for small messages

## Configuring RDMA for MPI

MPI applications use the InfiniBand fabric through the UCX or OpenMPI libraries. Configure OpenMPI to prefer InfiniBand:

```bash
# Install OpenMPI with InfiniBand support
sudo apt install openmpi-bin libopenmpi-dev

# Configure MPI to use InfiniBand via UCX
export OMPI_MCA_pml=ucx
export OMPI_MCA_btl='^uct'
export UCX_NET_DEVICES=mlx5_0:1

# Test MPI over InfiniBand
mpirun --hostfile hosts.txt -np 8 -mca pml ucx ./mpi_benchmark
```

## Diagnosing Connectivity Issues

```bash
# Check the SM routing tables
ibroute

# Trace the path between two nodes
ibsysstat
ibping -G guid_of_destination

# Check for errors on the port
perfquery -x mlx5_0 1

# Show the complete subnet topology
ibnetdiscover

# Check for symbol errors (a reliable indicator of cable or transceiver issues)
infiniband-diags
ibcheckerrors
```

For persistent errors, check physical connections first - IB cables and transceivers are sensitive to contamination and improper seating. A dirty QSFP transceiver can cause symbol errors that look like software configuration problems.

With InfiniBand configured, your cluster nodes can communicate at wire speed with microsecond latency, which is essential for tightly coupled HPC workloads running MPI applications across many nodes.
