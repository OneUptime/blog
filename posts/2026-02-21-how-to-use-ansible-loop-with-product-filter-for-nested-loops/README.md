# How to Use Ansible loop with product Filter for Nested Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Loops, Nested Loops, Jinja2 Filters

Description: Learn how to use the product filter in Ansible to create nested loops that generate all combinations of items from multiple lists.

---

Sometimes you need to iterate over every combination of items from two or more lists. Think configuring access rules where every user needs access to every database, or deploying configurations to every combination of environment and region. In traditional programming, you would use nested for loops. In Ansible, you use the `product` filter, which generates the Cartesian product of multiple lists.

## What Is a Cartesian Product?

Given two lists, the Cartesian product is every possible pairing of one item from the first list with one item from the second list.

For example, given `[a, b]` and `[1, 2, 3]`, the product is:

```
(a, 1), (a, 2), (a, 3), (b, 1), (b, 2), (b, 3)
```

That is 2 x 3 = 6 combinations.

## Basic product Usage

```yaml
# Generate all combinations of users and databases
- name: Grant database access for all user-database combinations
  ansible.builtin.debug:
    msg: "Granting {{ item.0 }} access to {{ item.1 }}"
  loop: "{{ users | product(databases) | list }}"
  vars:
    users:
      - alice
      - bob
      - charlie
    databases:
      - production
      - staging
      - analytics
```

This produces 9 iterations (3 users x 3 databases). Each `item` is a list with two elements: `item.0` from the first list and `item.1` from the second list.

## Real-World Example: Database Grants

```yaml
# Create database user grants for every user-database pair
- name: Configure database access
  community.postgresql.postgresql_privs:
    db: "{{ item.1 }}"
    role: "{{ item.0 }}"
    privs: SELECT
    type: database
    state: present
  become_user: postgres
  loop: "{{ readonly_users | product(accessible_databases) | list }}"
  loop_control:
    label: "{{ item.0 }} -> {{ item.1 }}"
  vars:
    readonly_users:
      - analyst
      - reporter
      - dashboard_svc
    accessible_databases:
      - sales
      - marketing
      - support
```

Every user in `readonly_users` gets SELECT access to every database in `accessible_databases`. That is 9 grant operations from two simple lists.

## Multi-Environment, Multi-Region Deployment

A classic use case is deploying configurations across environment and region combinations:

```yaml
# Create configuration files for every environment-region combination
- name: Deploy environment-region configs
  ansible.builtin.template:
    src: app-config.j2
    dest: "/etc/myapp/configs/{{ item.0 }}-{{ item.1 }}.conf"
  loop: "{{ environments | product(regions) | list }}"
  loop_control:
    label: "{{ item.0 }}/{{ item.1 }}"
  vars:
    environments:
      - production
      - staging
      - development
    regions:
      - us-east
      - us-west
      - eu-central
```

This creates 9 configuration files: `production-us-east.conf`, `production-us-west.conf`, etc.

## Three-Way Products

You can chain `product` calls for three or more lists:

```yaml
# Generate all combinations of app, environment, and region
- name: Create monitoring dashboards for all combinations
  ansible.builtin.template:
    src: dashboard.json.j2
    dest: "/opt/dashboards/{{ item.0 }}-{{ item.1 }}-{{ item.2 }}.json"
  loop: "{{ apps | product(envs, regions) | list }}"
  loop_control:
    label: "{{ item.0 }}/{{ item.1 }}/{{ item.2 }}"
  vars:
    apps:
      - api
      - web
    envs:
      - prod
      - staging
    regions:
      - east
      - west
```

This generates 8 combinations (2 x 2 x 2). Note that for three lists, you pass all lists as arguments to a single `product` call: `product(envs, regions)`.

## Firewall Rules with product

Creating firewall rules between source and destination networks:

```yaml
# Allow traffic between all source and destination network pairs
- name: Configure inter-network firewall rules
  ansible.builtin.iptables:
    chain: FORWARD
    source: "{{ item.0 }}"
    destination: "{{ item.1 }}"
    jump: ACCEPT
  loop: "{{ source_networks | product(destination_networks) | list }}"
  loop_control:
    label: "{{ item.0 }} -> {{ item.1 }}"
  vars:
    source_networks:
      - 10.0.1.0/24
      - 10.0.2.0/24
    destination_networks:
      - 10.0.10.0/24
      - 10.0.11.0/24
      - 10.0.12.0/24
```

This creates 6 firewall rules allowing traffic from each source network to each destination network.

## Filtering Product Results

Sometimes you do not want every combination. Use `reject` or `select` to filter:

```yaml
# Create DNS records but skip same-region pairs
- name: Set up cross-region DNS failover
  ansible.builtin.debug:
    msg: "DNS failover: {{ item.0 }} -> {{ item.1 }}"
  loop: >-
    {{
      regions | product(regions) | reject('sameas_pair') | list
    }}
  vars:
    regions:
      - us-east
      - us-west
      - eu-central
```

