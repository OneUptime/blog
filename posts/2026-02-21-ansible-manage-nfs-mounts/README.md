# How to Use Ansible to Manage NFS Mounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, NFS, Storage, Linux, File Sharing

Description: Automate NFS client and server configuration across your Linux infrastructure using Ansible for consistent network file system mounts and exports.

---

NFS (Network File System) is the workhorse of shared storage in Linux environments. It has been around since the 1980s and is still the go-to solution for sharing files between servers. Whether you are sharing application code, log directories, home directories, or backup targets, NFS gets the job done. Managing NFS mounts and exports by hand gets tedious fast, especially when you add or remove servers from the pool. Ansible automates the entire NFS lifecycle.

## Setting Up the NFS Server

Before clients can mount anything, we need a properly configured NFS server.

This playbook installs and configures an NFS server with exports:

```yaml
# configure-nfs-server.yml - Set up NFS server
---
- name: Configure NFS Server
  hosts: nfs_servers
  become: true
  vars:
    nfs_exports:
      - path: /srv/nfs/shared
        clients: "10.0.0.0/24"
        options: "rw,sync,no_subtree_check,no_root_squash"
      - path: /srv/nfs/backups
        clients: "10.0.0.0/24"
        options: "rw,sync,no_subtree_check,root_squash"
      - path: /srv/nfs/readonly
        clients: "*"
        options: "ro,sync,no_subtree_check,root_squash"

  tasks:
    - name: Install NFS server packages
      ansible.builtin.apt:
        name:
          - nfs-kernel-server
          - nfs-common
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Install NFS server packages on RHEL
      ansible.builtin.yum:
        name:
          - nfs-utils
        state: present
      when: ansible_os_family == "RedHat"

    - name: Create export directories
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: directory
        owner: nobody
        group: nogroup
        mode: '0775'
      loop: "{{ nfs_exports }}"
      loop_control:
        label: "{{ item.path }}"

    - name: Configure /etc/exports
      ansible.builtin.template:
        src: exports.j2
        dest: /etc/exports
        owner: root
        group: root
        mode: '0644'
      notify: Reload NFS exports

    - name: Enable and start NFS server
      ansible.builtin.systemd:
        name: nfs-kernel-server
        enabled: true
        state: started
      when: ansible_os_family == "Debian"

    - name: Enable and start NFS server on RHEL
      ansible.builtin.systemd:
        name: nfs-server
        enabled: true
        state: started
      when: ansible_os_family == "RedHat"

    - name: Open NFS ports in firewall
      ansible.posix.firewalld:
        service: "{{ item }}"
        permanent: true
        state: enabled
        immediate: true
      loop:
        - nfs
        - mountd
        - rpc-bind
      when: ansible_os_family == "RedHat"
      failed_when: false

  handlers:
    - name: Reload NFS exports
      ansible.builtin.command: exportfs -ra
```

The exports template:

```jinja2
# exports.j2 - NFS exports configuration
# Managed by Ansible - do not edit manually

{% for export in nfs_exports %}
{{ export.path }}    {{ export.clients }}({{ export.options }})
{% endfor %}
```

## Configuring NFS Clients

Now let us set up the client side to mount NFS shares.

This playbook configures NFS clients with persistent mounts:

