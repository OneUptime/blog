# How to Set Up MPI Cluster on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MPI, HPC, Parallel Computing, Cluster

Description: Learn how to set up an MPI cluster on Ubuntu using OpenMPI, configure passwordless SSH, and run parallel programs across multiple nodes.

---

MPI (Message Passing Interface) is the standard for parallel programming in high-performance computing. It allows a single program to run across many machines simultaneously, with processes communicating by passing messages. This tutorial sets up a multi-node OpenMPI cluster on Ubuntu - commonly used for scientific computing, simulations, machine learning training, and any workload that benefits from distributing computation.

## Prerequisites

- Two or more Ubuntu 22.04 machines (physical or virtual)
- All machines on the same network
- A shared NFS filesystem (recommended but optional)
- Root or sudo access on all nodes

For this guide, nodes will be called:
- `head-node` (192.168.1.10) - the node from which jobs are submitted
- `compute-node-01` (192.168.1.11)
- `compute-node-02` (192.168.1.12)

## Setting Up Hostnames and /etc/hosts

On all nodes, configure consistent hostname resolution:

```bash
# On each node, set the appropriate hostname
# On head-node:
sudo hostnamectl set-hostname head-node

# On compute-node-01:
sudo hostnamectl set-hostname compute-node-01

# On head-node:
sudo hostnamectl set-hostname compute-node-02

# On ALL nodes, add all cluster hosts to /etc/hosts
sudo tee -a /etc/hosts > /dev/null <<'EOF'
192.168.1.10 head-node
192.168.1.11 compute-node-01
192.168.1.12 compute-node-02
EOF
```

## Creating a Dedicated MPI User

Use a shared user account across all nodes for running MPI jobs:

```bash
# On ALL nodes, create the mpiuser account with the same UID
sudo adduser --uid 2000 mpiuser

# Set the same password on all nodes, or use SSH keys (preferred)
```

## Configuring Passwordless SSH

MPI needs to SSH between nodes without passwords. Do this as `mpiuser`:

```bash
# On the head node, switch to mpiuser
sudo su - mpiuser

# Generate an SSH key pair
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# Copy the public key to all compute nodes
ssh-copy-id mpiuser@compute-node-01
ssh-copy-id mpiuser@compute-node-02

# Also authorize localhost to support single-node runs
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Test passwordless SSH
ssh mpiuser@compute-node-01 hostname
ssh mpiuser@compute-node-02 hostname
```

## Installing OpenMPI on All Nodes

Run the following on every node in the cluster:

```bash
# Update and install OpenMPI
sudo apt update
sudo apt install -y openmpi-bin openmpi-common libopenmpi-dev

# Verify installation
mpirun --version
mpicc --version

# Install additional HPC tools
sudo apt install -y build-essential libhdf5-dev
```

## Setting Up a Shared Filesystem with NFS

NFS allows all nodes to share the same home directory and executables. This avoids copying binaries to every node manually.

### On the Head Node (NFS Server)

```bash
sudo apt install -y nfs-kernel-server

# Create the shared directory
sudo mkdir -p /shared
sudo chown mpiuser:mpiuser /shared

# Export the directory
echo "/shared 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)" \
  | sudo tee -a /etc/exports

# Apply the export configuration
sudo exportfs -a
sudo systemctl enable --now nfs-kernel-server
```

### On Compute Nodes (NFS Clients)

```bash
sudo apt install -y nfs-common

# Create the mount point
sudo mkdir -p /shared

# Mount the NFS share
sudo mount head-node:/shared /shared

# Make it persistent across reboots
echo "head-node:/shared /shared nfs defaults,_netdev 0 0" \
  | sudo tee -a /etc/fstab

# Test the mount
ls -la /shared
```

## Writing and Running an MPI Program

### Hello World in C

Create this file on the shared filesystem as `mpiuser`:

