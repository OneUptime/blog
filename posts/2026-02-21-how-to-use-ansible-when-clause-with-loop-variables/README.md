# How to Use Ansible when Clause with Loop Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Conditionals, Loops, Automation

Description: Learn how to combine Ansible when conditionals with loop variables to selectively process items during iteration in your playbooks.

---

Ansible loops let you repeat a task for multiple items, and the `when` clause lets you skip tasks based on conditions. When you combine the two, you get selective iteration, which is the ability to process only certain items from a list based on runtime conditions. This pattern shows up constantly in real-world playbooks where you need to iterate over a list but only act on items that meet specific criteria.

## The Basics of when with Loops

When you add a `when` clause to a looping task, Ansible evaluates the condition for each item in the loop independently. If the condition is false for a particular item, that iteration is skipped while the rest continue.

Here is a straightforward example:

```yaml
# Install only packages that are marked as required
- name: Install required packages only
  ansible.builtin.apt:
    name: "{{ item.name }}"
    state: present
  loop:
    - { name: "nginx", required: true }
    - { name: "apache2", required: false }
    - { name: "curl", required: true }
    - { name: "wget", required: false }
  when: item.required
```

In this playbook, only `nginx` and `curl` will be installed because `apache2` and `wget` have `required` set to false. The `item` variable refers to the current element in the loop, and you can access any attribute on it inside the `when` clause.

## Accessing Loop Variables in Conditions

The loop variable is called `item` by default, but you can rename it using `loop_var` in `loop_control`. Regardless of the name, you can use it directly in the `when` expression.

```yaml
# Create user accounts only for users who should be active
- name: Manage user accounts
  ansible.builtin.user:
    name: "{{ account.username }}"
    state: "{{ 'present' if account.active else 'absent' }}"
    shell: "{{ account.shell | default('/bin/bash') }}"
  loop:
    - { username: "deploy", active: true, shell: "/bin/bash" }
    - { username: "oldadmin", active: false, shell: "/bin/bash" }
    - { username: "monitoring", active: true, shell: "/usr/sbin/nologin" }
  loop_control:
    loop_var: account
  when: account.active
```

By renaming the loop variable to `account`, the code becomes more readable. The `when` clause checks `account.active` for each user in the list.

## Combining Multiple Conditions

You can chain multiple conditions together using `and`, `or`, and parentheses. Each condition can reference the loop variable:

```yaml
# Deploy config files only for services that are enabled and running on this OS
- name: Deploy service configurations
  ansible.builtin.template:
    src: "{{ item.template }}"
    dest: "{{ item.dest }}"
    owner: root
    group: root
    mode: '0644'
  loop:
    - { service: "nginx", template: "nginx.conf.j2", dest: "/etc/nginx/nginx.conf", enabled: true, os: ["Debian", "RedHat"] }
    - { service: "haproxy", template: "haproxy.cfg.j2", dest: "/etc/haproxy/haproxy.cfg", enabled: true, os: ["Debian"] }
    - { service: "varnish", template: "varnish.j2", dest: "/etc/varnish/default.vcl", enabled: false, os: ["Debian", "RedHat"] }
  when:
    - item.enabled
    - ansible_os_family in item.os
```

Here, a config file is only deployed if the service is enabled AND the current host's OS family matches one of the allowed operating systems. The conditions are listed as a YAML list under `when`, which Ansible treats as a logical AND.

## Using Loop Variables with Registered Results

A common pattern is to run a command in a loop, register the results, and then use those results in a subsequent task with conditions:

```yaml
# Check if services are running, then restart only the ones that are stopped
- name: Check service status
  ansible.builtin.command: systemctl is-active {{ item }}
  loop:
    - nginx
    - postgresql
    - redis
  register: service_checks
  changed_when: false
  failed_when: false

- name: Restart stopped services
  ansible.builtin.systemd:
    name: "{{ item.item }}"
    state: started
  loop: "{{ service_checks.results }}"
  when: item.rc != 0
```

When you register a variable inside a loop, Ansible stores the results in a `.results` list. Each entry in that list has an `.item` attribute pointing back to the original loop item, plus all the normal return values like `rc`, `stdout`, and `stderr`. The second task loops over these results and only starts services where the return code was non-zero (meaning the service was not active).

## Filtering with Boolean and String Conditions

Loop variables can be tested against various types of conditions:

