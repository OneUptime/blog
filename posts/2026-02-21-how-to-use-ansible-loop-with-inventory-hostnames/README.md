# How to Use Ansible loop with Inventory Hostnames

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Inventory, Host Management

Description: Learn how to iterate over inventory hostnames in Ansible loops to dynamically configure resources based on your infrastructure topology.

---

Ansible's inventory is a list of all the hosts you manage. Sometimes a task running on one host needs to reference or configure something for other hosts in the inventory. For example, a load balancer needs to know about all web servers, a monitoring server needs to register all hosts, or a database needs to configure replication peers. Looping over inventory hostnames lets you build these cross-host configurations dynamically.

## Accessing Inventory Groups

Ansible makes inventory group membership available through the `groups` variable, which is a dictionary mapping group names to lists of hostnames:

```yaml
# Display all hosts in each inventory group
- name: Show inventory groups
  ansible.builtin.debug:
    msg:
      all_hosts: "{{ groups['all'] }}"
      web_servers: "{{ groups['webservers'] | default([]) }}"
      db_servers: "{{ groups['dbservers'] | default([]) }}"
```

To iterate over a group's hosts:

```yaml
# Loop over all hosts in the webservers group
- name: List web server hostnames
  ansible.builtin.debug:
    msg: "Web server: {{ item }}"
  loop: "{{ groups['webservers'] }}"
```

## Configuring a Load Balancer

The most classic use case is building a load balancer backend configuration:

```yaml
# Generate HAProxy backend configuration from inventory
- name: Configure HAProxy backends
  hosts: loadbalancers
  vars:
    backend_port: 8080
  tasks:
    - name: Deploy HAProxy configuration
      ansible.builtin.template:
        src: haproxy.cfg.j2
        dest: /etc/haproxy/haproxy.cfg
      notify: reload haproxy

    - name: Verify all backends are reachable
      ansible.builtin.wait_for:
        host: "{{ item }}"
        port: "{{ backend_port }}"
        timeout: 5
      loop: "{{ groups['webservers'] }}"
      loop_control:
        label: "{{ item }}:{{ backend_port }}"

  handlers:
    - name: reload haproxy
      ansible.builtin.service:
        name: haproxy
        state: reloaded
```

The HAProxy template would use the same group:

```jinja2
# haproxy.cfg.j2
backend web_servers
    balance roundrobin
{% for host in groups['webservers'] %}
    server {{ host }} {{ hostvars[host]['ansible_host'] | default(host) }}:{{ backend_port }} check
{% endfor %}
```

## Using hostvars with Inventory Loops

When looping over inventory hostnames, you can access each host's variables through `hostvars`:

```yaml
# Build /etc/hosts entries for all hosts in the inventory
- name: Configure /etc/hosts for all known hosts
  ansible.builtin.lineinfile:
    path: /etc/hosts
    regexp: ".*{{ item }}$"
    line: "{{ hostvars[item]['ansible_host'] | default(item) }}  {{ item }}"
    state: present
  loop: "{{ groups['all'] }}"
  loop_control:
    label: "{{ item }}"
```

The `hostvars[item]` dictionary contains all variables for the host named `item`. This includes gathered facts (if previously gathered), group_vars, host_vars, and inventory variables.

## Generating SSH Known Hosts

```yaml
# Add all inventory hosts to the known_hosts file
- name: Gather SSH host keys from all servers
  ansible.builtin.command: ssh-keyscan -H {{ hostvars[item]['ansible_host'] | default(item) }}
  loop: "{{ groups['all'] }}"
  register: ssh_keys
  changed_when: false
  failed_when: false
  loop_control:
    label: "{{ item }}"

- name: Add keys to known_hosts
  ansible.builtin.known_hosts:
    name: "{{ item.item }}"
    key: "{{ item.stdout }}"
    state: present
  loop: "{{ ssh_keys.results }}"
  when: item.stdout | length > 0
  loop_control:
    label: "{{ item.item }}"
```

## The inventory_hostnames Lookup

For more complex host patterns, use the `inventory_hostnames` lookup:

```yaml
# Get hosts matching a pattern
- name: Process hosts matching a pattern
  ansible.builtin.debug:
    msg: "Host: {{ item }}"
  loop: "{{ query('inventory_hostnames', 'webservers:&production') }}"
```

This returns hosts that are in BOTH the `webservers` AND `production` groups. The lookup supports all Ansible host patterns:

```yaml
# Various host pattern examples
# All hosts in webservers group
- loop: "{{ query('inventory_hostnames', 'webservers') }}"

# Hosts in webservers AND production
- loop: "{{ query('inventory_hostnames', 'webservers:&production') }}"

# Hosts in webservers OR dbservers
- loop: "{{ query('inventory_hostnames', 'webservers:dbservers') }}"

# Hosts in webservers but NOT in staging
- loop: "{{ query('inventory_hostnames', 'webservers:!staging') }}"

# All hosts
- loop: "{{ query('inventory_hostnames', 'all') }}"
```

## Configuring Database Replication

