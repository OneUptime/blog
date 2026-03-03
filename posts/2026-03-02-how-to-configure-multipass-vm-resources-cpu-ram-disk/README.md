# How to Configure Multipass VM Resources (CPU, RAM, Disk)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Multipass, Virtualization, Performance

Description: Learn how to configure CPU, RAM, and disk resources for Multipass VMs at launch time and how to resize resources on existing instances.

---

By default, Multipass creates minimal VMs - 1 CPU, 1GB of RAM, and 5GB of disk. For most real development work, that is not enough. This guide covers how to allocate proper resources at launch and how to adjust them afterward when requirements change.

## Default Resource Allocation

Before changing anything, understand what defaults Multipass uses:

```bash
# Check current defaults
multipass get local.cpus    # default: 1
multipass get local.memory  # default: 1G
multipass get local.disk    # default: 5G
```

These defaults apply to any `multipass launch` command that doesn't explicitly specify resources.

## Specifying Resources at Launch Time

The cleanest approach is to set resources at launch. These flags are straightforward:

```bash
# Launch with specific resources
multipass launch 24.04 \
  --name workstation \
  --cpus 4 \
  --memory 8G \
  --disk 50G
```

### CPU Specification

The `--cpus` flag sets virtual CPU count. Use a value up to your physical core count (or slightly above with overcommit):

```bash
# Check physical CPU count on host
nproc

# Launch with 4 vCPUs
multipass launch --name dev --cpus 4

# For compilation-heavy work, match physical core count
CORES=$(nproc)
multipass launch --name compiler-vm --cpus $CORES --memory 16G --disk 100G
```

### Memory Specification

Memory accepts suffixes: `K`, `M`, `G`. Always use whole numbers:

```bash
# 512MB (minimal)
multipass launch --name tiny --memory 512M

# 4GB (general development)
multipass launch --name dev --memory 4G

# 16GB (memory-intensive workloads like databases or ML)
multipass launch --name db-server --memory 16G
```

### Disk Specification

Disk size uses `G` (gigabytes). The disk image uses copy-on-write, so actual disk usage on the host is only as much as data written:

```bash
# 20GB for moderate work
multipass launch --name dev --disk 20G

# 100GB for development environments with large datasets
multipass launch --name data-vm --disk 100G

# Note: disk cannot easily be shrunk after creation
# Always provision more than you think you'll need
```

## Setting Persistent Defaults

If you always need more than 1 CPU and 1G RAM, set global defaults so every launch inherits them:

```bash
# Set new defaults
sudo multipass set local.cpus=2
sudo multipass set local.memory=4G
sudo multipass set local.disk=20G

# Verify they took effect
multipass get local.cpus
multipass get local.memory
multipass get local.disk

# Now this launch uses 2 CPUs, 4G RAM, 20G disk
multipass launch --name myvm
```

To reset a default back to the factory value:

```bash
sudo multipass set local.cpus=1
sudo multipass set local.memory=1G
sudo multipass set local.disk=5G
```

## Verifying Resources Inside the VM

After launching, confirm the VM sees the correct resources:

```bash
# Get info from Multipass
multipass info workstation

# Or shell in and check directly
multipass exec workstation -- bash -c "
  echo '=== CPU ==='
  nproc
  echo '=== Memory ==='
  free -h
  echo '=== Disk ==='
  df -h /
"
```

Sample output:

```text
=== CPU ===
4
=== Memory ===
              total        used        free      shared  buff/cache   available
Mem:          7.8Gi       312Mi       7.2Gi       0.0Ki       285Mi       7.3Gi
=== Disk ===
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        49G  3.2G   44G   7% /
```

## Adjusting Resources on an Existing VM

Multipass does not currently support live resource modification. To change resources, you need to stop the VM, modify its configuration, and restart. However, Multipass's CLI does not expose a direct `set-resources` command for existing instances.

### The Workaround: Edit the Instance Configuration

For the KVM/QEMU backend, instance configurations are stored in JSON files:

```bash
# Stop the instance first
multipass stop workstation

# Find the instance config (path may vary by snap version)
sudo ls /var/snap/multipass/common/data/multipassd/vault/instances/workstation/

# Edit the config file (backup first)
sudo cp /var/snap/multipass/common/data/multipassd/vault/instances/workstation/multipass-info.json \
        /tmp/workstation-backup.json

sudo nano /var/snap/multipass/common/data/multipassd/vault/instances/workstation/multipass-info.json
```

Inside the JSON, update the CPU, memory fields, then restart:

```bash
sudo snap restart multipass
multipass start workstation
multipass info workstation  # verify new resources
```

### The Safer Workaround: Recreate with Transferred Data

For important VMs, recreate with new resources and transfer data:

```bash
# 1. Export data from existing VM
multipass exec oldvm -- tar czf /home/ubuntu/data-backup.tar.gz /home/ubuntu/projects/
multipass transfer oldvm:/home/ubuntu/data-backup.tar.gz ./

# 2. Delete old VM
multipass delete --purge oldvm

# 3. Create new VM with correct resources
multipass launch 24.04 \
  --name newvm \
  --cpus 4 \
  --memory 8G \
  --disk 50G

# 4. Restore data
multipass transfer data-backup.tar.gz newvm:/home/ubuntu/
multipass exec newvm -- tar xzf /home/ubuntu/data-backup.tar.gz -C /
```

## Disk Expansion Inside the VM

Even if you allocated enough disk at launch, you might later need more space. Since Multipass uses cloud images, the filesystem inside often uses less than the allocated disk:

```bash
# Check available space inside the VM
multipass exec myvm -- df -h /

# If there's unpartitioned space, expand from inside
multipass exec myvm -- bash -c "
  # Check current partition layout
  lsblk

  # Grow the partition and filesystem (cloud images use growpart)
  sudo growpart /dev/sda 1
  sudo resize2fs /dev/sda1
  df -h /
"
```

## Resource Planning Guidelines

Based on common workload types:

| Workload | CPUs | RAM | Disk |
|----------|------|-----|------|
| Quick testing | 1 | 1G | 5G |
| Web development | 2 | 4G | 20G |
| Backend/API dev | 2-4 | 4-8G | 30G |
| Database server | 2-4 | 8-16G | 50-100G |
| Build environment | 4-8 | 8-16G | 50G |
| ML/Data science | 4-8 | 16-32G | 100G |

Always leave headroom on the host - don't allocate 100% of host RAM to VMs or you'll hit swap and performance degrades significantly.

## Checking Host Resources Before Allocation

Before launching a resource-heavy VM, verify the host has capacity:

```bash
# Check host available memory
free -h

# Check host CPU count
nproc

# Check host disk space
df -h /

# Check what Multipass VMs are currently consuming
multipass list
for vm in $(multipass list --format csv | tail -n +2 | cut -d',' -f1); do
  echo "--- $vm ---"
  multipass info $vm | grep -E "CPU|Memory|Disk"
done
```

Setting resources correctly at launch time prevents the awkward situation of needing to migrate data to a new VM later. When in doubt, provision generously - the copy-on-write disk means unused disk space costs almost nothing on the host.
