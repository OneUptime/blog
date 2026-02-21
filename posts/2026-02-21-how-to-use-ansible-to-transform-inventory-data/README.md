# How to Use Ansible to Transform Inventory Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, Data Transformation, Automation

Description: Learn how to transform Ansible inventory data using hostvars, group_vars, and filters to reshape, aggregate, and enrich host information for playbooks.

---

Ansible inventory data is the foundation of every playbook. But raw inventory data often needs to be reshaped, filtered, aggregated, or enriched before it is useful for your automation tasks. This post covers practical patterns for transforming inventory data within your playbooks.

## Accessing Inventory Data

Ansible provides several built-in variables for working with inventory:

```yaml
# playbook-access-inventory.yml
# Shows how to access and display various inventory data structures
- name: Access inventory data
  hosts: all
  gather_facts: false

  tasks:
    - name: Show current host info
      ansible.builtin.debug:
        msg:
          hostname: "{{ inventory_hostname }}"
          short_name: "{{ inventory_hostname_short }}"
          groups: "{{ group_names }}"
      run_once: true

- name: Aggregate inventory from localhost
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Show all groups
      ansible.builtin.debug:
        msg: "{{ groups.keys() | list }}"

    - name: Show hosts in webservers group
      ansible.builtin.debug:
        msg: "{{ groups['webservers'] | default([]) }}"

    - name: Show all hosts
      ansible.builtin.debug:
        msg: "{{ groups['all'] }}"
```

## Building a Host Summary from hostvars

The `hostvars` dictionary contains all variables for every host. You can use it to build cross-host data structures:

```yaml
# playbook-hostvars-transform.yml
# Builds a summary of all hosts from hostvars after gathering facts
- name: Gather facts first
  hosts: all
  gather_facts: true

- name: Transform inventory data
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Build host summary from gathered facts
      ansible.builtin.set_fact:
        host_summary: >-
          {% set result = [] %}
          {% for host in groups['all'] %}
          {% if hostvars[host].ansible_facts is defined %}
          {% set facts = hostvars[host].ansible_facts %}
          {% set _ = result.append({
            'hostname': host,
            'os': facts.get('distribution', 'unknown') ~ ' ' ~ facts.get('distribution_version', ''),
            'kernel': facts.get('kernel', 'unknown'),
            'cpu_count': facts.get('processor_vcpus', 0),
            'memory_mb': facts.get('memtotal_mb', 0),
            'ip': facts.get('default_ipv4', {}).get('address', 'unknown')
          }) %}
          {% endif %}
          {% endfor %}
          {{ result }}

    - name: Display host summary
      ansible.builtin.debug:
        var: host_summary
```

## Grouping Hosts by Attributes

Transform flat inventory into grouped structures:

```yaml
# playbook-group-hosts.yml
# Groups hosts by OS family and by custom variables like environment
- name: Group hosts by attributes
  hosts: all
  gather_facts: true

- name: Process grouped data
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Group hosts by OS family
      ansible.builtin.set_fact:
        by_os: >-
          {% set result = {} %}
          {% for host in groups['all'] %}
          {% if hostvars[host].ansible_facts is defined %}
          {% set os = hostvars[host].ansible_facts.get('os_family', 'unknown') %}
          {% if os not in result %}{% set _ = result.update({os: []}) %}{% endif %}
          {% set _ = result[os].append(host) %}
          {% endif %}
          {% endfor %}
          {{ result }}

    - name: Show hosts grouped by OS
      ansible.builtin.debug:
        var: by_os

    - name: Group hosts by environment variable
      ansible.builtin.set_fact:
        by_environment: >-
          {% set result = {} %}
          {% for host in groups['all'] %}
          {% set env = hostvars[host].get('environment', 'undefined') %}
          {% if env not in result %}{% set _ = result.update({env: []}) %}{% endif %}
          {% set _ = result[env].append(host) %}
          {% endfor %}
          {{ result }}

    - name: Show hosts grouped by environment
      ansible.builtin.debug:
        var: by_environment
```

## Inventory Transformation Pipeline

```mermaid
graph TD
    A[Raw Inventory] -->|gather_facts| B[hostvars with facts]
    B -->|Extract| C[Host attributes]
    C -->|Group by| D[Grouped hosts]
    C -->|Filter| E[Filtered host lists]
    C -->|Aggregate| F[Summary statistics]
    D --> G[Generate configs per group]
    E --> H[Target specific hosts]
    F --> I[Reports and dashboards]
```

## Filtering Inventory by Criteria

```yaml
# playbook-filter-inventory.yml
# Filters inventory hosts by various criteria like OS, memory, and group membership
- name: Filter inventory data
  hosts: all
  gather_facts: true

- name: Apply filters
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Find hosts with less than 4GB RAM
      ansible.builtin.set_fact:
        low_memory_hosts: >-
          {% set result = [] %}
          {% for host in groups['all'] %}
          {% if hostvars[host].ansible_facts is defined %}
          {% if hostvars[host].ansible_facts.get('memtotal_mb', 0) < 4096 %}
          {% set _ = result.append(host) %}
          {% endif %}
          {% endif %}
          {% endfor %}
          {{ result }}

    - name: Find Ubuntu hosts
      ansible.builtin.set_fact:
        ubuntu_hosts: >-
          {% set result = [] %}
          {% for host in groups['all'] %}
          {% if hostvars[host].ansible_facts is defined %}
          {% if hostvars[host].ansible_facts.get('distribution', '') == 'Ubuntu' %}
          {% set _ = result.append(host) %}
          {% endif %}
          {% endif %}
          {% endfor %}
          {{ result }}

    - name: Show filtered results
      ansible.builtin.debug:
        msg:
          low_memory: "{{ low_memory_hosts }}"
          ubuntu: "{{ ubuntu_hosts }}"
```

