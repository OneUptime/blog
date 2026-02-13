# How to Use Cluster Placement Groups for HPC Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, HPC, Placement Groups, High Performance Computing

Description: A deep dive into configuring EC2 cluster placement groups with EFA for high-performance computing workloads including MPI and parallel processing.

---

High-performance computing workloads have unique demands. They need massive parallel processing, ultra-low inter-node latency, and high-bandwidth communication. Running these on cloud infrastructure used to be impractical, but AWS has made it viable with cluster placement groups, Elastic Fabric Adapter (EFA), and purpose-built instance types.

This guide walks through setting up an HPC cluster on EC2 that can compete with on-premises supercomputing clusters.

## Why Cluster Placement Groups for HPC

HPC workloads typically involve many nodes working on the same problem simultaneously. Whether it's computational fluid dynamics, molecular modeling, weather simulation, or financial risk analysis, these applications use MPI (Message Passing Interface) to communicate between nodes. MPI is extremely sensitive to network latency and bandwidth.

Cluster placement groups solve this by:

- Placing all instances in the same network segment within a single AZ
- Enabling up to 100 Gbps bandwidth between instances
- Providing single-digit microsecond latencies
- Supporting EFA for kernel-bypass networking

## Choosing the Right Instance Types

Not all EC2 instance types are created equal for HPC. Here are the key families:

| Instance Family | Best For | Network | vCPUs | Memory |
|----------------|---------|---------|-------|--------|
| hpc6a          | Compute-intensive HPC | 100 Gbps EFA | 96 | 384 GB |
| hpc7g          | ARM-based HPC | 200 Gbps EFA | 64 | 128 GB |
| c5n            | General compute | 100 Gbps EFA | 72 | 192 GB |
| p4d            | GPU HPC/ML | 400 Gbps EFA | 96 | 1152 GB |
| c6i            | Latest gen compute | 50 Gbps EFA | 128 | 256 GB |

The `hpc6a` and `hpc7g` instances are specifically designed for HPC and offer the best price-performance for non-GPU workloads.

## Setting Up the Cluster

Let's build an HPC cluster from scratch. First, create the placement group:

```bash
# Create a cluster placement group for HPC
aws ec2 create-placement-group \
  --group-name hpc-cluster \
  --strategy cluster \
  --tag-specifications 'ResourceType=placement-group,Tags=[{Key=Name,Value=hpc-cluster},{Key=Project,Value=cfd-simulation}]'
```

## Configuring EFA

EFA is the secret sauce for HPC on AWS. It provides OS-bypass networking that lets your application communicate directly with the network hardware, skipping the kernel's TCP/IP stack entirely.

First, create security group rules that allow EFA traffic:

```bash
# Create security group for EFA
aws ec2 create-security-group \
  --group-name hpc-efa-sg \
  --description "Security group for HPC with EFA" \
  --vpc-id vpc-0123456789abcdef0

SG_ID=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=hpc-efa-sg \
  --query 'SecurityGroups[0].GroupId' --output text)

# Allow all traffic within the security group (required for EFA)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol -1 \
  --source-group $SG_ID

# Allow SSH from your network
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 10.0.0.0/8
```

EFA requires all-protocol access between nodes in the cluster. This is normal for HPC - the nodes need unrestricted communication.

## Launching HPC Instances with EFA

Now launch the cluster nodes with EFA-enabled network interfaces:

```bash
# Launch HPC instances with EFA
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type hpc6a.48xlarge \
  --count 16 \
  --placement GroupName=hpc-cluster \
  --key-name my-keypair \
  --network-interfaces '{
    "DeviceIndex": 0,
    "SubnetId": "subnet-0123456789abcdef0",
    "Groups": ["sg-0123456789abcdef0"],
    "InterfaceType": "efa"
  }' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=hpc-node}]'
```

## Installing EFA Software

After launching, you need to install the EFA software stack on each node. The EFA installer includes the kernel module, libfabric, and Open MPI.

This user data script installs the EFA software and Open MPI:

```bash
#!/bin/bash
# Install EFA software on Amazon Linux 2
set -e

# Update system
yum update -y

# Download and install EFA
cd /tmp
curl -O https://efa-installer.amazonaws.com/aws-efa-installer-latest.tar.gz
tar -xf aws-efa-installer-latest.tar.gz
cd aws-efa-installer
./efa_installer.sh -y

# Verify EFA installation
fi_info -p efa

# Set up environment for Open MPI
cat >> /etc/profile.d/efa.sh << 'EFAENV'
export PATH=/opt/amazon/openmpi/bin:$PATH
export LD_LIBRARY_PATH=/opt/amazon/openmpi/lib:$LD_LIBRARY_PATH
EFAENV

# Install common HPC tools
yum install -y gcc gcc-c++ gcc-gfortran make cmake
```

Verify EFA is working:

```bash
# Verify EFA is detected
fi_info -p efa

# Expected output should show the EFA provider
# provider: efa
# fabric: EFA-...
# domain: efa_0-...
```

## Setting Up Shared Storage

HPC workloads need shared storage so all nodes can access the same data. FSx for Lustre is the go-to choice for high-performance parallel file systems.

