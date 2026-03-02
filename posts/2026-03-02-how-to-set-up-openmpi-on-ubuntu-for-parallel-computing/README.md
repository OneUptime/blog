# How to Set Up OpenMPI on Ubuntu for Parallel Computing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, OpenMPI, HPC, Parallel Computing, Linux

Description: Install and configure OpenMPI on Ubuntu for parallel computing applications, covering single-node and multi-node cluster setup, SSH key configuration, and running example MPI programs.

---

MPI (Message Passing Interface) is the standard for distributed-memory parallel computing. OpenMPI is one of the two dominant open-source implementations (alongside MPICH) and is widely used in scientific computing, simulations, and any application that needs to distribute work across multiple CPU cores or multiple machines. This guide covers getting it running on Ubuntu, from a single workstation to a multi-node cluster.

## Installing OpenMPI

OpenMPI is in Ubuntu's default repositories. For production HPC use, you may want to compile it with specific optimizations, but the packaged version works well for development and moderate workloads:

```bash
# Install OpenMPI runtime and development libraries
sudo apt update
sudo apt install -y openmpi-bin openmpi-common libopenmpi-dev

# Verify installation
mpirun --version
mpicc --version
mpic++ --version

# Check where MPI headers and libraries are
dpkg -L libopenmpi-dev | grep -E "include|lib"

# Optional: install MPI-parallel versions of common tools
sudo apt install -y hdf5-tools python3-mpi4py
```

## Writing a Simple MPI Program

The canonical first MPI program demonstrates the basic pattern of getting rank and size:

```c
/* hello_mpi.c - Basic MPI hello world */
#include <mpi.h>
#include <stdio.h>

int main(int argc, char** argv) {
    /* Initialize MPI environment */
    MPI_Init(&argc, &argv);

    /* Get total number of processes */
    int world_size;
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);

    /* Get this process's rank (0 to world_size-1) */
    int world_rank;
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);

    /* Get the processor name (hostname) */
    char processor_name[MPI_MAX_PROCESSOR_NAME];
    int name_len;
    MPI_Get_processor_name(processor_name, &name_len);

    printf("Hello from process %d of %d on %s\n",
           world_rank, world_size, processor_name);

    /* Finalize MPI - required before exit */
    MPI_Finalize();
    return 0;
}
```

Compile and run:

```bash
# Compile with mpicc (wrapper around gcc that adds MPI flags)
mpicc -o hello_mpi hello_mpi.c

# Run with 4 processes on the local machine
mpirun -np 4 ./hello_mpi

# Expected output (order may vary):
# Hello from process 0 of 4 on myhost
# Hello from process 2 of 4 on myhost
# Hello from process 1 of 4 on myhost
# Hello from process 3 of 4 on myhost
```

## A More Practical Example: Parallel Sum

This example divides a computation across processes using point-to-point communication:

```c
/* parallel_sum.c - Distribute array sum across MPI processes */
#include <mpi.h>
#include <stdio.h>
#include <stdlib.h>

#define ARRAY_SIZE 1000000

int main(int argc, char** argv) {
    MPI_Init(&argc, &argv);

    int rank, size;
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);

    /* Divide work among processes */
    int chunk = ARRAY_SIZE / size;
    int start = rank * chunk;
    int end = (rank == size - 1) ? ARRAY_SIZE : start + chunk;

    /* Each process computes its partial sum */
    double partial_sum = 0.0;
    for (int i = start; i < end; i++) {
        partial_sum += (double)i;
    }

    /* Reduce all partial sums to process 0 using MPI_Reduce */
    double total_sum = 0.0;
    MPI_Reduce(&partial_sum, &total_sum, 1, MPI_DOUBLE,
               MPI_SUM, 0, MPI_COMM_WORLD);

    /* Only process 0 prints the result */
    if (rank == 0) {
        printf("Sum of 0..%d = %.0f\n", ARRAY_SIZE - 1, total_sum);
        printf("Expected: %.0f\n",
               (double)(ARRAY_SIZE - 1) * ARRAY_SIZE / 2.0);
    }

    MPI_Finalize();
    return 0;
}
```

```bash
# Compile
mpicc -O2 -o parallel_sum parallel_sum.c

# Run with different process counts and observe speedup
time mpirun -np 1 ./parallel_sum
time mpirun -np 4 ./parallel_sum
time mpirun -np 8 ./parallel_sum
```

## Setting Up a Multi-Node Cluster

For multi-node MPI jobs, each node needs:
1. The same user account (same username and UID)
2. OpenMPI installed at the same path
3. Passwordless SSH access from the master node
4. Shared filesystem or copies of the executable

### Configure Passwordless SSH

```bash
# On the master node (the one that will launch mpirun)
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -f ~/.ssh/mpi_key -N ""

# Copy the public key to each worker node
ssh-copy-id -i ~/.ssh/mpi_key.pub user@worker-node-01
ssh-copy-id -i ~/.ssh/mpi_key.pub user@worker-node-02
ssh-copy-id -i ~/.ssh/mpi_key.pub user@worker-node-03

# Test passwordless login
ssh -i ~/.ssh/mpi_key user@worker-node-01 hostname

# Configure SSH to use this key for MPI connections
# Add to ~/.ssh/config
cat >> ~/.ssh/config << 'EOF'
Host worker-node-*
    IdentityFile ~/.ssh/mpi_key
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF
```

### Create a Hostfile

