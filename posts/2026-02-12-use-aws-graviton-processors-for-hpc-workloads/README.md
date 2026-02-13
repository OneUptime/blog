# How to Use AWS Graviton Processors for HPC Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Graviton, ARM, HPC, EC2, Performance, Cost Optimization

Description: Learn how to leverage AWS Graviton ARM-based processors for high-performance computing workloads with better price-performance than x86 instances.

---

AWS Graviton processors are ARM-based chips designed by Amazon. They offer significantly better price-performance than comparable x86 instances for many workloads. The latest Graviton4 processors deliver up to 30% better compute performance than Graviton3, and Graviton instances typically cost 20-40% less than equivalent Intel or AMD instances.

For HPC workloads, this translates to running the same simulations for less money, or running bigger simulations for the same money. But moving to ARM requires some preparation. This guide covers what you need to know.

## Why Graviton for HPC?

The numbers tell the story:

- **C7g instances** (Graviton3) deliver up to 25% better performance than C6i (Intel) for compute-bound workloads, at 20% lower cost
- **HPC7g instances** are specifically designed for HPC, with 200 Gbps EFA networking and DDR5 memory
- Graviton3 supports bfloat16 and SVE (Scalable Vector Extensions), which are useful for scientific computing and ML inference
- Lower power consumption per compute unit

The catch: your software needs to be compiled for ARM (aarch64). Most modern compilers and libraries support this, but you need to verify your specific toolchain.

## Graviton Instance Types for HPC

| Instance Type | Processor | vCPUs | Memory | Network | Best For |
|---|---|---|---|---|---|
| c7g.16xlarge | Graviton3 | 64 | 128 GB | 30 Gbps | General compute |
| c7gn.16xlarge | Graviton3 | 64 | 128 GB | 200 Gbps | Network-intensive |
| hpc7g.16xlarge | Graviton3E | 64 | 128 GB | 200 Gbps EFA | Tightly-coupled HPC |
| m7g.16xlarge | Graviton3 | 64 | 256 GB | 30 Gbps | Memory + compute |
| r7g.16xlarge | Graviton3 | 64 | 512 GB | 30 Gbps | Memory-intensive |

The `hpc7g` instances are purpose-built for HPC. They have higher sustained clock speeds and EFA networking for MPI communication.

## Step 1: Verify Software Compatibility

Before provisioning instances, check that your HPC software stack supports ARM.

```bash
# Check if your binary is compiled for ARM or x86
file /path/to/your/binary
# ARM output: ELF 64-bit LSB executable, ARM aarch64
# x86 output: ELF 64-bit LSB executable, x86-64

# Check what architecture your current system runs
uname -m
# x86_64 = Intel/AMD
# aarch64 = ARM/Graviton
```

Common HPC software with ARM support:

- **OpenMPI** - Full support since version 4.0
- **GROMACS** - Native ARM support with NEON/SVE optimizations
- **OpenFOAM** - Compiles natively on ARM
- **WRF** (Weather Research and Forecasting) - ARM support available
- **LAMMPS** - ARM support with NEON optimizations
- **NAMD** - ARM builds available
- **GCC** - Full aarch64 support
- **LLVM/Clang** - Full aarch64 support
- **Python** (NumPy, SciPy) - Full ARM support

## Step 2: Set Up a Graviton-Based HPC Cluster

Using AWS ParallelCluster, you can spin up a Graviton cluster with Slurm.

```yaml
# graviton-cluster-config.yaml
Region: us-east-1
Image:
  Os: alinux2
  # Use ARM-based AMI
  CustomAmi: ami-0graviton-hpc-ami

HeadNode:
  InstanceType: m7g.xlarge
  Networking:
    SubnetId: subnet-0abc123
  Ssh:
    KeyName: my-hpc-key

Scheduling:
  Scheduler: slurm
  SlurmQueues:
    - Name: graviton-compute
      ComputeResources:
        - Name: hpc7g-nodes
          InstanceType: hpc7g.16xlarge
          MinCount: 0
          MaxCount: 64
      Networking:
        SubnetIds:
          - subnet-0abc123
        PlacementGroup:
          Enabled: true
    - Name: graviton-general
      ComputeResources:
        - Name: c7g-nodes
          InstanceType: c7g.16xlarge
          MinCount: 0
          MaxCount: 100
      Networking:
        SubnetIds:
          - subnet-0abc123

SharedStorage:
  - MountDir: /shared
    Name: shared-storage
    StorageType: Ebs
    EbsSettings:
      VolumeType: gp3
      Size: 500
```

