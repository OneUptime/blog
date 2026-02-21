# How to Use Ansible to Set Up LUKS Disk Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, LUKS, Disk Encryption, Security, Linux

Description: Automate LUKS disk encryption setup and management across your Linux servers using Ansible for data-at-rest protection.

---

Data at rest encryption is a fundamental security control, especially if you handle sensitive data or need to meet compliance requirements like PCI DSS, HIPAA, or GDPR. LUKS (Linux Unified Key Setup) is the standard for disk encryption on Linux. It provides a consistent interface for managing encrypted volumes with support for multiple key slots and strong encryption algorithms.

Setting up LUKS manually on each server is doable for a few machines, but when you need encrypted volumes across a fleet, Ansible is the way to go. In this post, I will show you how to use Ansible to create encrypted volumes, manage keys, and configure automatic unlocking.

## LUKS Basics

LUKS works by creating an encrypted container on a disk partition or logical volume. To access the data, you need to "open" the container with a passphrase or key file, which creates a mapped device that you can then format and mount like any other block device.

```mermaid
flowchart LR
    A[Physical Disk] --> B[LUKS Header + Encrypted Data]
    B -->|Key/Passphrase| C[dm-crypt Layer]
    C --> D[Mapped Device /dev/mapper/name]
    D --> E[Filesystem ext4/xfs]
    E --> F[Mount Point /data]
```

## Prerequisites

Before encrypting disks, you need cryptsetup installed on your target hosts.

This playbook installs the required packages:

```yaml
# install_luks.yml - Install LUKS prerequisites
---
- name: Install LUKS prerequisites
  hosts: all
  become: true

  tasks:
    - name: Install cryptsetup on Debian/Ubuntu
      ansible.builtin.apt:
        name:
          - cryptsetup
          - cryptsetup-initramfs
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Install cryptsetup on RHEL/CentOS
      ansible.builtin.yum:
        name:
          - cryptsetup
        state: present
      when: ansible_os_family == "RedHat"

    - name: Verify cryptsetup is available
      ansible.builtin.command: cryptsetup --version
      register: cryptsetup_version
      changed_when: false

    - name: Report version
      ansible.builtin.debug:
        msg: "{{ cryptsetup_version.stdout }}"
```

## Creating an Encrypted Volume

This is the core operation: taking a raw disk or partition and encrypting it with LUKS.

This playbook creates a LUKS-encrypted volume on a specified device:

```yaml
# create_luks_volume.yml - Create LUKS encrypted volume
---
- name: Create LUKS encrypted volume
  hosts: storage_servers
  become: true

  vars:
    luks_device: /dev/sdb
    luks_name: encrypted_data
    luks_mount_point: /data
    luks_filesystem: ext4
    luks_key_file: /root/.luks_keyfile
    luks_key_size: 4096

  tasks:
    - name: Generate key file
      ansible.builtin.shell: |
        dd if=/dev/urandom of={{ luks_key_file }} bs=1 count={{ luks_key_size }}
      args:
        creates: "{{ luks_key_file }}"

    - name: Set key file permissions
      ansible.builtin.file:
        path: "{{ luks_key_file }}"
        owner: root
        group: root
        mode: '0400'

    - name: Check if device is already a LUKS volume
      ansible.builtin.command: cryptsetup isLuks {{ luks_device }}
      register: is_luks
      changed_when: false
      failed_when: false

    - name: Format device with LUKS
      community.crypto.luks_device:
        device: "{{ luks_device }}"
        state: present
        keyfile: "{{ luks_key_file }}"
        type: luks2
        cipher: aes-xts-plain64
        hash: sha256
        key_size: 512
      when: is_luks.rc != 0

    - name: Open LUKS volume
      community.crypto.luks_device:
        device: "{{ luks_device }}"
        state: opened
        name: "{{ luks_name }}"
        keyfile: "{{ luks_key_file }}"

    - name: Create filesystem on encrypted volume
      community.general.filesystem:
        fstype: "{{ luks_filesystem }}"
        dev: "/dev/mapper/{{ luks_name }}"

    - name: Create mount point
      ansible.builtin.file:
        path: "{{ luks_mount_point }}"
        state: directory
        mode: '0755'

    - name: Mount encrypted volume
      ansible.posix.mount:
        path: "{{ luks_mount_point }}"
        src: "/dev/mapper/{{ luks_name }}"
        fstype: "{{ luks_filesystem }}"
        state: mounted
```