```yaml
# configure-nfs-clients.yml - Mount NFS shares
---
- name: Configure NFS Clients
  hosts: app_servers
  become: true
  vars:
    nfs_server: "10.0.0.10"
    nfs_mounts:
      - src: "{{ nfs_server }}:/srv/nfs/shared"
        path: /mnt/shared
        opts: "rw,soft,timeo=300,retrans=3,_netdev"
        fstype: nfs4
      - src: "{{ nfs_server }}:/srv/nfs/backups"
        path: /mnt/backups
        opts: "rw,soft,timeo=300,_netdev"
        fstype: nfs4

  tasks:
    - name: Install NFS client packages
      ansible.builtin.apt:
        name: nfs-common
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Install NFS client packages on RHEL
      ansible.builtin.yum:
        name: nfs-utils
        state: present
      when: ansible_os_family == "RedHat"

    - name: Create mount point directories
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: directory
        mode: '0755'
      loop: "{{ nfs_mounts }}"
      loop_control:
        label: "{{ item.path }}"

    - name: Mount NFS shares and add to fstab
      ansible.posix.mount:
        path: "{{ item.path }}"
        src: "{{ item.src }}"
        fstype: "{{ item.fstype }}"
        opts: "{{ item.opts }}"
        state: mounted
      loop: "{{ nfs_mounts }}"
      loop_control:
        label: "{{ item.path }}"

    - name: Verify NFS mounts are accessible
      ansible.builtin.command:
        cmd: "df -h {{ item.path }}"
      register: mount_check
      changed_when: false
      loop: "{{ nfs_mounts }}"
      loop_control:
        label: "{{ item.path }}"

    - name: Display mount status
      ansible.builtin.debug:
        msg: "{{ item.stdout }}"
      loop: "{{ mount_check.results }}"
      loop_control:
        label: "{{ item.item.path }}"
```

## Understanding NFS Mount Options

Mount options can make or break your NFS setup. Here is what the important ones mean:

- **soft vs hard**: `soft` returns an error after timeout; `hard` retries forever. Use `soft` for non-critical data, `hard` for important data.
- **timeo**: Timeout in tenths of a second before a retransmission.
- **retrans**: Number of retransmissions before giving up (with `soft`).
- **_netdev**: Tells the system this mount requires networking, so it waits for the network to be up before trying to mount.
- **noatime**: Do not update access times on files (reduces NFS traffic).
- **async vs sync**: `async` buffers writes (faster but riskier); `sync` writes through (safer but slower).

## AutoFS for On-Demand NFS Mounting

For environments where NFS shares should only be mounted when accessed, AutoFS is the way to go.

This playbook configures AutoFS for on-demand NFS mounting:

```yaml
# configure-autofs-nfs.yml - On-demand NFS with AutoFS
---
- name: Configure AutoFS for NFS
  hosts: all
  become: true
  vars:
    nfs_server: "10.0.0.10"
    autofs_mounts:
      - name: shared
        remote_path: /srv/nfs/shared
        options: "-rw,soft,timeo=300"
      - name: backups
        remote_path: /srv/nfs/backups
        options: "-rw,soft,timeo=300"
      - name: readonly
        remote_path: /srv/nfs/readonly
        options: "-ro,soft,timeo=300"
    autofs_mount_point: /nfs

  tasks:
    - name: Install AutoFS
      ansible.builtin.package:
        name: autofs
        state: present

    - name: Create auto.master entry for NFS
      ansible.builtin.lineinfile:
        path: /etc/auto.master
        line: "{{ autofs_mount_point }} /etc/auto.nfs --timeout=300"
        state: present
      notify: Restart autofs

    - name: Create auto.nfs map file
      ansible.builtin.copy:
        dest: /etc/auto.nfs
        mode: '0644'
        content: |
          # AutoFS NFS map - managed by Ansible
          {% for mount in autofs_mounts %}
          {{ mount.name }} {{ mount.options }} {{ nfs_server }}:{{ mount.remote_path }}
          {% endfor %}
      notify: Restart autofs

    - name: Enable and start AutoFS
      ansible.builtin.systemd:
        name: autofs
        enabled: true
        state: started

  handlers:
    - name: Restart autofs
      ansible.builtin.systemd:
        name: autofs
        state: restarted
```

With AutoFS, you access shares at `/nfs/shared`, `/nfs/backups`, etc. They mount automatically on first access and unmount after 5 minutes of inactivity (300 seconds timeout).

## NFS Performance Tuning

Default NFS settings are not optimized for performance. Here is how to tune them.

