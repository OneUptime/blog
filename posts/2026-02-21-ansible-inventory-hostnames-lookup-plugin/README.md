# How to Use the Ansible inventory_hostnames Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Inventory, Host Patterns

Description: Learn how to use the Ansible inventory_hostnames lookup plugin to resolve host patterns and group names into actual host lists dynamically.

---

When writing playbooks, you sometimes need to know which hosts belong to a specific group or match a particular pattern, not to run tasks on them, but to use that information in your logic. The `inventory_hostnames` lookup plugin resolves inventory host patterns into a list of matching hostnames. This lets you reference hosts from other groups in your templates, build dynamic configurations, or create cross-group awareness without changing your play's `hosts` directive.

## What inventory_hostnames Does

The `inventory_hostnames` lookup takes an inventory host pattern (the same kind you use in the `hosts:` line of a play) and returns a list of matching hostnames. It evaluates the pattern against the current inventory without actually connecting to any hosts.

## Basic Usage

The simplest form resolves a group name to its members.

This playbook running on web servers generates a config that references all database servers:

```yaml
# playbook.yml - Resolve group members from another group
---
- name: Configure web servers with database server list
  hosts: webservers
  tasks:
    - name: Get list of all database servers
      ansible.builtin.debug:
        msg: "Database servers: {{ lookup('inventory_hostnames', 'dbservers', wantlist=True) }}"

    - name: Get list of all hosts in inventory
      ansible.builtin.debug:
        msg: "All hosts: {{ lookup('inventory_hostnames', 'all', wantlist=True) }}"
```

## Host Pattern Syntax

The lookup supports the same patterns used in the `hosts:` field of plays.

```yaml
# playbook.yml - Different host pattern examples
---
- name: Demonstrate host pattern resolution
  hosts: localhost
  tasks:
    # Single group
    - name: All webservers
      ansible.builtin.debug:
        msg: "{{ lookup('inventory_hostnames', 'webservers', wantlist=True) }}"

    # Multiple groups (union)
    - name: Web and app servers combined
      ansible.builtin.debug:
        msg: "{{ lookup('inventory_hostnames', 'webservers:appservers', wantlist=True) }}"

    # Intersection of groups
    - name: Hosts in both production AND webservers
      ansible.builtin.debug:
        msg: "{{ lookup('inventory_hostnames', 'production:&webservers', wantlist=True) }}"

    # Exclusion
    - name: All servers except databases
      ansible.builtin.debug:
        msg: "{{ lookup('inventory_hostnames', 'all:!dbservers', wantlist=True) }}"

    # Wildcard patterns
    - name: All hosts starting with web
      ansible.builtin.debug:
        msg: "{{ lookup('inventory_hostnames', 'web*', wantlist=True) }}"

    # Regex patterns
    - name: Hosts matching a regex
      ansible.builtin.debug:
        msg: "{{ lookup('inventory_hostnames', '~web[0-9]+\\.example\\.com', wantlist=True) }}"
```

## Practical Example: Load Balancer Configuration

The most common use case is generating load balancer configurations that reference backend servers.

Given this inventory:

```ini
# inventory/hosts
[webservers]
web01.example.com
web02.example.com
web03.example.com

[apiservers]
api01.example.com
api02.example.com

[loadbalancers]
lb01.example.com
```

This playbook configures the load balancer with all backend servers:

```yaml
# playbook.yml - Configure load balancer with discovered backends
---
- name: Configure HAProxy load balancer
  hosts: loadbalancers
  vars:
    web_backends: "{{ lookup('inventory_hostnames', 'webservers', wantlist=True) }}"
    api_backends: "{{ lookup('inventory_hostnames', 'apiservers', wantlist=True) }}"
  tasks:
    - name: Deploy HAProxy configuration
      ansible.builtin.template:
        src: haproxy.cfg.j2
        dest: /etc/haproxy/haproxy.cfg
        mode: '0644'
      notify: restart haproxy
```

The HAProxy template:

```
# templates/haproxy.cfg.j2
global
    log /dev/log local0
    maxconn 4096

defaults
    mode http
    timeout connect 5s
    timeout client  30s
    timeout server  30s

frontend web_frontend
    bind *:80
    default_backend web_servers

backend web_servers
    balance roundrobin
{% for host in web_backends %}
    server {{ host | regex_replace('\.example\.com$', '') }} {{ host }}:8080 check
{% endfor %}

frontend api_frontend
    bind *:9090
    default_backend api_servers

backend api_servers
    balance roundrobin
{% for host in api_backends %}
    server {{ host | regex_replace('\.example\.com$', '') }} {{ host }}:9090 check
{% endfor %}
```

## Cluster Configuration

When deploying clustered applications, each node needs to know about all other nodes.

```yaml
# playbook.yml - Configure cluster peers
---
- name: Configure etcd cluster
  hosts: etcd_nodes
  vars:
    all_etcd_nodes: "{{ lookup('inventory_hostnames', 'etcd_nodes', wantlist=True) }}"
  tasks:
    - name: Display cluster members
      ansible.builtin.debug:
        msg: "Cluster members: {{ all_etcd_nodes | join(', ') }}"

    - name: Generate etcd configuration
      ansible.builtin.template:
        src: etcd.conf.j2
        dest: /etc/etcd/etcd.conf
        mode: '0644'
      notify: restart etcd
```

The etcd config template:

