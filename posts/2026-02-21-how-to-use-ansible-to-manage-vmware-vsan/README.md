# How to Use Ansible to Manage VMware vSAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, VMware, vSAN, Storage, Hyper-Converged

Description: Learn how to manage VMware vSAN storage clusters with Ansible for automated disk group creation, policy management, and monitoring.

---

VMware vSAN turns local disks across your ESXi hosts into a shared datastore. It eliminates the need for external SANs in many use cases, but managing vSAN configurations manually across a growing cluster gets complicated. Ansible gives you a way to standardize and automate vSAN operations, from initial cluster setup to storage policy management.

In this post, I will walk through managing vSAN with Ansible, covering cluster enablement, disk groups, storage policies, and health monitoring.

## Prerequisites

Make sure you have:

- Ansible 2.12+ on your control node
- The `community.vmware` collection installed
- vCenter Server 7.0+ with vSAN license
- ESXi hosts with local SSDs and HDDs (or all-flash)
- Python libraries `pyvmomi` and `requests`

```bash
# Install required collection and Python packages
ansible-galaxy collection install community.vmware
pip install pyvmomi requests
```

## vSAN Architecture Refresher

vSAN pools local disks from each host into a distributed datastore. Each host contributes a disk group consisting of a cache tier (SSD) and a capacity tier (SSD or HDD).

```mermaid
graph TD
    A[vSAN Cluster] --> B[Host 1]
    A --> C[Host 2]
    A --> D[Host 3]
    B --> E[Disk Group 1]
    E --> F[Cache SSD]
    E --> G[Capacity HDD 1]
    E --> H[Capacity HDD 2]
    C --> I[Disk Group 2]
    D --> J[Disk Group 3]
    A --> K[vSAN Datastore]
```

## Enabling vSAN on a Cluster

The `community.vmware.vmware_cluster_vsan` module handles vSAN cluster configuration.

```yaml
# playbooks/enable-vsan.yml
---
- name: Enable vSAN on cluster
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/vcenter_creds.yml

  vars:
    vcenter_datacenter: "DC-Production"
    vcenter_cluster: "Cluster-vSAN-01"

  tasks:
    # Enable vSAN with deduplication and compression
    - name: Enable vSAN on the cluster
      community.vmware.vmware_cluster_vsan:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        datacenter_name: "{{ vcenter_datacenter }}"
        cluster_name: "{{ vcenter_cluster }}"
        validate_certs: false
        enable: true
        vsan_auto_claim_storage: false
        advanced_options:
          automatic_rebalance: true
          disable_site_read_locality: false
      register: vsan_result

    - name: Display vSAN enablement result
      ansible.builtin.debug:
        var: vsan_result
```

I always set `vsan_auto_claim_storage` to `false`. Auto-claiming grabs every available disk, which is almost never what you want in production. You should explicitly define your disk groups.

## Creating Disk Groups

Disk groups are the fundamental storage unit in vSAN. Each disk group has one cache disk and one or more capacity disks.

```yaml
# playbooks/vsan-disk-groups.yml
---
- name: Configure vSAN disk groups
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/vcenter_creds.yml

  vars:
    esxi_hosts:
      - hostname: esxi-01.lab.local
        cache_disk: "naa.5000c5001234abcd"
        capacity_disks:
          - "naa.5000c500abcd1234"
          - "naa.5000c500abcd5678"
      - hostname: esxi-02.lab.local
        cache_disk: "naa.5000c5005678efgh"
        capacity_disks:
          - "naa.5000c500efgh1234"
          - "naa.5000c500efgh5678"
      - hostname: esxi-03.lab.local
        cache_disk: "naa.5000c500ijkl9012"
        capacity_disks:
          - "naa.5000c500ijkl3456"
          - "naa.5000c500ijkl7890"

  tasks:
    # First, get disk info to verify disk IDs
    - name: Get disk information for each host
      community.vmware.vmware_host_disk_info:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        esxi_hostname: "{{ item.hostname }}"
        validate_certs: false
      loop: "{{ esxi_hosts }}"
      loop_control:
        label: "{{ item.hostname }}"
      register: disk_info

    # Create disk groups on each host
    - name: Create vSAN disk groups
      community.vmware.vmware_vsan_cluster:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
        datacenter_name: "{{ vcenter_datacenter }}"
        cluster_name: "{{ vcenter_cluster }}"
        esxi_hostname: "{{ item.hostname }}"
        cache_disk: "{{ item.cache_disk }}"
        capacity_disk: "{{ item.capacity_disks }}"
      loop: "{{ esxi_hosts }}"
      loop_control:
        label: "{{ item.hostname }}"
```

## Managing vSAN Storage Policies

Storage policies define how data is stored: number of failures to tolerate, stripe width, and more. This is where vSAN shines compared to traditional storage.

```yaml
# playbooks/vsan-storage-policies.yml
---
- name: Manage vSAN storage policies
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/vcenter_creds.yml

  tasks:
    # Create a storage policy for mission-critical workloads
    - name: Create FTT=2 storage policy
      community.vmware.vmware_vm_storage_policy:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
        name: "vSAN-Critical-FTT2"
        description: "High availability policy with FTT=2"
        subprofiles:
          - name: "vSAN"
            rules:
              - capability_id: "VSAN.hostFailuresToTolerate"
                value: 2
              - capability_id: "VSAN.stripeWidth"
                value: 2
              - capability_id: "VSAN.forceProvisioning"
                value: false
        state: present

    # Create a policy for dev workloads with lower redundancy
    - name: Create FTT=1 RAID-5 storage policy
      community.vmware.vmware_vm_storage_policy:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
        name: "vSAN-Dev-RAID5"
        description: "Space-efficient policy for dev workloads"
        subprofiles:
          - name: "vSAN"
            rules:
              - capability_id: "VSAN.hostFailuresToTolerate"
                value: 1
              - capability_id: "VSAN.replicaPreference"
                value: "RAID-5/6 (Erasure Coding) - Capacity"
        state: present
```

