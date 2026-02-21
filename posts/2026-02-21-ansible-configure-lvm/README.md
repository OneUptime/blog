# How to Use Ansible to Configure LVM (Logical Volume Manager)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, LVM, Storage, Linux, DevOps

Description: Automate LVM setup and management including physical volumes, volume groups, and logical volumes using Ansible playbooks for flexible storage management.

---

LVM (Logical Volume Manager) is one of those Linux features that you do not appreciate until you need to resize a filesystem on a production server with zero downtime. It adds a layer of abstraction between your physical disks and filesystems that makes storage management dramatically more flexible. Setting it up by hand is not hard, but doing it consistently across 50 servers is where Ansible comes in.

## LVM Architecture Quick Recap

LVM works in three layers:

- **Physical Volumes (PV)**: Physical disks or partitions marked for LVM use
- **Volume Groups (VG)**: Pools of storage created by combining one or more PVs
- **Logical Volumes (LV)**: The actual "partitions" you create filesystems on, carved from a VG

The beauty is that you can add disks to a volume group, extend logical volumes, and resize filesystems without downtime.

## Installing LVM Tools

Some minimal installations do not include LVM. Let us make sure it is there.

This playbook installs LVM2 on target hosts:

```yaml
# install-lvm.yml - Ensure LVM tools are available
---
- name: Install LVM Prerequisites
  hosts: all
  become: true
  tasks:
    - name: Install LVM2 on Debian-based systems
      ansible.builtin.apt:
        name: lvm2
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Install LVM2 on RHEL-based systems
      ansible.builtin.yum:
        name: lvm2
        state: present
      when: ansible_os_family == "RedHat"

    - name: Ensure lvm2-lvmetad service is running
      ansible.builtin.systemd:
        name: lvm2-lvmetad
        state: started
        enabled: true
      failed_when: false
```

## Setting Up Physical Volumes

The first step in LVM is initializing your disks as physical volumes.

This playbook creates physical volumes on specified disks:

```yaml
# setup-lvm.yml - Complete LVM configuration
---
- name: Configure LVM Storage
  hosts: storage_servers
  become: true
  vars:
    lvm_physical_disks:
      - /dev/sdb
      - /dev/sdc
    lvm_volume_group: vg_data
    lvm_logical_volumes:
      - name: lv_app
        size: 50g
        fstype: ext4
        mount: /opt/app
        mount_opts: defaults,noatime
      - name: lv_logs
        size: 30g
        fstype: xfs
        mount: /var/log/app
        mount_opts: defaults,noatime
      - name: lv_database
        size: 100g
        fstype: xfs
        mount: /var/lib/database
        mount_opts: defaults,noatime,nobarrier

  tasks:
    - name: Create physical volumes
      community.general.lvg:
        vg: "{{ lvm_volume_group }}"
        pvs: "{{ lvm_physical_disks | join(',') }}"
        state: present
```

Wait, that approach creates both the PV and VG in one shot using the `lvg` module. If you need more control over the PV creation step, you can do it separately.

This task creates physical volumes individually for more control:

```yaml
    - name: Initialize physical volumes individually
      ansible.builtin.command:
        cmd: "pvcreate {{ item }}"
        creates: "{{ item }}"
      loop: "{{ lvm_physical_disks }}"
      register: pv_result
      changed_when: "'Physical volume' in pv_result.stdout | default('')"
      failed_when: pv_result.rc != 0 and 'already' not in pv_result.stderr | default('')
```

## Creating Volume Groups

Now we pool the physical volumes into a volume group.

This task creates a volume group from the physical volumes:

```yaml
    - name: Create volume group from physical volumes
      community.general.lvg:
        vg: "{{ lvm_volume_group }}"
        pvs: "{{ lvm_physical_disks | join(',') }}"
        pesize: "32"
        state: present
```

The `pesize` parameter sets the Physical Extent size in megabytes. The default is 4MB, but I typically use 32MB for better performance on large volumes.

