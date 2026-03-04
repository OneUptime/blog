# How to Use Ansible to Manage LVM on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, LVM, Storage, Automation, Linux

Description: Automate LVM volume group and logical volume management on RHEL using Ansible for consistent storage provisioning.

---

LVM (Logical Volume Manager) is the standard storage management layer on RHEL. Using Ansible to manage LVM means you can provision, extend, and manage storage consistently across your server fleet without SSH-ing into each machine.

## LVM Architecture

```mermaid
graph TD
    A[Physical Disks] --> B[Physical Volumes - PVs]
    B --> C[Volume Group - VG]
    C --> D[Logical Volume - data]
    C --> E[Logical Volume - logs]
    C --> F[Logical Volume - backup]
    D --> G[/data - xfs]
    E --> H[/var/log - xfs]
    F --> I[/backup - xfs]
```

## Creating LVM from Scratch

```yaml
# playbook-lvm-create.yml
# Set up LVM storage on RHEL servers
---
- name: Configure LVM storage
  hosts: storage_hosts
  become: true

  vars:
    # Physical disks to use
    lvm_physical_devices:
      - /dev/sdb
      - /dev/sdc

    # Volume group name
    lvm_vg_name: data_vg

    # Logical volumes to create
    lvm_volumes:
      - name: data_lv
        size: 50g
        mount: /data
        fstype: xfs
        owner: root
        group: root
        mode: "0755"
      - name: logs_lv
        size: 20g
        mount: /var/log/app
        fstype: xfs
        owner: root
        group: root
        mode: "0755"
      - name: backup_lv
        size: 30g
        mount: /backup
        fstype: xfs
        owner: root
        group: root
        mode: "0755"

  tasks:
    - name: Install LVM packages
      ansible.builtin.dnf:
        name: lvm2
        state: present

    - name: Create physical volumes
      community.general.lvg:
        vg: "{{ lvm_vg_name }}"
        pvs: "{{ lvm_physical_devices | join(',') }}"
        state: present

    - name: Create logical volumes
      community.general.lvol:
        vg: "{{ lvm_vg_name }}"
        lv: "{{ item.name }}"
        size: "{{ item.size }}"
        state: present
      loop: "{{ lvm_volumes }}"

    - name: Create filesystems
      community.general.filesystem:
        fstype: "{{ item.fstype }}"
        dev: "/dev/{{ lvm_vg_name }}/{{ item.name }}"
      loop: "{{ lvm_volumes }}"

    - name: Create mount point directories
      ansible.builtin.file:
        path: "{{ item.mount }}"
        state: directory
        owner: "{{ item.owner }}"
        group: "{{ item.group }}"
        mode: "{{ item.mode }}"
      loop: "{{ lvm_volumes }}"

    - name: Mount the logical volumes
      ansible.posix.mount:
        path: "{{ item.mount }}"
        src: "/dev/{{ lvm_vg_name }}/{{ item.name }}"
        fstype: "{{ item.fstype }}"
        opts: defaults
        state: mounted
      loop: "{{ lvm_volumes }}"
```

## Extending Logical Volumes

```yaml
# playbook-lvm-extend.yml
# Extend existing logical volumes
---
- name: Extend LVM volumes
  hosts: storage_hosts
  become: true

  tasks:
    - name: Add a new physical disk to the volume group
      community.general.lvg:
        vg: data_vg
        pvs: /dev/sdb,/dev/sdc,/dev/sdd
        state: present

    - name: Extend the data logical volume by 20GB
      community.general.lvol:
        vg: data_vg
        lv: data_lv
        size: +20g
        resizefs: true  # Automatically resize the filesystem
        state: present

    - name: Extend logs volume to use 100% of remaining free space
      community.general.lvol:
        vg: data_vg
        lv: logs_lv
        size: 100%FREE
        resizefs: true
        state: present
```

## Thin Provisioning

```yaml
# playbook-lvm-thin.yml
# Create thin-provisioned LVM volumes
---
- name: Configure thin-provisioned LVM
  hosts: storage_hosts
  become: true

  tasks:
    - name: Create volume group
      community.general.lvg:
        vg: thin_vg
        pvs: /dev/sdb
        state: present

    - name: Create thin pool
      community.general.lvol:
        vg: thin_vg
        thinpool: thin_pool
        size: 80g
        state: present

    - name: Create thin volumes
      community.general.lvol:
        vg: thin_vg
        lv: "{{ item.name }}"
        size: "{{ item.size }}"
        thinpool: thin_pool
        state: present
      loop:
        # Thin volumes can overcommit the pool
        - { name: "vm1_disk", size: "50g" }
        - { name: "vm2_disk", size: "50g" }
        - { name: "vm3_disk", size: "50g" }
```

## LVM Snapshots

```yaml
# playbook-lvm-snapshot.yml
# Create LVM snapshots for backups
---
- name: Create LVM snapshots
  hosts: storage_hosts
  become: true

  tasks:
    - name: Create a snapshot of the data volume
      community.general.lvol:
        vg: data_vg
        lv: data_lv
        snapshot: data_snap
        size: 5g
        state: present

    - name: Mount the snapshot for backup
      ansible.posix.mount:
        path: /mnt/data_snap
        src: /dev/data_vg/data_snap
        fstype: xfs
        opts: "ro,nouuid"
        state: mounted

    # After backup, remove the snapshot
    - name: Unmount and remove snapshot
      block:
        - name: Unmount snapshot
          ansible.posix.mount:
            path: /mnt/data_snap
            state: unmounted

        - name: Remove snapshot
          community.general.lvol:
            vg: data_vg
            lv: data_snap
            state: absent
            force: true
      tags: cleanup
```

## Verification

```bash
# Show physical volumes
sudo pvs

# Show volume groups
sudo vgs

# Show logical volumes
sudo lvs

# Detailed information
sudo pvdisplay
sudo vgdisplay
sudo lvdisplay

# Check filesystem sizes
df -h
```

## Wrapping Up

LVM management with Ansible eliminates the manual work of provisioning storage. The `community.general` collection provides the `lvg`, `lvol`, and `filesystem` modules that cover the entire LVM lifecycle. The `resizefs: true` option on `lvol` is particularly useful since it grows the filesystem along with the logical volume in a single step. For production environments, use variables to define your storage layout so you can apply the same structure across multiple servers with different disk configurations.
