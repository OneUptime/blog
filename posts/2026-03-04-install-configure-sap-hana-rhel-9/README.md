# How to Install and Configure SAP HANA on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP HANA, SAP, Database, Enterprise, Linux

Description: A complete guide to installing and configuring SAP HANA database on RHEL, covering system preparation, HANA installation, and post-install validation.

---

SAP HANA is one of the most demanding enterprise workloads, and RHEL is a certified platform for running it. This guide walks you through the entire process, from preparing your RHEL system to completing a working SAP HANA installation.

## Architecture Overview

```mermaid
graph TB
    subgraph "RHEL Server"
        OS[RHEL OS Layer]
        OS --> Kernel[Tuned Kernel Parameters]
        OS --> FS[XFS Filesystems]
        OS --> Packages[Required Packages]
        Kernel --> HANA[SAP HANA Database]
        FS --> HANA
        Packages --> HANA
        HANA --> Data[/hana/data]
        HANA --> Log[/hana/log]
        HANA --> Shared[/hana/shared]
    end
```

## Prerequisites

- RHEL.x with an active subscription (SAP Solutions subscription recommended)
- Minimum 64 GB RAM (128 GB or more for production)
- At least 4 CPU cores
- Separate disks for /hana/data, /hana/log, and /hana/shared
- SAP HANA installation media from the SAP Software Download Center
- SAP S-user credentials

## Step 1: Register the System and Enable SAP Repositories

```bash
# Register with Red Hat Subscription Manager
sudo subscription-manager register --username=your_username --password=your_password

# Attach the SAP Solutions subscription
sudo subscription-manager attach --pool=your_sap_pool_id

# Enable the required repositories for SAP HANA
sudo subscription-manager repos \
  --enable=rhel-9-for-x86_64-baseos-rpms \
  --enable=rhel-9-for-x86_64-appstream-rpms \
  --enable=rhel-9-for-x86_64-sap-solutions-rpms \
  --enable=rhel-9-for-x86_64-sap-netweaver-rpms
```

## Step 2: Run the SAP Preconfigure Ansible Role

Red Hat provides Ansible roles that automatically configure RHEL for SAP workloads.

```bash
# Install the SAP preconfigure roles
sudo dnf install -y rhel-system-roles-sap

# Create an Ansible playbook for SAP HANA preparation
cat <<'EOF' > /tmp/sap-hana-prepare.yml
---
- name: Prepare RHEL for SAP HANA
  hosts: localhost
  become: true
  roles:
    - role: sap_general_preconfigure
    - role: sap_hana_preconfigure
EOF

# Run the playbook
sudo ansible-playbook /tmp/sap-hana-prepare.yml
```

## Step 3: Configure Storage for SAP HANA

SAP HANA requires specific filesystem layouts with XFS formatting.

```bash
# Create physical volumes on the dedicated disks
# Replace /dev/sdb, /dev/sdc, /dev/sdd with your actual devices
sudo pvcreate /dev/sdb /dev/sdc /dev/sdd

# Create volume groups for each HANA component
sudo vgcreate vg_hana_data /dev/sdb
sudo vgcreate vg_hana_log /dev/sdc
sudo vgcreate vg_hana_shared /dev/sdd

# Create logical volumes using 100% of available space
sudo lvcreate -l 100%FREE -n lv_hana_data vg_hana_data
sudo lvcreate -l 100%FREE -n lv_hana_log vg_hana_log
sudo lvcreate -l 100%FREE -n lv_hana_shared vg_hana_shared

# Format with XFS (SAP recommended filesystem)
sudo mkfs.xfs /dev/vg_hana_data/lv_hana_data
sudo mkfs.xfs /dev/vg_hana_log/lv_hana_log
sudo mkfs.xfs /dev/vg_hana_shared/lv_hana_shared

# Create mount points
sudo mkdir -p /hana/data /hana/log /hana/shared

# Add entries to /etc/fstab for persistent mounts
cat <<'EOF' | sudo tee -a /etc/fstab
/dev/vg_hana_data/lv_hana_data   /hana/data   xfs defaults,noatime,nodiratime 0 0
/dev/vg_hana_log/lv_hana_log     /hana/log    xfs defaults,noatime,nodiratime 0 0
/dev/vg_hana_shared/lv_hana_shared /hana/shared xfs defaults,noatime,nodiratime 0 0
EOF

# Mount all filesystems
sudo mount -a

# Verify the mounts
df -hT /hana/data /hana/log /hana/shared
```

## Step 4: Configure Kernel Parameters

