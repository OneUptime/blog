# How to Set Up PBS Pro for Job Scheduling on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HPC, Job Scheduling, PBS Pro, Cluster Computing

Description: A step-by-step guide to installing and configuring PBS Pro workload manager for high-performance computing job scheduling on Ubuntu servers.

---

PBS Pro (Portable Batch System Professional) is a workload management system used in HPC clusters to schedule jobs across compute nodes. It handles resource allocation, job queuing, and execution so you can run batch workloads efficiently without manually managing compute resources. This guide covers installing PBS Pro on Ubuntu, configuring a basic head node and compute node setup, and submitting your first jobs.

## Prerequisites

You need at least two Ubuntu 22.04 servers - one acting as the head node (server) and one or more compute nodes. All nodes should be able to reach each other by hostname. Set up `/etc/hosts` entries if you don't have a DNS server.

Both nodes should have the same user accounts, ideally synchronized via LDAP or at minimum with matching UIDs and GIDs. NFS is commonly used to share home directories across nodes.

## Installing PBS Pro

PBS Pro is available as open source from the Altair GitHub repository. You need to build it from source or download pre-built packages.

```bash
# Install build dependencies
sudo apt update
sudo apt install -y build-essential python3-dev libssl-dev \
    libexpat1-dev libhwloc-dev libcjson-dev tcl-dev tk-dev \
    libx11-dev libxt-dev libedit-dev postgresql postgresql-contrib \
    python3-pip git

# Clone the PBS Pro source
git clone https://github.com/openpbs/openpbs.git
cd openpbs

# Configure and build
./autogen.sh
./configure --prefix=/opt/pbs
make -j$(nproc)
sudo make install
```

After installation, run the post-install script to set up initial configuration:

```bash
sudo /opt/pbs/libexec/pbs_postinstall
```

## Configuring the Head Node

The head node runs the PBS server daemon, scheduler, and MOM (Machine Oriented Mini-server). Edit the PBS configuration file:

```bash
sudo nano /etc/pbs.conf
```

Set the following values:

```bash
# /etc/pbs.conf - head node configuration
PBS_SERVER=headnode          # Hostname of the head node
PBS_START_SERVER=1           # Start the PBS server daemon
PBS_START_SCHED=1            # Start the scheduler
PBS_START_COMM=1             # Start the communication daemon
PBS_START_MOM=1              # Start MOM on this node too if it runs jobs
PBS_EXEC=/opt/pbs            # PBS installation directory
PBS_HOME=/var/spool/pbs      # PBS data directory
PBS_CORE_LIMIT=unlimited
```

Start the PBS services:

```bash
sudo /etc/init.d/pbs start

# Or with systemd
sudo systemctl start pbs
sudo systemctl enable pbs
```

Add PBS binaries to your PATH:

```bash
echo 'export PATH=/opt/pbs/bin:/opt/pbs/sbin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Adding Compute Nodes

On each compute node, install PBS Pro using the same build process, but configure it as a client/MOM-only node:

```bash
# /etc/pbs.conf on compute node
PBS_SERVER=headnode
PBS_START_SERVER=0           # Do not start server on compute nodes
PBS_START_SCHED=0            # Do not start scheduler
PBS_START_COMM=1
PBS_START_MOM=1              # MOM runs on compute nodes
PBS_EXEC=/opt/pbs
PBS_HOME=/var/spool/pbs
```

Start PBS on the compute node:

```bash
sudo systemctl start pbs
sudo systemctl enable pbs
```

Back on the head node, register the compute nodes with the PBS server:

```bash
# Create the nodes in PBS
sudo /opt/pbs/bin/qmgr -c "create node compute01 np=8"
sudo /opt/pbs/bin/qmgr -c "create node compute02 np=8"

