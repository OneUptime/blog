# How to Configure Automatic Crash Dumps with kdump Using RHEL System Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Crash Dump

Description: Step-by-step guide on configure automatic crash dumps with kdump using rhel system roles with practical examples and commands.

---

kdump captures kernel crash dumps for post-mortem analysis. This guide covers configuring automatic crash dumps on RHEL 9 using RHEL System Roles.

## Prerequisites

- RHEL 9 systems with Ansible installed
- RHEL System Roles package installed

```bash
sudo dnf install -y rhel-system-roles
```

## View Available kdump Variables

```bash
ls /usr/share/ansible/roles/rhel-system-roles.kdump/
cat /usr/share/ansible/roles/rhel-system-roles.kdump/defaults/main.yml
```

## Create the kdump Playbook

```yaml
---
# kdump-setup.yml
- name: Configure kdump on RHEL 9 servers
  hosts: all
  become: true

  vars:
    kdump_path: /var/crash
    kdump_core_collector: "makedumpfile -l --message-level 7 -d 31"

  roles:
    - rhel-system-roles.kdump
```

## Configure Remote Crash Dump Storage

To send crash dumps to a remote NFS server:

```yaml
---
- name: Configure kdump with NFS target
  hosts: all
  become: true

  vars:
    kdump_target:
      type: nfs
      location: nfs-server.example.com:/crash-dumps
    kdump_core_collector: "makedumpfile -l --message-level 7 -d 31"

  roles:
    - rhel-system-roles.kdump
```

## Configure SSH Crash Dump Target

```yaml
---
- name: Configure kdump with SSH target
  hosts: all
  become: true

  vars:
    kdump_target:
      type: ssh
      location: crashadmin@crash-server.example.com
    kdump_sshkey: /root/.ssh/kdump_id_rsa
    kdump_path: /var/crash

  roles:
    - rhel-system-roles.kdump
```

## Run the Playbook

```bash
ansible-playbook -i inventory kdump-setup.yml
```

## Verify kdump Configuration

```bash
sudo systemctl status kdump
sudo kdumpctl showmem
sudo cat /etc/kdump.conf
```

## Test kdump

Trigger a test crash (this will reboot the system):

```bash
echo 1 | sudo tee /proc/sys/kernel/sysrq
echo c | sudo tee /proc/sysrq-trigger
```

After reboot, check for crash dumps:

```bash
ls -la /var/crash/
```

## Analyze Crash Dumps

```bash
sudo dnf install -y crash kernel-debuginfo
sudo crash /usr/lib/debug/lib/modules/$(uname -r)/vmlinux /var/crash/*/vmcore
```

## Conclusion

RHEL System Roles simplify kdump configuration across your fleet. Configure remote crash dump storage for centralized analysis and test your configuration regularly to ensure crash dumps are captured properly.

