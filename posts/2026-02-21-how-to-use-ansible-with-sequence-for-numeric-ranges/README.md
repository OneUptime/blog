# How to Use Ansible with_sequence for Numeric Ranges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Numeric Sequences, Automation

Description: Learn how to generate numeric sequences in Ansible using with_sequence and the modern loop with range for creating numbered resources and iterating over number ranges.

---

Creating numbered resources is a common task in infrastructure automation. You might need to create 10 directories, spawn 5 worker processes, or generate configuration files numbered 1 through 20. Ansible's `with_sequence` and the modern `range()` function give you the tools to iterate over numeric sequences without manually listing every number.

## with_sequence Basics

The `with_sequence` lookup generates a sequence of numbers. At its simplest:

```yaml
# Create directories numbered 1 through 5
- name: Create data directories
  ansible.builtin.file:
    path: "/data/volume{{ item }}"
    state: directory
    owner: root
    group: root
    mode: '0755'
  with_sequence: start=1 end=5
```

This creates `/data/volume1` through `/data/volume5`. The `item` variable contains the current number as a string.

## with_sequence Parameters

`with_sequence` accepts three parameters:

- `start` - the first number (default: 1)
- `end` - the last number (inclusive)
- `stride` - the step between numbers (default: 1)

```yaml
# Create even-numbered ports from 8080 to 8090
- name: Open even-numbered ports
  ansible.builtin.debug:
    msg: "Opening port {{ item }}"
  with_sequence: start=8080 end=8090 stride=2
  # Produces: 8080, 8082, 8084, 8086, 8088, 8090
```

## Format Strings

`with_sequence` supports printf-style format strings for creating zero-padded numbers:

```yaml
# Create zero-padded numbered files
- name: Create log files with zero-padded names
  ansible.builtin.file:
    path: "/var/log/myapp/app-{{ item }}.log"
    state: touch
    mode: '0644'
  with_sequence: start=1 end=10 format=%03d
  # Produces: 001, 002, 003, ..., 010
```

The `%03d` format means: decimal integer, zero-padded to 3 digits. You can also use `%02d` for 2-digit padding, `%04d` for 4-digit, and so on.

## The Modern Alternative: loop with range()

The recommended modern approach uses `loop` with Python's `range()` function:

```yaml
# Modern syntax using loop with range
- name: Create data directories (modern)
  ansible.builtin.file:
    path: "/data/volume{{ item }}"
    state: directory
    mode: '0755'
  loop: "{{ range(1, 6) | list }}"
  # range(1, 6) produces: 1, 2, 3, 4, 5
```

Note that `range()` follows Python conventions where the end value is exclusive. So `range(1, 6)` gives you 1 through 5. This is different from `with_sequence` where `end` is inclusive.

## range() Parameters

```yaml
# range(stop) - 0 to stop-1
- loop: "{{ range(5) | list }}"
  # Produces: 0, 1, 2, 3, 4

# range(start, stop) - start to stop-1
- loop: "{{ range(1, 6) | list }}"
  # Produces: 1, 2, 3, 4, 5

# range(start, stop, step) - start to stop-1 with step
- loop: "{{ range(0, 20, 5) | list }}"
  # Produces: 0, 5, 10, 15
```

## Zero-Padding with range()

Since `range()` does not have a built-in format option, use the `format` filter:

```yaml
# Zero-padded numbers with the format filter
- name: Create zero-padded files
  ansible.builtin.file:
    path: "/var/log/myapp/app-{{ '%03d' | format(item) }}.log"
    state: touch
    mode: '0644'
  loop: "{{ range(1, 11) | list }}"
```

This produces `app-001.log` through `app-010.log`, the same as `with_sequence` with `format=%03d`.

## Creating Multiple Worker Instances

```yaml
# Create worker configuration files and systemd units
- name: Deploy worker infrastructure
  hosts: worker_nodes
  become: yes
  vars:
    worker_count: 4
    base_port: 9000

  tasks:
    - name: Create worker directories
      ansible.builtin.file:
        path: "/opt/workers/worker-{{ item }}"
        state: directory
        owner: appuser
        group: appuser
        mode: '0755'
      loop: "{{ range(1, worker_count + 1) | list }}"

    - name: Deploy worker configs
      ansible.builtin.template:
        src: worker.conf.j2
        dest: "/opt/workers/worker-{{ item }}/config.yml"
        owner: appuser
        group: appuser
        mode: '0640'
      loop: "{{ range(1, worker_count + 1) | list }}"
      vars:
        worker_id: "{{ item }}"
        worker_port: "{{ base_port + item }}"

    - name: Create systemd service files
      ansible.builtin.template:
        src: worker.service.j2
        dest: "/etc/systemd/system/worker-{{ item }}.service"
      loop: "{{ range(1, worker_count + 1) | list }}"
      notify: reload systemd

    - name: Start all workers
      ansible.builtin.systemd:
        name: "worker-{{ item }}"
        state: started
        enabled: yes
      loop: "{{ range(1, worker_count + 1) | list }}"

  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: yes
```

The `worker_count` variable controls how many workers are created. Changing it from 4 to 8 automatically creates four more workers.

## Creating Test Data

```yaml
# Generate test user accounts
- name: Create test users
  ansible.builtin.user:
    name: "testuser{{ '%02d' | format(item) }}"
    state: present
    shell: /bin/bash
    password: "{{ test_password | password_hash('sha512') }}"
  loop: "{{ range(1, 21) | list }}"
  loop_control:
    label: "testuser{{ '%02d' | format(item) }}"
```