For more on ParallelCluster setup, see our guide on [setting up AWS ParallelCluster for HPC](https://oneuptime.com/blog/post/2026-02-12-set-up-aws-parallelcluster-for-hpc/view).

```bash
# Create the Graviton cluster
pcluster create-cluster \
  --cluster-name graviton-hpc \
  --cluster-configuration graviton-cluster-config.yaml
```

## Step 3: Compile Your Code for ARM

If you need to build from source, here is how to compile common HPC applications on Graviton.

```bash
# Compile with GCC and ARM-specific optimizations
# The -march=armv8.4-a flag targets Graviton3's architecture
# -mcpu=neoverse-v1 specifically targets the Graviton3 core
gcc -O3 -march=armv8.4-a -mcpu=neoverse-v1 \
    -o simulation simulation.c -lm

# For Graviton3 with SVE (Scalable Vector Extensions)
gcc -O3 -march=armv8.4-a+sve -mcpu=neoverse-v1 \
    -o simulation_sve simulation.c -lm

# For Fortran codes (common in HPC)
gfortran -O3 -march=armv8.4-a -mcpu=neoverse-v1 \
    -o solver solver.f90
```

### Compiling OpenMPI for Graviton

```bash
# Download and build OpenMPI from source
wget https://download.open-mpi.org/release/open-mpi/v4.1/openmpi-4.1.6.tar.gz
tar xzf openmpi-4.1.6.tar.gz
cd openmpi-4.1.6

./configure --prefix=/opt/openmpi \
  --with-efa \
  --enable-mpi-cxx \
  CFLAGS="-O3 -march=armv8.4-a -mcpu=neoverse-v1" \
  CXXFLAGS="-O3 -march=armv8.4-a -mcpu=neoverse-v1"

make -j $(nproc) && sudo make install

export PATH=/opt/openmpi/bin:$PATH
export LD_LIBRARY_PATH=/opt/openmpi/lib:$LD_LIBRARY_PATH
```

### Compiling GROMACS for Graviton

```bash
# Build GROMACS with ARM NEON SIMD
wget https://ftp.gromacs.org/gromacs/gromacs-2024.tar.gz
tar xzf gromacs-2024.tar.gz
cd gromacs-2024

mkdir build && cd build
cmake .. \
  -DCMAKE_INSTALL_PREFIX=/opt/gromacs \
  -DGMX_BUILD_OWN_FFTW=ON \
  -DGMX_SIMD=ARM_NEON_ASIMD \
  -DGMX_MPI=ON \
  -DCMAKE_C_FLAGS="-mcpu=neoverse-v1" \
  -DCMAKE_CXX_FLAGS="-mcpu=neoverse-v1"

make -j $(nproc) && sudo make install
```

## Step 4: Run Benchmarks

Always benchmark before committing to a migration. Compare the same workload on Graviton vs x86.

```bash
#!/bin/bash
# benchmark.sh - Compare Graviton vs x86 performance

# Run the benchmark on current architecture
echo "Architecture: $(uname -m)"
echo "Instance type: $(curl -s http://169.254.169.254/latest/meta-data/instance-type)"

# Time your actual workload
time mpirun -np 64 /opt/gromacs/bin/gmx_mpi mdrun \
  -s benchmark.tpr \
  -nsteps 10000

# Record results
echo "Benchmark complete. Check ns/day metric for comparison."
```

A typical comparison might look like:

| Metric | c6i.16xlarge (Intel) | c7g.16xlarge (Graviton3) |
|---|---|---|
| GROMACS ns/day | 42.5 | 48.3 |
| Price per hour | $2.72 | $2.18 |
| Cost per ns | $0.064 | $0.045 |
| Price-performance gain | baseline | 30% better |

## Step 5: Use Multi-Architecture Docker Images

If you run containerized workloads, build multi-arch images so the same image works on both Graviton and x86.

```bash
# Create a multi-architecture Docker build
docker buildx create --name multiarch --use

# Build for both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t 123456789012.dkr.ecr.us-east-1.amazonaws.com/hpc-app:latest \
  --push .
```

Your Dockerfile might need conditional logic for architecture-specific dependencies:

```dockerfile
FROM ubuntu:22.04

# Architecture-specific packages are handled by apt automatically
RUN apt-get update && apt-get install -y \
    build-essential \
    gfortran \
    libopenmpi-dev \
    openmpi-bin \
    && rm -rf /var/lib/apt/lists/*

# Compile with architecture-auto-detected flags
COPY src/ /app/src/
RUN cd /app/src && make ARCH=$(uname -m)
```

## Common Pitfalls

- **x86-specific SIMD instructions** - Code using SSE/AVX intrinsics will not compile on ARM. Use NEON/SVE equivalents or compiler auto-vectorization.
- **Hardcoded architecture assumptions** - Check for `#ifdef __x86_64__` guards in your code.
- **Binary dependencies** - Pre-compiled libraries might be x86 only. Install from source or find ARM packages.
- **JIT-compiled code** - Python/Java/Julia handle the architecture switch automatically. Native extensions may need recompilation.

## Wrapping Up

AWS Graviton processors deliver real, measurable cost savings for HPC workloads. The 20-40% lower instance cost combined with competitive or better performance makes them hard to ignore. The migration effort is mostly about recompiling your software for ARM, which modern compilers and build systems handle well. Start with a benchmark on your actual workload, and if the numbers look good, make the switch. Most teams that benchmark Graviton end up adopting it.