## Managing LUKS Key Slots

LUKS supports up to 8 key slots. You can add backup keys, admin keys, or recovery keys alongside the primary key.

This playbook manages LUKS key slots:

```yaml
# manage_luks_keys.yml - Manage LUKS key slots
---
- name: Manage LUKS key slots
  hosts: storage_servers
  become: true

  vars:
    luks_device: /dev/sdb
    luks_primary_keyfile: /root/.luks_keyfile
    luks_backup_keyfile: /root/.luks_backup_keyfile

  tasks:
    - name: Generate backup key file
      ansible.builtin.shell: |
        dd if=/dev/urandom of={{ luks_backup_keyfile }} bs=1 count=4096
      args:
        creates: "{{ luks_backup_keyfile }}"

    - name: Set backup key file permissions
      ansible.builtin.file:
        path: "{{ luks_backup_keyfile }}"
        owner: root
        group: root
        mode: '0400'

    - name: Add backup key to LUKS volume
      community.crypto.luks_device:
        device: "{{ luks_device }}"
        state: present
        keyfile: "{{ luks_primary_keyfile }}"
        new_keyfile: "{{ luks_backup_keyfile }}"

    - name: Verify key slots
      ansible.builtin.command: cryptsetup luksDump {{ luks_device }}
      register: luks_dump
      changed_when: false

    - name: Display key slot info
      ansible.builtin.debug:
        msg: "{{ luks_dump.stdout_lines | select('match', '.*Key Slot.*') | list }}"
```

## Configuring Automatic Unlocking with crypttab

For servers that need to boot unattended, configure `/etc/crypttab` to automatically unlock volumes using key files.

This playbook configures automatic LUKS unlocking at boot:

```yaml
# auto_unlock_luks.yml - Configure automatic LUKS unlocking
---
- name: Configure automatic LUKS unlocking
  hosts: storage_servers
  become: true

  vars:
    luks_volumes:
      - name: encrypted_data
        device: /dev/sdb
        keyfile: /root/.luks_keyfile
        mount_point: /data
        filesystem: ext4
        mount_options: "defaults,noatime"

  tasks:
    - name: Get UUID of LUKS device
      ansible.builtin.command: "blkid -s UUID -o value {{ item.device }}"
      loop: "{{ luks_volumes }}"
      register: device_uuids
      changed_when: false

    - name: Configure crypttab entries
      ansible.builtin.lineinfile:
        path: /etc/crypttab
        regexp: "^{{ item.item.name }}"
        line: "{{ item.item.name }} UUID={{ item.stdout }} {{ item.item.keyfile }} luks"
        create: true
        mode: '0644'
      loop: "{{ device_uuids.results }}"

    - name: Configure fstab entries
      ansible.posix.mount:
        path: "{{ item.mount_point }}"
        src: "/dev/mapper/{{ item.name }}"
        fstype: "{{ item.filesystem }}"
        opts: "{{ item.mount_options }}"
        state: present
      loop: "{{ luks_volumes }}"

    - name: Update initramfs to include crypttab changes (Debian)
      ansible.builtin.command: update-initramfs -u
      when: ansible_os_family == "Debian"
      changed_when: true

    - name: Update initramfs (RHEL)
      ansible.builtin.command: dracut --force
      when: ansible_os_family == "RedHat"
      changed_when: true
```

## Key Rotation

Periodically rotating encryption keys is a best practice. LUKS makes this possible without re-encrypting the entire volume.

