# How to Use Ansible to Automate VMware Infrastructure Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, VMware, Infrastructure Provisioning, vSphere, Automation

Description: Automate end-to-end VMware infrastructure provisioning with Ansible from VM creation to network configuration and storage assignment.

---

Provisioning VMware infrastructure by hand is fine when you are building one or two VMs. But when you need to stand up entire environments with dozens of VMs, each with specific CPU, memory, network, and storage configurations, doing it through the vSphere Client becomes a bottleneck. Ansible lets you define your entire VMware infrastructure as code and provision it repeatably.

This guide covers the full provisioning lifecycle: creating VMs from templates, configuring networking, assigning storage, and building multi-tier application environments.

## Prerequisites

You need:

- Ansible 2.12+ with the `community.vmware` collection
- vCenter Server with appropriate permissions
- VM templates prepared in your vSphere environment
- Python packages `pyvmomi` and `requests`

```bash
# Install everything you need
ansible-galaxy collection install community.vmware
pip install pyvmomi requests
```

## The Provisioning Pipeline

Here is the typical flow when provisioning VMware infrastructure with Ansible.

```mermaid
flowchart LR
    A[Define VM Specs] --> B[Clone from Template]
    B --> C[Customize Guest OS]
    C --> D[Configure Networking]
    D --> E[Attach Storage]
    E --> F[Power On]
    F --> G[Post-Config with Ansible]
```

## Defining Your Infrastructure

Start by defining your infrastructure in a YAML vars file. This becomes your source of truth.

```yaml
# vars/infrastructure.yml
---
datacenter: "DC-Production"
cluster: "Cluster-Prod-01"
datastore: "ds-vsan-prod"
template: "template-ubuntu-22.04"
folder: "/DC-Production/vm/Production"

vms:
  - name: web-prod-01
    cpu: 4
    memory_mb: 8192
    disk_gb: 100
    network: "seg-web-prod"
    ip: "192.168.10.11"
    gateway: "192.168.10.1"
    dns: ["10.0.0.53", "10.0.0.54"]
    role: webserver

  - name: web-prod-02
    cpu: 4
    memory_mb: 8192
    disk_gb: 100
    network: "seg-web-prod"
    ip: "192.168.10.12"
    gateway: "192.168.10.1"
    dns: ["10.0.0.53", "10.0.0.54"]
    role: webserver

  - name: app-prod-01
    cpu: 8
    memory_mb: 16384
    disk_gb: 200
    network: "seg-app-prod"
    ip: "192.168.20.11"
    gateway: "192.168.20.1"
    dns: ["10.0.0.53", "10.0.0.54"]
    role: appserver

  - name: db-prod-01
    cpu: 16
    memory_mb: 65536
    disk_gb: 500
    network: "seg-db-prod"
    ip: "192.168.30.11"
    gateway: "192.168.30.1"
    dns: ["10.0.0.53", "10.0.0.54"]
    role: database
```

## Provisioning VMs from Templates

The `community.vmware.vmware_guest` module handles VM creation from templates with guest customization.

```yaml
# playbooks/provision-vms.yml
---
- name: Provision VMware infrastructure
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/vcenter_creds.yml
    - ../vars/infrastructure.yml

  tasks:
    # Clone each VM from template with full customization
    - name: Create VMs from template
      community.vmware.vmware_guest:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
        datacenter: "{{ datacenter }}"
        cluster: "{{ cluster }}"
        folder: "{{ folder }}"
        name: "{{ item.name }}"
        template: "{{ template }}"
        datastore: "{{ datastore }}"
        state: poweredon
        hardware:
          num_cpus: "{{ item.cpu }}"
          memory_mb: "{{ item.memory_mb }}"
        disk:
          - size_gb: "{{ item.disk_gb }}"
            type: thin
            datastore: "{{ datastore }}"
        networks:
          - name: "{{ item.network }}"
            ip: "{{ item.ip }}"
            netmask: 255.255.255.0
            gateway: "{{ item.gateway }}"
            type: static
            dns_servers: "{{ item.dns }}"
        customization:
          hostname: "{{ item.name }}"
          domain: "lab.local"
          dns_servers: "{{ item.dns }}"
        wait_for_customization: true
        wait_for_customization_timeout: 600
        wait_for_ip_address: true
      loop: "{{ vms }}"
      loop_control:
        label: "{{ item.name }}"
      register: provisioned_vms
```

## Adding Extra Disks

Database servers and application servers often need extra disks beyond the OS disk.

```yaml
# playbooks/add-disks.yml
---
- name: Add extra disks to VMs
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/vcenter_creds.yml

  vars:
    extra_disks:
      - vm_name: db-prod-01
        disks:
          - size_gb: 500
            type: eagerzeroedthick
            scsi_controller: 1
            unit_number: 0
          - size_gb: 200
            type: eagerzeroedthick
            scsi_controller: 1
            unit_number: 1

  tasks:
    # Add data and log disks to the database server
    - name: Add extra disks to database VMs
      community.vmware.vmware_guest_disk:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
        datacenter: "{{ datacenter }}"
        name: "{{ item.0.vm_name }}"
        disk:
          - size_gb: "{{ item.1.size_gb }}"
            type: "{{ item.1.type }}"
            scsi_controller: "{{ item.1.scsi_controller }}"
            unit_number: "{{ item.1.unit_number }}"
            datastore: "{{ datastore }}"
            state: present
      loop: "{{ extra_disks | subelements('disks') }}"
      loop_control:
        label: "{{ item.0.vm_name }} - disk {{ item.1.unit_number }}"
```

