# How to Use Ansible Magic Variables (hostvars, groups, inventory_hostname)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Inventory, DevOps, Automation

Description: Learn how to use Ansible magic variables like hostvars, groups, inventory_hostname, and others to access inventory data and host information dynamically.

---

Ansible automatically provides a set of special variables, often called magic variables, that give you access to inventory structure, host information, and playbook metadata. These variables are not defined by you. They exist automatically and contain information about the current play, the current host, the entire inventory, and the runtime environment. Understanding these magic variables unlocks powerful patterns for building dynamic, inventory-aware playbooks.

## The Most Important Magic Variables

Here is a quick reference of the magic variables you will use most often:

| Variable | Description |
|---|---|
| `inventory_hostname` | The name of the current host as defined in inventory |
| `ansible_hostname` | The actual hostname from the remote system (a gathered fact) |
| `hostvars` | Dictionary of all variables for all hosts |
| `groups` | Dictionary of all groups and their host lists |
| `group_names` | List of groups the current host belongs to |
| `ansible_play_hosts` | List of hosts in the current play |
| `play_hosts` | Same as ansible_play_hosts |
| `ansible_play_batch` | List of hosts in the current batch (when using serial) |
| `inventory_dir` | Directory path of the inventory source |
| `playbook_dir` | Directory path of the playbook |
| `role_path` | Path of the currently executing role |
| `ansible_check_mode` | Boolean, true when running in check mode |

## inventory_hostname

This is the name of the current host as it appears in your inventory, not the actual system hostname:

```yaml
---
# inventory-hostname.yml
# inventory_hostname is the inventory name, not the system hostname

- hosts: webservers
  tasks:
    # inventory_hostname comes from the inventory file
    - name: Show inventory hostname
      debug:
        msg: "Inventory name: {{ inventory_hostname }}"

    # ansible_hostname comes from the actual system
    - name: Show actual hostname
      debug:
        msg: "System hostname: {{ ansible_hostname }}"

    # They are often different
    # Inventory might have: web-prod-01
    # System might report: ip-10-0-1-42

    # inventory_hostname_short is the part before the first dot
    - name: Show short hostname
      debug:
        msg: "Short name: {{ inventory_hostname_short }}"
    # If inventory_hostname is "web01.example.com", this gives "web01"
```

## groups

The `groups` variable is a dictionary where each key is a group name and the value is a list of hosts in that group:

```yaml
---
# groups-variable.yml
# Access the full inventory group structure

- hosts: webservers
  tasks:
    # List all groups in the inventory
    - name: Show all group names
      debug:
        msg: "Groups: {{ groups.keys() | list }}"

    # List hosts in a specific group
    - name: Show all web servers
      debug:
        msg: "Web servers: {{ groups['webservers'] }}"

    # List hosts in the 'all' group (every host in inventory)
    - name: Show all hosts
      debug:
        msg: "All hosts: {{ groups['all'] }}"

    # Count hosts in a group
    - name: Count database servers
      debug:
        msg: "Database server count: {{ groups['databases'] | length }}"

    # Check if a group exists
    - name: Check for monitoring group
      debug:
        msg: "Monitoring group exists: {{ 'monitoring' in groups }}"
```

## group_names

This variable contains the list of groups that the current host belongs to:

```yaml
---
# group-names.yml
# Use group_names to make decisions based on group membership

- hosts: all
  tasks:
    # Show which groups this host belongs to
    - name: Show group membership
      debug:
        msg: "{{ inventory_hostname }} is in groups: {{ group_names }}"

    # Conditional tasks based on group membership
    - name: Install monitoring agent for production hosts
      apt:
        name: prometheus-node-exporter
        state: present
      when: "'production' in group_names"
      become: yes

    - name: Enable debug logging for development hosts
      lineinfile:
        path: /etc/myapp/app.conf
        regexp: '^log_level'
        line: 'log_level = debug'
      when: "'development' in group_names"
      become: yes

    # Apply different configurations based on role groups
    - name: Configure as web server
      include_tasks: tasks/configure-webserver.yml
      when: "'webservers' in group_names"

    - name: Configure as database server
      include_tasks: tasks/configure-database.yml
      when: "'databases' in group_names"
```

## hostvars

The `hostvars` dictionary contains all variables for every host in the inventory. This is how you access variables from other hosts:

```yaml
---
# hostvars-example.yml
# Access variables from any host in the inventory

- hosts: webservers
  tasks:
    # Access the current host's variables (same as using the variable directly)
    - name: Access own variables via hostvars
      debug:
        msg: "My IP: {{ hostvars[inventory_hostname]['ansible_default_ipv4']['address'] }}"

    # Access another host's variables
    - name: Get the primary database server's IP
      debug:
        msg: "DB Primary IP: {{ hostvars[groups['databases'][0]]['ansible_host'] }}"

    # Build a configuration that references multiple hosts
    - name: Generate upstream server list
      set_fact:
        upstream_servers: >-
          {{
            groups['webservers']
            | map('extract', hostvars, ['ansible_host'])
            | list
          }}

    - name: Show upstream servers
      debug:
        var: upstream_servers
```

