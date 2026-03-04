# How to Prepare RHEL for SAP HANA Installation Using RHEL System Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP HANA, System Roles, Ansible, Enterprise, Linux

Description: Use RHEL System Roles for SAP to automatically prepare RHEL servers for SAP HANA installation, configuring all required OS settings.

---

Red Hat provides dedicated System Roles for SAP that automate the complex OS-level preparation required before installing SAP HANA. These roles handle package installation, kernel tuning, filesystem setup, and compliance checks.

## Installing SAP System Roles

```bash
# Install the RHEL System Roles for SAP
sudo dnf install -y rhel-system-roles-sap

# Verify the roles are installed
ls /usr/share/ansible/roles/ | grep sap
# sap_general_preconfigure
# sap_hana_preconfigure
# sap_netweaver_preconfigure
```

## Creating the SAP HANA Preparation Playbook

```yaml
# prepare-sap-hana.yml
---
- name: Prepare RHEL for SAP HANA
  hosts: sap_hana_servers
  become: true

  vars:
    # SAP HANA specific variables
    sap_hana_preconfigure_assert: true
    sap_hana_preconfigure_assert_ignore_errors: false
    sap_general_preconfigure_modify_etc_hosts: true
    sap_general_preconfigure_update: true

  roles:
    # Step 1: General SAP prerequisites
    - role: sap_general_preconfigure

    # Step 2: SAP HANA specific prerequisites
    - role: sap_hana_preconfigure
```

## Inventory for SAP HANA Servers

```ini
# inventory.ini
[sap_hana_servers]
hana01.example.com
hana02.example.com

[sap_hana_servers:vars]
ansible_user=admin
ansible_become=true
```

## Running the Preparation

```bash
# Run the playbook (use --check first for a dry run)
ansible-playbook prepare-sap-hana.yml -i inventory.ini --check

# Apply the configuration
ansible-playbook prepare-sap-hana.yml -i inventory.ini
```

## What the Roles Configure

The `sap_general_preconfigure` role handles:

```bash
# Packages: installs required packages for SAP
# /etc/hosts: configures hostname resolution
# tmpfs: configures /dev/shm size
# Services: enables required services

# You can verify after the playbook runs:
rpm -qa | grep -i compat-sap
cat /etc/hosts
df -h /dev/shm
```

The `sap_hana_preconfigure` role handles:

```bash
# Kernel parameters for SAP HANA
sysctl vm.memory_failure_early_kill
sysctl vm.max_map_count
sysctl net.core.somaxconn

# Tuned profile
tuned-adm active
# Should show: sap-hana

# Required packages for HANA
rpm -q libatomic
rpm -q compat-openssl11
```

## Verifying the Configuration

After running the roles, verify readiness:

```bash
# Run the roles in assert mode to check compliance
ansible-playbook prepare-sap-hana.yml -i inventory.ini \
  -e "sap_hana_preconfigure_assert=true"

# Manual checks
cat /proc/sys/vm/max_map_count
# Expected: 2147483647

cat /proc/sys/kernel/numa_balancing
# Expected: 0

tuned-adm active
# Expected: sap-hana
```

The system is now ready for SAP HANA installation according to SAP Note requirements.
