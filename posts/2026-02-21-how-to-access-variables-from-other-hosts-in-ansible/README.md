# How to Access Variables from Other Hosts in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, hostvars, Cross-Host, DevOps

Description: Learn how to access variables and facts from other hosts in Ansible using hostvars, delegation, and fact caching for cross-host configuration.

---

In most Ansible playbooks, each host works in isolation. Tasks on web01 see web01's variables, tasks on db01 see db01's variables. But many real-world configurations require information from other hosts. A web server needs to know the database server's IP address. A load balancer needs the list of all backend server ports. A monitoring server needs every host's metrics endpoint. Ansible provides several mechanisms for accessing variables across hosts, and in this post I will walk through each one with working examples.

## The hostvars Dictionary

The `hostvars` magic variable is a dictionary containing all variables for every host in the inventory. It is the primary way to access another host's data:

```yaml
---
# cross-host-basic.yml
# Access variables from another host

- hosts: webservers
  tasks:
    # Access a specific host's variable
    - name: Get database server IP
      debug:
        msg: "DB server IP: {{ hostvars['db01']['ansible_host'] }}"

    # Access the first host in a group
    - name: Get primary database IP
      debug:
        msg: "Primary DB: {{ hostvars[groups['databases'][0]]['ansible_host'] }}"

    # Access another host's gathered facts
    - name: Get database server's total memory
      debug:
        msg: "DB memory: {{ hostvars['db01']['ansible_memtotal_mb'] }}MB"
```

## The Fact Gathering Requirement

There is an important catch: you can only access gathered facts from hosts that have been part of a play with fact gathering enabled. If Ansible has not connected to a host yet, its facts will not be in `hostvars`.

This fails:

```yaml
---
# This will fail because facts for databases group have not been gathered

- hosts: webservers    # Only connects to webservers
  tasks:
    - name: Try to get DB server memory
      debug:
        msg: "{{ hostvars['db01']['ansible_memtotal_mb'] }}"
    # ERROR: 'ansible_memtotal_mb' is undefined
```

The fix is to gather facts on the other hosts first:

```yaml
---
# gather-facts-first.yml
# Gather facts on all hosts before using cross-host data

# Play 1: Gather facts on all hosts
- hosts: all
  gather_facts: yes
  tasks: []    # No tasks needed, just fact gathering

# Play 2: Now use cross-host facts
- hosts: webservers
  tasks:
    - name: Get DB server memory (works now)
      debug:
        msg: "DB memory: {{ hostvars['db01']['ansible_memtotal_mb'] }}MB"
```

Alternatively, use inventory variables (like `ansible_host`) which are available without fact gathering:

```yaml
# Inventory variables are always available, no fact gathering needed
- hosts: webservers
  tasks:
    - name: Get DB host from inventory
      debug:
        msg: "DB host: {{ hostvars['db01']['ansible_host'] }}"
    # This works because ansible_host is an inventory variable, not a gathered fact
```

## Building Configuration from Multiple Hosts

The most common use case is generating config files that reference other hosts:

```yaml
---
# web-server-config.yml
# Configure web servers with references to database and cache servers

# Gather facts on all hosts first
- hosts: all
  gather_facts: yes
  tasks: []

# Now configure web servers with full cross-host information
- hosts: webservers
  become: yes
  tasks:
    - name: Build database connection string
      set_fact:
        db_primary_host: "{{ hostvars[groups['databases'][0]]['ansible_default_ipv4']['address'] }}"
        db_replica_host: "{{ hostvars[groups['databases'][1]]['ansible_default_ipv4']['address'] | default('') }}"
        redis_host: "{{ hostvars[groups['cache'][0]]['ansible_default_ipv4']['address'] }}"

    - name: Deploy application configuration
      template:
        src: app-config.yml.j2
        dest: /opt/myapp/config.yml
        owner: myapp
        mode: '0640'
      notify: restart myapp
```

The template:

```yaml
# templates/app-config.yml.j2
# Application configuration with cross-host references

database:
  primary:
    host: {{ db_primary_host }}
    port: 5432
{% if db_replica_host %}
  replica:
    host: {{ db_replica_host }}
    port: 5432
{% endif %}

cache:
  host: {{ redis_host }}
  port: 6379

# Reference all web servers for session sharing
cluster_nodes:
{% for host in groups['webservers'] %}
  - host: {{ hostvars[host]['ansible_default_ipv4']['address'] }}
    port: 8080
{% endfor %}
```

## Using extract Filter for Cleaner Access

The `extract` filter is a cleaner way to pull specific values from `hostvars`:

```yaml
---
# extract-pattern.yml
# Use the extract filter for cleaner cross-host data access

- hosts: all
  gather_facts: yes
  tasks: []

- hosts: loadbalancers
  become: yes
  tasks:
    # Get all web server IPs using extract
    - name: Get web server IPs
      set_fact:
        web_ips: "{{ groups['webservers'] | map('extract', hostvars, ['ansible_default_ipv4', 'address']) | list }}"

    - name: Show web server IPs
      debug:
        var: web_ips
    # Output: [10.0.1.10, 10.0.1.11, 10.0.1.12]

    # Get inventory-defined hosts using extract
    - name: Get web server inventory hosts
      set_fact:
        web_hosts: "{{ groups['webservers'] | map('extract', hostvars, 'ansible_host') | list }}"

    # Build upstream entries combining hostname and port
    - name: Build upstream server list
      set_fact:
        upstream_entries: >-
          {{
            groups['webservers'] | map('extract', hostvars, 'ansible_host')
            | zip(groups['webservers'] | map('extract', hostvars, 'app_port') | map('default', 8080))
            | map('join', ':')
            | list
          }}

    - name: Show upstream entries
      debug:
        var: upstream_entries
    # Output: ["10.0.1.10:8080", "10.0.1.11:8080", "10.0.1.12:8080"]
```