## Applying Storage Policies to VMs

After creating policies, assign them to VMs to control their data placement.

```yaml
# playbooks/assign-vsan-policies.yml
---
- name: Assign vSAN storage policies to VMs
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/vcenter_creds.yml

  vars:
    critical_vms:
      - sql-prod-01
      - sql-prod-02
      - app-prod-01
    dev_vms:
      - dev-web-01
      - dev-app-01

  tasks:
    # Apply the high-availability policy to critical VMs
    - name: Assign FTT=2 policy to critical VMs
      community.vmware.vmware_guest_storage_policy:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
        vm_name: "{{ item }}"
        vm_home_policy: "vSAN-Critical-FTT2"
        disk_policy:
          - unit_number: 0
            policy: "vSAN-Critical-FTT2"
      loop: "{{ critical_vms }}"

    # Apply space-efficient policy to dev VMs
    - name: Assign RAID-5 policy to dev VMs
      community.vmware.vmware_guest_storage_policy:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
        vm_name: "{{ item }}"
        vm_home_policy: "vSAN-Dev-RAID5"
        disk_policy:
          - unit_number: 0
            policy: "vSAN-Dev-RAID5"
      loop: "{{ dev_vms }}"
```

## Monitoring vSAN Health

vSAN health checks are critical. A playbook that regularly verifies cluster health can catch problems before they cause outages.

```yaml
# playbooks/vsan-health-check.yml
---
- name: Check vSAN cluster health
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/vcenter_creds.yml

  tasks:
    # Gather vSAN health information
    - name: Get vSAN cluster health
      community.vmware.vmware_vsan_health_info:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        cluster_name: "{{ vcenter_cluster }}"
        validate_certs: false
      register: vsan_health

    - name: Display vSAN health summary
      ansible.builtin.debug:
        msg: "vSAN Health: {{ vsan_health }}"

    # Check for any degraded objects
    - name: Get vSAN object health
      community.vmware.vmware_object_role_permission:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
      register: object_health

    # Alert if health is not green
    - name: Fail if vSAN health is degraded
      ansible.builtin.fail:
        msg: "vSAN health check failed! Review the cluster immediately."
      when: vsan_health.vsan_health_info.overall_health != "green"
```

## Managing vSAN Stretched Clusters

For sites that need cross-datacenter redundancy, vSAN stretched clusters replicate data between two sites with a witness host at a third site.

```yaml
# playbooks/vsan-stretched-cluster.yml
---
- name: Configure vSAN stretched cluster
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/vcenter_creds.yml

  tasks:
    # Configure fault domains for stretched cluster
    - name: Create preferred site fault domain
      community.vmware.vmware_vsan_stretch_cluster:
        hostname: "{{ vcenter_hostname }}"
        username: "{{ vcenter_username }}"
        password: "{{ vcenter_password }}"
        validate_certs: false
        cluster_name: "{{ vcenter_cluster }}"
        preferred_fault_domain:
          name: "site-a"
          hosts:
            - esxi-01.site-a.local
            - esxi-02.site-a.local
            - esxi-03.site-a.local
        secondary_fault_domain:
          name: "site-b"
          hosts:
            - esxi-01.site-b.local
            - esxi-02.site-b.local
            - esxi-03.site-b.local
        witness_host: witness.site-c.local
```

## Building a vSAN Management Role

Wrap it all into a reusable role.

```yaml
# roles/vsan_management/tasks/main.yml
---
- name: Enable vSAN
  community.vmware.vmware_cluster_vsan:
    hostname: "{{ vcenter_hostname }}"
    username: "{{ vcenter_username }}"
    password: "{{ vcenter_password }}"
    datacenter_name: "{{ vsan_datacenter }}"
    cluster_name: "{{ vsan_cluster }}"
    validate_certs: false
    enable: true
    vsan_auto_claim_storage: false

- name: Configure disk groups
  community.vmware.vmware_vsan_cluster:
    hostname: "{{ vcenter_hostname }}"
    username: "{{ vcenter_username }}"
    password: "{{ vcenter_password }}"
    validate_certs: false
    datacenter_name: "{{ vsan_datacenter }}"
    cluster_name: "{{ vsan_cluster }}"
    esxi_hostname: "{{ item.hostname }}"
    cache_disk: "{{ item.cache_disk }}"
    capacity_disk: "{{ item.capacity_disks }}"
  loop: "{{ vsan_disk_groups }}"
  loop_control:
    label: "{{ item.hostname }}"
  when: vsan_disk_groups is defined
```

## Things I Have Learned Running vSAN

1. **Never use auto-claim in production.** It will grab disks you did not intend to use, including boot device partitions in some edge cases.
2. **FTT=1 is the minimum for production.** If you lose a host with FTT=0, you lose data. Period.
3. **Monitor disk health proactively.** A failing SSD cache disk takes out the entire disk group. Use Ansible scheduled jobs to check health regularly.
4. **RAID-5/6 erasure coding saves space** but requires more hosts (minimum 4 for RAID-5, 6 for RAID-6). Plan your cluster size accordingly.
5. **Network bandwidth matters.** vSAN traffic needs at least 10 GbE. Anything less and resync operations during host failures will take forever.

With Ansible managing your vSAN configuration, you get consistent storage policies across all clusters and can spin up new vSAN clusters from a template in minutes instead of hours.
