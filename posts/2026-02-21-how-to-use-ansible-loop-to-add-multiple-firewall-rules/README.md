# How to Use Ansible loop to Add Multiple Firewall Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Firewall, Security, Linux

Description: Learn how to use Ansible loop to add multiple firewall rules with UFW, firewalld, and iptables for consistent security across your infrastructure.

---

Firewall configuration is one of those tasks where consistency matters more than almost anything else. A single missed rule on one server can leave a gap in your security posture. Manually SSHing into servers to add rules is error-prone and does not scale. Ansible loops let you define your firewall rules as data and apply them uniformly across your entire fleet.

This post covers adding multiple firewall rules using Ansible loops with UFW (Ubuntu), firewalld (RHEL/CentOS), and iptables. We will look at patterns for managing both simple port rules and complex rule sets.

## UFW Rules with loop

UFW is the default firewall on Ubuntu. The `community.general.ufw` module makes it straightforward to manage rules in Ansible.

```yaml
# ufw-rules.yml
# Applies a set of UFW firewall rules for a web server
- name: Configure UFW firewall
  hosts: webservers
  become: true
  tasks:
    - name: Set default deny incoming
      community.general.ufw:
        direction: incoming
        default: deny

    - name: Set default allow outgoing
      community.general.ufw:
        direction: outgoing
        default: allow

    - name: Allow required ports
      community.general.ufw:
        rule: allow
        port: "{{ item.port }}"
        proto: "{{ item.proto }}"
        comment: "{{ item.comment }}"
      loop:
        - { port: "22", proto: "tcp", comment: "SSH" }
        - { port: "80", proto: "tcp", comment: "HTTP" }
        - { port: "443", proto: "tcp", comment: "HTTPS" }
        - { port: "9090", proto: "tcp", comment: "Prometheus" }
        - { port: "9100", proto: "tcp", comment: "Node Exporter" }

    - name: Enable UFW
      community.general.ufw:
        state: enabled
```

Each loop iteration adds one firewall rule. The `comment` field is useful for auditing later since you can quickly see why each rule exists.

## UFW Rules with Source IP Restrictions

For production environments, you usually want to restrict access to specific source IPs, not open ports to the world.

```yaml
# ufw-restricted.yml
# Adds source-restricted UFW rules for sensitive services
- name: Configure restricted UFW rules
  hosts: dbservers
  become: true
  vars:
    firewall_rules:
      - { port: "22", proto: "tcp", src: "10.0.1.0/24", comment: "SSH from management" }
      - { port: "5432", proto: "tcp", src: "10.0.2.0/24", comment: "PostgreSQL from app tier" }
      - { port: "5432", proto: "tcp", src: "10.0.3.0/24", comment: "PostgreSQL from reporting" }
      - { port: "9100", proto: "tcp", src: "10.0.5.10/32", comment: "Node Exporter for Prometheus" }
  tasks:
    - name: Add restricted firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item.port }}"
        proto: "{{ item.proto }}"
        from_ip: "{{ item.src }}"
        comment: "{{ item.comment }}"
      loop: "{{ firewall_rules }}"
```

## firewalld Rules with loop

On RHEL, CentOS, and Fedora, firewalld is the standard. The `ansible.posix.firewalld` module handles rule management.

```yaml
# firewalld-rules.yml
# Adds firewalld rules for a web application server
- name: Configure firewalld
  hosts: webservers
  become: true
  tasks:
    - name: Ensure firewalld is running
      ansible.builtin.service:
        name: firewalld
        state: started
        enabled: true

    - name: Allow services through firewall
      ansible.posix.firewalld:
        service: "{{ item }}"
        permanent: true
        immediate: true
        state: enabled
      loop:
        - http
        - https
        - ssh

    - name: Allow custom ports through firewall
      ansible.posix.firewalld:
        port: "{{ item.port }}/{{ item.proto }}"
        permanent: true
        immediate: true
        state: enabled
      loop:
        - { port: "8080", proto: "tcp" }
        - { port: "9090", proto: "tcp" }
        - { port: "9100", proto: "tcp" }
        - { port: "6379", proto: "tcp" }
```

Notice that firewalld distinguishes between named services (like `http`, `https`) and raw port numbers. We handle them in separate tasks with separate loops.

## firewalld Zone-Based Rules

firewalld supports zones for more granular control. You can loop over rules that target different zones.

```yaml
# firewalld-zones.yml
# Configures zone-based firewall rules for a multi-tier application
- name: Configure firewalld zones
  hosts: appservers
  become: true
  vars:
    zone_rules:
      - { zone: "public", service: "https", state: "enabled" }
      - { zone: "public", service: "http", state: "enabled" }
      - { zone: "internal", port: "5432/tcp", state: "enabled" }
      - { zone: "internal", port: "6379/tcp", state: "enabled" }
      - { zone: "trusted", service: "ssh", state: "enabled" }
  tasks:
    - name: Configure service rules per zone
      ansible.posix.firewalld:
        zone: "{{ item.zone }}"
        service: "{{ item.service }}"
        permanent: true
        immediate: true
        state: "{{ item.state }}"
      loop: "{{ zone_rules | selectattr('service', 'defined') | list }}"

    - name: Configure port rules per zone
      ansible.posix.firewalld:
        zone: "{{ item.zone }}"
        port: "{{ item.port }}"
        permanent: true
        immediate: true
        state: "{{ item.state }}"
      loop: "{{ zone_rules | selectattr('port', 'defined') | list }}"
```

