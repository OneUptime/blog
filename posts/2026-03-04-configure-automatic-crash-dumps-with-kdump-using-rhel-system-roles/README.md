# How to Configure Automatic Crash Dumps with kdump Using RHEL System Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, kdump, System Roles, Ansible, Crash Dump

Description: Use the RHEL System Role for kdump to configure automatic kernel crash dump collection across multiple RHEL systems using Ansible.

---

RHEL System Roles provide Ansible roles for common system configurations. The `kdump` system role lets you configure kernel crash dumps across your entire fleet with a single playbook.

## Install RHEL System Roles

```bash
# Install the system roles package
sudo dnf install -y rhel-system-roles

# The roles are installed to /usr/share/ansible/roles/
ls /usr/share/ansible/roles/ | grep kdump
# rhel-system-roles.kdump
```

## Create the Playbook

```yaml
# kdump-setup.yml - Configure kdump across all hosts
---
- name: Configure kdump on all systems
  hosts: all
  become: true
  vars:
    # Reserve 256 MB for the crash kernel
    kdump_system_action: dump

    # Store crash dumps locally
    kdump_target:
      type: local
      path: /var/crash

    # Core collector options: compress the dump to save space
    kdump_core_collector: "makedumpfile -l --message-level 7 -d 31"

  roles:
    - rhel-system-roles.kdump
```

## Configure a Remote Dump Target

You can send crash dumps to an NFS or SSH server:

```yaml
# kdump-remote.yml - Send crash dumps to an NFS server
---
- name: Configure kdump with NFS target
  hosts: all
  become: true
  vars:
    kdump_target:
      type: nfs
      location: "nfs-server.example.com:/exports/crash"

    kdump_core_collector: "makedumpfile -l --message-level 7 -d 31"

  roles:
    - rhel-system-roles.kdump
```

## Run the Playbook

```bash
# Apply the kdump configuration
ansible-playbook -i inventory kdump-setup.yml

# The role will:
# 1. Install kexec-tools if not present
# 2. Configure /etc/kdump.conf
# 3. Reserve crash kernel memory via GRUB
# 4. Enable and start the kdump service
```

## Verify kdump is Active

```bash
# Check the kdump service status
sudo systemctl status kdump

# Verify crash kernel memory is reserved
cat /proc/cmdline | grep crashkernel

# Check the kdump configuration
cat /etc/kdump.conf
```

## Test kdump (Caution: This Crashes the System)

```bash
# Trigger a test crash (the system will reboot)
echo 1 | sudo tee /proc/sys/kernel/sysrq
echo c | sudo tee /proc/sysrq-trigger

# After reboot, check for the crash dump
ls -la /var/crash/
```

The system role handles all the configuration details, including setting the correct crashkernel boot parameter and adjusting SELinux contexts for the dump target.
