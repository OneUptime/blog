# How to Compare RHEL and Oracle Linux for Database Server Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Oracle Linux, Database, Comparison, Enterprise

Description: Compare RHEL and Oracle Linux for running database workloads, covering kernel options, support models, and Oracle Database optimization.

---

Oracle Linux is a free RHEL-compatible distribution maintained by Oracle. It is commonly used for Oracle Database deployments because of its tight integration with Oracle products. Here is how it compares to RHEL for database server use.

## Kernel Options

Oracle Linux offers two kernel choices: the Red Hat Compatible Kernel (RHCK) and the Unbreakable Enterprise Kernel (UEK):

```bash
# Oracle Linux: Check which kernel is running
uname -r
# RHCK example: 5.14.0-362.8.1.el9_3.x86_64
# UEK example: 5.15.0-200.131.27.el9uek.x86_64

# Switch between kernels by setting the default in GRUB
sudo grubby --set-default /boot/vmlinuz-5.15.0-200.131.27.el9uek.x86_64
```

UEK includes optimizations for Oracle Database workloads, including better I/O scheduling and DTrace support. RHEL uses only the RHCK.

## Oracle Database Preinstallation

Oracle Linux ships a preinstallation RPM that automatically configures kernel parameters, user accounts, and resource limits for Oracle Database:

```bash
# Oracle Linux: Install the preinstall package
sudo dnf install oracle-database-preinstall-21c

# This automatically sets sysctl parameters, creates the oracle user,
# and configures /etc/security/limits.conf
```

On RHEL, you must configure these prerequisites manually or use your own automation:

```bash
# RHEL: Manually set kernel parameters for Oracle DB
sudo tee /etc/sysctl.d/99-oracle.conf << 'EOF'
fs.aio-max-nr = 1048576
fs.file-max = 6815744
kernel.shmall = 2097152
kernel.shmmax = 4294967295
kernel.sem = 250 32000 100 128
net.ipv4.ip_local_port_range = 9000 65500
net.core.rmem_default = 262144
net.core.rmem_max = 4194304
net.core.wmem_default = 262144
net.core.wmem_max = 1048576
EOF

sudo sysctl --system
```

## Support Models

RHEL requires a subscription for updates and support. Oracle Linux base updates are free, and Oracle Premier Support is a paid add-on:

```bash
# RHEL: Check subscription status
sudo subscription-manager status

# Oracle Linux: Repositories are freely available
sudo dnf repolist
```

If you run Oracle Database, Oracle Premier Support for Oracle Linux is included with your database support contract at no additional cost.

## Compatibility

Oracle Linux maintains binary compatibility with RHEL. Packages built for RHEL generally work on Oracle Linux:

```bash
# Verify binary compatibility
rpm -q --queryformat '%{VENDOR}\n' glibc
```

## When to Choose Each

Choose Oracle Linux when you run Oracle Database and want the UEK kernel optimizations, free OS updates, and simplified preinstallation. Choose RHEL when you run mixed database workloads (PostgreSQL, MySQL, SQL Server), need Red Hat support for the OS layer, or your organization standardizes on Red Hat products. Both are solid choices for database servers; the decision often comes down to your database vendor and existing support contracts.