This playbook rotates LUKS keys:

```yaml
# rotate_luks_keys.yml - Rotate LUKS encryption keys
---
- name: Rotate LUKS keys
  hosts: storage_servers
  become: true

  vars:
    luks_device: /dev/sdb
    luks_current_keyfile: /root/.luks_keyfile
    luks_new_keyfile: /root/.luks_keyfile_new

  tasks:
    - name: Generate new key file
      ansible.builtin.shell: |
        dd if=/dev/urandom of={{ luks_new_keyfile }} bs=1 count=4096
      changed_when: true

    - name: Set permissions on new key
      ansible.builtin.file:
        path: "{{ luks_new_keyfile }}"
        owner: root
        group: root
        mode: '0400'

    - name: Add new key to LUKS volume
      community.crypto.luks_device:
        device: "{{ luks_device }}"
        state: present
        keyfile: "{{ luks_current_keyfile }}"
        new_keyfile: "{{ luks_new_keyfile }}"

    - name: Remove old key from LUKS volume
      community.crypto.luks_device:
        device: "{{ luks_device }}"
        state: present
        keyfile: "{{ luks_new_keyfile }}"
        remove_keyfile: "{{ luks_current_keyfile }}"

    - name: Replace current key file with new one
      ansible.builtin.command: mv {{ luks_new_keyfile }} {{ luks_current_keyfile }}
      changed_when: true

    - name: Set permissions on rotated key
      ansible.builtin.file:
        path: "{{ luks_current_keyfile }}"
        owner: root
        group: root
        mode: '0400'

    - name: Update crypttab (key file path unchanged)
      ansible.builtin.debug:
        msg: "Key rotated successfully. crypttab does not need updating since the file path is the same."
```

## Auditing Encrypted Volumes

Verify that all volumes that should be encrypted actually are:

```yaml
# audit_encryption.yml - Audit disk encryption status
---
- name: Audit disk encryption
  hosts: all
  become: true

  vars:
    expected_encrypted_devices:
      - /dev/sdb

  tasks:
    - name: Check LUKS status of each expected device
      ansible.builtin.command: cryptsetup isLuks {{ item }}
      loop: "{{ expected_encrypted_devices }}"
      register: luks_check
      changed_when: false
      failed_when: false

    - name: Report encryption status
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ 'ENCRYPTED' if item.rc == 0 else 'NOT ENCRYPTED' }}"
      loop: "{{ luks_check.results }}"

    - name: Fail if any device is not encrypted
      ansible.builtin.fail:
        msg: "Device {{ item.item }} is not encrypted!"
      loop: "{{ luks_check.results }}"
      when: item.rc != 0

    - name: Check LUKS header details
      ansible.builtin.command: cryptsetup luksDump {{ item }}
      loop: "{{ expected_encrypted_devices }}"
      register: luks_details
      changed_when: false

    - name: Verify encryption algorithm
      ansible.builtin.debug:
        msg: "{{ item.stdout_lines | select('match', '.*Cipher.*') | list }}"
      loop: "{{ luks_details.results }}"
```

## Production Considerations

1. **Back up your key files.** If you lose all key files and passphrases, the data is gone. Store backups securely off-server.
2. **Performance impact.** Encryption adds CPU overhead. On modern CPUs with AES-NI hardware acceleration, the impact is usually under 5%.
3. **Key file security.** Key files stored on the same server as the encrypted volume provide protection against physical theft but not against a running compromise. Consider using a key management service for high-security environments.
4. **Test recovery procedures.** Regularly practice unlocking volumes from backup keys to make sure your recovery process works.
5. **Do not encrypt the boot volume with this method.** Boot volume encryption requires separate handling through the initramfs and is more complex to automate.

LUKS disk encryption with Ansible gives you automated, consistent data-at-rest protection across your fleet. The combination of key file management, crypttab configuration, and regular auditing ensures your encrypted volumes stay secure and accessible.