```yaml
# Process firewall rules based on multiple criteria
- name: Configure firewall rules
  ansible.builtin.iptables:
    chain: INPUT
    protocol: "{{ item.protocol }}"
    destination_port: "{{ item.port }}"
    jump: "{{ item.action }}"
  loop:
    - { protocol: "tcp", port: 80, action: "ACCEPT", environment: "production" }
    - { protocol: "tcp", port: 443, action: "ACCEPT", environment: "production" }
    - { protocol: "tcp", port: 8080, action: "ACCEPT", environment: "staging" }
    - { protocol: "tcp", port: 22, action: "ACCEPT", environment: "all" }
  when: >
    item.environment == target_environment or
    item.environment == 'all'
```

The `>` YAML scalar lets you write the condition on multiple lines for readability. The condition allows rules tagged with the current `target_environment` or rules tagged with `all`.

## Nested Data and Complex Conditions

When your loop items are more complex data structures, you can dig into nested attributes:

```yaml
# Deploy applications only if their health check endpoint responds and they are scheduled for this host
- name: Define applications
  ansible.builtin.set_fact:
    applications:
      - name: api-gateway
        deploy_to: ["web01", "web02"]
        config:
          port: 8080
          health_path: /health
      - name: auth-service
        deploy_to: ["web01"]
        config:
          port: 8081
          health_path: /status
      - name: worker
        deploy_to: ["worker01", "worker02"]
        config:
          port: 9090
          health_path: /ping

- name: Deploy application configs
  ansible.builtin.template:
    src: "app-config.j2"
    dest: "/etc/apps/{{ item.name }}.conf"
  loop: "{{ applications }}"
  when: inventory_hostname in item.deploy_to
```

Each application has a `deploy_to` list of hostnames. The `when` clause checks if the current host (`inventory_hostname`) is in that list. Only matching applications get deployed to each host.

## Combining when with index_var

Sometimes you need to reference the loop index in your condition:

```yaml
# Apply configuration changes in batches, only processing items at even indices first
- name: Process even-indexed items
  ansible.builtin.debug:
    msg: "Processing {{ item }} at index {{ my_idx }}"
  loop:
    - server-a
    - server-b
    - server-c
    - server-d
  loop_control:
    index_var: my_idx
  when: my_idx % 2 == 0
```

This processes only items at even indices (0, 2), which could be useful for blue-green deployments or staged rollouts.

## Practical Example: Conditional Package Installation

Here is a real-world scenario where you manage a heterogeneous fleet and need to install different packages based on host properties:

```yaml
# Install monitoring agents based on the host's role and OS
- name: Install monitoring components
  hosts: all
  vars:
    monitoring_packages:
      - { name: "node-exporter", roles: ["all"], os_families: ["Debian", "RedHat"] }
      - { name: "mysqld-exporter", roles: ["database"], os_families: ["Debian", "RedHat"] }
      - { name: "nginx-exporter", roles: ["webserver"], os_families: ["Debian"] }
      - { name: "windows-exporter", roles: ["webserver"], os_families: ["Windows"] }
  tasks:
    - name: Install appropriate monitoring packages
      ansible.builtin.package:
        name: "{{ item.name }}"
        state: present
      loop: "{{ monitoring_packages }}"
      when:
        - ansible_os_family in item.os_families
        - >
          'all' in item.roles or
          host_role in item.roles
```

This playbook installs only the exporters relevant to each host's role and operating system. The `when` clause combines OS family checking with role-based filtering, making a single loop handle what would otherwise require many separate tasks.

## Things to Watch Out For

One common mistake is forgetting that `when` with a loop evaluates per item, not once for the entire loop. If you want to skip the entire loop based on a condition, put the condition on the task itself referencing a non-loop variable.

Another pitfall is undefined attributes. If some items in your loop have an attribute and others do not, you will get an error. Use the `default` filter to handle missing attributes:

```yaml
# Safely handle items that might not have the 'enabled' attribute
- name: Process items with optional enabled flag
  ansible.builtin.debug:
    msg: "Processing {{ item.name }}"
  loop:
    - { name: "task-a", enabled: true }
    - { name: "task-b" }
    - { name: "task-c", enabled: false }
  when: item.enabled | default(true)
```

Items without an `enabled` attribute default to `true`, so they get processed. Only items explicitly set to `false` are skipped.

## Wrapping Up

Combining `when` with loop variables gives you fine-grained control over which items in a loop get processed. The key points to remember are that the condition evaluates once per loop iteration, you can reference any attribute of the current `item`, and you can combine multiple conditions with `and`/`or` or as a YAML list for implicit AND. This pattern is fundamental to writing concise, maintainable Ansible playbooks that handle varied environments without duplicating tasks.
