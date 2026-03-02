# How to Perform a Minimal Ubuntu Server Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Minimal, Installation, Server, Optimization

Description: Learn how to install the smallest possible Ubuntu Server footprint, strip unnecessary packages, disable unused services, and build a lean, purpose-specific server base.

---

There are good reasons to want the smallest possible Ubuntu Server installation: reduced memory usage, minimized attack surface, faster boot times, easier auditing, and lower disk consumption on resource-constrained systems like Raspberry Pi, cloud micro-instances, or embedded hardware. Ubuntu's standard server ISO installs a reasonably lean system, but you can go significantly further by making intentional choices during installation and aggressively removing unused components afterward.

## Starting with the Right ISO

Ubuntu provides several starting points, each progressively smaller:

- **Ubuntu Server ISO**: Standard installer, ~2-4 GB after install
- **Ubuntu Mini ISO / Netboot**: Downloads only what is needed from the network
- **Ubuntu Base**: A minimal tarball for container and chroot use

For bare-metal or VM installations, the standard Ubuntu Server ISO with careful package selection is the most practical approach.

## Minimal Installation During Setup

When the Ubuntu Server installer asks about package groups (the "Featured Server Snaps" screen), skip all of them. Do not install Docker, Microk8s, or any optional packages during setup. Install only what you explicitly need after the OS is running.

For automated installations using Autoinstall, specify minimal packages:

```yaml
# autoinstall.yaml - minimal configuration
version: 1
locale: en_US.UTF-8
keyboard:
  layout: us
storage:
  layout:
    name: direct    # No LVM, slightly smaller overhead
identity:
  hostname: minimal-server
  username: admin
  password: "$6$..."
ssh:
  install-server: true
  authorized-keys:
    - "ssh-ed25519 AAAA... your_key"
  allow-pw: false
packages: []           # No extra packages
snaps: []             # No snap packages
updates: security     # Only security updates automatically
```

## Post-Install Package Cleanup

After the standard installation, check what is installed and remove what you do not need:

```bash
# Show installed package count
dpkg -l | grep -c '^ii'

# Show packages sorted by size (largest first)
dpkg-query -W --showformat='${Installed-Size}\t${Package}\n' | sort -nr | head -50

# List automatically installed packages that are no longer needed
apt list --auto-removable 2>/dev/null
```

### Removing Snap

If you do not intend to use snap packages, removing snapd reduces memory usage and eliminates several background daemons:

```bash
# Remove all installed snaps first
snap list | awk 'NR>1{print $1}' | xargs -I {} sudo snap remove {}

# Remove snapd
sudo apt purge snapd -y
sudo apt autoremove -y

# Prevent snapd from being reinstalled (optional)
sudo apt-mark hold snapd

# Remove leftover snap directories
rm -rf ~/snap /var/snap /var/lib/snapd /snap
```

### Removing Unnecessary Packages

```bash
# Remove packages common in a standard install that may not be needed
sudo apt purge -y \
    vim-tiny \
    nano \
    cloud-guest-utils \
    python3-commandnotfound \
    apport \
    ubuntu-advantage-tools

# Remove documentation and man pages to save space
sudo apt purge -y man-db manpages

# Clean up
sudo apt autoremove -y
sudo apt clean
```

### Removing Unused Kernel Headers

If you do not compile modules, kernel headers consume significant disk space:

```bash
# Show installed kernel header packages
dpkg -l 'linux-headers-*' | grep '^ii'

# Remove headers for kernels that are not the current running kernel
CURRENT=$(uname -r)
dpkg -l 'linux-headers-*' | awk '/^ii/{print $2}' | grep -v "$CURRENT" | xargs -r sudo apt purge -y
```

## Disabling Unnecessary Services

Every running service consumes memory and CPU. Identify and disable services you do not need:

```bash
# List all running services
systemctl list-units --type=service --state=running

# List services that start on boot but may not be needed
systemctl list-unit-files --type=service --state=enabled
```

Common services to disable on minimal servers:

