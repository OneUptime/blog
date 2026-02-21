# How to Use the Ansible known_hosts Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, known_hosts, Security

Description: Learn how to manage SSH known_hosts entries with Ansible to automate host key verification and prevent MITM attacks.

---

Every time you SSH into a server for the first time, your SSH client asks you to verify the host key fingerprint. If you have ever typed "yes" to that prompt, you have added an entry to `~/.ssh/known_hosts`. In automated environments, manually confirming host keys is not practical. The Ansible `known_hosts` module lets you manage these entries programmatically, which is essential for maintaining SSH security at scale without disabling host key checking entirely.

This post covers how to add, remove, and manage SSH host keys using the `known_hosts` module, along with security best practices.

## Why known_hosts Matters

When Ansible connects to a remote host over SSH, it checks the host's key against the `known_hosts` file. If the key is not found, one of three things happens:

1. If `host_key_checking = true` (default), Ansible refuses to connect
2. If you set `ANSIBLE_HOST_KEY_CHECKING=False`, Ansible connects without verification (insecure)
3. If the host key is already in `known_hosts`, Ansible connects normally

The right approach is option 3: pre-populate `known_hosts` with verified host keys. That is what the `known_hosts` module does.

## Adding a Host Key

The basic usage adds a host's SSH key to the known_hosts file:

```yaml
# add a host key to known_hosts
---
- name: Manage known_hosts entries
  hosts: localhost
  connection: local
  tasks:
    - name: Add server SSH key to known_hosts
      ansible.builtin.known_hosts:
        name: server1.example.com
        key: "server1.example.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl"
        state: present
```

The `key` parameter requires the full public key string in the format: `hostname keytype base64key`.

## Fetching Host Keys Automatically

Rather than hardcoding keys, you can scan them from the hosts:

```yaml
# scan and add host keys dynamically
---
- name: Auto-populate known_hosts
  hosts: localhost
  connection: local
  tasks:
    - name: Scan SSH host key from server
      ansible.builtin.command:
        cmd: ssh-keyscan -t ed25519 server1.example.com
      register: host_key_scan
      changed_when: false

    - name: Add scanned key to known_hosts
      ansible.builtin.known_hosts:
        name: server1.example.com
        key: "{{ host_key_scan.stdout }}"
        state: present
```

You can scan multiple key types:

```yaml
# scan multiple key types from a host
- name: Scan all key types
  ansible.builtin.command:
    cmd: "ssh-keyscan -t {{ item }} server1.example.com"
  register: key_scans
  loop:
    - ed25519
    - rsa
    - ecdsa
  changed_when: false
  failed_when: false

- name: Add all available keys
  ansible.builtin.known_hosts:
    name: server1.example.com
    key: "{{ item.stdout }}"
    state: present
  loop: "{{ key_scans.results }}"
  when: item.stdout | length > 0
```

## Managing known_hosts for Multiple Hosts

Scale this to your entire inventory:

```yaml
# add known_hosts entries for all inventory hosts
---
- name: Populate known_hosts for all managed hosts
  hosts: localhost
  connection: local
  tasks:
    - name: Scan SSH keys from all managed hosts
      ansible.builtin.command:
        cmd: "ssh-keyscan -t ed25519 {{ item }}"
      register: all_host_keys
      loop: "{{ groups['all'] }}"
      changed_when: false
      failed_when: false

    - name: Add all host keys to known_hosts
      ansible.builtin.known_hosts:
        name: "{{ item.item }}"
        key: "{{ item.stdout }}"
        state: present
      loop: "{{ all_host_keys.results }}"
      when: item.stdout | length > 0
```

## Adding Keys for Non-Standard SSH Ports

If your SSH servers run on non-standard ports, the known_hosts format is different:

```yaml
# add host key for SSH on a non-standard port
---
- name: Handle non-standard SSH ports
  hosts: localhost
  connection: local
  tasks:
    - name: Scan host key on custom port
      ansible.builtin.command:
        cmd: "ssh-keyscan -t ed25519 -p 2222 server1.example.com"
      register: custom_port_key
      changed_when: false

    - name: Add host key with custom port
      ansible.builtin.known_hosts:
        name: "[server1.example.com]:2222"
        key: "{{ custom_port_key.stdout }}"
        state: present
```

When SSH uses a non-standard port, the hostname in known_hosts is wrapped in brackets with the port appended: `[hostname]:port`.

## Removing Host Keys

When decommissioning servers or after key rotation, remove old entries:

```yaml
# remove a host from known_hosts
---
- name: Clean up known_hosts
  hosts: localhost
  connection: local
  tasks:
    - name: Remove decommissioned server
      ansible.builtin.known_hosts:
        name: old-server.example.com
        state: absent

    - name: Remove multiple decommissioned hosts
      ansible.builtin.known_hosts:
        name: "{{ item }}"
        state: absent
      loop:
        - old-web1.example.com
        - old-web2.example.com
        - old-db1.example.com
```

## Host Key Rotation

When servers get new SSH keys (after a rebuild or certificate rotation), you need to update known_hosts:

