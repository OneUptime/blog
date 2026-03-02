# How to Configure Slurm Workload Manager on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Slurm, HPC, Cluster Computing, Linux

Description: Install and configure Slurm Workload Manager on Ubuntu to schedule and manage jobs across a compute cluster, covering controller, compute nodes, and job submission workflows.

---

Slurm (Simple Linux Utility for Resource Management) is the most widely deployed workload manager in high-performance computing. It manages job queuing, resource allocation, and execution across clusters ranging from a few nodes to tens of thousands. If you're building a compute cluster on Ubuntu, Slurm is the standard choice.

## Architecture

Slurm has three main components:

**slurmctld** - the central controller daemon. Runs on one (or two for HA) dedicated nodes. Manages the job queue, makes scheduling decisions, and tracks cluster state.

**slurmd** - the compute daemon. Runs on every compute node. Accepts jobs from the controller and manages their execution.

**slurmdbd** - the accounting database daemon (optional but recommended). Stores job accounting records in MySQL/MariaDB.

All nodes in the cluster must have synchronized clocks (NTP), share a common user database (LDAP or consistent `/etc/passwd`), and be able to reach each other by hostname.

## Installing Slurm

```bash
# On ALL nodes (controller and compute)
sudo apt update
sudo apt install -y slurm-wlm slurmd slurmctld munge

# On the controller node additionally
sudo apt install -y slurmctld

# On compute nodes only
sudo apt install -y slurmd

# For accounting (controller node)
sudo apt install -y slurmdbd default-mysql-server

# Verify installation
slurmctld --version
slurmd --version
```

## Setting Up MUNGE Authentication

Slurm uses MUNGE for cluster-wide authentication. All nodes must share the same MUNGE key:

```bash
# On the controller node, generate the MUNGE key
sudo /usr/sbin/create-munge-key
sudo systemctl enable munge
sudo systemctl start munge

# Copy the MUNGE key to all compute nodes
# The key is in /etc/munge/munge.key
sudo scp /etc/munge/munge.key root@compute-01:/etc/munge/
sudo scp /etc/munge/munge.key root@compute-02:/etc/munge/

# On each compute node, fix permissions and start munge
ssh root@compute-01 'chown munge:munge /etc/munge/munge.key && chmod 400 /etc/munge/munge.key && systemctl enable munge && systemctl start munge'

# Test MUNGE authentication from a compute node
ssh compute-01 munge -n | unmunge
# Should show: STATUS: Success
```

## Creating the Slurm Configuration

The main configuration file is `/etc/slurm/slurm.conf`. This file must be identical on all nodes:

```bash
sudo nano /etc/slurm/slurm.conf
```

```ini
# /etc/slurm/slurm.conf
# This file MUST be identical on controller and all compute nodes

# === Cluster Identity ===
ClusterName=mycluster
ControlMachine=controller-hostname
# ControlAddr=10.0.0.1  # Uncomment if DNS is not available

# === Authentication ===
AuthType=auth/munge
CryptoType=crypto/munge

# === Communication ===
SlurmctldPort=6817
SlurmdPort=6818
ReturnAddrBindTo=No

# === Scheduler ===
SchedulerType=sched/backfill
SelectType=select/cons_tres
SelectTypeParameters=CR_Core_Memory

# === Logging ===
SlurmctldLogFile=/var/log/slurm/slurmctld.log
SlurmdLogFile=/var/log/slurm/slurmd.log
SlurmctldDebug=info
SlurmdDebug=info

# === Accounting ===
AccountingStorageType=accounting_storage/slurmdbd
AccountingStorageHost=controller-hostname
AccountingStorageTPort=6819
JobCompType=jobcomp/none

# === State Preservation ===
StateSaveLocation=/var/spool/slurmctld
SlurmdSpoolDir=/var/spool/slurmd
SwitchType=switch/none
MpiDefault=none

# === Resource Tracking ===
ProctrackType=proctrack/cgroup
TaskPlugin=task/cgroup

# === Timeouts ===
SlurmctldTimeout=120
SlurmdTimeout=300
InactiveLimit=0
MinJobAge=300
KillWait=30
WaitTime=0

# === Partitions and Nodes ===
# Node definitions - get actual CPU/memory with: slurmd -C
NodeName=compute-01 CPUs=16 Sockets=1 CoresPerSocket=8 ThreadsPerCore=2 RealMemory=62000 State=UNKNOWN
NodeName=compute-02 CPUs=16 Sockets=1 CoresPerSocket=8 ThreadsPerCore=2 RealMemory=62000 State=UNKNOWN
NodeName=compute-03 CPUs=32 Sockets=2 CoresPerSocket=8 ThreadsPerCore=2 RealMemory=126000 State=UNKNOWN

# Partition definitions
PartitionName=debug Nodes=compute-01 Default=YES MaxTime=1:00:00 State=UP
PartitionName=short Nodes=compute-[01-02] MaxTime=24:00:00 State=UP
PartitionName=long Nodes=compute-[01-03] MaxTime=168:00:00 State=UP
PartitionName=gpu Nodes=compute-03 MaxTime=48:00:00 State=UP
```