This creates a Lustre file system optimized for HPC:

```bash
# Create FSx for Lustre file system
aws fsx create-file-system \
  --file-system-type LUSTRE \
  --storage-capacity 3600 \
  --subnet-ids subnet-0123456789abcdef0 \
  --security-group-ids sg-0123456789abcdef0 \
  --lustre-configuration '{
    "DeploymentType": "PERSISTENT_2",
    "PerUnitStorageThroughput": 250,
    "DataCompressionType": "LZ4"
  }' \
  --tags Key=Name,Value=hpc-lustre
```

Mount it on each node:

```bash
# Mount Lustre on each HPC node
amazon-linux-extras install -y lustre2.10
mkdir -p /shared
mount -t lustre file-system-dns-name@tcp:/fsx /shared
```

## Running an MPI Job

With everything set up, here's how to run a parallel MPI job across your cluster.

Create a hostfile listing all nodes:

```bash
# Create hostfile with all node IPs
# Each line: hostname slots=num_cores
cat > hostfile << 'EOF'
10.0.1.10 slots=96
10.0.1.11 slots=96
10.0.1.12 slots=96
10.0.1.13 slots=96
10.0.1.14 slots=96
10.0.1.15 slots=96
10.0.1.16 slots=96
10.0.1.17 slots=96
EOF
```

Run your MPI application:

```bash
# Run MPI job across 8 nodes with EFA
mpirun \
  --hostfile hostfile \
  -np 768 \
  --map-by slot \
  -x FI_PROVIDER=efa \
  -x FI_EFA_USE_DEVICE_RDMA=1 \
  -x LD_LIBRARY_PATH \
  --mca btl_tcp_if_include eth0 \
  --mca pml ^cm \
  /shared/bin/my_simulation --input /shared/data/input.dat
```

The key flags here:
- `FI_PROVIDER=efa` tells libfabric to use the EFA provider
- `FI_EFA_USE_DEVICE_RDMA=1` enables RDMA for even lower latency
- `-np 768` runs 768 processes (8 nodes x 96 cores)

## Terraform for a Complete HPC Cluster

Here's a Terraform module that provisions a complete HPC cluster:

```hcl
resource "aws_placement_group" "hpc" {
  name     = "hpc-cluster"
  strategy = "cluster"
}

resource "aws_launch_template" "hpc_node" {
  name_prefix   = "hpc-"
  image_id      = var.hpc_ami_id
  instance_type = "hpc6a.48xlarge"
  key_name      = var.key_name

  network_interfaces {
    device_index    = 0
    subnet_id       = var.subnet_id
    security_groups = [aws_security_group.hpc.id]
    interface_type  = "efa"
  }

  placement {
    group_name = aws_placement_group.hpc.name
  }

  user_data = base64encode(file("hpc-userdata.sh"))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name    = "hpc-node"
      Project = var.project_name
    }
  }
}

resource "aws_instance" "hpc_nodes" {
  count = var.node_count

  launch_template {
    id      = aws_launch_template.hpc_node.id
    version = "$Latest"
  }

  tags = {
    Name = "hpc-node-${count.index + 1}"
  }
}

resource "aws_fsx_lustre_file_system" "hpc_storage" {
  storage_capacity            = var.lustre_capacity_gb
  subnet_ids                  = [var.subnet_id]
  security_group_ids          = [aws_security_group.hpc.id]
  deployment_type             = "PERSISTENT_2"
  per_unit_storage_throughput = 250

  tags = {
    Name = "hpc-lustre"
  }
}
```

## Benchmarking Your Cluster

Run standard HPC benchmarks to validate your cluster's performance.

Use the OSU Micro-Benchmarks to test MPI latency and bandwidth:

```bash
# Build OSU Micro-Benchmarks
cd /tmp
wget http://mvapich.cse.ohio-state.edu/download/mvapich/osu-micro-benchmarks-7.3.tar.gz
tar xf osu-micro-benchmarks-7.3.tar.gz
cd osu-micro-benchmarks-7.3
./configure CC=/opt/amazon/openmpi/bin/mpicc CXX=/opt/amazon/openmpi/bin/mpicxx
make -j$(nproc)

# Run latency test between two nodes
mpirun -np 2 -hostfile hostfile \
  -x FI_PROVIDER=efa \
  ./c/mpi/pt2pt/standard/osu_latency

# Run bandwidth test
mpirun -np 2 -hostfile hostfile \
  -x FI_PROVIDER=efa \
  ./c/mpi/pt2pt/standard/osu_bw
```

Expected results with EFA on hpc6a instances:
- Latency: ~15-20 microseconds for small messages
- Bandwidth: 90+ Gbps for large messages

## Summary

Running HPC workloads on AWS with cluster placement groups and EFA is now a viable alternative to on-premises clusters. The combination of co-located instances, kernel-bypass networking, and high-performance parallel storage delivers the performance that demanding simulations require. Start with a small test cluster, run your benchmarks, and scale up as you validate performance. For broader placement group strategies, see our guide on [setting up placement groups for low latency](https://oneuptime.com/blog/post/2026-02-12-ec2-placement-groups-low-latency/view).
