# How to Set Up a RHEL Baseline Configuration for Consistent Server Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Baseline, Configuration, Automation, Linux

Description: Create a standardized RHEL baseline configuration using kickstart files and system roles to ensure consistent server deployments.

---

A baseline configuration ensures every RHEL server starts with the same packages, security settings, and monitoring. This eliminates configuration drift and reduces troubleshooting time.

## Kickstart File for Automated Installs

Create a kickstart file that defines your standard server build:

```bash
# /var/www/html/ks/rhel9-baseline.ks
# RHEL 9 Baseline Kickstart

# System language and keyboard
lang en_US.UTF-8
keyboard us
timezone America/New_York --utc

# Network configuration
network --bootproto=dhcp --onboot=yes --hostname=rhel-new

# Root password (use a vault in production)
rootpw --iscrypted $6$rounds=4096$salt$hashedpassword

# Disk partitioning with LVM
clearpart --all --initlabel
autopart --type=lvm

# Package selection
%packages
@^minimal-environment
chrony
firewalld
audit
rsyslog
dnf-automatic
policycoreutils-python-utils
%end

# Post-installation script
%post --log=/root/ks-post.log

# Enable essential services
systemctl enable firewalld
systemctl enable chronyd
systemctl enable auditd
systemctl enable dnf-automatic-install.timer

# Harden SSH
cat > /etc/ssh/sshd_config.d/99-baseline.conf << 'SSHEOF'
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
X11Forwarding no
SSHEOF

# Set SELinux to enforcing
sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config

# Configure firewall defaults
firewall-offline-cmd --add-service=ssh
firewall-offline-cmd --remove-service=cockpit

# Set sysctl baseline
cat > /etc/sysctl.d/99-baseline.conf << 'SYSEOF'
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
kernel.randomize_va_space = 2
SYSEOF

%end
```

## Using RHEL System Roles

RHEL System Roles are Ansible roles maintained by Red Hat for consistent configuration:

```bash
# Install RHEL System Roles
sudo dnf install rhel-system-roles

# List available roles
ls /usr/share/ansible/roles/
# Includes: rhel-system-roles.timesync, rhel-system-roles.firewall, etc.
```

Create a playbook that applies your baseline:

```yaml
# baseline.yml
---
- hosts: all
  become: true
  roles:
    - role: rhel-system-roles.timesync
      vars:
        timesync_ntp_servers:
          - hostname: time.example.com
            iburst: yes

    - role: rhel-system-roles.firewall
      vars:
        firewall:
          - service: ssh
            state: enabled
            permanent: yes

    - role: rhel-system-roles.selinux
      vars:
        selinux_state: enforcing
```

```bash
# Apply the baseline to new servers
ansible-playbook -i inventory baseline.yml
```

## Verifying Baseline Compliance

After deployment, verify servers match the baseline:

```bash
#!/bin/bash
# baseline-check.sh
echo "=== Baseline Compliance Check ==="
echo "SELinux: $(getenforce)"
echo "Firewalld: $(systemctl is-active firewalld)"
echo "Chrony: $(systemctl is-active chronyd)"
echo "SSH Root Login: $(grep PermitRootLogin /etc/ssh/sshd_config.d/99-baseline.conf)"
echo "Pending Updates: $(dnf check-update --quiet 2>/dev/null | wc -l)"
```

Store your kickstart files and Ansible playbooks in version control so changes are tracked and auditable.