We use `selectattr` to filter the list based on whether the item has a `service` or `port` attribute, then route each to the appropriate task.

## iptables Rules with loop

For systems without UFW or firewalld, you can manage iptables directly.

```yaml
# iptables-rules.yml
# Applies iptables rules for a production web server
- name: Configure iptables
  hosts: webservers
  become: true
  vars:
    iptables_rules:
      - { chain: "INPUT", protocol: "tcp", port: "22", source: "10.0.0.0/8", jump: "ACCEPT", comment: "SSH from internal" }
      - { chain: "INPUT", protocol: "tcp", port: "80", jump: "ACCEPT", comment: "HTTP" }
      - { chain: "INPUT", protocol: "tcp", port: "443", jump: "ACCEPT", comment: "HTTPS" }
      - { chain: "INPUT", protocol: "tcp", port: "9100", source: "10.0.5.10/32", jump: "ACCEPT", comment: "Node Exporter" }
  tasks:
    - name: Apply iptables rules
      ansible.builtin.iptables:
        chain: "{{ item.chain }}"
        protocol: "{{ item.protocol }}"
        destination_port: "{{ item.port }}"
        source: "{{ item.source | default(omit) }}"
        jump: "{{ item.jump }}"
        comment: "{{ item.comment }}"
      loop: "{{ iptables_rules }}"
```

The `default(omit)` filter is important. When a rule does not have a `source` defined, `omit` tells Ansible to skip that parameter entirely rather than passing an empty value.

## Role-Based Firewall Configuration

In a well-structured Ansible project, firewall rules live in group variables and a reusable role applies them.

```yaml
# group_vars/webservers.yml
firewall_allowed_ports:
  - { port: "80", proto: "tcp", comment: "HTTP" }
  - { port: "443", proto: "tcp", comment: "HTTPS" }
  - { port: "9100", proto: "tcp", comment: "Node Exporter" }

# group_vars/dbservers.yml
firewall_allowed_ports:
  - { port: "5432", proto: "tcp", comment: "PostgreSQL" }
  - { port: "9100", proto: "tcp", comment: "Node Exporter" }

# group_vars/all.yml
firewall_base_ports:
  - { port: "22", proto: "tcp", comment: "SSH" }
```

```yaml
# roles/firewall/tasks/main.yml
# Combines base and role-specific firewall rules
- name: Combine base and group firewall rules
  ansible.builtin.set_fact:
    all_firewall_rules: "{{ firewall_base_ports + (firewall_allowed_ports | default([])) }}"

- name: Apply all firewall rules
  community.general.ufw:
    rule: allow
    port: "{{ item.port }}"
    proto: "{{ item.proto }}"
    comment: "{{ item.comment }}"
  loop: "{{ all_firewall_rules }}"
```

This way, every server gets SSH access from the base rules, and each group gets its own specific ports on top.

## Removing Old Firewall Rules

When rules change, you need to remove the old ones. You can maintain a deny list and loop over it.

```yaml
# cleanup-rules.yml
# Removes deprecated firewall rules
- name: Remove deprecated firewall rules
  hosts: all
  become: true
  vars:
    deprecated_rules:
      - { port: "8080", proto: "tcp" }
      - { port: "3000", proto: "tcp" }
      - { port: "27017", proto: "tcp" }
  tasks:
    - name: Remove old UFW rules
      community.general.ufw:
        rule: allow
        port: "{{ item.port }}"
        proto: "{{ item.proto }}"
        delete: true
      loop: "{{ deprecated_rules }}"
```

## Verifying Firewall Rules

After applying rules, verify them.

```yaml
# verify-firewall.yml
# Checks that expected ports are open on the firewall
- name: Verify firewall configuration
  hosts: all
  become: true
  tasks:
    - name: Check UFW status
      ansible.builtin.command: ufw status numbered
      register: ufw_status
      changed_when: false

    - name: Verify expected ports are allowed
      ansible.builtin.assert:
        that:
          - "item in ufw_status.stdout"
        fail_msg: "Port {{ item }} is not in the firewall rules!"
      loop:
        - "22/tcp"
        - "80/tcp"
        - "443/tcp"
```

## Summary

Using Ansible loops for firewall management gives you version-controlled, reproducible security configurations. Define your rules as data in variables, apply them consistently with loops, and store different rule sets in group variables for each server role. Whether you use UFW, firewalld, or iptables, the loop pattern stays the same: define a list of rules, iterate over them, and apply each one. Always include a verification step to confirm your rules are active after the playbook runs.