```yaml
# templates/etcd.conf.j2
name: {{ inventory_hostname }}
initial-cluster: {% for node in all_etcd_nodes %}{{ node }}=https://{{ node }}:2380{% if not loop.last %},{% endif %}{% endfor %}

listen-peer-urls: https://{{ inventory_hostname }}:2380
listen-client-urls: https://{{ inventory_hostname }}:2379,https://127.0.0.1:2379
initial-advertise-peer-urls: https://{{ inventory_hostname }}:2380
advertise-client-urls: https://{{ inventory_hostname }}:2379
```

## Security Group Configuration

Generate firewall rules that allow traffic between specific groups.

```yaml
# playbook.yml - Configure inter-group firewall rules
---
- name: Configure firewall rules between tiers
  hosts: all
  tasks:
    # Allow web servers to reach app servers
    - name: Allow web-to-app traffic
      ansible.builtin.iptables:
        chain: INPUT
        source: "{{ item }}"
        protocol: tcp
        destination_port: "8080"
        jump: ACCEPT
        comment: "Allow from {{ item }}"
      loop: "{{ lookup('inventory_hostnames', 'webservers', wantlist=True) }}"
      when: inventory_hostname in lookup('inventory_hostnames', 'appservers', wantlist=True)

    # Allow app servers to reach database servers
    - name: Allow app-to-db traffic
      ansible.builtin.iptables:
        chain: INPUT
        source: "{{ item }}"
        protocol: tcp
        destination_port: "5432"
        jump: ACCEPT
        comment: "Allow from {{ item }}"
      loop: "{{ lookup('inventory_hostnames', 'appservers', wantlist=True) }}"
      when: inventory_hostname in lookup('inventory_hostnames', 'dbservers', wantlist=True)
```

## Monitoring Discovery

Set up monitoring that automatically discovers all hosts in specific groups.

```yaml
# playbook.yml - Generate monitoring configuration from inventory
---
- name: Configure Prometheus targets from inventory
  hosts: monitoring_servers
  vars:
    monitored_groups:
      - group: webservers
        port: 9100
        labels:
          tier: frontend
      - group: appservers
        port: 9100
        labels:
          tier: backend
      - group: dbservers
        port: 9187
        labels:
          tier: data
  tasks:
    - name: Generate Prometheus scrape targets
      ansible.builtin.copy:
        content: |
          {% for group_config in monitored_groups %}
          - targets:
          {% for host in lookup('inventory_hostnames', group_config.group, wantlist=True) %}
              - {{ host }}:{{ group_config.port }}
          {% endfor %}
            labels:
          {% for key, value in group_config.labels.items() %}
              {{ key }}: {{ value }}
          {% endfor %}
              group: {{ group_config.group }}
          {% endfor %}
        dest: /etc/prometheus/file_sd/inventory_targets.yml
        mode: '0644'
      notify: reload prometheus
```

## SSH Known Hosts

Pre-populate SSH known hosts for all inventory members:

```yaml
# playbook.yml - Pre-populate SSH known hosts
---
- name: Build SSH known hosts from inventory
  hosts: all
  vars:
    all_hosts: "{{ lookup('inventory_hostnames', 'all', wantlist=True) }}"
  tasks:
    - name: Scan SSH keys for all inventory hosts
      ansible.builtin.command:
        cmd: "ssh-keyscan {{ item }}"
      loop: "{{ all_hosts }}"
      register: ssh_keys
      changed_when: false
      delegate_to: localhost
      run_once: true

    - name: Write known_hosts file
      ansible.builtin.copy:
        content: |
          {% for result in ssh_keys.results %}
          {% if result.stdout is defined %}
          {{ result.stdout }}
          {% endif %}
          {% endfor %}
        dest: /etc/ssh/ssh_known_hosts
        mode: '0644'
```

## Counting and Reporting

Use the lookup for inventory analysis and reporting.

```yaml
# playbook.yml - Inventory analysis
---
- name: Inventory report
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Generate inventory summary
      ansible.builtin.debug:
        msg: |
          Inventory Summary:
          Total hosts: {{ lookup('inventory_hostnames', 'all', wantlist=True) | length }}
          Web servers: {{ lookup('inventory_hostnames', 'webservers', wantlist=True) | length }}
          App servers: {{ lookup('inventory_hostnames', 'appservers', wantlist=True) | length }}
          DB servers: {{ lookup('inventory_hostnames', 'dbservers', wantlist=True) | length }}
          Production: {{ lookup('inventory_hostnames', 'production', wantlist=True) | length }}
          Staging: {{ lookup('inventory_hostnames', 'staging', wantlist=True) | length }}
```

## Tips

1. **No connection required**: The lookup resolves patterns from the parsed inventory only. It does not connect to any hosts, making it fast and safe.

2. **Dynamic inventory**: It works with dynamic inventory sources (AWS, GCP, etc.) just as well as static files. The patterns are resolved after all inventory sources are loaded.

3. **Empty groups**: If a group has no members, the lookup returns an empty list. Check for this with `| length > 0` if needed.

4. **groups variable**: Ansible also provides the `groups` magic variable (e.g., `groups['webservers']`), which gives you the same data. The lookup is more useful when you need to evaluate complex patterns (intersections, exclusions, wildcards) that the `groups` variable cannot handle.

5. **Host vars are not loaded**: The lookup gives you hostnames only. If you need host variables, you still need to use `hostvars[hostname]` to access them.

The `inventory_hostnames` lookup is essential for cross-group awareness in your playbooks. It lets any play reference hosts from any group, which is the foundation for building configurations that reflect your full infrastructure topology.