Get the correct node configuration automatically:

```bash
# On each compute node, run this to get its hardware specs
slurmd -C

# Example output:
# NodeName=compute-01 Arch=x86_64 CoresPerSocket=8 CPUTot=16 ...
# RealMemory=63829 Sockets=1 ThreadsPerCore=2 ...
# Use these values in slurm.conf NodeName lines
```

## Setting Up cgroup Configuration

Slurm's cgroup plugin for resource enforcement needs its own configuration:

```bash
# On all nodes
sudo tee /etc/slurm/cgroup.conf << 'EOF'
# /etc/slurm/cgroup.conf
CgroupMountpoint=/sys/fs/cgroup
CgroupAutomount=yes
ConstrainCores=yes
ConstrainRAMSpace=yes
ConstrainSwapSpace=no
MaxRAMPercent=98
EOF
```

## Starting the Slurm Services

```bash
# Create log and state directories
sudo mkdir -p /var/log/slurm /var/spool/slurmctld /var/spool/slurmd
sudo chown slurm:slurm /var/log/slurm /var/spool/slurmctld
sudo chown slurm:slurm /var/spool/slurmd

# On the CONTROLLER node
sudo systemctl enable slurmctld
sudo systemctl start slurmctld
sudo systemctl status slurmctld

# On each COMPUTE node
sudo systemctl enable slurmd
sudo systemctl start slurmd
sudo systemctl status slurmd

# Check cluster status from the controller
sinfo

# Output example:
# PARTITION AVAIL  TIMELIMIT  NODES  STATE NODELIST
# debug*       up    1:00:00      2   idle compute-[01-02]
# short        up 1-00:00:00      2   idle compute-[01-02]
```

## Submitting Jobs

Slurm uses `sbatch` for batch jobs and `srun` for interactive or inline execution:

```bash
# Create a simple job script
cat > myjob.sh << 'EOF'
#!/bin/bash
#SBATCH --job-name=my_first_job
#SBATCH --output=/home/user/slurm_output_%j.txt
#SBATCH --error=/home/user/slurm_error_%j.txt
#SBATCH --ntasks=4
#SBATCH --cpus-per-task=2
#SBATCH --mem=8G
#SBATCH --time=01:00:00
#SBATCH --partition=short

# Load modules if using environment modules
# module load openmpi/4.1

echo "Job started on $(hostname) at $(date)"
echo "Running on nodes: $SLURM_NODELIST"
echo "Tasks: $SLURM_NTASKS, CPUs per task: $SLURM_CPUS_PER_TASK"

# Run your computation
mpirun -np $SLURM_NTASKS ./my_mpi_program

echo "Job finished at $(date)"
EOF

# Submit the job
sbatch myjob.sh

# Check job status
squeue

# Check your jobs only
squeue -u $USER

# Get detailed job information
scontrol show job <job-id>

# Cancel a job
scancel <job-id>
```

### Interactive Jobs

```bash
# Request an interactive session with 4 cores for 2 hours
srun --ntasks=1 --cpus-per-task=4 --mem=8G --time=2:00:00 --pty bash

# Run a command interactively across multiple nodes
srun --nodes=2 --ntasks=8 hostname

# Interactive job with GPU (requires GPU nodes configured)
srun --ntasks=1 --cpus-per-task=4 --gres=gpu:1 --time=1:00:00 --pty bash
```

## Managing the Cluster

```bash
# View cluster information
sinfo -l

# See node details
scontrol show nodes

# Mark a node as down for maintenance
sudo scontrol update NodeName=compute-01 State=drain Reason="Maintenance"

# Bring a drained node back online
sudo scontrol update NodeName=compute-01 State=resume

# View all running jobs
squeue -a

# View job accounting for completed jobs (requires slurmdbd)
sacct --format=JobID,JobName,Partition,State,ExitCode,Elapsed,MaxRSS

# Set account/project for fair-share scheduling
sacctmgr add account myproject Description="Research Project"
sacctmgr add user alice Account=myproject

# Check fair-share priority
sprio -l
sshare -l
```

## Setting Resource Limits

```bash
# Set resource limits per partition via QOS (Quality of Service)
# Add to slurm.conf or manage via sacctmgr

sacctmgr add qos high-priority priority=100 MaxTRESPerUser=cpu=32
sacctmgr add qos standard priority=50 MaxTRESPerUser=cpu=64 MaxWall=7-00:00:00
sacctmgr add qos low priority=10 MaxTRESPerUser=cpu=128

# Assign a QOS to a user
sacctmgr modify user alice set qos=standard

# Limit a partition to specific users
# In slurm.conf:
# PartitionName=restricted Nodes=compute-[01-03] AllowAccounts=myproject State=UP
```

Slurm's configuration is verbose but well-documented, and once you understand the node/partition/QOS hierarchy, cluster management becomes systematic. The combination of backfill scheduling, fair-share policies, and cgroup-based resource enforcement makes it capable of running production workloads with predictable resource utilization.