## ansible_play_hosts and ansible_play_batch

These variables tell you which hosts are in the current play:

```yaml
---
# play-hosts.yml
# Know which hosts are being targeted

- hosts: webservers
  serial: 2
  tasks:
    # All hosts targeted by this play (regardless of serial batching)
    - name: Show all hosts in this play
      debug:
        msg: "All play hosts: {{ ansible_play_hosts }}"

    # Only the hosts in the current serial batch
    - name: Show current batch
      debug:
        msg: "Current batch: {{ ansible_play_batch }}"

    # Total host count
    - name: Show host count
      debug:
        msg: "Total hosts: {{ ansible_play_hosts | length }}, Current batch: {{ ansible_play_batch | length }}"

    # Am I the first host in the play?
    - name: Run once on the first host
      debug:
        msg: "I am the first host in this play"
      when: inventory_hostname == ansible_play_hosts[0]
```

## Practical Example: Dynamic Configuration Generation

One of the most powerful uses of magic variables is generating configuration files that reference multiple hosts:

```yaml
---
# dynamic-config.yml
# Generate HAProxy config that includes all web server backends

- hosts: loadbalancers
  become: yes
  tasks:
    - name: Generate HAProxy configuration
      template:
        src: haproxy.cfg.j2
        dest: /etc/haproxy/haproxy.cfg
      notify: reload haproxy

  handlers:
    - name: reload haproxy
      service:
        name: haproxy
        state: reloaded
```

The template uses magic variables to dynamically list all backend servers:

```
# templates/haproxy.cfg.j2
# HAProxy configuration generated by Ansible
# Uses magic variables to discover backend servers

global
    maxconn 4096
    log /dev/log local0

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend http_front
    bind *:80
    default_backend webservers

backend webservers
    balance roundrobin
    option httpchk GET /health
{% for host in groups['webservers'] %}
    server {{ host }} {{ hostvars[host]['ansible_host'] }}:{{ hostvars[host].get('app_port', 8080) }} check inter 5s rise 2 fall 3
{% endfor %}

frontend db_front
    bind *:5432
    mode tcp
    default_backend databases

backend databases
    mode tcp
    balance leastconn
{% for host in groups['databases'] %}
    server {{ host }} {{ hostvars[host]['ansible_host'] }}:5432 check
{% endfor %}
```

## Practical Example: Cluster-Aware Configuration

```yaml
---
# cluster-config.yml
# Configure an application cluster where each node knows about all other nodes

- hosts: app_cluster
  become: yes
  vars:
    cluster_port: 7000

  tasks:
    # Build list of all cluster members
    - name: Set cluster peers
      set_fact:
        cluster_peers: >-
          {{
            groups['app_cluster']
            | difference([inventory_hostname])
            | map('extract', hostvars, ['ansible_host'])
            | map('regex_replace', '(.*)', '\1:' ~ cluster_port)
            | list
          }}

    - name: Show cluster configuration
      debug:
        msg: |
          I am: {{ ansible_host }}:{{ cluster_port }}
          My peers: {{ cluster_peers | join(', ') }}

    - name: Deploy cluster configuration
      template:
        src: cluster.conf.j2
        dest: /etc/myapp/cluster.conf
      notify: restart myapp
```

## Playbook and Role Path Variables

```yaml
---
# path-variables.yml
# Access file paths relative to playbook and role locations

- hosts: webservers
  tasks:
    - name: Show path variables
      debug:
        msg: |
          Playbook directory: {{ playbook_dir }}
          Inventory directory: {{ inventory_dir | default('N/A') }}
          Role path: {{ role_path | default('N/A') }}

    # Useful for referencing files relative to the playbook
    - name: Copy a file from the playbook directory
      copy:
        src: "{{ playbook_dir }}/files/custom-script.sh"
        dest: /usr/local/bin/custom-script.sh
        mode: '0755'
```

## Runtime State Variables

```yaml
---
# runtime-vars.yml
# Access runtime state information

- hosts: webservers
  tasks:
    # Check if running in check mode
    - name: Skip destructive task in check mode
      debug:
        msg: "Running in check mode: {{ ansible_check_mode }}"

    # Access the current play name
    - name: Show current play info
      debug:
        msg: |
          Play name: {{ ansible_play_name | default('unnamed') }}
          Run tags: {{ ansible_run_tags | default([]) }}
          Skip tags: {{ ansible_skip_tags | default([]) }}

    # Use ansible_version for compatibility checks
    - name: Check Ansible version
      assert:
        that:
          - ansible_version.full is version('2.14', '>=')
        fail_msg: "This playbook requires Ansible 2.14 or newer"
```

## Wrapping Up

Magic variables are the glue that connects your playbooks to the live inventory and runtime state. The three most important ones to internalize are `hostvars` for cross-host data access, `groups` for inventory structure, and `inventory_hostname` for identifying the current host. Once you are comfortable with these, you can write truly dynamic playbooks that generate configurations based on the actual inventory, build cluster topologies automatically, and make intelligent decisions based on group membership and host properties. They turn static playbooks into adaptive automation that scales with your infrastructure.
