# How to Use Ansible loop with Conditional when Clause

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Conditionals, Playbook Design

Description: Learn how to combine Ansible loop with when conditionals to selectively process items, skip iterations, and build smart automation workflows.

---

Combining `loop` with `when` is one of the most frequently used patterns in Ansible. It lets you iterate over a list but only act on items that meet specific criteria. The `when` clause is evaluated independently for each loop iteration, so some items can be processed while others are skipped. This is the foundation of selective automation.

## How when Works Inside a Loop

When you attach a `when` clause to a looped task, Ansible evaluates the condition for every item in the loop. Each evaluation has access to the current `item` variable:

```yaml
# Process only items that match a condition
- name: Install packages that are marked as required
  ansible.builtin.apt:
    name: "{{ item.name }}"
    state: present
  loop:
    - { name: "nginx", required: true }
    - { name: "apache2", required: false }
    - { name: "curl", required: true }
    - { name: "telnet", required: false }
    - { name: "git", required: true }
  when: item.required
```

In the output, required items show as "ok" or "changed", while non-required items show as "skipping". This makes it easy to see what was actually processed.

## Combining Item Properties with Host Facts

The `when` clause can reference both the loop variable and host facts:

```yaml
# Install packages based on both the item's OS requirement and the actual host OS
- name: Install platform-specific tools
  ansible.builtin.package:
    name: "{{ item.package }}"
    state: present
  loop:
    - { package: "apt-transport-https", os_family: "Debian" }
    - { package: "yum-utils", os_family: "RedHat" }
    - { package: "curl", os_family: "all" }
    - { package: "epel-release", os_family: "RedHat" }
    - { package: "software-properties-common", os_family: "Debian" }
  when: >
    item.os_family == ansible_os_family or
    item.os_family == "all"
```

On a Debian host, only the Debian-specific and "all" packages get installed. On a RedHat host, only the RedHat-specific and "all" packages get installed.

## Multiple Conditions

You can chain multiple conditions. When written as a YAML list, they are joined with AND:

```yaml
# Deploy configs only for services that are enabled and match the current environment
- name: Deploy service configurations
  ansible.builtin.template:
    src: "{{ item.template }}"
    dest: "{{ item.dest }}"
    mode: '0644'
  loop:
    - template: api.conf.j2
      dest: /etc/myapp/api.conf
      enabled: true
      environments: ["production", "staging"]
    - template: debug.conf.j2
      dest: /etc/myapp/debug.conf
      enabled: true
      environments: ["development"]
    - template: legacy.conf.j2
      dest: /etc/myapp/legacy.conf
      enabled: false
      environments: ["production"]
    - template: monitoring.conf.j2
      dest: /etc/myapp/monitoring.conf
      enabled: true
      environments: ["production", "staging", "development"]
  when:
    - item.enabled
    - target_env in item.environments
  loop_control:
    label: "{{ item.template }}"
```

Both conditions must be true for the item to be processed. The service must be enabled AND the current environment must be in the service's allowed environments list.

## Using or Conditions

For OR logic, use the `or` keyword:

```yaml
# Process items that meet at least one of several criteria
- name: Manage special user accounts
  ansible.builtin.user:
    name: "{{ item.name }}"
    state: present
    shell: "{{ item.shell }}"
  loop:
    - { name: "admin", shell: "/bin/bash", is_admin: true, is_deploy: false }
    - { name: "deploy", shell: "/bin/bash", is_admin: false, is_deploy: true }
    - { name: "guest", shell: "/usr/sbin/nologin", is_admin: false, is_deploy: false }
    - { name: "ci", shell: "/bin/bash", is_admin: false, is_deploy: true }
  when: item.is_admin or item.is_deploy
  loop_control:
    label: "{{ item.name }}"
```

Only users who are admins OR have deploy privileges get created. The "guest" user is skipped.

## Handling Undefined Attributes

Not all items in a loop might have the same attributes. Use the `default` filter to handle missing attributes safely:

```yaml
# Safely handle items with optional attributes
- name: Configure services
  ansible.builtin.systemd:
    name: "{{ item.name }}"
    state: started
    enabled: yes
  loop:
    - { name: "nginx", critical: true }
    - { name: "cron" }
    - { name: "rsyslog", critical: true }
    - { name: "avahi-daemon" }
  when: item.critical | default(false)
  loop_control:
    label: "{{ item.name }}"
```

Items without a `critical` attribute default to `false` and are skipped. Without the `default` filter, Ansible would throw an error on items missing the attribute.

