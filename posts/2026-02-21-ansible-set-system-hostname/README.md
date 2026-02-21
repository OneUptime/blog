# How to Use Ansible to Set System Hostname

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Hostname, Linux, System Configuration, DevOps

Description: Learn how to set and manage system hostnames across your Linux fleet using Ansible including static, pretty, and transient hostname configuration.

---

Setting hostnames sounds trivial until you have 200 servers and half of them are still called "localhost" or have names that do not match your inventory. A proper hostname scheme makes troubleshooting faster, logging meaningful, and your monitoring dashboards actually useful. Ansible makes it easy to enforce consistent naming across your fleet.

## Why Hostname Management Matters

Hostnames show up everywhere: log entries, monitoring alerts, shell prompts, network traffic. When a server is named `ip-172-31-42-17` (looking at you, AWS defaults), good luck figuring out what it does from a log entry at 2 AM. A good naming scheme like `web-prod-us-east-01` tells you the role, environment, region, and instance number at a glance.

## The Simple Approach: hostname Module

Ansible has a built-in `hostname` module that handles the basics.

This playbook sets the hostname to match the inventory hostname:

```yaml
# set-hostname-simple.yml - Basic hostname configuration
---
- name: Set System Hostname
  hosts: all
  become: true
  tasks:
    - name: Set the system hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts with the new hostname
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname_short }} {{ inventory_hostname }}"
        state: present

    - name: Ensure localhost entry exists
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.0\.1'
        line: "127.0.0.1 localhost"
        state: present
```

## Full Hostname Configuration with hostnamectl

Modern Linux systems (systemd-based) have three types of hostnames:

- **Static**: Stored in `/etc/hostname`, used at boot
- **Pretty**: A human-readable name, can include special characters
- **Transient**: Set by DHCP or mDNS, temporary

This playbook configures all three hostname types:

```yaml
# set-hostname-full.yml - Complete hostname configuration
---
- name: Configure All Hostname Types
  hosts: all
  become: true
  vars:
    # Define hostname components
    server_role: "{{ group_names[0] | default('server') }}"
    server_env: "{{ env | default('prod') }}"
    server_region: "{{ region | default('us-east') }}"
    server_index: "{{ inventory_hostname | regex_search('\\d+$') | default('01') }}"

    # Build the hostname
    static_hostname: "{{ server_role }}-{{ server_env }}-{{ server_region }}-{{ server_index }}"
    pretty_hostname: "{{ server_role | title }} Server {{ server_index }} ({{ server_env | upper }})"

  tasks:
    - name: Set static hostname
      ansible.builtin.hostname:
        name: "{{ static_hostname }}"
        use: systemd

    - name: Set pretty hostname via hostnamectl
      ansible.builtin.command:
        cmd: "hostnamectl set-hostname --pretty '{{ pretty_hostname }}'"
      changed_when: true

    - name: Set chassis type for proper icon in management tools
      ansible.builtin.command:
        cmd: "hostnamectl set-chassis server"
      changed_when: false

    - name: Set deployment environment
      ansible.builtin.command:
        cmd: "hostnamectl set-deployment '{{ server_env }}'"
      changed_when: false

    - name: Verify hostname configuration
      ansible.builtin.command: hostnamectl
      register: hostnamectl_output
      changed_when: false

    - name: Display hostname info
      ansible.builtin.debug:
        msg: "{{ hostnamectl_output.stdout_lines }}"
```

## Updating /etc/hosts Comprehensively

The hostname needs to be reflected in `/etc/hosts` for local resolution to work properly. This is especially important for applications like sudo that do DNS lookups on the hostname.

This playbook builds a complete /etc/hosts file using inventory data:

```yaml
# update-etc-hosts.yml - Build /etc/hosts from inventory
---
- name: Update /etc/hosts on All Servers
  hosts: all
  become: true
  tasks:
    - name: Deploy /etc/hosts from template
      ansible.builtin.template:
        src: hosts.j2
        dest: /etc/hosts
        owner: root
        group: root
        mode: '0644'
        backup: true
```

The template that generates /etc/hosts from your Ansible inventory:

```jinja2
# hosts.j2 - /etc/hosts managed by Ansible
# Do not edit manually

# Loopback
127.0.0.1   localhost
127.0.1.1   {{ inventory_hostname_short }} {{ inventory_hostname }}
::1         localhost ip6-localhost ip6-loopback

# Cluster members
{% for host in groups['all'] %}
{% if hostvars[host]['ansible_default_ipv4'] is defined %}
{{ hostvars[host]['ansible_default_ipv4']['address'] }}  {{ host }} {{ host.split('.')[0] }}
{% endif %}
{% endfor %}
```

## Hostname Naming Convention Role

For organizations that want to enforce a naming convention, wrap it in a role.

The role defaults define the naming pattern:

```yaml
# roles/hostname/defaults/main.yml
---
hostname_domain: example.com
hostname_separator: "-"
hostname_format: "{{ hostname_role }}{{ hostname_separator }}{{ hostname_env }}{{ hostname_separator }}{{ hostname_location }}{{ hostname_separator }}{{ hostname_index }}"
hostname_role: "{{ group_names[0] | default('srv') }}"
hostname_env: "{{ lookup('env', 'ENVIRONMENT') | default('prod', true) }}"
hostname_location: "us1"
hostname_index: "{{ play_hosts.index(inventory_hostname) + 1 }}"
```

