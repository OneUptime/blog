# How to Harden RHEL During Installation with Secure Partitioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Security, Partitioning, Hardening, Linux

Description: Learn how to set up a hardened RHEL installation from the start by using a secure partitioning scheme that meets CIS benchmark and STIG requirements.

---

The single best time to harden a Linux server is during installation. Trying to repartition a running system is painful, risky, and often just not practical. If you get the disk layout right from day one, you save yourself a lot of headaches down the road.

This guide walks through a secure partitioning strategy for RHEL that satisfies CIS benchmarks and DISA STIG requirements. I have used this layout on hundreds of servers across government, healthcare, and financial environments.

## Why Partitioning Matters for Security

Separate partitions let you apply different mount options to different directories. For example, there is no good reason to allow executable binaries in `/tmp`. With a separate partition, you can mount `/tmp` with `noexec`, which blocks a common class of attacks where malware is downloaded and executed from temporary directories.

```mermaid
flowchart LR
    A[Single / partition] -->|Risk| B[Attacker fills /var/log, crashes system]
    C[Separate partitions] -->|Mitigated| D[/var/log full, / still functional]
```

## Recommended Partition Layout

Here is the layout I recommend for a typical server with a 100 GB disk:

| Mount Point | Size | Filesystem | Mount Options |
|-------------|------|------------|---------------|
| /boot | 1 GB | xfs | defaults,nodev,nosuid |
| /boot/efi | 600 MB | vfat | defaults,umask=0077 |
| / | 20 GB | xfs | defaults |
| /tmp | 5 GB | xfs | defaults,nodev,nosuid,noexec |
| /var | 15 GB | xfs | defaults,nodev,nosuid |
| /var/log | 10 GB | xfs | defaults,nodev,nosuid,noexec |
| /var/log/audit | 5 GB | xfs | defaults,nodev,nosuid,noexec |
| /var/tmp | 5 GB | xfs | defaults,nodev,nosuid,noexec |
| /home | 10 GB | xfs | defaults,nodev,nosuid |
| swap | 4 GB | swap | - |

The remaining space can be allocated to `/` or left as free space in the volume group for future needs.

## Setting This Up During Installation

### Using the Anaconda Installer

During the graphical installation, choose "Custom" partitioning in the Installation Destination screen. Then create each partition manually using the layout above.

### Using Kickstart for Automated Installations

For automated deployments, add the partition layout to your Kickstart file:

```bash
# Kickstart partitioning section for secure layout
# Clear existing partitions
clearpart --all --initlabel

# Create boot partitions
part /boot/efi --fstype=efi --size=600
part /boot --fstype=xfs --size=1024

# Create a physical volume for LVM
part pv.01 --size=1 --grow

# Create the volume group
volgroup rhel pv.01

# Create logical volumes with specific sizes
logvol / --vgname=rhel --fstype=xfs --size=20480 --name=root
logvol /tmp --vgname=rhel --fstype=xfs --size=5120 --name=tmp --fsoptions="nodev,nosuid,noexec"
logvol /var --vgname=rhel --fstype=xfs --size=15360 --name=var --fsoptions="nodev,nosuid"
logvol /var/log --vgname=rhel --fstype=xfs --size=10240 --name=var_log --fsoptions="nodev,nosuid,noexec"
logvol /var/log/audit --vgname=rhel --fstype=xfs --size=5120 --name=var_log_audit --fsoptions="nodev,nosuid,noexec"
logvol /var/tmp --vgname=rhel --fstype=xfs --size=5120 --name=var_tmp --fsoptions="nodev,nosuid,noexec"
logvol /home --vgname=rhel --fstype=xfs --size=10240 --name=home --fsoptions="nodev,nosuid"
logvol swap --vgname=rhel --fstype=swap --size=4096 --name=swap
```

## Verifying the Partition Layout After Installation

Once the system is installed, verify everything is correct:

```bash
# Check the partition layout
lsblk

# Verify mount options are applied
findmnt -l -t xfs,vfat

# Check specific mount options for /tmp
findmnt /tmp -o TARGET,SOURCE,FSTYPE,OPTIONS
```

The output for `/tmp` should include `nodev,nosuid,noexec` in the options column.

## Understanding Mount Options

Each mount option serves a specific purpose:

- **nodev** - Prevents device files from being created or interpreted on this filesystem. Attackers sometimes create device files in world-writable directories.
- **nosuid** - Prevents setuid and setgid bits from taking effect. This stops privilege escalation via rogue binaries placed in temporary directories.
- **noexec** - Prevents direct execution of binaries on this filesystem. Scripts can still be run with `bash /tmp/script.sh`, but direct execution like `/tmp/malware` is blocked.

## Applying Mount Options to Existing Systems

If you already have a running system and need to add mount options without repartitioning, you can still apply them:

```bash
# Edit /etc/fstab to add mount options
# Find the line for /tmp and add the options
vi /etc/fstab

# Example line:
# /dev/mapper/rhel-tmp /tmp xfs defaults,nodev,nosuid,noexec 0 0

# Remount without rebooting (for partitions that are separate)
mount -o remount /tmp

# Verify the new options took effect
findmnt /tmp
```

## Handling /tmp as a tmpfs

Some organizations prefer to mount `/tmp` as a tmpfs (RAM-based filesystem). This has the advantage of being automatically cleared on reboot:

```bash
# Enable tmp.mount systemd unit for tmpfs /tmp
systemctl enable tmp.mount

# Configure the tmpfs options
mkdir -p /etc/systemd/system/tmp.mount.d/
cat > /etc/systemd/system/tmp.mount.d/options.conf << 'EOF'
[Mount]
Options=mode=1777,strictatime,noexec,nodev,nosuid,size=2G
EOF

# Reload and start
systemctl daemon-reload
systemctl start tmp.mount
```

## LUKS Encryption for Additional Security

For environments that require encryption at rest, configure LUKS during installation:

```bash
# In Kickstart, add --encrypted and --passphrase to each logvol
logvol / --vgname=rhel --fstype=xfs --size=20480 --name=root --encrypted --passphrase=YourPassphrase

# After installation, verify encryption status
lsblk -f | grep crypto_LUKS

# Check LUKS details
cryptsetup luksDump /dev/sda3
```

For production servers, use a key file or integrate with Tang/Clevis for Network-Bound Disk Encryption (NBDE) so the server can boot unattended.

## Common Mistakes to Avoid

1. **Making /var too small** - Log files, package caches, and container storage all live under /var. Size it generously.
2. **Forgetting /var/log/audit** - Auditors specifically look for this as a separate partition. STIG requires it.
3. **Skipping noexec on /tmp** - This is one of the easiest wins in security hardening and costs you nothing.
4. **Using a single partition for everything** - A full filesystem on / can crash the entire system. Separate partitions contain the damage.

## Validating Against CIS Benchmarks

After installation, run an OpenSCAP scan to verify your partitioning meets CIS requirements:

```bash
# Install OpenSCAP
dnf install -y openscap-scanner scap-security-guide

# Run CIS benchmark scan
oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_cis \
  --results /tmp/partition-check.xml \
  --report /tmp/partition-report.html \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml

# Check partition-related findings
grep -i "partition" /tmp/partition-report.html | head -20
```

Getting the partitioning right during installation is a one-time effort that pays dividends for the life of the server. It is far easier to allocate disk space correctly on day one than to migrate a running production system to a new layout.