## Conditional Loops Based on External Variables

You can control whether to loop at all using a variable:

```yaml
# Only run the loop if a feature flag is enabled
- name: Install optional monitoring tools
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop:
    - prometheus-node-exporter
    - collectd
    - telegraf
  when: enable_monitoring | default(false)
```

If `enable_monitoring` is false or undefined, every iteration is skipped. This effectively disables the entire loop based on a single variable.

## Using when to Filter Before and After

Sometimes you want to pre-filter the loop list for cleaner output:

```yaml
# Approach 1: Filter in the when clause (shows "skipping" for each filtered item)
- name: Process active items (with skipping messages)
  ansible.builtin.debug:
    msg: "Processing {{ item.name }}"
  loop: "{{ all_items }}"
  when: item.active
  loop_control:
    label: "{{ item.name }}"

# Approach 2: Filter the list before looping (no skipping messages)
- name: Process active items (clean output)
  ansible.builtin.debug:
    msg: "Processing {{ item.name }}"
  loop: "{{ all_items | selectattr('active') | list }}"
  loop_control:
    label: "{{ item.name }}"
```

Approach 2 is cleaner when the filter is simple. Approach 1 is necessary when the condition involves external variables or facts that are not part of the item data.

## Practical Example: Server Hardening with Selective Rules

```yaml
# Apply security hardening rules selectively
- name: Server hardening
  hosts: all
  become: yes
  vars:
    server_role: "{{ group_names[0] | default('generic') }}"
    hardening_rules:
      - name: "Disable root login"
        sysctl_key: null
        file_action: true
        file_path: /etc/ssh/sshd_config
        line: "PermitRootLogin no"
        applies_to: ["all"]

      - name: "Set TCP SYN cookies"
        sysctl_key: net.ipv4.tcp_syncookies
        sysctl_value: "1"
        file_action: false
        applies_to: ["all"]

      - name: "Disable ICMP redirects"
        sysctl_key: net.ipv4.conf.all.accept_redirects
        sysctl_value: "0"
        file_action: false
        applies_to: ["webserver", "database"]

      - name: "Enable IP forwarding"
        sysctl_key: net.ipv4.ip_forward
        sysctl_value: "1"
        file_action: false
        applies_to: ["router", "loadbalancer"]

      - name: "Increase file descriptor limit"
        sysctl_key: fs.file-max
        sysctl_value: "65536"
        file_action: false
        applies_to: ["webserver", "database", "all"]

  tasks:
    - name: Apply sysctl hardening rules
      ansible.posix.sysctl:
        name: "{{ item.sysctl_key }}"
        value: "{{ item.sysctl_value }}"
        state: present
        reload: yes
      loop: "{{ hardening_rules }}"
      when:
        - not item.file_action
        - "'all' in item.applies_to or server_role in item.applies_to"
      loop_control:
        label: "{{ item.name }}"

    - name: Apply file-based hardening rules
      ansible.builtin.lineinfile:
        path: "{{ item.file_path }}"
        line: "{{ item.line }}"
        state: present
      loop: "{{ hardening_rules }}"
      when:
        - item.file_action
        - "'all' in item.applies_to or server_role in item.applies_to"
      loop_control:
        label: "{{ item.name }}"
      notify: restart sshd

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

This playbook has a single list of hardening rules, but each rule specifies which server roles it applies to. The `when` clause on each task checks both the rule type (sysctl vs. file) and whether the rule applies to the current server's role.

## Comparing Approaches: when vs Pre-Filtering

Here is when to use each approach:

Use `when` inside the loop when:
- The condition depends on host facts or variables outside the item
- You want visibility into which items were skipped
- The condition combines item properties with runtime information

Pre-filter the loop list when:
- The condition depends only on item properties
- You want cleaner output without skipping messages
- You want to reduce the number of iterations for performance

```yaml
# Both approaches achieve the same result for item-only conditions

# Pre-filter approach (cleaner)
- loop: "{{ items | selectattr('enabled') | list }}"

# when approach (more visible)
- loop: "{{ items }}"
  when: item.enabled
```

## Summary

The combination of `loop` and `when` gives you fine-grained control over which items get processed during iteration. The `when` clause evaluates per iteration, can reference both the current `item` and external facts/variables, and supports complex AND/OR logic. Use the `default` filter to handle items with optional attributes, pre-filter your lists with `selectattr` when the condition is purely item-based, and keep your `when` conditions readable by using YAML list format for multiple AND conditions.
