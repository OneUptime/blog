# How to Manage Multiple Multipass VMs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Multipass, Virtualization, DevOps

Description: Learn how to effectively manage multiple Multipass VMs on Ubuntu, including listing, organizing, starting, stopping, and scripting bulk operations across instances.

---

Once you start using Multipass regularly, you tend to accumulate VMs. A dev environment here, a test server there, a sandbox for experimenting with a new tool. Without a management strategy, things get messy fast. This guide covers practical patterns for managing a fleet of Multipass VMs.

## The Core Commands

Before diving into multi-VM management patterns, here are the essential commands:

```bash
# List all instances with status and IP
multipass list

# Detailed info for one instance
multipass info <name>

# Start an instance
multipass start <name>

# Stop an instance
multipass stop <name>

# Restart an instance
multipass restart <name>

# Delete an instance (moves to trash)
multipass delete <name>

# Permanently remove deleted instances
multipass purge

# Open a shell
multipass shell <name>

# Run a command in an instance
multipass exec <name> -- <command>
```

## Understanding Instance States

`multipass list` shows each VM's state:

```text
Name                    State             IPv4             Image
dev-primary             Running           192.168.64.3     Ubuntu 24.04 LTS
test-server             Stopped           --               Ubuntu 22.04 LTS
api-sandbox             Suspended         --               Ubuntu 24.04 LTS
old-experiment          Deleted           --               Ubuntu 20.04 LTS
```

States explained:
- **Running** - the VM is up and has an IP
- **Stopped** - cleanly shut down, data preserved
- **Suspended** - memory state saved to disk (like sleep), resumes faster than a full boot
- **Deleted** - in the trash, not yet purged (recoverable with no purge yet run)

## Naming Conventions

Naming conventions become important when you have many VMs. Consider including purpose and version information:

```bash
# Good naming patterns:
multipass launch 24.04 --name dev-primary        # main development machine
multipass launch 22.04 --name test-jammy         # testing on older Ubuntu
multipass launch 24.04 --name db-postgres-16     # database server with version
multipass launch 24.04 --name ci-runner-01       # numbered CI runners

# Avoid:
multipass launch --name vm1  # what is this?
multipass launch --name test  # test of what?
```

## Managing Groups of VMs

Multipass has no built-in concept of groups or tags, so use shell scripting:

### Start or Stop All Instances

```bash
# Stop all running instances
multipass list --format csv | tail -n +2 | awk -F',' '$2=="Running"{print $1}' | xargs -I{} multipass stop {}

# Start all stopped instances
multipass list --format csv | tail -n +2 | awk -F',' '$2=="Stopped"{print $1}' | xargs -I{} multipass start {}
```

### Start/Stop a Named Group

Use a naming prefix convention to group related VMs:

```bash
# Start all "dev-" prefixed instances
multipass list --format csv | tail -n +2 | awk -F',' '$1~/^dev-/{print $1}' | xargs -I{} multipass start {}

# Stop all "test-" prefixed instances
multipass list --format csv | tail -n +2 | awk -F',' '$1~/^test-/{print $1}' | xargs -I{} multipass stop {}
```

### Run a Command on Multiple Instances

```bash
# Update all running instances
for vm in $(multipass list --format csv | tail -n +2 | awk -F',' '$2=="Running"{print $1}'); do
  echo "Updating $vm..."
  multipass exec "$vm" -- sudo apt update -qq
  multipass exec "$vm" -- sudo apt upgrade -y -qq
done

# Check disk usage across all running VMs
for vm in $(multipass list --format csv | tail -n +2 | awk -F',' '$2=="Running"{print $1}'); do
  echo -n "$vm: "
  multipass exec "$vm" -- df -h / | tail -1 | awk '{print $3 " used of " $2}'
done
```

## Building a VM Management Script

A helper script makes recurring operations more convenient:

