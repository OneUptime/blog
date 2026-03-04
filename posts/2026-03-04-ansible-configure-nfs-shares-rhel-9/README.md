# How to Use Ansible to Configure NFS Shares on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, NFS, File Sharing, Automation, Linux

Description: Automate NFS server and client configuration on RHEL using Ansible playbooks for consistent shared storage across your infrastructure.

---

Setting up NFS across multiple servers involves configuring exports, opening firewall ports, and mounting shares on clients. Ansible makes this repeatable and consistent, especially when you need the same shares available across a fleet of application servers.

## NFS Architecture

```mermaid
graph LR
    A[NFS Server] -->|exports| B[/data/shared]
    A -->|exports| C[/data/home]
    D[Client 1] -->|mounts| B
    D -->|mounts| C
    E[Client 2] -->|mounts| B
    E -->|mounts| C
    F[Client 3] -->|mounts| B
```

## NFS Server Playbook

```yaml
# playbook-nfs-server.yml
# Configure an NFS server on RHEL
---
- name: Configure NFS server
  hosts: nfs_servers
  become: true

  vars:
    nfs_exports:
      - path: /data/shared
        options: "10.0.0.0/8(rw,sync,no_subtree_check,no_root_squash)"
        owner: root
        group: root
        mode: "0755"
      - path: /data/home
        options: "10.0.0.0/8(rw,sync,no_subtree_check,root_squash)"
        owner: root
        group: root
        mode: "0755"
      - path: /data/readonly
        options: "10.0.0.0/8(ro,sync,no_subtree_check)"
        owner: root
        group: root
        mode: "0755"

  tasks:
    - name: Install NFS packages
      ansible.builtin.dnf:
        name:
          - nfs-utils
          - rpcbind
        state: present

    - name: Create export directories
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: directory
        owner: "{{ item.owner }}"
        group: "{{ item.group }}"
        mode: "{{ item.mode }}"
      loop: "{{ nfs_exports }}"

    - name: Configure /etc/exports
      ansible.builtin.template:
        src: exports.j2
        dest: /etc/exports
        owner: root
        group: root
        mode: "0644"
      notify: Reload NFS exports

    - name: Enable and start NFS services
      ansible.builtin.systemd:
        name: "{{ item }}"
        enabled: true
        state: started
      loop:
        - rpcbind
        - nfs-server

    - name: Open firewall for NFS
      ansible.posix.firewalld:
        service: "{{ item }}"
        permanent: true
        state: enabled
        immediate: true
      loop:
        - nfs
        - rpc-bind
        - mountd

  handlers:
    - name: Reload NFS exports
      ansible.builtin.command: exportfs -ra
```

Create the exports template:

```jinja2
# templates/exports.j2
# NFS exports - managed by Ansible
{% for export in nfs_exports %}
{{ export.path }}  {{ export.options }}
{% endfor %}
```

## NFS Client Playbook

```yaml
# playbook-nfs-client.yml
# Configure NFS mounts on client servers
---
- name: Configure NFS clients
  hosts: nfs_clients
  become: true

  vars:
    nfs_server: "nfs1.example.com"
    nfs_mounts:
      - src: "{{ nfs_server }}:/data/shared"
        path: /mnt/shared
        opts: "rw,sync,hard,intr,timeo=600,retrans=2"
      - src: "{{ nfs_server }}:/data/home"
        path: /mnt/home
        opts: "rw,sync,hard,intr"
      - src: "{{ nfs_server }}:/data/readonly"
        path: /mnt/readonly
        opts: "ro,sync,hard,intr"

  tasks:
    - name: Install NFS client packages
      ansible.builtin.dnf:
        name: nfs-utils
        state: present

    - name: Create mount point directories
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: directory
        mode: "0755"
      loop: "{{ nfs_mounts }}"

    - name: Mount NFS shares
      ansible.posix.mount:
        src: "{{ item.src }}"
        path: "{{ item.path }}"
        fstype: nfs
        opts: "{{ item.opts }}"
        state: mounted
      loop: "{{ nfs_mounts }}"

    - name: Enable rpcbind service
      ansible.builtin.systemd:
        name: rpcbind
        enabled: true
        state: started
```

## Combined Playbook

```yaml
# playbook-nfs.yml
# Set up the full NFS infrastructure
---
- name: Configure NFS server
  ansible.builtin.import_playbook: playbook-nfs-server.yml

- name: Configure NFS clients
  ansible.builtin.import_playbook: playbook-nfs-client.yml
```

## Inventory

```ini
# inventory
[nfs_servers]
nfs1.example.com

[nfs_clients]
web1.example.com
web2.example.com
app1.example.com
app2.example.com
```

## Verifying NFS Configuration

On the server:

```bash
# Show current exports
exportfs -v

# Check NFS service status
systemctl status nfs-server

# View connected clients
ss -tlnp | grep -E '(2049|111)'
```

On the clients:

```bash
# Check mounted NFS shares
mount | grep nfs

# Verify the share is accessible
ls -la /mnt/shared

# Show NFS mount statistics
nfsstat -m
```

## Wrapping Up

Automating NFS with Ansible ensures that every server mounts the same shares with the same options. The most common issue in NFS setups is forgetting to open the firewall or using inconsistent mount options across clients. With Ansible, you define it once and every client gets the correct configuration. Pay attention to the mount options, especially `hard` vs `soft` and the timeout values, since they directly affect application behavior when the NFS server becomes unreachable.