Since `reject` with a custom test is not straightforward, you can use `when` instead:

```yaml
# Create cross-region connections, skip same-region pairs
- name: Configure cross-region replication
  ansible.builtin.debug:
    msg: "Replicate from {{ item.0 }} to {{ item.1 }}"
  loop: "{{ regions | product(regions) | list }}"
  when: item.0 != item.1
  vars:
    regions:
      - us-east
      - us-west
      - eu-central
```

This produces 6 combinations instead of 9, skipping the pairs where source equals destination.

## Product with Complex Objects

The items in your lists can be dictionaries:

```yaml
# Deploy applications to servers based on role compatibility
- name: Deploy app configs to appropriate servers
  ansible.builtin.template:
    src: "{{ item.0.template }}"
    dest: "/opt/{{ item.0.name }}/config-{{ item.1.hostname }}.yml"
  loop: "{{ applications | product(servers) | list }}"
  loop_control:
    label: "{{ item.0.name }} -> {{ item.1.hostname }}"
  when: item.0.tier in item.1.supported_tiers
  vars:
    applications:
      - { name: "api", tier: "web", template: "api.yml.j2" }
      - { name: "worker", tier: "compute", template: "worker.yml.j2" }
    servers:
      - { hostname: "web01", supported_tiers: ["web"] }
      - { hostname: "web02", supported_tiers: ["web"] }
      - { hostname: "compute01", supported_tiers: ["compute", "web"] }
```

The `when` clause filters combinations to only those where the application's tier matches the server's supported tiers.

## Performance Considerations

The product operation grows multiplicatively. Two lists of 10 items produce 100 combinations. Three lists of 10 produce 1000. Be mindful of this:

```yaml
# BAD: This creates 1000 iterations
# loop: "{{ list_10 | product(list_10, list_10) | list }}"

# BETTER: Filter early to reduce combinations
# loop: "{{ list_10 | select(...) | product(list_10 | select(...)) | list }}"
```

Always filter your input lists before computing the product, not after. This reduces the number of iterations Ansible needs to process.

## product vs. with_nested

The `product` filter replaces the older `with_nested` syntax:

```yaml
# Old syntax
- name: Old way with_nested
  ansible.builtin.debug:
    msg: "{{ item[0] }} - {{ item[1] }}"
  with_nested:
    - [a, b, c]
    - [1, 2, 3]

# Modern syntax using product
- name: New way with product
  ansible.builtin.debug:
    msg: "{{ item.0 }} - {{ item.1 }}"
  loop: "{{ ['a', 'b', 'c'] | product([1, 2, 3]) | list }}"
```

## Practical Example: Multi-Tenant Infrastructure

Here is a complete playbook that sets up infrastructure for multiple tenants across multiple regions:

```yaml
# Set up multi-tenant infrastructure across regions
- name: Multi-tenant provisioning
  hosts: localhost
  vars:
    tenants:
      - { name: "acme", plan: "enterprise", db_size: "large" }
      - { name: "globex", plan: "professional", db_size: "medium" }
      - { name: "initech", plan: "starter", db_size: "small" }
    regions:
      - { name: "us-east-1", vpc_cidr: "10.0.0.0/16" }
      - { name: "eu-west-1", vpc_cidr: "10.1.0.0/16" }

  tasks:
    - name: Create tenant databases in each region
      ansible.builtin.debug:
        msg: >
          Creating {{ item.0.db_size }} database for tenant '{{ item.0.name }}'
          in region {{ item.1.name }}
      loop: "{{ tenants | product(regions) | list }}"
      loop_control:
        label: "{{ item.0.name }}@{{ item.1.name }}"

    - name: Create DNS records for each tenant-region pair
      ansible.builtin.debug:
        msg: >
          Creating DNS: {{ item.0.name }}.{{ item.1.name }}.example.com
      loop: "{{ tenants | product(regions) | list }}"
      loop_control:
        label: "{{ item.0.name }}.{{ item.1.name }}.example.com"

    - name: Generate SSL certificates for each tenant-region pair
      ansible.builtin.debug:
        msg: >
          Generating SSL cert for {{ item.0.name }}.{{ item.1.name }}.example.com
      loop: "{{ tenants | product(regions) | list }}"
      loop_control:
        label: "{{ item.0.name }}@{{ item.1.name }}"
```

This creates 6 databases, 6 DNS records, and 6 SSL certificates from just 3 tenants and 2 regions. Adding a new tenant or region automatically generates all the required combinations.

## Summary

The `product` filter gives you nested loop behavior in Ansible's flat loop model. It computes the Cartesian product of two or more lists, producing every possible combination. Use it for multi-dimensional configurations like tenant-region pairs, user-database grants, environment-region deployments, and cross-network firewall rules. Always be aware of the multiplicative growth and filter your input lists before computing the product to keep iteration counts manageable.
