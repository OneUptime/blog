# How to Configure RKE2 SELinux Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, SELinux, Security, Linux, Rancher

Description: Learn how to configure and enable SELinux support in RKE2 for enhanced mandatory access control security on RHEL, CentOS, and Rocky Linux nodes.

SELinux (Security-Enhanced Linux) is a mandatory access control (MAC) security mechanism built into the Linux kernel. When properly configured with RKE2, SELinux adds an additional layer of security that restricts what processes can access, even if they gain elevated privileges. This guide covers enabling and configuring SELinux support in RKE2.

## Prerequisites

- RHEL, CentOS, Rocky Linux, or Fedora with SELinux available
- A supported RKE2 release
- Understanding of SELinux concepts (contexts, policies, booleans)

## Understanding SELinux with Kubernetes

SELinux can conflict with Kubernetes container runtime operations if not properly configured. RKE2 provides an SELinux policy package (`rke2-selinux`) that defines the necessary SELinux contexts for RKE2 components.

## Step 1: Check Current SELinux Status

```bash
# Check SELinux status

sestatus

# Check current enforcement mode
getenforce

# Available modes:
# Enforcing - SELinux policy is enforced
# Permissive - SELinux logs but doesn't enforce
# Disabled - SELinux is disabled

# For production: use Enforcing
# For testing/debugging: use Permissive
```

## Step 2: Install RKE2 SELinux Policy

```bash
# For RHEL/CentOS/Rocky Linux/Fedora, install the base container
# SELinux policy and SELinux administration tools
sudo dnf install -y container-selinux policycoreutils-python-utils

# Install RKE2-specific SELinux policy
# Option 1: Install RKE2 from RPMs; this installs rke2-selinux by default
curl -sfL https://get.rke2.io | sudo sh -

# Option 2: If the Rancher RKE2 RPM repo is already configured,
# install or update just the SELinux policy package
sudo dnf install -y rke2-selinux

# Verify the policy is installed
rpm -q rke2-selinux
```

## Step 3: Configure SELinux Mode

```bash
# Make enforcing mode permanent
sudo sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config

# If SELinux is Disabled, reboot after changing /etc/selinux/config.
# If SELinux is currently Permissive, switch to Enforcing immediately:
sudo setenforce 1

# Verify
cat /etc/selinux/config | grep "^SELINUX="
```

## Step 4: Configure RKE2 to Work with SELinux

```yaml
# /etc/rancher/rke2/config.yaml - SELinux configuration
# Enable SELinux in containerd. RPM installations enable this by default;
# set it explicitly for tarball installs or when documenting the node config.
selinux: true

# The selinux: true setting tells containerd to:
# 1. Apply SELinux labels to containers
# 2. Use the container SELinux policy for workload containers
# 3. Use RKE2-specific labels for control-plane static pods
# 4. Respect SELinux labels on volume mounts
```

## Step 5: Verify SELinux Labels on RKE2 Processes

```bash
# Start RKE2
sudo systemctl start rke2-server

# Check SELinux labels on RKE2 processes
ps -eZ | grep -E "rke2|containerd|kubelet"

# Check SELinux context of control-plane static pod processes
# Example: etcd and kube-apiserver can use RKE2-specific contexts such as
# rke2_service_db_t or rke2_service_t
ps -eZ | grep -E "etcd|kube-apiserver"

# Check SELinux labels on RKE2 files
ls -laZ /var/lib/rancher/rke2/
ls -laZ /etc/rancher/rke2/
```

## Step 6: Troubleshoot SELinux Denials

When SELinux denials occur, use these tools to diagnose:

```bash
# View recent SELinux denials
sudo ausearch -m avc --start recent

# Format denials for readability
sudo ausearch -m avc --start recent | audit2why

# Get suggested policy adjustments
sudo ausearch -m avc --start recent | audit2allow -M mypolicy

# View SELinux audit log
sudo cat /var/log/audit/audit.log | grep denied | tail -20

# Check if RKE2 is generating denials
sudo ausearch -m avc -c rke2 --start recent
sudo ausearch -m avc -c containerd --start recent
sudo ausearch -m avc -c kubelet --start recent
```

## Step 7: Configure SELinux Boolean Settings

Some workloads may require specific SELinux booleans. RKE2 itself does not require these by default; enable only the booleans required by your CNI, storage, or workload:

```bash
# Check current SELinux booleans relevant to containers
getsebool -a | grep -E "container|virt"

# Optional: allow containers that run systemd to manage cgroups
sudo setsebool -P container_manage_cgroup on

# Optional: allow container domains to use NFS volumes
sudo setsebool -P virt_use_nfs on

# Optional: allow containers to connect to any TCP port
sudo setsebool -P container_connect_any on

# Verify boolean settings
getsebool container_manage_cgroup
getsebool virt_use_nfs
getsebool container_connect_any
```

## Step 8: SELinux Contexts for Persistent Volumes

When using persistent volumes, SELinux contexts must be correct:

```bash
# Check the SELinux context of a volume directory
ls -laZ /data/

# Set the correct context for Kubernetes data directories
sudo semanage fcontext -a \
  -t container_file_t "/data(/.*)?"

sudo restorecon -Rv /data/

# Verify the context was applied
ls -laZ /data/
# Should show container_file_t
```

```yaml
# pod-with-selinux.yaml - Configure SELinux context in pod spec
apiVersion: v1
kind: Pod
metadata:
  name: selinux-pod
spec:
  securityContext:
    seLinuxOptions:
      # Use a specific SELinux context for all containers
      level: "s0:c123,c456"
      # Or use a specific type
      type: "container_t"
  containers:
  - name: app
    image: nginx:latest
    securityContext:
      seLinuxOptions:
        # Container-specific override
        level: "s0:c789,c012"
```

## Conclusion

Configuring SELinux with RKE2 provides an additional layer of mandatory access control that protects against container escapes and privilege escalation. The RKE2 SELinux policy package (`rke2-selinux`) simplifies the process by pre-defining the necessary policies for RKE2 components. When deploying in RHEL, CentOS, or Rocky Linux environments, enabling SELinux enforcement from the start is strongly recommended for production clusters, especially those requiring CIS benchmark or STIG compliance.