```bash
#!/bin/bash
# mp-manager.sh - Multipass VM manager helper

CMD="${1}"
PATTERN="${2:-.*}"  # default: match all

case "$CMD" in
  list)
    multipass list
    ;;

  start-all)
    echo "Starting all instances matching: $PATTERN"
    multipass list --format csv | tail -n +2 \
      | awk -F',' -v pat="$PATTERN" '$1 ~ pat && $2=="Stopped"{print $1}' \
      | xargs -I{} multipass start {}
    ;;

  stop-all)
    echo "Stopping all running instances matching: $PATTERN"
    multipass list --format csv | tail -n +2 \
      | awk -F',' -v pat="$PATTERN" '$1 ~ pat && $2=="Running"{print $1}' \
      | xargs -I{} multipass stop {}
    ;;

  update-all)
    echo "Updating all running instances matching: $PATTERN"
    multipass list --format csv | tail -n +2 \
      | awk -F',' -v pat="$PATTERN" '$1 ~ pat && $2=="Running"{print $1}' \
      | while read vm; do
          echo "--- Updating $vm ---"
          multipass exec "$vm" -- sudo apt update -qq
          multipass exec "$vm" -- sudo apt upgrade -y -qq
        done
    ;;

  ips)
    echo "IP addresses for running instances:"
    multipass list --format csv | tail -n +2 \
      | awk -F',' '$2=="Running"{printf "%-30s %s\n", $1, $3}'
    ;;

  cleanup)
    echo "Purging deleted instances..."
    multipass purge
    echo "Done."
    ;;

  *)
    echo "Usage: $0 {list|start-all|stop-all|update-all|ips|cleanup} [pattern]"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 stop-all dev-"
    echo "  $0 update-all test-"
    echo "  $0 ips"
    ;;
esac
```

```bash
chmod +x mp-manager.sh

# Usage examples
./mp-manager.sh list
./mp-manager.sh stop-all test-    # stop all test-* VMs
./mp-manager.sh ips               # show all running IPs
./mp-manager.sh update-all        # update all running VMs
```

## Working with Instance Snapshots

While Multipass does not have a first-class snapshot feature like libvirt, you can simulate it by copying the disk image:

```bash
# Stop the VM
multipass stop myvm

# Locate the disk image
sudo ls /var/snap/multipass/common/data/multipassd/vault/instances/myvm/

# Copy the disk image as a backup
sudo cp /var/snap/multipass/common/data/multipassd/vault/instances/myvm/ubuntu-24.04.img \
        /var/snap/multipass/common/data/multipassd/vault/instances/myvm/ubuntu-24.04.img.bak

# Restart the VM
multipass start myvm
```

## Monitoring Resource Usage

```bash
# Quick overview of running VMs
multipass list

# Detailed resource view for all running VMs
for vm in $(multipass list --format csv | tail -n +2 | awk -F',' '$2=="Running"{print $1}'); do
  echo "=== $vm ==="
  multipass info "$vm" | grep -E "IPv4|CPU|Memory|Disk"
  echo ""
done

# Check a VM's CPU load remotely
multipass exec myvm -- uptime

# Check memory pressure
multipass exec myvm -- free -h
```

## Transferring Files Between VMs

Multipass does not support direct VM-to-VM transfers. Route through the host:

```bash
# Copy from vm1 to vm2 via host
multipass transfer vm1:/home/ubuntu/output.tar.gz /tmp/
multipass transfer /tmp/output.tar.gz vm2:/home/ubuntu/

# Or pipe through SSH
# Get VM IPs
IP1=$(multipass info vm1 | grep IPv4 | awk '{print $2}')
IP2=$(multipass info vm2 | grep IPv4 | awk '{print $2}')

# Use SSH to pipe (Multipass sets up SSH keys)
ssh ubuntu@$IP1 "cat /home/ubuntu/file.txt" | ssh ubuntu@$IP2 "cat > /home/ubuntu/file.txt"
```

## Setting Resource Limits for New Instances

When managing multiple VMs on a constrained host, set reasonable defaults to prevent any single VM from being over-provisioned:

```bash
# Set conservative defaults
sudo multipass set local.cpus=2
sudo multipass set local.memory=2G
sudo multipass set local.disk=15G
```

Override defaults for specific VMs that need more:

```bash
# Heavy dev machine gets more resources
multipass launch 24.04 --name dev-primary --cpus 4 --memory 8G --disk 50G

# Lightweight test VMs use defaults
multipass launch 24.04 --name test-1
multipass launch 24.04 --name test-2
```

## Cleaning Up Stale VMs

Review and clean up periodically:

```bash
# See all VMs including stopped/deleted
multipass list

# Delete VMs you no longer need
multipass delete test-old-project test-experiment-1

# Purge them permanently
multipass purge

# After purge, those VM names become available again
multipass list
```

Treat VM cleanup like disk cleanup - do it regularly before you run out of disk space on the host. A suspended VM with 50GB allocated is consuming that disk space even when not running.

Managing multiple Multipass VMs effectively comes down to consistent naming, scripted operations, and regular cleanup. The Multipass CLI's CSV output mode makes it easy to filter and process VMs in shell scripts, giving you flexibility without needing a dedicated management UI.