## Enriching Inventory with External Data

Combine inventory data with external sources:

```yaml
# playbook-enrich-inventory.yml
# Enriches Ansible inventory with data from an external CMDB API
- name: Enrich inventory with CMDB data
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Fetch CMDB data
      ansible.builtin.uri:
        url: "https://cmdb.internal/api/servers"
        headers:
          Authorization: "Bearer {{ lookup('env', 'CMDB_TOKEN') }}"
      register: cmdb_response

    - name: Build enriched inventory
      ansible.builtin.set_fact:
        enriched_inventory: >-
          {% set cmdb = {} %}
          {% for server in cmdb_response.json.servers %}
          {% set _ = cmdb.update({server.hostname: server}) %}
          {% endfor %}
          {% set result = [] %}
          {% for host in groups['all'] %}
          {% set cmdb_data = cmdb.get(host, {}) %}
          {% set _ = result.append({
            'hostname': host,
            'ansible_groups': hostvars[host].group_names | default([]),
            'owner': cmdb_data.get('owner', 'unknown'),
            'cost_center': cmdb_data.get('cost_center', 'N/A'),
            'maintenance_window': cmdb_data.get('maintenance_window', 'undefined')
          }) %}
          {% endfor %}
          {{ result }}

    - name: Show enriched inventory
      ansible.builtin.debug:
        var: enriched_inventory
```

## Generating Dynamic Group Lists

```yaml
# playbook-dynamic-groups.yml
# Creates dynamic groups based on host variables and gathered facts
- name: Create dynamic groups from inventory data
  hosts: all
  gather_facts: true

  tasks:
    - name: Group by disk space availability
      ansible.builtin.group_by:
        key: "disk_{{ 'low' if (ansible_facts.mounts | selectattr('mount', 'equalto', '/') | map(attribute='size_available') | first | default(0)) < 5368709120 else 'ok' }}"

    - name: Group by memory size
      ansible.builtin.group_by:
        key: "memory_{{ 'small' if ansible_facts.memtotal_mb < 4096 else 'medium' if ansible_facts.memtotal_mb < 16384 else 'large' }}"

- name: Use dynamic groups
  hosts: disk_low
  gather_facts: false

  tasks:
    - name: Alert on low disk space hosts
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} has low disk space"
```

## Cross-Host Data Collection

```yaml
# playbook-cross-host.yml
# Collects service information from all hosts and aggregates it
- name: Collect data from all hosts
  hosts: webservers
  gather_facts: false

  tasks:
    - name: Get running services
      ansible.builtin.shell: systemctl list-units --type=service --state=running --no-legend | awk '{print $1}'
      register: running_services
      changed_when: false

- name: Aggregate cross-host data
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Build service matrix
      ansible.builtin.set_fact:
        service_matrix: >-
          {% set result = {} %}
          {% for host in groups['webservers'] %}
          {% if hostvars[host].running_services is defined %}
          {% set _ = result.update({host: hostvars[host].running_services.stdout_lines}) %}
          {% endif %}
          {% endfor %}
          {{ result }}

    - name: Find services common to all hosts
      ansible.builtin.set_fact:
        common_services: >-
          {% set lists = service_matrix.values() | list %}
          {% if lists | length > 0 %}
          {% set result = lists[0] %}
          {% for svc_list in lists[1:] %}
          {% set result = result | intersect(svc_list) %}
          {% endfor %}
          {{ result }}
          {% else %}
          {{ [] }}
          {% endif %}

    - name: Show common services
      ansible.builtin.debug:
        var: common_services
```

## Practical Example: Generating Load Balancer Config

```yaml
# playbook-lb-config.yml
# Transforms inventory data into load balancer backend configuration
- name: Generate LB config from inventory
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Build backend pool from webserver group
      ansible.builtin.set_fact:
        backends: >-
          {% set result = [] %}
          {% for host in groups.get('webservers', []) %}
          {% set _ = result.append({
            'name': host,
            'address': hostvars[host].get('ansible_host', host),
            'port': hostvars[host].get('app_port', 8080),
            'weight': hostvars[host].get('lb_weight', 1)
          }) %}
          {% endfor %}
          {{ result }}

    - name: Generate HAProxy backend config
      ansible.builtin.copy:
        content: |
          backend webservers
              balance roundrobin
              option httpchk GET /health
          {% for backend in backends %}
              server {{ backend.name }} {{ backend.address }}:{{ backend.port }} weight {{ backend.weight }} check
          {% endfor %}
        dest: /tmp/haproxy_backends.cfg
```

## Summary

Ansible inventory transformation is all about reshaping the data that Ansible already knows about your infrastructure. Use `hostvars` and `groups` to access inventory data, `ansible_facts` for gathered system information, and Jinja2 expressions to filter, group, and aggregate. Enrich inventory data by combining it with external sources via API calls. Use `group_by` to create dynamic groups based on runtime criteria. These patterns let you build configuration files, reports, and deployment plans that adapt automatically as your inventory changes.