## Dynamic Inventory for Post-Provisioning

After creating VMs, you need to configure them. Use a dynamic inventory that queries vCenter to find the new VMs.

```yaml
# inventory/vmware_dynamic.yml
---
plugin: community.vmware.vmware_vm_inventory
strict: false
hostname: vcenter.lab.local
username: administrator@vsphere.local
password: "{{ vault_vcenter_password }}"
validate_certs: false
with_nested_properties: true
properties:
  - guest.ipAddress
  - config.name
  - config.guestId
  - runtime.powerState
hostnames:
  - config.name
compose:
  ansible_host: guest.ipAddress
groups:
  webservers: "'web' in config.name"
  appservers: "'app' in config.name"
  databases: "'db' in config.name"
```

## Post-Provisioning Configuration

Once VMs are up, run configuration playbooks against them.

```yaml
# playbooks/configure-infrastructure.yml
---
- name: Configure web servers
  hosts: webservers
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true

    - name: Start and enable nginx
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true

- name: Configure database servers
  hosts: databases
  become: true
  tasks:
    # Format and mount the data disk
    - name: Create filesystem on data disk
      community.general.filesystem:
        fstype: xfs
        dev: /dev/sdb

    - name: Mount data disk
      ansible.posix.mount:
        path: /var/lib/mysql
        src: /dev/sdb
        fstype: xfs
        opts: noatime,nodiratime
        state: mounted

    - name: Install MySQL
      ansible.builtin.apt:
        name: mysql-server
        state: present
        update_cache: true
```

## Snapshots Before Major Changes

Before doing anything risky, take snapshots of your VMs.

```yaml
# playbooks/snapshot-management.yml
---
- name: Manage VM snapshots
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/vcenter_creds.yml

  tasks:
    # Take a snapshot before upgrades
    - name: Create pre-upgrade snapshots
      community.vmware.vmware_guest_snapshot:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
        datacenter: "{{ datacenter }}"
        name: "{{ item }}"
        snapshot_name: "pre-upgrade-{{ ansible_date_time.date }}"
        description: "Snapshot before system upgrade"
        state: present
        memory_dump: false
        quiesce: true
      loop:
        - web-prod-01
        - web-prod-02
        - app-prod-01
        - db-prod-01
```

## Full Environment Teardown

For development environments that need to be rebuilt regularly, a teardown playbook is essential.

```yaml
# playbooks/teardown-environment.yml
---
- name: Tear down development environment
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/vcenter_creds.yml

  vars:
    environment_prefix: "dev-sprint42"

  tasks:
    # Find all VMs matching the environment prefix
    - name: Get list of VMs to remove
      community.vmware.vmware_vm_info:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
      register: all_vms

    - name: Filter VMs by prefix
      ansible.builtin.set_fact:
        vms_to_remove: "{{ all_vms.virtual_machines | selectattr('guest_name', 'match', environment_prefix) | list }}"

    # Power off and delete matching VMs
    - name: Remove environment VMs
      community.vmware.vmware_guest:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
        name: "{{ item.guest_name }}"
        state: absent
        force: true
      loop: "{{ vms_to_remove }}"
      loop_control:
        label: "{{ item.guest_name }}"
```

## Orchestrating the Full Pipeline

Tie everything together with a master playbook that runs the full provisioning pipeline.

```yaml
# playbooks/full-provision.yml
---
- name: Full infrastructure provisioning pipeline
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Provision VMs
      ansible.builtin.include_tasks: provision-vms.yml

    - name: Add extra disks
      ansible.builtin.include_tasks: add-disks.yml

    - name: Wait for VMs to be reachable
      ansible.builtin.wait_for:
        host: "{{ item.ip }}"
        port: 22
        timeout: 300
      loop: "{{ vms }}"
      loop_control:
        label: "{{ item.name }}"

- name: Configure all servers
  ansible.builtin.import_playbook: configure-infrastructure.yml
```

## Practical Advice

After provisioning hundreds of VMware environments with Ansible, here is what I have found works best:

1. **Invest time in good templates.** A well-built VM template with the right drivers, agents, and base packages saves you time on every single deployment.
2. **Use thin provisioning unless you have a good reason not to.** Eagerzeroedthick is only needed for specific workloads like databases where consistent I/O latency matters.
3. **Set timeouts generously.** Guest customization can take a while, especially on Windows VMs. A 600-second timeout is not unreasonable.
4. **Tag everything.** Apply vSphere tags during provisioning so you can use them for dynamic inventory, NSX security groups, and backup policies.
5. **Keep your infrastructure definitions in Git.** When someone asks why a VM has 64 GB of RAM, you can point to the commit where it was requested.

Ansible turns VMware provisioning from a manual, error-prone process into a repeatable, auditable workflow. The initial setup takes some effort, but once your playbooks and templates are in place, standing up new environments takes minutes instead of days.