The main task file for the hostname role:

```yaml
# roles/hostname/tasks/main.yml
---
- name: Calculate FQDN
  ansible.builtin.set_fact:
    calculated_fqdn: "{{ hostname_format }}.{{ hostname_domain }}"
    calculated_short: "{{ hostname_format }}"

- name: Set system hostname to short name
  ansible.builtin.hostname:
    name: "{{ calculated_short }}"

- name: Configure /etc/hostname
  ansible.builtin.copy:
    content: "{{ calculated_short }}\n"
    dest: /etc/hostname
    mode: '0644'

- name: Update /etc/hosts with FQDN and short name
  ansible.builtin.lineinfile:
    path: /etc/hosts
    regexp: '^127\.0\.1\.1'
    line: "127.0.1.1 {{ calculated_fqdn }} {{ calculated_short }}"

- name: Configure machine-info for pretty hostname
  ansible.builtin.copy:
    dest: /etc/machine-info
    mode: '0644'
    content: |
      PRETTY_HOSTNAME="{{ calculated_short | upper }}"
      DEPLOYMENT="{{ hostname_env }}"
      LOCATION="{{ hostname_location }}"

- name: Update shell prompt to show hostname
  ansible.builtin.lineinfile:
    path: /etc/profile.d/hostname-prompt.sh
    line: 'export PS1="\u@{{ calculated_short }}:\w\$ "'
    create: true
    mode: '0644'
```

## Handling Cloud Provider Hostname Persistence

Cloud providers like AWS tend to reset hostnames on reboot. Here is how to make your hostname stick.

This playbook configures hostname persistence on AWS EC2 instances:

```yaml
# persist-hostname-aws.yml - Keep hostname after reboot on AWS
---
- name: Persist Hostname on AWS
  hosts: all
  become: true
  tasks:
    - name: Set preserve_hostname in cloud-init
      ansible.builtin.lineinfile:
        path: /etc/cloud/cloud.cfg
        regexp: '^preserve_hostname'
        line: 'preserve_hostname: true'
        create: true
      when: ansible_system_vendor | default('') == 'Amazon EC2' or
            ansible_system_vendor | default('') == 'Xen'

    - name: Disable cloud-init hostname module
      ansible.builtin.copy:
        dest: /etc/cloud/cloud.cfg.d/99-disable-hostname.cfg
        mode: '0644'
        content: |
          # Prevent cloud-init from resetting hostname
          manage_etc_hosts: false
          preserve_hostname: true
      when: ansible_virtualization_type | default('') in ['xen', 'kvm']

    - name: Set hostname via hostnamectl for persistence
      ansible.builtin.command:
        cmd: "hostnamectl set-hostname {{ inventory_hostname }}"
      changed_when: true
```

## Hostname Validation Playbook

After setting hostnames, validate that everything is consistent.

This playbook checks hostname configuration across all servers:

```yaml
# validate-hostnames.yml - Verify hostname configuration
---
- name: Validate Hostnames
  hosts: all
  become: true
  tasks:
    - name: Get actual hostname
      ansible.builtin.command: hostname
      register: actual_hostname
      changed_when: false

    - name: Get FQDN
      ansible.builtin.command: hostname -f
      register: actual_fqdn
      changed_when: false
      failed_when: false

    - name: Check /etc/hostname contents
      ansible.builtin.slurp:
        src: /etc/hostname
      register: etc_hostname

    - name: Verify hostname matches inventory
      ansible.builtin.assert:
        that:
          - actual_hostname.stdout == inventory_hostname or
            actual_hostname.stdout == inventory_hostname_short
        fail_msg: >
          Hostname mismatch on {{ inventory_hostname }}!
          Expected: {{ inventory_hostname }}
          Actual: {{ actual_hostname.stdout }}
        success_msg: "Hostname OK: {{ actual_hostname.stdout }}"

    - name: Check hostname resolves locally
      ansible.builtin.command:
        cmd: "getent hosts {{ inventory_hostname }}"
      register: hosts_check
      changed_when: false
      failed_when: false

    - name: Warn if hostname does not resolve
      ansible.builtin.debug:
        msg: "WARNING: {{ inventory_hostname }} does not resolve locally"
      when: hosts_check.rc != 0
```

## Naming Convention Flow

```mermaid
graph LR
    A[Server Role] --> E[Hostname Builder]
    B[Environment] --> E
    C[Region] --> E
    D[Index] --> E
    E --> F[web-prod-us1-01]
    F --> G[/etc/hostname]
    F --> H[/etc/hosts]
    F --> I[hostnamectl]
    F --> J[Shell Prompt]
```

Hostname management is one of those foundational things that pays off every single day. When your monitoring alert says "web-prod-us1-03 is down" instead of "ip-10-0-3-47 is down," you save precious seconds in every incident. Use Ansible to get it right once and keep it consistent forever.
