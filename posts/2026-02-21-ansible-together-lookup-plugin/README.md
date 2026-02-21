# How to Use the Ansible together Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Loops, Data Pairing

Description: Learn how to use the Ansible together lookup plugin to zip multiple lists together and iterate over paired elements in your playbooks.

---

When you have two or more related lists that need to be processed in parallel, the `together` lookup plugin zips them together. If you have a list of usernames and a corresponding list of UIDs, `together` pairs them up so you can access the username and UID for each user in a single loop iteration. It works exactly like Python's `zip()` function.

## What the together Lookup Does

The `together` lookup takes two or more lists and combines them element-by-element. The first element from each list forms the first pair, the second element from each forms the second pair, and so on. If the lists have different lengths, shorter lists are padded with `None`.

## Basic Usage

The simplest form zips two lists together.

This playbook creates users from paired lists of names and UIDs:

```yaml
# playbook.yml - Pair usernames with UIDs
---
- name: Create users from paired lists
  hosts: all
  vars:
    usernames:
      - alice
      - bob
      - charlie
    user_uids:
      - 1001
      - 1002
      - 1003
  tasks:
    - name: Create user accounts
      ansible.builtin.user:
        name: "{{ item.0 }}"
        uid: "{{ item.1 }}"
        state: present
      loop: "{{ lookup('together', usernames, user_uids, wantlist=True) }}"
```

In each iteration:
- `item.0` is the element from the first list (username)
- `item.1` is the element from the second list (UID)

## Pairing Three or More Lists

You can zip any number of lists together.

This playbook pairs names, ports, and protocols:

```yaml
# playbook.yml - Zip three lists together
---
- name: Configure services from parallel lists
  hosts: all
  vars:
    service_names:
      - web
      - api
      - database
      - cache
    service_ports:
      - 80
      - 9090
      - 5432
      - 6379
    service_protocols:
      - http
      - http
      - tcp
      - tcp
  tasks:
    - name: Open firewall ports for each service
      ansible.builtin.iptables:
        chain: INPUT
        protocol: "{{ item.2 }}"
        destination_port: "{{ item.1 }}"
        jump: ACCEPT
        comment: "Allow {{ item.0 }}"
      loop: "{{ lookup('together', service_names, service_ports, service_protocols, wantlist=True) }}"
```

## Practical Example: NFS Mount Points

A common real-world pattern is pairing NFS server paths with local mount points.

```yaml
# playbook.yml - Configure NFS mounts from paired lists
---
- name: Configure NFS mounts
  hosts: appservers
  vars:
    nfs_sources:
      - "nfs-server:/exports/shared"
      - "nfs-server:/exports/logs"
      - "nfs-server:/exports/backups"
    nfs_mount_points:
      - "/mnt/shared"
      - "/mnt/logs"
      - "/mnt/backups"
    nfs_options:
      - "rw,sync,hard"
      - "rw,sync,hard"
      - "ro,sync,soft"
  tasks:
    - name: Create mount point directories
      ansible.builtin.file:
        path: "{{ item.1 }}"
        state: directory
        mode: '0755'
      loop: "{{ lookup('together', nfs_sources, nfs_mount_points, nfs_options, wantlist=True) }}"

    - name: Configure NFS mounts
      ansible.posix.mount:
        path: "{{ item.1 }}"
        src: "{{ item.0 }}"
        fstype: nfs
        opts: "{{ item.2 }}"
        state: mounted
      loop: "{{ lookup('together', nfs_sources, nfs_mount_points, nfs_options, wantlist=True) }}"
```

## SSL Certificate Deployment

Pairing certificate files with their keys and deploying them together:

```yaml
# playbook.yml - Deploy SSL certs with matching private keys
---
- name: Deploy SSL certificates
  hosts: webservers
  vars:
    cert_domains:
      - example.com
      - api.example.com
      - admin.example.com
    cert_files:
      - files/certs/example.com.crt
      - files/certs/api.example.com.crt
      - files/certs/admin.example.com.crt
    key_files:
      - files/keys/example.com.key
      - files/keys/api.example.com.key
      - files/keys/admin.example.com.key
  tasks:
    - name: Deploy certificate files
      ansible.builtin.copy:
        src: "{{ item.1 }}"
        dest: "/etc/ssl/certs/{{ item.0 }}.crt"
        mode: '0644'
      loop: "{{ lookup('together', cert_domains, cert_files, wantlist=True) }}"

    - name: Deploy private key files
      ansible.builtin.copy:
        src: "{{ item.1 }}"
        dest: "/etc/ssl/private/{{ item.0 }}.key"
        mode: '0600'
      loop: "{{ lookup('together', cert_domains, key_files, wantlist=True) }}"
```

## Disk and Partition Mapping

When provisioning servers with multiple disks, you might have paired lists of devices and mount points.