This creates `testuser01` through `testuser20`.

## IP Address Generation

```yaml
# Generate IP addresses in a subnet
- name: Add static ARP entries
  ansible.builtin.command: >
    arp -s 192.168.1.{{ item }} {{ mac_prefix }}:{{ '%02x' | format(item) }}
  loop: "{{ range(10, 21) | list }}"
  loop_control:
    label: "192.168.1.{{ item }}"
  changed_when: true
```

This generates IP addresses from 192.168.1.10 to 192.168.1.20.

## Countdown Sequences

`range()` supports negative steps for countdown:

```yaml
# Countdown for graceful shutdown
- name: Graceful shutdown countdown
  ansible.builtin.debug:
    msg: "Shutting down in {{ item }} seconds..."
  loop: "{{ range(5, 0, -1) | list }}"
  # Produces: 5, 4, 3, 2, 1
```

## Combining Sequences with Data

You can use sequences as indices into other data:

```yaml
# Deploy configs to numbered instances using sequence as index
- name: Set up application instances
  ansible.builtin.set_fact:
    instances: >-
      {{
        range(1, instance_count + 1)
        | map('regex_replace', '^(.*)$', 'instance-\1')
        | list
      }}
  vars:
    instance_count: 5

- name: Show generated instance names
  ansible.builtin.debug:
    var: instances
  # Output: ["instance-1", "instance-2", "instance-3", "instance-4", "instance-5"]
```

## Creating Partitions and Volumes

```yaml
# Create multiple LVM logical volumes
- name: Create logical volumes
  community.general.lvol:
    vg: data_vg
    lv: "data_lv{{ item }}"
    size: 50G
    state: present
  loop: "{{ range(1, 5) | list }}"

- name: Create filesystems on logical volumes
  community.general.filesystem:
    fstype: xfs
    dev: "/dev/data_vg/data_lv{{ item }}"
  loop: "{{ range(1, 5) | list }}"

- name: Mount logical volumes
  ansible.posix.mount:
    path: "/data/vol{{ item }}"
    src: "/dev/data_vg/data_lv{{ item }}"
    fstype: xfs
    state: mounted
  loop: "{{ range(1, 5) | list }}"
```

## Practical Example: Database Shard Setup

```yaml
# Create and configure multiple database shards
- name: Setup database shards
  hosts: db_servers
  become: yes
  vars:
    shard_count: 8
    shard_base_port: 5432

  tasks:
    - name: Create shard data directories
      ansible.builtin.file:
        path: "/var/lib/postgresql/shard{{ '%02d' | format(item) }}"
        state: directory
        owner: postgres
        group: postgres
        mode: '0700'
      loop: "{{ range(1, shard_count + 1) | list }}"

    - name: Initialize shard databases
      ansible.builtin.command: >
        pg_createcluster 14 shard{{ '%02d' | format(item) }}
        -p {{ shard_base_port + item }}
        -d /var/lib/postgresql/shard{{ '%02d' | format(item) }}
      loop: "{{ range(1, shard_count + 1) | list }}"
      register: create_results
      failed_when:
        - create_results.rc != 0
        - "'already exists' not in create_results.stderr"
      changed_when: create_results.rc == 0

    - name: Deploy shard configurations
      ansible.builtin.template:
        src: postgresql-shard.conf.j2
        dest: "/etc/postgresql/14/shard{{ '%02d' | format(item) }}/postgresql.conf"
      loop: "{{ range(1, shard_count + 1) | list }}"
      vars:
        shard_id: "{{ item }}"
        shard_port: "{{ shard_base_port + item }}"

    - name: Start all shard instances
      ansible.builtin.systemd:
        name: "postgresql@14-shard{{ '%02d' | format(item) }}"
        state: started
        enabled: yes
      loop: "{{ range(1, shard_count + 1) | list }}"

    - name: Verify all shards are accepting connections
      ansible.builtin.command: >
        pg_isready -p {{ shard_base_port + item }}
      loop: "{{ range(1, shard_count + 1) | list }}"
      register: shard_checks
      until: shard_checks.rc == 0
      retries: 10
      delay: 2
      changed_when: false
```

## Migration from with_sequence to loop

Here is a quick conversion guide:

```yaml
# with_sequence: start=1 end=5
# Equivalent loop:
loop: "{{ range(1, 6) | list }}"

# with_sequence: start=0 end=10 stride=2
# Equivalent loop:
loop: "{{ range(0, 11, 2) | list }}"

# with_sequence: start=1 end=5 format=%02d
# Equivalent loop (format in the task, not the loop):
loop: "{{ range(1, 6) | list }}"
# Then use: "{{ '%02d' | format(item) }}" in the task
```

Remember that `with_sequence` has an inclusive end, while `range()` has an exclusive end. Add 1 to the end value when converting.

## Summary

Numeric sequences in Ansible can be generated with `with_sequence` (older syntax with inclusive end) or `loop` with `range()` (modern syntax with exclusive end). Both support start, end, and step values. For zero-padded output, use `format=%03d` with `with_sequence` or `'%03d' | format(item)` with `loop`. These tools are essential for creating numbered resources like worker processes, database shards, volume mounts, and test data at scale.
