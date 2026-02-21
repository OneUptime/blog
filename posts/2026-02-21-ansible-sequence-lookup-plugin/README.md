# How to Use the Ansible sequence Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Loops, Automation

Description: Learn how to use the Ansible sequence lookup plugin to generate numeric sequences and formatted strings for use in playbook loops.

---

Creating multiple similar resources is one of the most common tasks in infrastructure automation. You might need to create ten worker nodes, five database replicas, or a hundred test accounts. The `sequence` lookup plugin generates numeric sequences that you can use to drive these repetitive tasks, with support for formatting, custom ranges, and step values.

## What the sequence Lookup Does

The `sequence` lookup generates a list of numbers (or formatted strings based on numbers) given a start value, end value, optional step, and optional format string. It is similar to Python's `range()` function but with string formatting built in.

## Basic Usage

The simplest form generates a sequence of numbers.

This playbook creates multiple directories numbered 1 through 5:

```yaml
# playbook.yml - Generate a simple numeric sequence
---
- name: Create numbered directories
  hosts: localhost
  tasks:
    - name: Create worker directories
      ansible.builtin.file:
        path: "/opt/workers/worker-{{ item }}"
        state: directory
        mode: '0755'
      loop: "{{ lookup('sequence', 'start=1 end=5', wantlist=True) }}"
```

This creates `/opt/workers/worker-1` through `/opt/workers/worker-5`.

## Format Strings

The `format` parameter lets you generate formatted strings instead of plain numbers.

This playbook uses zero-padded numbers:

```yaml
# playbook.yml - Using format strings with sequence
---
- name: Create formatted resources
  hosts: localhost
  tasks:
    # Zero-padded 3-digit numbers
    - name: Create numbered log files
      ansible.builtin.file:
        path: "/var/log/myapp/app-{{ item }}.log"
        state: touch
        mode: '0644'
      loop: "{{ lookup('sequence', 'start=1 end=10 format=%03d', wantlist=True) }}"

    # Hexadecimal numbering
    - name: Create hex-numbered configs
      ansible.builtin.debug:
        msg: "Config ID: {{ item }}"
      loop: "{{ lookup('sequence', 'start=0 end=15 format=%x', wantlist=True) }}"

    # Custom prefix with number
    - name: Create named workers
      ansible.builtin.debug:
        msg: "Worker: {{ item }}"
      loop: "{{ lookup('sequence', 'start=1 end=5 format=worker-%02d', wantlist=True) }}"
```

The format string uses Python's `%` formatting syntax:

- `%d` for decimal integer
- `%02d` for zero-padded 2-digit integer
- `%03d` for zero-padded 3-digit integer
- `%x` for hexadecimal
- `%o` for octal
- `worker-%02d` for prefixed formatted numbers

## Custom Ranges and Steps

You can control the start, end, and step values.

```yaml
# playbook.yml - Custom ranges and steps
---
- name: Demonstrate custom ranges
  hosts: localhost
  tasks:
    # Start from 0, go to 100, step by 10
    - name: Generate percentage thresholds
      ansible.builtin.debug:
        msg: "Threshold: {{ item }}%"
      loop: "{{ lookup('sequence', 'start=0 end=100 stride=10', wantlist=True) }}"

    # Even numbers only
    - name: Generate even port numbers
      ansible.builtin.debug:
        msg: "Port: {{ item }}"
      loop: "{{ lookup('sequence', 'start=8000 end=8010 stride=2', wantlist=True) }}"

    # Count down
    - name: Reverse countdown
      ansible.builtin.debug:
        msg: "Countdown: {{ item }}"
      loop: "{{ lookup('sequence', 'start=10 end=1 stride=-1', wantlist=True) }}"
```

The parameter `stride` controls the step between numbers. Use a negative stride to count backwards.

## Practical Example: Creating a Cluster

Here is a real-world example of provisioning a cluster of application nodes.

```yaml
# playbook.yml - Provision a cluster of application nodes
---
- name: Provision application cluster
  hosts: localhost
  vars:
    cluster_size: 5
    base_port: 9000
  tasks:
    - name: Create configuration for each node
      ansible.builtin.template:
        src: node_config.j2
        dest: "/etc/myapp/nodes/node-{{ item }}.yml"
        mode: '0644'
      vars:
        node_id: "{{ item }}"
        node_port: "{{ base_port | int + item | int }}"
      loop: "{{ lookup('sequence', 'start=1 end=' + cluster_size | string, wantlist=True) }}"

    - name: Create systemd service for each node
      ansible.builtin.template:
        src: node_service.j2
        dest: "/etc/systemd/system/myapp-node-{{ item }}.service"
        mode: '0644'
      loop: "{{ lookup('sequence', 'start=1 end=' + cluster_size | string, wantlist=True) }}"
      notify: reload systemd

    - name: Start all node services
      ansible.builtin.systemd:
        name: "myapp-node-{{ item }}"
        state: started
        enabled: true
      loop: "{{ lookup('sequence', 'start=1 end=' + cluster_size | string, wantlist=True) }}"
```

The node config template:

```yaml
# templates/node_config.j2
node:
  id: {{ node_id }}
  port: {{ node_port }}
  peers:
{% for i in range(1, cluster_size | int + 1) %}
{% if i | string != node_id %}
    - host: localhost
      port: {{ base_port | int + i }}
{% endif %}
{% endfor %}
```

## Generating Test Data

The sequence lookup is great for creating test scenarios.