# Verify nodes are visible
/opt/pbs/bin/pbsnodes -a
```

## Configuring Queues

PBS uses queues to organize job submissions. Create a default execution queue:

```bash
# Open qmgr for batch configuration
sudo /opt/pbs/bin/qmgr << 'EOF'
# Create a default queue
create queue workq
set queue workq queue_type = Execution
set queue workq resources_default.nodes = 1
set queue workq resources_default.walltime = 01:00:00
set queue workq resources_default.ncpus = 1
set queue workq resources_default.mem = 1gb
set queue workq enabled = True
set queue workq started = True

# Set default queue on the server
set server default_queue = workq
set server scheduling = True
set server acl_hosts = headnode
set server managers = root@headnode
set server operators = root@headnode
EOF
```

For large memory jobs or GPU workloads, create specialized queues:

```bash
sudo /opt/pbs/bin/qmgr << 'EOF'
create queue gpu
set queue gpu queue_type = Execution
set queue gpu resources_default.ngpus = 1
set queue gpu resources_default.walltime = 04:00:00
set queue gpu enabled = True
set queue gpu started = True
EOF
```

## Writing and Submitting Jobs

PBS jobs are shell scripts with resource directives embedded as comments. Create a simple test job:

```bash
# test_job.sh - basic PBS job script
#!/bin/bash
#PBS -N my_test_job          # Job name
#PBS -l ncpus=4              # Request 4 CPU cores
#PBS -l mem=2gb              # Request 2 GB memory
#PBS -l walltime=00:30:00    # Maximum runtime (30 minutes)
#PBS -q workq                # Submit to the workq queue
#PBS -j oe                   # Merge stdout and stderr
#PBS -o /home/user/job.log   # Output file location

# Change to the submission directory
cd $PBS_O_WORKDIR

echo "Job ID: $PBS_JOBID"
echo "Running on: $(hostname)"
echo "Number of CPUs: $PBS_NCPUS"
date

# Your actual workload here
sleep 60
echo "Job completed"
date
```

Submit the job:

```bash
# Submit job to PBS
qsub test_job.sh

# Submit with resource overrides
qsub -l ncpus=8,mem=4gb test_job.sh

# Submit to specific queue
qsub -q gpu test_job.sh
```

## Managing Jobs

Common PBS commands for job management:

```bash
# List all jobs in the queue
qstat

# Detailed job information
qstat -f <job_id>

# Show jobs for a specific user
qstat -u username

# Delete a job
qdel <job_id>

# Hold a job (prevent it from running)
qhold <job_id>

# Release a held job
qrls <job_id>

# Show node status
pbsnodes -a

# Show server status
qstat -B
```

## Monitoring and Troubleshooting

PBS writes logs to `/var/spool/pbs/server_logs/` and `/var/spool/pbs/mom_logs/`. Check these when jobs fail or nodes go offline:

```bash
# Check server logs
tail -f /var/spool/pbs/server_logs/$(date +%Y%m%d)

# Check MOM logs on a compute node
tail -f /var/spool/pbs/mom_logs/$(date +%Y%m%d)

# Check scheduler logs
tail -f /var/spool/pbs/sched_logs/$(date +%Y%m%d)
```

If a node shows as `offline`, bring it back with:

```bash
pbsnodes -c compute01
```

To mark a node as down for maintenance:

```bash
pbsnodes -o compute01
```

## Setting Up NFS Home Directories

Jobs need access to files on compute nodes. Share home directories from the head node:

```bash
# On the head node - configure NFS exports
sudo apt install nfs-kernel-server
echo '/home  compute01(rw,sync,no_subtree_check) compute02(rw,sync,no_subtree_check)' | sudo tee -a /etc/exports
sudo exportfs -ra
sudo systemctl enable nfs-kernel-server

# On compute nodes - mount NFS home
sudo apt install nfs-common
echo 'headnode:/home  /home  nfs  defaults,_netdev  0  0' | sudo tee -a /etc/fstab
sudo mount -a
```

With PBS Pro configured, you have a functional HPC job scheduler that can queue jobs, manage resources, and distribute workloads across your compute cluster. From here you can explore PBS Pro's advanced features like fair-share scheduling, reservation systems, and hooks for custom pre/post job actions.
