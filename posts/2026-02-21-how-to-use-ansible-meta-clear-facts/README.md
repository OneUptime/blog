# How to Use Ansible meta clear_facts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Meta, Facts, Cache Management

Description: Learn how to use Ansible meta clear_facts to reset cached facts during playbook execution and force fresh fact gathering.

---

Ansible caches facts about hosts after gathering them. This cache persists across plays within a single playbook run and can even persist across separate runs if you use a fact caching backend. The `meta: clear_facts` directive lets you wipe this cache for the current host, forcing Ansible to start fresh the next time it gathers facts. This is useful in scenarios where system state changes during the playbook run and the cached facts become stale.

## Why You Would Need to Clear Facts

Consider a playbook that installs a new kernel, reboots the host, and then needs to verify the new kernel version. The `ansible_kernel` fact was gathered before the reboot and still contains the old kernel version. Without clearing facts, your verification check would pass or fail based on outdated information.

```yaml
# The problem: stale facts after system changes
---
- name: Kernel upgrade (stale fact problem)
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Show current kernel (from initial gather)
      ansible.builtin.debug:
        msg: "Current kernel: {{ ansible_kernel }}"

    - name: Install new kernel
      ansible.builtin.apt:
        name: "linux-image-{{ target_kernel }}"
        state: present
      register: kernel_install

    - name: Reboot to load new kernel
      ansible.builtin.reboot:
        reboot_timeout: 300
      when: kernel_install is changed

    # Problem: ansible_kernel still has the OLD value
    - name: Show kernel after reboot (THIS IS STALE)
      ansible.builtin.debug:
        msg: "Kernel after reboot: {{ ansible_kernel }}"
      # This will show the OLD kernel version
```

## Using clear_facts to Solve Stale Data

Here is how `meta: clear_facts` fixes the stale fact problem.

```yaml
# Solution: clear facts and re-gather
---
- name: Kernel upgrade (correct approach)
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Show current kernel
      ansible.builtin.debug:
        msg: "Current kernel: {{ ansible_kernel }}"

    - name: Install new kernel
      ansible.builtin.apt:
        name: "linux-image-{{ target_kernel }}"
        state: present
      register: kernel_install

    - name: Reboot to load new kernel
      ansible.builtin.reboot:
        reboot_timeout: 300
      when: kernel_install is changed

    - name: Clear cached facts
      ansible.builtin.meta: clear_facts
      when: kernel_install is changed

    - name: Re-gather facts with fresh data
      ansible.builtin.setup:
      when: kernel_install is changed

    - name: Show kernel after reboot (FRESH DATA)
      ansible.builtin.debug:
        msg: "Kernel after reboot: {{ ansible_kernel }}"
      # This now shows the NEW kernel version
```

The sequence is: `clear_facts` wipes the cache, then `setup` re-gathers all facts, and now `ansible_kernel` reflects the actual running kernel.

## What clear_facts Actually Clears

The `clear_facts` directive removes all cached facts for the current host. This includes:

- All facts gathered by the `setup` module (OS info, network, hardware, etc.)
- Custom facts set with `set_fact` that have `cacheable: true`
- Facts from custom fact scripts in `/etc/ansible/facts.d/`

It does NOT remove:
- Regular variables defined in `vars`, `vars_files`, or `extra_vars`
- Facts set with `set_fact` that are not cacheable (these are technically host variables, not facts)
- Inventory variables

```yaml
# Demonstrate what gets cleared and what does not
---
- name: Clear facts demonstration
  hosts: localhost
  gather_facts: true

  vars:
    regular_var: "I survive clear_facts"

  tasks:
    - name: Set a regular fact (not cacheable)
      ansible.builtin.set_fact:
        my_regular_fact: "I will survive clear_facts"

    - name: Set a cacheable fact
      ansible.builtin.set_fact:
        my_cached_fact: "I will be cleared"
        cacheable: true

    - name: Show before clearing
      ansible.builtin.debug:
        msg: |
          OS: {{ ansible_distribution | default('CLEARED') }}
          Regular var: {{ regular_var }}
          Regular fact: {{ my_regular_fact | default('CLEARED') }}
          Cached fact: {{ my_cached_fact | default('CLEARED') }}

    - name: Clear all facts
      ansible.builtin.meta: clear_facts

    - name: Show after clearing
      ansible.builtin.debug:
        msg: |
          OS: {{ ansible_distribution | default('CLEARED') }}
          Regular var: {{ regular_var }}
          Regular fact: {{ my_regular_fact | default('CLEARED') }}
          Cached fact: {{ my_cached_fact | default('CLEARED') }}
```

## Use Case: System Configuration Changes

When you make changes that affect system facts (like changing the hostname, adding network interfaces, or modifying mounts), clearing and re-gathering facts ensures accuracy.