```bash
sudo su - mpiuser
mkdir -p /shared/mpi_examples
cat > /shared/mpi_examples/hello_mpi.c <<'EOF'
#include <mpi.h>
#include <stdio.h>

int main(int argc, char *argv[]) {
    int rank, size;
    char hostname[256];
    int hostname_len;

    // Initialize MPI environment
    MPI_Init(&argc, &argv);

    // Get the number of processes
    MPI_Comm_size(MPI_COMM_WORLD, &size);

    // Get the rank of this process
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);

    // Get the hostname of this machine
    MPI_Get_processor_name(hostname, &hostname_len);

    printf("Hello from rank %d of %d on host %s\n", rank, size, hostname);

    // Finalize the MPI environment
    MPI_Finalize();
    return 0;
}
EOF

# Compile the program
mpicc -o /shared/mpi_examples/hello_mpi /shared/mpi_examples/hello_mpi.c
```

### Running on Multiple Nodes

```bash
# Create a hostfile listing nodes and their processor counts
cat > /shared/hostfile <<'EOF'
head-node slots=4
compute-node-01 slots=4
compute-node-02 slots=4
EOF

# Run with 12 total processes distributed across all nodes
mpirun --hostfile /shared/hostfile -np 12 /shared/mpi_examples/hello_mpi

# Expected output (order may vary):
# Hello from rank 0 of 12 on host head-node
# Hello from rank 4 of 12 on host compute-node-01
# Hello from rank 8 of 12 on host compute-node-02
# ... etc
```

## Point-to-Point Communication Example

```bash
cat > /shared/mpi_examples/send_recv.c <<'EOF'
#include <mpi.h>
#include <stdio.h>

int main(int argc, char *argv[]) {
    int rank, size, data;

    MPI_Init(&argc, &argv);
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);

    if (rank == 0) {
        // Process 0 sends data to process 1
        data = 42;
        MPI_Send(&data, 1, MPI_INT, 1, 0, MPI_COMM_WORLD);
        printf("Process 0: Sent %d to process 1\n", data);
    } else if (rank == 1) {
        // Process 1 receives data from process 0
        MPI_Recv(&data, 1, MPI_INT, 0, 0, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
        printf("Process 1: Received %d from process 0\n", data);
    }

    MPI_Finalize();
    return 0;
}
EOF

mpicc -o /shared/mpi_examples/send_recv /shared/mpi_examples/send_recv.c

# Run with at least 2 processes
mpirun --hostfile /shared/hostfile -np 2 /shared/mpi_examples/send_recv
```

## Performance Tuning

### Binding Processes to CPU Cores

```bash
# Bind each MPI process to a specific CPU core for better cache performance
mpirun --hostfile /shared/hostfile -np 12 \
  --bind-to core \
  --map-by core \
  /shared/mpi_examples/hello_mpi
```

### Using High-Speed Interconnects

If your nodes have InfiniBand:

```bash
# Install OFED and OpenMPI with InfiniBand support
sudo apt install -y libopenmpi-dev openmpi-bin rdma-core

# Run with InfiniBand transport
mpirun --hostfile /shared/hostfile -np 12 \
  --mca btl openib,self,sm \
  /shared/mpi_examples/hello_mpi
```

## Troubleshooting

### SSH Authentication Failures During mpirun

```bash
# Test SSH manually as mpiuser
ssh -v mpiuser@compute-node-01 hostname

# Ensure StrictHostKeyChecking is disabled for cluster nodes
cat >> ~/.ssh/config <<'EOF'
Host 192.168.1.*
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF
```

### Process Spawn Failures

```bash
# Check that OpenMPI is installed on all nodes
ssh compute-node-01 mpirun --version
ssh compute-node-02 mpirun --version

# Verify the binary is accessible on all nodes (via NFS)
ssh compute-node-01 ls -la /shared/mpi_examples/hello_mpi
```

### Slow Performance

```bash
# Check network latency between nodes
ping -c 10 compute-node-01

# Use the OSU MPI benchmark suite for detailed performance analysis
sudo apt install -y openmpi-bin
# Download and build OSU benchmarks from http://mvapich.cse.ohio-state.edu/benchmarks/
```

OpenMPI on Ubuntu is a solid foundation for parallel computing. Once the basic cluster is working, you can layer on job schedulers like SLURM for managing multiple users and workloads, which transforms this setup into a proper HPC cluster.
