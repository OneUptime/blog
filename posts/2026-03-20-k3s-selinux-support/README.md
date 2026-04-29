# How to Configure K3s SELinux Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Security, SELinux, RHEL, CentOS

Description: Learn how to configure and run K3s with SELinux enforcing mode on RHEL, CentOS, and other SELinux-enabled Linux distributions.

## Introduction

SELinux (Security-Enhanced Linux) provides mandatory access control (MAC) at the OS level, adding an extra layer of security beyond standard Linux permissions. Running K3s on SELinux-enabled systems requires proper policy configuration to allow K3s and container workloads to operate correctly while maintaining SELinux enforcement. This guide covers setting up K3s with SELinux on RHEL/CentOS systems.

## Prerequisites

- RHEL 8/9, CentOS Stream 8/9, Rocky Linux, or AlmaLinux
- SELinux installed and set to `enforcing` or `permissive` mode
- Root/sudo access

## Step 1: Check Current SELinux Status

```bash
# Check SELinux status

getenforce
# Output: Enforcing, Permissive, or Disabled

# View detailed SELinux configuration
sestatus

# View SELinux mode in config file
cat /etc/selinux/config
```

## Step 2: Install the K3s SELinux Policy Package

K3s requires the `k3s-selinux` policy package, along with the base container SELinux policy packages:

```bash
# Install the base SELinux container policy packages
dnf install -y container-selinux selinux-policy-base

# Select the Rancher SELinux repo path for EL8 or EL9
source /etc/os-release
if [ "${VERSION_ID%%.*}" = "8" ]; then
  RPM_PATH="centos/8"
else
  RPM_PATH="centos/9"
fi

# Add the Rancher K3s SELinux repository
cat > /etc/yum.repos.d/rancher-k3s-common.repo << EOF
[rancher-k3s-common-stable]
name=Rancher K3s Common (stable)
baseurl=https://rpm.rancher.io/k3s/stable/common/${RPM_PATH}/noarch
enabled=1
gpgcheck=1
repo_gpgcheck=0
gpgkey=https://rpm.rancher.io/public.key
EOF

# Install the K3s SELinux policy
dnf install -y k3s-selinux

# Verify installation
rpm -q k3s-selinux

# Check that the K3s SELinux module is loaded
semodule -l | grep k3s
```

## Step 3: Install K3s with SELinux Enabled

```bash
# Install K3s with SELinux support enabled
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="--selinux" \
  sh -

# Verify K3s is running
systemctl is-active k3s
# Output: active
```

Or configure via config file:

```yaml
# /etc/rancher/k3s/config.yaml
selinux: true
```

## Step 4: Verify SELinux Contexts

After installation, verify that the K3s binary and data directories have the expected SELinux labels:

```bash
# Check K3s and containerd process contexts
ps -eZ | grep -E "k3s|containerd"

# Check the K3s binary label
ls -Z "$(command -v k3s)"

# Expected type for the K3s binary: container_runtime_exec_t

# Check K3s data directory contexts
ls -dZ /var/lib/rancher/k3s /var/lib/rancher/k3s/data /var/lib/rancher/k3s/storage

# Expected types include: container_var_lib_t, k3s_data_t, and container_file_t
```

## Step 5: Handle SELinux AVC Denials

SELinux denials are logged to the audit log. Check and resolve them:

```bash
# Install SELinux troubleshooting utilities if needed
dnf install -y policycoreutils-python-utils

# Check for SELinux denials related to K3s
ausearch -m avc -ts recent | grep k3s

# Or check the audit log directly
grep "avc:  denied" /var/log/audit/audit.log | grep k3s

# Use audit2why to understand denials
ausearch -m avc -ts recent | audit2why

# Generate a policy module to allow denied operations
ausearch -m avc -ts recent | audit2allow -M k3s-custom
semodule -i k3s-custom.pp
```

## Step 6: Temporarily Switch to Permissive for Debugging

If K3s has issues starting, temporarily switch to permissive mode for diagnostics:

```bash
# Switch to permissive (logs denials but doesn't enforce)
setenforce 0

# Verify
getenforce
# Output: Permissive

# Start K3s and check for AVC denials
systemctl start k3s
ausearch -m avc -ts recent | grep k3s

# Generate policy from accumulated denials
ausearch -m avc -ts recent | audit2allow -M k3s-fix
semodule -i k3s-fix.pp

# Return to enforcing mode
setenforce 1
```

## Step 7: Configure Container SELinux Context

Control the SELinux context for pods:

```yaml
# pod-selinux-context.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  securityContext:
    # Set SELinux options for the pod
    seLinuxOptions:
      level: "s0:c123,c456"
      type: container_t
  containers:
    - name: app
      image: nginx:latest
      securityContext:
        # Container-level SELinux options
        seLinuxOptions:
          level: "s0:c123,c456"
```

## Step 8: Handle Persistent Volume SELinux Labels

Persistent volumes need correct SELinux labels:

```bash
# Check current SELinux context of a volume directory
ls -Z /data/my-pv/

# Set the correct context for K3s persistent volumes
chcon -R -t container_file_t /data/my-pv/

# Or use semanage for permanent labeling
semanage fcontext -a -t container_file_t "/data/my-pv(/.*)?"
restorecon -R /data/my-pv/

# Verify
ls -Z /data/my-pv/
```

## Step 9: SELinux Boolean Settings for K3s

Adjust SELinux booleans that may affect container workloads:

```bash
# List container-related SELinux booleans
getsebool -a | grep container

# Allow containers to access host devices (if needed)
setsebool -P container_use_devices 1

# Verify boolean settings
getsebool container_use_devices
```

## Step 10: Monitor SELinux Events in Production

Set up monitoring for SELinux denials:

```bash
# Install setroubleshoot for better denial analysis
dnf install -y setroubleshoot-server

# View SELinux alerts
sealert -a /var/log/audit/audit.log

# Add an audit rule to watch the K3s data directory
cat > /etc/audit/rules.d/k3s-selinux.rules << 'EOF'
-w /var/lib/rancher/k3s -p rwxa -k k3s-access
EOF

# Load the new audit rules
augenrules --load
```

## Conclusion

Running K3s with SELinux enforcing mode significantly enhances cluster security by restricting what processes can do at the OS level. The key requirements are installing the `k3s-selinux` policy package and its base SELinux dependencies, then enabling SELinux support in the K3s configuration. When encountering AVC denials, use `audit2allow` to generate custom policy modules rather than disabling SELinux entirely. For production deployments on RHEL/CentOS, SELinux enforcement should be considered a mandatory security control.