```bash
# Disable ModemManager (irrelevant on servers)
sudo systemctl disable --now ModemManager

# Disable avahi-daemon (mDNS - not needed on most servers)
sudo systemctl disable --now avahi-daemon

# Disable multipathd (needed only for multipath storage)
sudo systemctl disable --now multipathd

# Disable iscsid (iSCSI - needed only if you use iSCSI storage)
sudo systemctl disable --now iscsid

# Disable snapd timer units if snapd was not removed
sudo systemctl disable --now snapd.seeded.service
sudo systemctl disable --now snapd.service
```

Check the impact before and after:

```bash
# Count running processes before
ps aux --no-headers | wc -l

# Check memory usage
free -m
```

## Using ubuntu-minimal Metapackage

Ubuntu's `ubuntu-minimal` metapackage is the smallest coherent package set. If you want to build from scratch:

```bash
# On an existing system, see what ubuntu-minimal pulls in
apt-rdepends ubuntu-minimal | grep -v '^ '

# Alternatively, use debootstrap to create a minimal chroot
sudo debootstrap --variant=minbase noble /tmp/minimal-ubuntu http://archive.ubuntu.com/ubuntu
```

The `--variant=minbase` flag tells debootstrap to install only `essential` and `priority=required` packages, resulting in a ~200 MB base system.

## Minimal Kernel Configuration

Ubuntu ships a general-purpose kernel with many modules compiled in. For specialized hardware where you control the kernel, a custom kernel reduces boot time and memory:

```bash
# Show currently loaded modules
lsmod | wc -l

# Show loaded modules with their size
lsmod | sort -k2 -n -r | head -20

# Check what hardware modules are being loaded at boot
cat /proc/modules | awk '{print $1}' | sort
```

However, recompiling a custom kernel is a significant undertaking and rarely worth it for server use. Focus on software-level minimization instead.

## Memory Footprint After Minimization

A typical minimized Ubuntu 24.04 Server:

```bash
# After removing snapd, unnecessary packages, and disabling services
free -m
# Typical output:
#               total    used    free
# Mem:           2048     180    1868
# Swap:          2047       0    2047

# Compare to standard install:
# Mem:           2048     350    1698
```

The savings are meaningful on 512 MB or 1 GB instances.

## Disk Space Optimization

```bash
# Remove cached package files
sudo apt clean

# Remove old log files
sudo journalctl --vacuum-size=50M
sudo find /var/log -type f -name "*.gz" -delete

# Check disk usage by directory
du -sh /* 2>/dev/null | sort -hr | head -20
```

### Limiting Journal Size

systemd-journald by default grows its logs until they fill a percentage of the disk. Limit it:

```bash
sudo mkdir -p /etc/systemd/journald.conf.d/
sudo tee /etc/systemd/journald.conf.d/size.conf << 'EOF'
[Journal]
SystemMaxUse=100M
RuntimeMaxUse=50M
MaxRetentionSec=7day
EOF
sudo systemctl restart systemd-journald
```

## Verifying the Minimal State

After minimizing, audit what is running:

```bash
# Running processes
ps aux | grep -v grep

# Open network ports (attack surface check)
sudo ss -tlnp

# Listening services
sudo netstat -tlnp 2>/dev/null || sudo ss -tlnp

# Loaded kernel modules
lsmod

# Startup time
systemd-analyze
systemd-analyze blame | head -20
```

A well-minimized Ubuntu Server with only OpenSSH and the application you care about should:
- Boot in under 5 seconds
- Use under 200 MB RAM at idle
- Have fewer than 20 listening socket entries
- Run fewer than 30 processes

## Building a Minimal Docker Base Image

If you are creating custom Docker base images rather than a full VM, the debootstrap approach produces very small images:

```bash
# Create a minimal Ubuntu chroot
sudo debootstrap --variant=minbase noble ubuntu-noble http://archive.ubuntu.com/ubuntu

# Package it as a Docker image
sudo tar -C ubuntu-noble -c . | docker import - ubuntu-minimal:noble

# Verify size
docker images ubuntu-minimal:noble
# Should be around 80-100 MB

# Run it
docker run -it ubuntu-minimal:noble bash
```

The result is significantly smaller than the official Ubuntu Docker image because it skips the layer overhead and includes only what debootstrap considers essential.

Minimizing Ubuntu is about understanding what you actually need versus what the installer assumes you might want. A focused, minimal installation is easier to maintain, faster to audit, and less likely to surprise you with an unexpected service or background process interfering with your workload.