```bash
# Set the kernel parameters required by SAP HANA
sudo tee /etc/sysctl.d/sap-hana.conf > /dev/null <<'EOF'
# Shared memory - set to total RAM in bytes
kernel.shmmax = 137438953472
kernel.shmall = 33554432

# Semaphores: SEMMSL SEMMNS SEMOPM SEMMNI
kernel.sem = 1250 256000 100 8192

# Network tuning for SAP HANA
net.core.somaxconn = 4096
net.core.netdev_max_backlog = 300000
net.ipv4.tcp_max_syn_backlog = 16384
net.ipv4.tcp_slow_start_after_idle = 0

# Memory overcommit settings
vm.overcommit_memory = 0
vm.swappiness = 10

# Transparent Huge Pages must be disabled for SAP HANA
# (handled via kernel command line below)
EOF

# Apply the sysctl settings immediately
sudo sysctl --system

# Disable Transparent Huge Pages (required by SAP HANA)
sudo grubby --update-kernel=ALL --args="transparent_hugepage=never"
```

## Step 5: Install Required Packages

```bash
# Install packages required by SAP HANA
sudo dnf install -y \
  compat-openssl11 \
  libtool-ltdl \
  xfsprogs \
  nfs-utils \
  tuned-profiles-sap-hana \
  resource-agents-sap-hana \
  expect \
  graphviz \
  iptraf-ng \
  krb5-workstation \
  libatomic \
  libcanberra-gtk2 \
  numactl \
  PackageKit-gtk3-module \
  xorg-x11-xauth

# Apply the SAP HANA tuned profile
sudo tuned-adm profile sap-hana
```

## Step 6: Create the SAP HANA User and Group

```bash
# Create the sapsys group with the standard GID
sudo groupadd -g 79 sapsys

# Create the HANA admin user (replace HDB with your SID)
# Using SID "HDB" as an example
sudo useradd -u 1001 -g sapsys -d /home/hdbadm -s /bin/bash hdbadm

# Set the password for the admin user
sudo passwd hdbadm

# Set proper ownership on HANA directories
sudo chown -R hdbadm:sapsys /hana/data /hana/log /hana/shared
```

## Step 7: Run the SAP HANA Installer

```bash
# Extract the SAP HANA installation media
# Assuming the media is in /tmp/hana_media
cd /tmp/hana_media

# Run the HANA Database Lifecycle Manager (hdblcm)
sudo ./hdblcm \
  --action=install \
  --sid=HDB \
  --number=00 \
  --sapadm_password=YourSecurePassword \
  --system_user_password=YourSecurePassword \
  --datapath=/hana/data/HDB \
  --logpath=/hana/log/HDB \
  --components=server \
  --batch
```

The installer will validate the system, install the HANA binaries, and configure the database instance.

## Step 8: Verify the Installation

```bash
# Switch to the HANA admin user
sudo su - hdbadm

# Check if HANA processes are running
sapcontrol -nr 00 -function GetProcessList

# Verify the HANA version
HDB version

# Connect to the HANA database using hdbsql
hdbsql -i 00 -u SYSTEM -p YourSecurePassword \
  "SELECT VERSION FROM SYS.M_DATABASE"

# Check the system overview
hdbsql -i 00 -u SYSTEM -p YourSecurePassword \
  "SELECT * FROM SYS.M_SYSTEM_OVERVIEW"
```

## Step 9: Configure Firewall for SAP HANA

```bash
# Open the standard SAP HANA ports
# Instance number 00 uses ports 300xx and 5xx13-5xx14
sudo firewall-cmd --permanent --add-port=30013/tcp  # SQL/MDX access
sudo firewall-cmd --permanent --add-port=30015/tcp  # SQL/MDX access
sudo firewall-cmd --permanent --add-port=30017/tcp  # Internal communication
sudo firewall-cmd --permanent --add-port=30040/tcp  # HTTP access
sudo firewall-cmd --permanent --add-port=30041/tcp  # HTTPS access
sudo firewall-cmd --permanent --add-port=50013/tcp  # Instance agent HTTP
sudo firewall-cmd --permanent --add-port=50014/tcp  # Instance agent HTTPS

# Reload the firewall
sudo firewall-cmd --reload
```

## Post-Installation Checklist

```mermaid
graph LR
    A[System Prep] --> B[Storage Setup]
    B --> C[Kernel Tuning]
    C --> D[Package Install]
    D --> E[HANA Install]
    E --> F[Verification]
    F --> G[Firewall Config]
    G --> H[Backup Setup]
```

After completing the installation, make sure to:

1. Set up regular database backups
2. Configure HANA system replication for high availability
3. Enable audit logging
4. Set up monitoring with SAP HANA Cockpit or external tools
5. Apply the latest SAP HANA patches

## Conclusion

You now have SAP HANA installed and running on RHEL. The combination of RHEL system roles for preconfiguration and the hdblcm installer makes the process repeatable and consistent. For production environments, always refer to the latest SAP Notes and the SAP HANA Installation Guide for your specific HANA version.