## Delegation: Running Tasks on One Host Using Another's Data

The `delegate_to` keyword runs a task on a different host while keeping the original host's variables available:

```yaml
---
# delegation-example.yml
# Delegate tasks to run on different hosts

- hosts: webservers
  tasks:
    # Run this task on the monitoring server, but with each web server's data
    - name: Register web server in monitoring
      uri:
        url: "http://monitoring.example.com:9090/api/targets"
        method: POST
        body_format: json
        body:
          name: "{{ inventory_hostname }}"
          address: "{{ ansible_host }}"
          port: "{{ app_port | default(8080) }}"
          type: webserver
      delegate_to: monitoring01

    # Add each web server to the load balancer
    - name: Add to HAProxy backend
      haproxy:
        state: enabled
        host: "{{ inventory_hostname }}"
        socket: /var/run/haproxy/admin.sock
        backend: webservers
      delegate_to: "{{ item }}"
      loop: "{{ groups['loadbalancers'] }}"
```

## Using run_once with Cross-Host Data

Sometimes you need to process data from all hosts but only run the task once:

```yaml
---
# run-once-aggregate.yml
# Aggregate data from all hosts and process it once

- hosts: all
  gather_facts: yes
  tasks: []

- hosts: webservers
  tasks:
    # Generate a report aggregating data from all web servers (run once)
    - name: Generate cluster status report
      copy:
        content: |
          Cluster Status Report
          Generated: {{ ansible_date_time.iso8601 }}
          Total Servers: {{ groups['webservers'] | length }}

          Server Details:
          {% for host in groups['webservers'] %}
          - {{ host }}:
              IP: {{ hostvars[host]['ansible_default_ipv4']['address'] }}
              CPUs: {{ hostvars[host]['ansible_processor_vcpus'] }}
              Memory: {{ hostvars[host]['ansible_memtotal_mb'] }}MB
              OS: {{ hostvars[host]['ansible_distribution'] }} {{ hostvars[host]['ansible_distribution_version'] }}
          {% endfor %}
        dest: /tmp/cluster-report.txt
      delegate_to: localhost
      run_once: true
```

## Fact Caching for Cross-Play Access

Enable fact caching so that gathered facts persist between playbook runs:

```ini
# ansible.cfg
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_fact_cache
fact_caching_timeout = 86400    # Cache for 24 hours
```

With caching enabled, you do not need the initial fact-gathering play on every run. Facts from previous runs are available in `hostvars`:

```yaml
---
# cached-facts.yml
# With fact caching, you can access other hosts' facts without gathering first

- hosts: webservers
  tasks:
    # This works if db01's facts were gathered in a previous playbook run
    - name: Access cached DB facts
      debug:
        msg: "DB IP: {{ hostvars['db01']['ansible_default_ipv4']['address'] }}"
```

## Passing Data Between Plays Using set_fact

Variables set with `set_fact` in one play are accessible via `hostvars` in subsequent plays:

```yaml
---
# cross-play-facts.yml
# Pass computed data between plays

# Play 1: Compute something on database servers
- hosts: databases
  tasks:
    - name: Get current database version
      command: psql --version
      register: psql_output
      changed_when: false

    - name: Store the version as a fact
      set_fact:
        db_version: "{{ psql_output.stdout | regex_search('[0-9]+\\.[0-9]+') }}"

# Play 2: Use the database version on web servers
- hosts: webservers
  tasks:
    - name: Show database version from DB server
      debug:
        msg: "Database is running PostgreSQL {{ hostvars[groups['databases'][0]]['db_version'] }}"

    - name: Configure app with DB version awareness
      template:
        src: db-config.j2
        dest: /opt/myapp/db-config.yml
      vars:
        postgres_version: "{{ hostvars[groups['databases'][0]]['db_version'] }}"
```

## Safely Accessing Cross-Host Variables

Always handle the possibility that a host or variable might not exist:

```yaml
---
# safe-cross-host.yml
# Safe patterns for cross-host variable access

- hosts: webservers
  tasks:
    # Check if the group exists and has hosts
    - name: Get DB host safely
      set_fact:
        db_host: >-
          {{
            hostvars[groups['databases'][0]]['ansible_host']
            if (groups['databases'] is defined and groups['databases'] | length > 0)
            else 'localhost'
          }}

    # Safe access with default values
    - name: Get cache configuration safely
      set_fact:
        cache_host: "{{ hostvars[groups.get('cache', ['localhost'])[0]].get('ansible_host', 'localhost') }}"
        cache_port: "{{ hostvars[groups.get('cache', ['localhost'])[0]].get('cache_port', 6379) }}"

    # Using the default filter chain
    - name: Get monitoring endpoint
      set_fact:
        monitoring_url: >-
          {{
            'http://' ~
            (hostvars[(groups['monitoring'] | default(['localhost']))[0]] | default({})).get('ansible_host', 'localhost') ~
            ':9090'
          }}

    - name: Show resolved endpoints
      debug:
        msg: |
          Database: {{ db_host }}
          Cache: {{ cache_host }}:{{ cache_port }}
          Monitoring: {{ monitoring_url }}
```

## Wrapping Up

Accessing variables from other hosts is essential for building infrastructure-aware configurations. The `hostvars` dictionary is the main entry point, but remember that gathered facts are only available for hosts that have been contacted in the current (or cached) playbook run. Use a preliminary fact-gathering play or enable fact caching to ensure cross-host data is available when you need it. Combine `hostvars` with `groups` to build dynamic configurations like load balancer backends, cluster membership lists, and monitoring registrations. And always use safe access patterns with defaults to handle cases where hosts or variables might not exist.
