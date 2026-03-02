# How to Migrate from LXD to Incus on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Incus, LXD, Migration, Container

Description: Migrate existing LXD containers, storage pools, profiles, and networks from LXD to Incus on Ubuntu using the official migration tool with minimal downtime.

---

Incus provides an official migration tool that reads your LXD configuration and data, then creates equivalent Incus resources. The migration can happen in-place on the same server or as a transfer to a new server. Either way, the process is significantly less painful than manually recreating all your containers and configuration.

## Before You Start

Back up everything before migrating. LXD migration is a one-way process - the migration tool does not uninstall LXD or modify your existing data, but it is worth having a snapshot of the state before you begin.

```bash
# List all LXD instances
lxc list

# List all LXD storage pools
lxc storage list

# List all LXD networks
lxc network list

# List all LXD profiles
lxc profile list

# Export a specific container as a backup
lxc export my-container /backup/my-container.tar.gz

# Export all running containers
for container in $(lxc list --format csv -c n); do
    echo "Backing up: $container"
    lxc snapshot create "$container" pre-migration 2>/dev/null || true
done
```

Check the LXD snap version (migration tool requires LXD 5.0 or later):

```bash
snap list lxd
# Should show version 5.x or later
```

## Install Incus

Install Incus before running the migration tool. Do not initialize it yet - the migration tool handles initialization as part of the migration.

```bash
# Add the Zabbly repository
sudo mkdir -p /etc/apt/keyrings/
sudo curl -fsSL https://pkgs.zabbly.com/key.asc \
    -o /etc/apt/keyrings/zabbly.asc

sudo sh -c 'cat > /etc/apt/sources.list.d/zabbly-incus-stable.sources << EOF
Enabled: yes
Types: deb
URIs: https://pkgs.zabbly.com/incus/stable
Suites: $(. /etc/os-release && echo $VERSION_CODENAME)
Components: main
Architectures: amd64 arm64
Signed-By: /etc/apt/keyrings/zabbly.asc
EOF'

sudo apt-get update
sudo apt-get install -y incus incus-tools

# Do NOT run 'incus admin init' yet
```

## Understand What Gets Migrated

The migration tool transfers:
- Server configuration
- Storage pools and volumes
- Network configurations
- Profiles
- Containers (including snapshots)
- Virtual machines

What it does NOT automatically handle:
- Custom LXD daemon configuration that has no Incus equivalent
- Some advanced network configurations
- Cluster migrations (more complex, requires additional steps)

## Run the Migration Tool

The migration is performed with the `lxd-to-incus` tool:

```bash
# Install the migration tool
sudo apt-get install -y lxd-to-incus

# Run a dry-run first to see what would happen
sudo lxd-to-incus --dry-run 2>&1 | tee /tmp/migration-dry-run.log

# Review the dry-run output
cat /tmp/migration-dry-run.log
```

The dry-run shows any warnings or incompatibilities without making any changes. Address any issues shown before proceeding.

```bash
# If the dry-run looks good, run the actual migration
# This will stop LXD containers and migrate them to Incus
sudo lxd-to-incus 2>&1 | tee /tmp/migration-log.log
```

The migration process:
1. Stops all running LXD containers
2. Creates Incus configuration matching LXD's setup
3. Migrates storage pools and their contents
4. Creates matching network bridges
5. Creates profiles
6. Migrates each container and VM

This can take a significant amount of time depending on how many containers you have and the total storage size.

## Verify the Migration

Once the migration completes, verify everything transferred correctly:

```bash
# Check that Incus is running
sudo systemctl status incus

# List all migrated instances
incus list

# Verify storage pools
incus storage list
incus storage info default

# Verify networks
incus network list
incus network show incusbr0

# Check profiles
incus profile list
incus profile show default

# Verify a specific container's configuration
incus config show my-container
```

## Start Migrated Containers

The migration stops containers before transferring them. Start them back up:

```bash
# Start a specific container
incus start my-container

# Start all containers
for container in $(incus list --format csv -c n,s | grep -v RUNNING | cut -d, -f1); do
    echo "Starting: $container"
    incus start "$container" || echo "Failed to start $container"
done

# Check status
incus list
```

## Test Container Functionality

Verify containers are working properly after migration:

```bash
# Check container networking
incus exec my-container -- ip addr show

# Check that DNS works inside the container
incus exec my-container -- nslookup google.com

# Check that services that were running before are running now
incus exec my-container -- systemctl status

# Test any application-specific functionality
# For a web server container:
incus exec webserver -- curl -s http://localhost/ | head -5
```

## Fix Common Migration Issues

### Containers Won't Start After Migration

```bash
# Check the error
incus start my-container 2>&1

# Look at the container logs
incus logs my-container

# Check the Incus daemon log
sudo journalctl -u incus -n 100

# Possible fix: reset container configuration
incus config set my-container security.privileged false
```

### Network Not Working Inside Containers

```bash
# Check if the bridge is configured
incus network list
ip addr show incusbr0

# Verify the container has a network device
incus config device show my-container

# Check that dnsmasq is running for the bridge
ps aux | grep dnsmasq

# Restart the network
incus network restart incusbr0
incus restart my-container
```

### Storage Pool Migration Failed

If a storage pool migration failed, you may need to migrate volumes manually:

```bash
# Check which volumes exist in LXD
lxc storage volume list default

# Check Incus storage
incus storage volume list default

# Manually copy a container's disk if needed
# Stop the container in LXD
lxc stop my-container

# Export from LXD
lxc export my-container /tmp/my-container-export.tar.gz

# Import to Incus
incus import /tmp/my-container-export.tar.gz
```

## Remove LXD After Successful Migration

Once you have verified that all containers are running correctly in Incus, remove LXD:

```bash
# Stop all LXD containers
lxc list | awk '/RUNNING/{print $2}' | xargs -I{} lxc stop {}

# Remove the LXD snap
sudo snap remove --purge lxd

# Clean up LXD data (only after confirming incus is working)
sudo rm -rf /var/snap/lxd/common/lxd

# Verify LXD is gone
which lxc 2>/dev/null && echo "LXD still present" || echo "LXD removed"
```

## Update Scripts and Automation

After migration, update any scripts or systemd services that use the `lxc` command:

```bash
# Find scripts using lxc command
grep -r "lxc " /etc/systemd/ /usr/local/bin/ /root/ 2>/dev/null

# The incus command is the replacement for lxc
# Most commands are identical, just replace 'lxc' with 'incus'
# Example: lxc exec -> incus exec
# Example: lxc launch -> incus launch
# Example: lxc list -> incus list

# Create a compatibility alias if needed during transition
# echo 'alias lxc=incus' >> ~/.bashrc
```

## Key Differences Between LXD and Incus

After migration, be aware of these behavioral differences:

- The command is `incus` instead of `lxc`
- Administration commands use `incus admin` instead of `lxd admin`
- The socket path changed from `/var/snap/lxd/common/lxd/unix.socket` to `/var/lib/incus/unix.socket`
- Some deprecated LXD features may not be available in Incus
- Incus uses semantic versioning independently from LXD's version numbering

The migration tool handles most of the complexity automatically. The main time investment is verifying that all applications and services inside your containers continue to work correctly after the transfer.