This playbook applies NFS performance optimizations:

```yaml
# tune-nfs.yml - NFS performance tuning
---
- name: Tune NFS Performance
  hosts: nfs_servers
  become: true
  tasks:
    - name: Configure NFS server thread count
      ansible.builtin.lineinfile:
        path: /etc/default/nfs-kernel-server
        regexp: '^RPCNFSDCOUNT='
        line: 'RPCNFSDCOUNT=16'
      when: ansible_os_family == "Debian"
      notify: Restart NFS

    - name: Set NFS read and write sizes via sysctl
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        state: present
        sysctl_file: /etc/sysctl.d/60-nfs-tuning.conf
      loop:
        # Increase socket buffer sizes for NFS traffic
        - { key: "net.core.rmem_max", value: "16777216" }
        - { key: "net.core.wmem_max", value: "16777216" }
        - { key: "sunrpc.tcp_slot_table_entries", value: "128" }

  handlers:
    - name: Restart NFS
      ansible.builtin.systemd:
        name: "{{ 'nfs-kernel-server' if ansible_os_family == 'Debian' else 'nfs-server' }}"
        state: restarted
```

## NFS Monitoring and Health Checks

This playbook checks NFS health across your infrastructure:

```yaml
# check-nfs-health.yml - Monitor NFS mounts
---
- name: Check NFS Health
  hosts: all
  become: true
  tasks:
    - name: Check NFS mount status
      ansible.builtin.shell: |
        mount | grep nfs | awk '{print $3, $6}'
      register: nfs_status
      changed_when: false

    - name: Display NFS mounts
      ansible.builtin.debug:
        msg: "NFS mounts on {{ inventory_hostname }}: {{ nfs_status.stdout_lines }}"
      when: nfs_status.stdout_lines | length > 0

    - name: Test NFS mount accessibility with timeout
      ansible.builtin.shell: |
        timeout 5 ls {{ item.path }} > /dev/null 2>&1 && echo "OK" || echo "STALE"
      register: access_check
      changed_when: false
      loop: "{{ nfs_mounts | default([]) }}"
      loop_control:
        label: "{{ item.path }}"

    - name: Alert on stale NFS mounts
      ansible.builtin.debug:
        msg: "WARNING: Stale NFS mount {{ item.item.path }} on {{ inventory_hostname }}"
      loop: "{{ access_check.results | default([]) }}"
      loop_control:
        label: "{{ item.item.path | default('N/A') }}"
      when:
        - item.stdout is defined
        - item.stdout == "STALE"
```

## NFS Architecture

```mermaid
graph TD
    A[NFS Server] --> B[/etc/exports]
    B --> C[exportfs]
    C --> D{Export Shares}
    D --> E[/srv/nfs/shared]
    D --> F[/srv/nfs/backups]
    G[NFS Client 1] -->|mount| E
    H[NFS Client 2] -->|mount| E
    I[NFS Client 3] -->|autofs| F
    G --> J[/mnt/shared]
    H --> K[/mnt/shared]
    I --> L[/nfs/backups]
```

## Common NFS Pitfalls

**Stale file handles**: The most annoying NFS problem. Happens when the server restarts or the export changes. Use `soft` mount option so operations fail with an error instead of hanging indefinitely.

**Permission issues with root_squash**: By default, NFS maps root on the client to `nobody` on the server. If your application runs as root and needs to write files, you either need `no_root_squash` (security risk) or change the application to run as a regular user.

**DNS dependency**: If you use hostnames in your fstab or exports, DNS failures will prevent NFS from working. Use IP addresses for NFS mounts in production, or make sure your DNS is highly available.

**Boot order issues**: Without `_netdev` in your mount options, the system might try to mount NFS before the network is up during boot, causing mount failures or boot hangs.

NFS is not glamorous, but it works. With Ansible managing both the server and client configuration, you get consistent, reproducible NFS setups that you can deploy to new servers in minutes instead of hours.
