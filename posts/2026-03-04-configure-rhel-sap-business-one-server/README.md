# How to Configure RHEL for SAP Business One Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP, Business One, HANA, Configuration, Linux

Description: Configure RHEL to host SAP Business One with SAP HANA, including OS preparation, required packages, and system tuning for the B1 platform.

---

SAP Business One on HANA can run on RHEL. The OS requires specific preparation for both the HANA database and the Business One application server components.

## System Requirements

SAP Business One on HANA has specific hardware and OS requirements:

```bash
# Check minimum requirements
# CPU: 4+ cores
# RAM: 16 GB minimum (32 GB recommended)
# Disk: 100 GB+ for HANA data

# Verify RHEL version (RHEL 9.x supported)
cat /etc/redhat-release

# Check available memory
free -g

# Check available disk space
df -h
```

## Preparing RHEL for SAP Business One

```bash
# Update the system
sudo dnf update -y

# Install required packages
sudo dnf install -y \
  compat-openssl11 \
  libnsl \
  libatomic \
  numactl \
  tuned-profiles-sap-hana \
  uuidd \
  tcsh \
  expect \
  graphviz \
  iptraf-ng \
  krb5-workstation \
  libcanberra-gtk2 \
  net-tools \
  nfs-utils \
  xorg-x11-utils

# Enable uuidd (required by HANA)
sudo systemctl enable --now uuidd
```

## Configuring Kernel Parameters

```bash
# Create SAP-specific sysctl configuration
sudo cat > /etc/sysctl.d/sap-b1.conf << 'SYSCTL'
# SAP Business One / HANA parameters
vm.max_map_count = 2147483647
vm.swappiness = 10
kernel.numa_balancing = 0
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 8192
SYSCTL

# Apply the settings
sudo sysctl --system
```

## Setting Up Tuned Profile

```bash
# Activate the SAP HANA tuned profile
sudo tuned-adm profile sap-hana

# Verify
tuned-adm active
```

## Configuring Filesystem for HANA

```bash
# Create filesystems for HANA (using XFS)
sudo mkfs.xfs /dev/sdb1    # HANA data
sudo mkfs.xfs /dev/sdc1    # HANA log
sudo mkfs.xfs /dev/sdd1    # HANA shared

# Create mount points
sudo mkdir -p /hana/data /hana/log /hana/shared

# Add to fstab
cat >> /etc/fstab << 'FSTAB'
/dev/sdb1  /hana/data    xfs  defaults,noatime  0 0
/dev/sdc1  /hana/log     xfs  defaults,noatime  0 0
/dev/sdd1  /hana/shared  xfs  defaults,noatime  0 0
FSTAB

sudo mount -a
```

## Configuring Process Limits

```bash
# /etc/security/limits.d/sap-b1.conf
cat > /etc/security/limits.d/sap-b1.conf << 'LIMITS'
@sapsys  hard  nofile   1048576
@sapsys  soft  nofile   1048576
@sapsys  hard  nproc    unlimited
@sapsys  soft  nproc    unlimited
@sapsys  hard  memlock  unlimited
@sapsys  soft  memlock  unlimited
LIMITS
```

## Disabling Unnecessary Services

```bash
# Disable services not needed for SAP
sudo systemctl disable --now cups
sudo systemctl disable --now bluetooth
sudo systemctl disable --now avahi-daemon
```

After these preparations, you can proceed with the SAP HANA database installation followed by the SAP Business One server installation using the SAP B1 Setup Wizard.