```yaml
# playbook.yml - Generate test users and data
---
- name: Create test environment
  hosts: testservers
  tasks:
    - name: Create test user accounts
      ansible.builtin.user:
        name: "testuser{{ item }}"
        state: present
        password: "{{ lookup('password', '/dev/null length=16 chars=ascii_letters,digits') | password_hash('sha512') }}"
        shell: /bin/bash
      loop: "{{ lookup('sequence', 'start=1 end=20 format=%03d', wantlist=True) }}"

    - name: Create test databases
      community.mysql.mysql_db:
        name: "testdb_{{ item }}"
        state: present
      loop: "{{ lookup('sequence', 'start=1 end=5', wantlist=True) }}"

    - name: Grant test users access to their databases
      community.mysql.mysql_user:
        name: "testuser{{ item }}"
        password: "test_pass_{{ item }}"
        priv: "testdb_{{ item }}.*:ALL"
        state: present
      loop: "{{ lookup('sequence', 'start=1 end=5 format=%03d', wantlist=True) }}"
```

## IP Address Generation

Combine sequence with formatting to generate IP addresses for network configurations.

```yaml
# playbook.yml - Generate IP addresses for a subnet
---
- name: Configure network allowlist
  hosts: firewalls
  vars:
    subnet_prefix: "10.0.1"
    host_start: 10
    host_end: 50
  tasks:
    - name: Build list of allowed IPs
      ansible.builtin.set_fact:
        allowed_ips: "{{ lookup('sequence', 'start=' + host_start | string + ' end=' + host_end | string + ' format=' + subnet_prefix + '.%d', wantlist=True) }}"

    - name: Show generated IPs
      ansible.builtin.debug:
        msg: "{{ allowed_ips }}"

    - name: Add firewall rules for each IP
      ansible.builtin.iptables:
        chain: INPUT
        source: "{{ item }}"
        jump: ACCEPT
        protocol: tcp
        destination_port: '443'
      loop: "{{ allowed_ips }}"
```

## Creating Port Mappings

When deploying multiple instances of the same service, each needs a unique port.

```yaml
# playbook.yml - Create port mappings for multiple service instances
---
- name: Deploy multiple service instances
  hosts: appservers
  vars:
    instance_count: 4
    base_http_port: 8080
    base_admin_port: 9090
  tasks:
    - name: Deploy instance configurations
      ansible.builtin.template:
        src: instance.conf.j2
        dest: "/etc/myapp/instances/instance-{{ item }}.conf"
        mode: '0644'
      vars:
        instance_id: "{{ item }}"
        http_port: "{{ base_http_port | int + item | int - 1 }}"
        admin_port: "{{ base_admin_port | int + item | int - 1 }}"
      loop: "{{ lookup('sequence', 'start=1 end=' + instance_count | string, wantlist=True) }}"

    - name: Show port allocation
      ansible.builtin.debug:
        msg: "Instance {{ item }}: HTTP={{ base_http_port | int + item | int - 1 }}, Admin={{ base_admin_port | int + item | int - 1 }}"
      loop: "{{ lookup('sequence', 'start=1 end=' + instance_count | string, wantlist=True) }}"
```

## Combining sequence with Other Lookups

You can combine `sequence` with other lookups for more sophisticated patterns.

```yaml
# playbook.yml - Combine sequence with other data
---
- name: Complex resource creation
  hosts: localhost
  vars:
    environments:
      - dev
      - staging
      - prod
  tasks:
    - name: Create numbered resources per environment
      ansible.builtin.file:
        path: "/opt/{{ env_item }}/worker-{{ seq_item }}"
        state: directory
        mode: '0755'
      loop: "{{ environments | product(lookup('sequence', 'start=1 end=3', wantlist=True)) | list }}"
      vars:
        env_item: "{{ item[0] }}"
        seq_item: "{{ item[1] }}"
```

This creates `worker-1`, `worker-2`, `worker-3` inside each environment directory.

## Comparison with range Filter

Ansible also has a `range` filter that does something similar. Here is how they compare:

```yaml
# playbook.yml - sequence lookup vs range filter
---
- name: Compare sequence and range
  hosts: localhost
  tasks:
    # Using sequence lookup
    - name: With sequence
      ansible.builtin.debug:
        msg: "{{ item }}"
      loop: "{{ lookup('sequence', 'start=1 end=5', wantlist=True) }}"

    # Using range filter (Ansible 2.9+)
    - name: With range filter
      ansible.builtin.debug:
        msg: "{{ item }}"
      loop: "{{ range(1, 6) | list }}"
```

The key difference is that `sequence` returns strings (which is why the `format` parameter works), while `range` returns integers. Use `sequence` when you need formatted string output; use `range` when you need integer arithmetic.

## Things to Keep in Mind

1. **Values are strings**: The sequence lookup returns string values, not integers. If you need to do math with them, use the `int` filter: `{{ item | int + 100 }}`.

2. **Inclusive end**: The `end` value is inclusive, meaning `start=1 end=5` generates 1, 2, 3, 4, 5. This is different from Python's `range()` where the end is exclusive.

3. **Format string limitations**: The format string uses Python's old `%` formatting. You cannot use f-string or `.format()` syntax.

4. **Large sequences**: Generating very large sequences (millions of items) will consume memory since the entire list is materialized. For very large iterations, consider using the `range` filter with batch processing.

The `sequence` lookup is a simple but powerful tool for any task that involves numbered resources. Whether you are spinning up cluster nodes, creating test accounts, or generating configuration files, it saves you from maintaining static lists of numbers.