OpenMPI uses a hostfile to know which machines to use and how many processes each can run:

```bash
# /home/user/mpi_hosts
# Format: hostname slots=<number-of-cores>

cat > ~/mpi_hosts << 'EOF'
# Master node - 8 CPU cores
master-node slots=8
# Worker nodes
worker-node-01 slots=16
worker-node-02 slots=16
worker-node-03 slots=16
EOF
```

### Running Multi-Node Jobs

```bash
# Copy the executable to all nodes (or use a shared filesystem)
scp parallel_sum user@worker-node-01:~/
scp parallel_sum user@worker-node-02:~/
scp parallel_sum user@worker-node-03:~/

# Run across all nodes - 56 total processes (8 + 16 + 16 + 16)
mpirun --hostfile ~/mpi_hosts ./parallel_sum

# Override the number of processes
mpirun --hostfile ~/mpi_hosts -np 32 ./parallel_sum

# Use only specific hosts for this run
mpirun -H master-node,worker-node-01 -np 24 ./parallel_sum

# Run with verbose output to see process placement
mpirun --hostfile ~/mpi_hosts --display-map ./parallel_sum
```

## Using NFS for Shared Executable and Data

For multi-node jobs, a shared NFS mount makes distributing executables much easier:

```bash
# On the NFS server (master node), export the working directory
echo "/home/mpiuser/jobs *(rw,sync,no_subtree_check,no_root_squash)" | \
  sudo tee -a /etc/exports
sudo exportfs -ra

# On worker nodes, mount the shared directory
sudo mount master-node:/home/mpiuser/jobs /home/mpiuser/jobs

# Now compile once and run from any node
mpicc -O2 -o /home/mpiuser/jobs/myapp /home/mpiuser/jobs/myapp.c
mpirun --hostfile ~/mpi_hosts /home/mpiuser/jobs/myapp
```

## Environment Modules for OpenMPI Versions

On HPC systems, you often have multiple OpenMPI versions. The `environment-modules` package helps manage this:

```bash
# Install environment modules
sudo apt install -y environment-modules

# Create a modulefiles directory
sudo mkdir -p /opt/modulefiles/openmpi

# Create a module file for the system OpenMPI
sudo tee /opt/modulefiles/openmpi/4.1 << 'EOF'
#%Module1.0
proc ModulesHelp { } {
    puts stderr "OpenMPI 4.1 - system installation"
}
module-whatis "OpenMPI 4.1 MPI implementation"

set     prefix      /usr
prepend-path PATH $prefix/bin
prepend-path LD_LIBRARY_PATH $prefix/lib/x86_64-linux-gnu/openmpi/lib
prepend-path MANPATH $prefix/share/man
setenv MPI_HOME $prefix
EOF

# Add modulefiles directory to module path
echo "module use /opt/modulefiles" | sudo tee -a /etc/environment.d/modules.sh

# Use a module
module load openmpi/4.1
mpicc --version
```

## Python MPI with mpi4py

For Python users, `mpi4py` provides Pythonic bindings to MPI:

```bash
# Install mpi4py
sudo apt install -y python3-mpi4py
# Or via pip in a virtualenv
pip install mpi4py
```

```python
# parallel_pi.py - Calculate pi using MPI and Monte Carlo method
from mpi4py import MPI
import random
import math

def estimate_pi_chunk(n_samples):
    """Estimate pi using n_samples Monte Carlo throws."""
    inside = 0
    for _ in range(n_samples):
        x = random.random()
        y = random.random()
        if x*x + y*y <= 1.0:
            inside += 1
    return inside

comm = MPI.COMM_WORLD
rank = comm.Get_rank()
size = comm.Get_size()

# Total samples split across all processes
TOTAL_SAMPLES = 10_000_000
chunk = TOTAL_SAMPLES // size

# Each process estimates its chunk
local_inside = estimate_pi_chunk(chunk)

# Gather all counts to rank 0
total_inside = comm.reduce(local_inside, op=MPI.SUM, root=0)

if rank == 0:
    pi_estimate = 4.0 * total_inside / TOTAL_SAMPLES
    error = abs(pi_estimate - math.pi)
    print(f"Pi estimate: {pi_estimate:.6f}")
    print(f"Error: {error:.8f}")
    print(f"Computed across {size} processes")
```

```bash
# Run with 8 processes
mpirun -np 8 python3 parallel_pi.py
```

## Benchmarking with OSU Micro-Benchmarks

The OSU micro-benchmarks are standard tools for measuring MPI performance:

```bash
# Install from source
sudo apt install -y wget
wget https://mvapich.cse.ohio-state.edu/download/mvapich/osu-micro-benchmarks-7.2.tar.gz
tar xzf osu-micro-benchmarks-7.2.tar.gz
cd osu-micro-benchmarks-7.2
./configure CC=mpicc CXX=mpicxx
make -j$(nproc)

# Run point-to-point latency benchmark
cd mpi/pt2pt
mpirun -np 2 ./osu_latency

# Run bandwidth benchmark
mpirun -np 2 ./osu_bw

# Run all-reduce benchmark (collective operation)
cd ../collective
mpirun -np 4 ./osu_allreduce
```

OpenMPI provides the foundation for scaling computationally intensive work across cores and nodes. Once you've mastered the basic patterns - scatter/gather, broadcast, reduce - you have the tools to parallelize a wide range of scientific and data processing workloads.