```yaml
# Set up PostgreSQL streaming replication by adding all replica hosts
- name: Configure PostgreSQL replication
  hosts: db_primary
  vars:
    replication_user: replicator
    replication_password: "{{ vault_replication_password }}"
  tasks:
    - name: Add replication entries to pg_hba.conf
      ansible.builtin.lineinfile:
        path: /etc/postgresql/14/main/pg_hba.conf
        line: "host replication {{ replication_user }} {{ hostvars[item]['ansible_host'] }}/32 md5"
        state: present
      loop: "{{ groups['db_replicas'] }}"
      loop_control:
        label: "{{ item }}"
      notify: reload postgresql

    - name: Create replication slots
      community.postgresql.postgresql_query:
        db: postgres
        query: "SELECT pg_create_physical_replication_slot('{{ item | regex_replace('[^a-z0-9]', '_') }}') WHERE NOT EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = '{{ item | regex_replace('[^a-z0-9]', '_') }}')"
      loop: "{{ groups['db_replicas'] }}"
      loop_control:
        label: "{{ item }}"
      become_user: postgres

  handlers:
    - name: reload postgresql
      ansible.builtin.service:
        name: postgresql
        state: reloaded
```

## Building Monitoring Configuration

```yaml
# Configure Prometheus to scrape all application servers
- name: Setup Prometheus monitoring
  hosts: monitoring
  tasks:
    - name: Generate Prometheus scrape targets
      ansible.builtin.template:
        src: prometheus.yml.j2
        dest: /etc/prometheus/prometheus.yml
      notify: reload prometheus

    - name: Verify all targets are reachable
      ansible.builtin.uri:
        url: "http://{{ hostvars[item]['ansible_host'] | default(item) }}:9100/metrics"
        status_code: 200
        timeout: 5
      loop: "{{ groups['all'] }}"
      loop_control:
        label: "{{ item }}"
      ignore_errors: yes
      register: scrape_checks

    - name: Report unreachable targets
      ansible.builtin.debug:
        msg: "WARNING: {{ item.item }} is not responding to scrape requests"
      loop: "{{ scrape_checks.results }}"
      when: item is failed
      loop_control:
        label: "{{ item.item }}"

  handlers:
    - name: reload prometheus
      ansible.builtin.service:
        name: prometheus
        state: reloaded
```

## Excluding the Current Host

When generating peer configurations, you often want to exclude the current host from the loop:

```yaml
# Configure cluster peers (exclude self)
- name: Configure etcd cluster peers
  ansible.builtin.template:
    src: etcd.conf.j2
    dest: /etc/etcd/etcd.conf
  vars:
    peers: "{{ groups['etcd_cluster'] | difference([inventory_hostname]) }}"

- name: Show cluster peers
  ansible.builtin.debug:
    msg: "My peers: {{ groups['etcd_cluster'] | difference([inventory_hostname]) | join(', ') }}"
```

The `difference` filter removes the current host from the list.

## Iterating with Host Index

Sometimes you need sequential numbering for cluster nodes:

```yaml
# Assign cluster node IDs based on position in the group
- name: Configure cluster node IDs
  ansible.builtin.debug:
    msg: "Node {{ item }} has ID {{ idx + 1 }}"
  loop: "{{ groups['cluster'] }}"
  loop_control:
    index_var: idx
    label: "{{ item }} (id={{ idx + 1 }})"
```

## Practical Example: Complete Cluster Setup

```yaml
# Set up a distributed application cluster
- name: Configure distributed cluster
  hosts: app_cluster
  become: yes
  vars:
    cluster_port: 7946
    app_port: 8080

  tasks:
    - name: Install cluster software
      ansible.builtin.apt:
        name: myapp-cluster
        state: present

    - name: Generate cluster member list
      ansible.builtin.set_fact:
        cluster_members: >-
          {{
            groups['app_cluster']
            | map('extract', hostvars, 'ansible_host')
            | list
          }}

    - name: Deploy cluster configuration
      ansible.builtin.template:
        src: cluster.conf.j2
        dest: /etc/myapp/cluster.conf
      notify: restart myapp

    - name: Open cluster communication port for all members
      ansible.posix.firewalld:
        rich_rule: "rule family=ipv4 source address={{ hostvars[item]['ansible_host'] }}/32 port port={{ cluster_port }} protocol=tcp accept"
        permanent: yes
        state: enabled
        immediate: yes
      loop: "{{ groups['app_cluster'] | difference([inventory_hostname]) }}"
      loop_control:
        label: "Allow {{ item }} -> port {{ cluster_port }}"

    - name: Wait for all cluster members to be reachable
      ansible.builtin.wait_for:
        host: "{{ hostvars[item]['ansible_host'] | default(item) }}"
        port: "{{ cluster_port }}"
        timeout: 30
      loop: "{{ groups['app_cluster'] | difference([inventory_hostname]) }}"
      loop_control:
        label: "{{ item }}:{{ cluster_port }}"

  handlers:
    - name: restart myapp
      ansible.builtin.service:
        name: myapp
        state: restarted
```

## Summary

Looping over inventory hostnames lets you build configurations that are aware of your entire infrastructure topology. Use `groups['group_name']` for direct group access, `query('inventory_hostnames', 'pattern')` for complex host patterns, and `hostvars[hostname]` to access each host's variables during iteration. Filter with `difference` to exclude the current host, and combine with `map('extract', hostvars, 'key')` to efficiently pull specific variables from multiple hosts. This pattern is essential for configuring load balancers, monitoring systems, database clusters, and any distributed system where nodes need to know about each other.