## Creating Logical Volumes

With the volume group ready, we carve out logical volumes.

This task creates logical volumes and their filesystems:

```yaml
    - name: Create logical volumes
      community.general.lvol:
        vg: "{{ lvm_volume_group }}"
        lv: "{{ item.name }}"
        size: "{{ item.size }}"
        state: present
      loop: "{{ lvm_logical_volumes }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Create filesystems on logical volumes
      community.general.filesystem:
        fstype: "{{ item.fstype }}"
        dev: "/dev/{{ lvm_volume_group }}/{{ item.name }}"
      loop: "{{ lvm_logical_volumes }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Create mount point directories
      ansible.builtin.file:
        path: "{{ item.mount }}"
        state: directory
        mode: '0755'
      loop: "{{ lvm_logical_volumes }}"
      loop_control:
        label: "{{ item.mount }}"

    - name: Mount logical volumes and update fstab
      ansible.posix.mount:
        path: "{{ item.mount }}"
        src: "/dev/{{ lvm_volume_group }}/{{ item.name }}"
        fstype: "{{ item.fstype }}"
        opts: "{{ item.mount_opts }}"
        state: mounted
      loop: "{{ lvm_logical_volumes }}"
      loop_control:
        label: "{{ item.mount }}"
```

## Extending Logical Volumes

One of the biggest advantages of LVM is the ability to grow volumes without downtime.

This playbook extends an existing logical volume and its filesystem:

```yaml
# extend-lvm.yml - Grow a logical volume
---
- name: Extend Logical Volume
  hosts: storage_servers
  become: true
  vars:
    target_vg: vg_data
    target_lv: lv_app
    new_size: 80g

  tasks:
    - name: Get current LV size
      ansible.builtin.command:
        cmd: "lvs --noheadings -o lv_size --units g /dev/{{ target_vg }}/{{ target_lv }}"
      register: current_size
      changed_when: false

    - name: Display current size
      ansible.builtin.debug:
        msg: "Current size of {{ target_lv }}: {{ current_size.stdout | trim }}"

    - name: Extend the logical volume
      community.general.lvol:
        vg: "{{ target_vg }}"
        lv: "{{ target_lv }}"
        size: "{{ new_size }}"
        resizefs: true
      register: extend_result

    - name: Verify new size
      ansible.builtin.command:
        cmd: "lvs --noheadings -o lv_size --units g /dev/{{ target_vg }}/{{ target_lv }}"
      register: new_size_check
      changed_when: false

    - name: Display new size
      ansible.builtin.debug:
        msg: "New size of {{ target_lv }}: {{ new_size_check.stdout | trim }}"
```

The `resizefs: true` parameter is key here. It tells Ansible to also resize the filesystem after extending the logical volume. Without it, you would have a bigger LV but the filesystem would still be the old size.

## Adding a New Disk to an Existing Volume Group

When a volume group runs out of space, you can add more disks.

This playbook adds a new physical disk to an existing volume group:

```yaml
# add-disk-to-vg.yml - Expand a volume group with a new disk
---
- name: Add New Disk to Volume Group
  hosts: storage_servers
  become: true
  vars:
    new_disk: /dev/sdd
    target_vg: vg_data

  tasks:
    - name: Verify the new disk exists
      ansible.builtin.stat:
        path: "{{ new_disk }}"
      register: disk_check

    - name: Fail if disk is not available
      ansible.builtin.fail:
        msg: "Disk {{ new_disk }} not found"
      when: not disk_check.stat.exists

    - name: Check if disk is already part of a VG
      ansible.builtin.command:
        cmd: "pvs {{ new_disk }}"
      register: pv_check
      changed_when: false
      failed_when: false

    - name: Initialize new disk as physical volume
      ansible.builtin.command:
        cmd: "pvcreate {{ new_disk }}"
      when: pv_check.rc != 0

    - name: Extend volume group with new disk
      ansible.builtin.command:
        cmd: "vgextend {{ target_vg }} {{ new_disk }}"
      when: pv_check.rc != 0
      register: vg_extend

    - name: Display updated VG info
      ansible.builtin.command:
        cmd: "vgdisplay {{ target_vg }}"
      register: vg_info
      changed_when: false

    - name: Show volume group details
      ansible.builtin.debug:
        msg: "{{ vg_info.stdout_lines }}"
```

