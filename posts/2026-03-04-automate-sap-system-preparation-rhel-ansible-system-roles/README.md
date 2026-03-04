# How to Automate SAP System Preparation on RHEL with Ansible System Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP, Ansible, System Roles, Automation, Linux

Description: Automate the entire SAP system preparation process on RHEL using Ansible System Roles, covering general prerequisites, HANA-specific tuning, and NetWeaver requirements.

---

RHEL System Roles for SAP automate the dozens of configuration steps required to prepare RHEL for SAP installations. This eliminates manual errors and ensures consistent configuration across all SAP servers.

## Installing the Roles

```bash
# Install the SAP System Roles on the Ansible control node
sudo dnf install -y rhel-system-roles-sap

# List available SAP roles
ls /usr/share/ansible/roles/ | grep sap
# sap_general_preconfigure
# sap_hana_preconfigure
# sap_netweaver_preconfigure
```

## Playbook for SAP HANA Preparation

```yaml
# prepare-hana.yml
---
- name: Prepare RHEL for SAP HANA
  hosts: hana_servers
  become: true
  vars:
    # General SAP prerequisites
    sap_general_preconfigure_modify_etc_hosts: true
    sap_general_preconfigure_update: true
    sap_general_preconfigure_fail_if_reboot_required: false
    sap_general_preconfigure_reboot_ok: true

    # HANA specific settings
    sap_hana_preconfigure_assert: false
    sap_hana_preconfigure_update: true

  roles:
    - sap_general_preconfigure
    - sap_hana_preconfigure
```

## Playbook for SAP NetWeaver Preparation

```yaml
# prepare-netweaver.yml
---
- name: Prepare RHEL for SAP NetWeaver
  hosts: netweaver_servers
  become: true
  vars:
    sap_general_preconfigure_modify_etc_hosts: true
    sap_general_preconfigure_update: true
    sap_netweaver_preconfigure_update: true

  roles:
    - sap_general_preconfigure
    - sap_netweaver_preconfigure
```

## Combined Playbook for Mixed Environments

```yaml
# prepare-sap-all.yml
---
- name: Prepare all SAP HANA servers
  hosts: hana_servers
  become: true
  roles:
    - sap_general_preconfigure
    - sap_hana_preconfigure

- name: Prepare all SAP NetWeaver servers
  hosts: netweaver_servers
  become: true
  roles:
    - sap_general_preconfigure
    - sap_netweaver_preconfigure
```

## Inventory

```ini
# inventory.ini
[hana_servers]
hana01.example.com
hana02.example.com

[netweaver_servers]
app01.example.com
app02.example.com

[all:vars]
ansible_user=admin
ansible_become=true
```

## Running the Preparation

```bash
# Dry run to preview changes
ansible-playbook prepare-sap-all.yml -i inventory.ini --check --diff

# Apply the configuration
ansible-playbook prepare-sap-all.yml -i inventory.ini

# Run in assert mode to verify compliance after configuration
ansible-playbook prepare-hana.yml -i inventory.ini \
  -e "sap_hana_preconfigure_assert=true"
```

## What Gets Configured

```bash
# After running, verify key settings:

# Kernel parameters
sysctl vm.max_map_count        # 2147483647 for HANA
sysctl net.core.somaxconn      # 4096
sysctl net.ipv4.tcp_max_syn_backlog  # 8192

# Tuned profile
tuned-adm active               # sap-hana or sap-netweaver

# Required packages
rpm -q compat-openssl11
rpm -q libnsl
rpm -q libatomic

# Swap configuration (disabled for HANA)
swapon --show                  # Should be empty for HANA nodes
```

The roles are idempotent, so running them multiple times is safe and will only change settings that have drifted from the required values.