```yaml
# rotate host keys after server rebuild
---
- name: Rotate SSH host keys
  hosts: localhost
  connection: local
  vars:
    rebuilt_servers:
      - web1.example.com
      - web2.example.com
  tasks:
    - name: Remove old host keys
      ansible.builtin.known_hosts:
        name: "{{ item }}"
        state: absent
      loop: "{{ rebuilt_servers }}"

    - name: Scan new host keys
      ansible.builtin.command:
        cmd: "ssh-keyscan -t ed25519 {{ item }}"
      register: new_keys
      loop: "{{ rebuilt_servers }}"
      changed_when: false
      retries: 3
      delay: 10
      until: new_keys.stdout | length > 0

    - name: Add new host keys
      ansible.builtin.known_hosts:
        name: "{{ item.item }}"
        key: "{{ item.stdout }}"
        state: present
      loop: "{{ new_keys.results }}"
```

## Managing a Global known_hosts File

Instead of managing per-user known_hosts files, you can maintain a system-wide one:

```yaml
# manage the system-wide known_hosts file
---
- name: System-wide known_hosts management
  hosts: all
  become: true
  tasks:
    - name: Add infrastructure hosts to global known_hosts
      ansible.builtin.known_hosts:
        name: "{{ item.name }}"
        key: "{{ item.key }}"
        path: /etc/ssh/ssh_known_hosts
        state: present
      loop:
        - name: git.internal.com
          key: "git.internal.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl"
        - name: registry.internal.com
          key: "registry.internal.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBPQe5dGmPRG+s6FxBsh75qK+FeNxW69gTHAyqRScUhj"
```

The `path` parameter specifies which known_hosts file to modify. The system-wide file at `/etc/ssh/ssh_known_hosts` applies to all users.

## Handling Hosts with Multiple IPs

When a hostname resolves to multiple IPs, or you access a host by both name and IP:

```yaml
# add known_hosts entries for both hostname and IP
---
- name: Add host key for name and IP
  hosts: localhost
  connection: local
  tasks:
    - name: Scan host key
      ansible.builtin.command:
        cmd: ssh-keyscan -t ed25519 server1.example.com
      register: host_key
      changed_when: false

    - name: Extract just the key part
      ansible.builtin.set_fact:
        ssh_key_data: "{{ host_key.stdout.split(' ', 1)[1] }}"

    - name: Add entry for hostname
      ansible.builtin.known_hosts:
        name: server1.example.com
        key: "server1.example.com {{ ssh_key_data }}"
        state: present

    - name: Add entry for IP address
      ansible.builtin.known_hosts:
        name: 10.0.1.10
        key: "10.0.1.10 {{ ssh_key_data }}"
        state: present
```

## Security: Hash the known_hosts File

For additional security, you can hash hostnames in the known_hosts file so they cannot be read if the file is compromised:

```yaml
# hash known_hosts entries for security
---
- name: Secure known_hosts with hashing
  hosts: localhost
  connection: local
  tasks:
    - name: Add host keys (standard format)
      ansible.builtin.known_hosts:
        name: "{{ item }}"
        key: "{{ lookup('pipe', 'ssh-keyscan -t ed25519 ' + item) }}"
        hash_host: true
        state: present
      loop:
        - server1.example.com
        - server2.example.com
        - server3.example.com
```

The `hash_host: true` parameter stores the hostname as a hash instead of plaintext, matching the behavior of `ssh-keygen -H`.

## Practical Example: Bootstrap New Infrastructure

Here is a complete playbook for bootstrapping known_hosts when setting up new infrastructure:

```yaml
# bootstrap known_hosts for new infrastructure
---
- name: Bootstrap SSH known_hosts
  hosts: localhost
  connection: local
  vars:
    infrastructure:
      - name: web servers
        hosts: "{{ groups['webservers'] | default([]) }}"
      - name: database servers
        hosts: "{{ groups['dbservers'] | default([]) }}"
      - name: monitoring servers
        hosts: "{{ groups['monitoring'] | default([]) }}"
  tasks:
    - name: Wait for SSH to be available on all hosts
      ansible.builtin.wait_for:
        host: "{{ item.1 }}"
        port: 22
        timeout: 300
        state: started
      loop: "{{ infrastructure | subelements('hosts') }}"
      loop_control:
        label: "{{ item.1 }}"

    - name: Scan SSH keys from all infrastructure hosts
      ansible.builtin.command:
        cmd: "ssh-keyscan -t ed25519,rsa {{ item.1 }}"
      register: scanned_keys
      loop: "{{ infrastructure | subelements('hosts') }}"
      loop_control:
        label: "{{ item.1 }}"
      changed_when: false

    - name: Add all scanned keys to known_hosts
      ansible.builtin.known_hosts:
        name: "{{ item.item.1 }}"
        key: "{{ item.stdout_lines | first }}"
        state: present
      loop: "{{ scanned_keys.results }}"
      loop_control:
        label: "{{ item.item.1 }}"
      when: item.stdout_lines | length > 0

    - name: Report results
      ansible.builtin.debug:
        msg: "Added {{ scanned_keys.results | selectattr('stdout_lines') | list | length }} hosts to known_hosts"
```

## Summary

The Ansible `known_hosts` module is essential for maintaining SSH security in automated environments. Use it to pre-populate host keys instead of disabling host key checking. Combine it with `ssh-keyscan` to dynamically fetch keys from new hosts. Manage both per-user (`~/.ssh/known_hosts`) and system-wide (`/etc/ssh/ssh_known_hosts`) files. Implement key rotation workflows that remove old keys before adding new ones. And use `hash_host: true` for additional security when the known_hosts file might be accessed by untrusted parties.