## LVM Thin Provisioning

Thin provisioning lets you allocate more space to logical volumes than physically exists, banking on the fact that not all volumes will use their full allocation at once.

This playbook sets up a thin pool and thin volumes:

```yaml
# setup-thin-lvm.yml - Configure LVM thin provisioning
---
- name: Set Up LVM Thin Provisioning
  hosts: storage_servers
  become: true
  vars:
    thin_vg: vg_data
    thin_pool_name: thinpool
    thin_pool_size: 100g
    thin_volumes:
      - name: thin_vol1
        virtualsize: 50g
        mount: /srv/vol1
      - name: thin_vol2
        virtualsize: 50g
        mount: /srv/vol2
      - name: thin_vol3
        virtualsize: 50g
        mount: /srv/vol3

  tasks:
    - name: Create thin pool
      community.general.lvol:
        vg: "{{ thin_vg }}"
        thinpool: "{{ thin_pool_name }}"
        size: "{{ thin_pool_size }}"

    - name: Create thin volumes in the pool
      community.general.lvol:
        vg: "{{ thin_vg }}"
        lv: "{{ item.name }}"
        thinpool: "{{ thin_pool_name }}"
        size: "{{ item.virtualsize }}"
      loop: "{{ thin_volumes }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Create XFS filesystem on thin volumes
      community.general.filesystem:
        fstype: xfs
        dev: "/dev/{{ thin_vg }}/{{ item.name }}"
      loop: "{{ thin_volumes }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Mount thin volumes
      ansible.posix.mount:
        path: "{{ item.mount }}"
        src: "/dev/{{ thin_vg }}/{{ item.name }}"
        fstype: xfs
        opts: defaults
        state: mounted
      loop: "{{ thin_volumes }}"
      loop_control:
        label: "{{ item.mount }}"
```

## LVM Architecture Diagram

```mermaid
graph TD
    A[/dev/sdb] --> D[Physical Volume]
    B[/dev/sdc] --> E[Physical Volume]
    C[/dev/sdd] --> F[Physical Volume]
    D --> G[Volume Group: vg_data]
    E --> G
    F --> G
    G --> H[LV: lv_app - 50G]
    G --> I[LV: lv_logs - 30G]
    G --> J[LV: lv_database - 100G]
    G --> K[Free Space]
    H --> L[/opt/app - ext4]
    I --> M[/var/log/app - xfs]
    J --> N[/var/lib/database - xfs]
```

## Monitoring LVM Usage

Set up a quick health check to catch volumes running low on space.

This playbook checks LVM utilization and alerts on high usage:

```yaml
# check-lvm-usage.yml - Monitor LVM space utilization
---
- name: Check LVM Usage
  hosts: storage_servers
  become: true
  tasks:
    - name: Get LV usage percentages
      ansible.builtin.shell: |
        lvs --noheadings -o lv_name,data_percent,vg_name 2>/dev/null | \
        awk '{if ($2+0 > 80) print $3"/"$1": "$2"% used"}'
      register: lv_usage
      changed_when: false

    - name: Alert on high LV usage
      ansible.builtin.debug:
        msg: "WARNING - {{ item }}"
      loop: "{{ lv_usage.stdout_lines }}"
      when: lv_usage.stdout_lines | length > 0
```

LVM with Ansible is a powerful combination. You get the flexibility of LVM with the consistency and repeatability of infrastructure as code. Start with simple configurations and work your way up to thin provisioning as your storage needs grow.