```yaml
# Re-gather facts after network changes
---
- name: Network reconfiguration
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Show original network config
      ansible.builtin.debug:
        msg: "Primary IP: {{ ansible_default_ipv4.address }}"

    - name: Add secondary network interface
      ansible.builtin.template:
        src: secondary-nic.j2
        dest: /etc/netplan/60-secondary.yaml
      register: nic_config

    - name: Apply network configuration
      ansible.builtin.command:
        cmd: netplan apply
      when: nic_config is changed

    - name: Wait for network to stabilize
      ansible.builtin.pause:
        seconds: 5
      when: nic_config is changed

    - name: Clear stale network facts
      ansible.builtin.meta: clear_facts
      when: nic_config is changed

    - name: Re-gather facts
      ansible.builtin.setup:
        gather_subset:
          - network
      when: nic_config is changed

    - name: Show updated network config
      ansible.builtin.debug:
        msg: "Interfaces: {{ ansible_interfaces | join(', ') }}"

    - name: Verify new interface is present
      ansible.builtin.assert:
        that:
          - "'eth1' in ansible_interfaces"
        fail_msg: "Secondary interface eth1 was not detected after reconfiguration"
      when: nic_config is changed
```

## Use Case: Hostname Changes

After changing a hostname, the `ansible_hostname` fact becomes stale.

```yaml
# Refresh facts after hostname change
---
- name: Rename server
  hosts: all
  become: true
  gather_facts: true

  vars:
    new_hostname: "app-prod-01"

  tasks:
    - name: Show current hostname
      ansible.builtin.debug:
        msg: "Current hostname fact: {{ ansible_hostname }}"

    - name: Set new hostname
      ansible.builtin.hostname:
        name: "{{ new_hostname }}"
      register: hostname_change

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ new_hostname }}"
      when: hostname_change is changed

    - name: Clear facts to pick up new hostname
      ansible.builtin.meta: clear_facts
      when: hostname_change is changed

    - name: Re-gather facts
      ansible.builtin.setup:
        gather_subset:
          - "!all"
          - "!min"
          - network
      when: hostname_change is changed

    - name: Verify hostname change
      ansible.builtin.debug:
        msg: "Hostname is now: {{ ansible_hostname }}"
```

## Use Case: Disk Changes

After creating partitions or mounting filesystems, fact data about mounts becomes stale.

```yaml
# Refresh facts after disk operations
---
- name: Add data volume
  hosts: db_servers
  become: true
  gather_facts: true

  tasks:
    - name: Show current mounts
      ansible.builtin.debug:
        msg: "Current mounts: {{ ansible_mounts | map(attribute='mount') | list }}"

    - name: Create filesystem on new volume
      community.general.filesystem:
        fstype: ext4
        dev: /dev/sdb1
      register: fs_create

    - name: Mount data volume
      ansible.posix.mount:
        path: /data
        src: /dev/sdb1
        fstype: ext4
        state: mounted
      register: mount_result

    - name: Clear facts after mount changes
      ansible.builtin.meta: clear_facts
      when: mount_result is changed

    - name: Re-gather mount facts
      ansible.builtin.setup:
        gather_subset:
          - hardware
      when: mount_result is changed

    - name: Verify new mount appears in facts
      ansible.builtin.debug:
        msg: "Updated mounts: {{ ansible_mounts | map(attribute='mount') | list }}"

    - name: Assert data volume is mounted
      ansible.builtin.assert:
        that:
          - ansible_mounts | selectattr('mount', 'equalto', '/data') | list | length > 0
        fail_msg: "/data mount is not reflected in facts"
```

## Using clear_facts with Fact Caching

If you use a fact caching plugin (like Redis or JSON file caching), `clear_facts` removes the facts from the cache backend as well, not just from memory.

```yaml
# ansible.cfg with fact caching enabled
# [defaults]
# fact_caching = jsonfile
# fact_caching_connection = /tmp/ansible_facts_cache
# fact_caching_timeout = 86400

---
- name: Refresh stale cached facts
  hosts: all
  gather_facts: false  # Do not auto-gather stale cached facts

  tasks:
    - name: Clear any cached facts
      ansible.builtin.meta: clear_facts

    - name: Gather fresh facts
      ansible.builtin.setup:

    - name: Now all facts are current
      ansible.builtin.debug:
        msg: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
```

## Selective Fact Re-Gathering

After clearing facts, you do not have to re-gather everything. Use `gather_subset` to only collect what you need.

```yaml
# Selective re-gathering after clear
- name: Clear all facts
  ansible.builtin.meta: clear_facts

# Only re-gather network facts (faster than full gather)
- name: Re-gather network facts only
  ansible.builtin.setup:
    gather_subset:
      - "!all"
      - "!min"
      - network
```

The available subsets include `all`, `min`, `hardware`, `network`, `virtual`, `ohai`, and `facter`. Using `!all` and `!min` with a specific subset gives you just that subset without the default minimum facts.

The `meta: clear_facts` directive is a niche but important tool. You need it when your playbook makes changes that affect the system information Ansible caches as facts. Without clearing stale facts, your downstream tasks might make decisions based on outdated information, leading to misconfiguration or false verification results. Whenever you change something about the host that Ansible gathers as a fact, clear and re-gather.