```yaml
# playbook.yml - Partition and mount disks from paired lists
---
- name: Configure storage
  hosts: storageservers
  vars:
    disk_devices:
      - /dev/sdb
      - /dev/sdc
      - /dev/sdd
    mount_points:
      - /data/vol1
      - /data/vol2
      - /data/vol3
    filesystem_types:
      - xfs
      - xfs
      - ext4
  tasks:
    - name: Create filesystem on each disk
      community.general.filesystem:
        dev: "{{ item.0 }}"
        fstype: "{{ item.2 }}"
      loop: "{{ lookup('together', disk_devices, mount_points, filesystem_types, wantlist=True) }}"

    - name: Create mount directories
      ansible.builtin.file:
        path: "{{ item.1 }}"
        state: directory
        mode: '0755'
      loop: "{{ lookup('together', disk_devices, mount_points, filesystem_types, wantlist=True) }}"

    - name: Mount filesystems
      ansible.posix.mount:
        path: "{{ item.1 }}"
        src: "{{ item.0 }}"
        fstype: "{{ item.2 }}"
        state: mounted
      loop: "{{ lookup('together', disk_devices, mount_points, filesystem_types, wantlist=True) }}"
```

## Handling Unequal List Lengths

When lists have different lengths, shorter lists get padded with `None`. This can be useful or dangerous depending on your use case.

```yaml
# playbook.yml - Handling unequal lists
---
- name: Demonstrate unequal list handling
  hosts: localhost
  vars:
    names:
      - alice
      - bob
      - charlie
      - dave
    roles:
      - admin
      - developer
  tasks:
    - name: Show paired values (some will have None)
      ansible.builtin.debug:
        msg: "{{ item.0 }} -> {{ item.1 | default('no role assigned') }}"
      loop: "{{ lookup('together', names, roles, wantlist=True) }}"
```

This outputs:

```
alice -> admin
bob -> developer
charlie -> no role assigned
dave -> no role assigned
```

## Network Interface Configuration

Pairing interface names with IP addresses for multi-homed servers:

```yaml
# playbook.yml - Configure multiple network interfaces
---
- name: Configure network interfaces
  hosts: all
  vars:
    interfaces:
      - eth0
      - eth1
      - eth2
    ip_addresses:
      - "10.0.1.10/24"
      - "10.0.2.10/24"
      - "192.168.1.10/24"
    gateways:
      - "10.0.1.1"
      - "10.0.2.1"
      - "192.168.1.1"
  tasks:
    - name: Configure each network interface
      ansible.builtin.template:
        src: ifcfg.j2
        dest: "/etc/sysconfig/network-scripts/ifcfg-{{ item.0 }}"
        mode: '0644'
      vars:
        iface_name: "{{ item.0 }}"
        iface_ip: "{{ item.1 }}"
        iface_gateway: "{{ item.2 }}"
      loop: "{{ lookup('together', interfaces, ip_addresses, gateways, wantlist=True) }}"
      notify: restart network
```

## together vs zip Filter

Modern Ansible also provides a `zip` filter that does the same thing. Here is the comparison:

```yaml
# playbook.yml - together lookup vs zip filter
---
- name: Compare together and zip
  hosts: localhost
  vars:
    list_a: [1, 2, 3]
    list_b: [a, b, c]
  tasks:
    # Using together lookup
    - name: With together
      ansible.builtin.debug:
        msg: "{{ item.0 }}-{{ item.1 }}"
      loop: "{{ lookup('together', list_a, list_b, wantlist=True) }}"

    # Using zip filter (modern approach)
    - name: With zip filter
      ansible.builtin.debug:
        msg: "{{ item.0 }}-{{ item.1 }}"
      loop: "{{ list_a | zip(list_b) | list }}"
```

The `zip` filter is generally preferred in modern Ansible because it is more readable and follows Python conventions. However, `together` has one advantage: it pads shorter lists with `None` instead of truncating, which `zip` does not do by default (you would need `zip_longest` for that behavior, which is not available as a built-in filter).

## When to Use together vs Dictionaries

If you find yourself with multiple parallel lists that describe the same entities, you should consider whether a list of dictionaries would be cleaner:

```yaml
# Less readable: parallel lists with together
vars:
  names: [web, api, db]
  ports: [80, 9090, 5432]
  protocols: [http, http, tcp]

# More readable: list of dictionaries
vars:
  services:
    - name: web
      port: 80
      protocol: http
    - name: api
      port: 9090
      protocol: http
    - name: db
      port: 5432
      protocol: tcp
```

Use `together` when you receive data as separate lists (from external sources, APIs, or other tools) and cannot easily restructure it. Use dictionaries when you control the data definition.

## Tips

1. **Always use wantlist=True** when using `together` with `loop`. Without it, you will get unexpected behavior with single-element lists.

2. **Order matters**: The first list is accessed as `item.0`, the second as `item.1`, and so on. Keep your lists in a logical order.

3. **Validate lengths**: If your lists must be the same length, add an assertion before using them together.

4. **Consider readability**: More than three or four lists become hard to track. At that point, restructure your data into a list of dictionaries instead.

The `together` lookup is a clean way to iterate over parallel data structures. It shines when you have related data split across multiple lists and need to process them in lockstep.
