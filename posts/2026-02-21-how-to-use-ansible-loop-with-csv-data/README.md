# How to Use Ansible loop with CSV Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, CSV, Data Processing, Automation

Description: Learn how to read, parse, and iterate over CSV data in Ansible loops using the csvfile lookup, community.general.read_csv, and manual parsing.

---

CSV files are still one of the most common data formats in enterprise environments. Inventory lists, user accounts, server allocations, network configurations, and license assignments often live in spreadsheets exported as CSV. Ansible can read and loop over CSV data using lookup plugins, the `read_csv` module, and manual parsing techniques.

This post covers all three approaches, shows how to handle different CSV formats, and demonstrates real-world patterns for turning CSV data into automated infrastructure tasks.

## Using the read_csv Module

The `community.general.read_csv` module is the most robust way to handle CSV data in Ansible. It reads a CSV file and returns the data as a list of dictionaries.

```yaml
# read-csv-basic.yml
# Reads a CSV file and creates user accounts from its contents
- name: Create users from CSV
  hosts: all
  become: true
  tasks:
    - name: Read user data from CSV
      community.general.read_csv:
        path: /opt/ansible/data/users.csv
      register: csv_users
      delegate_to: localhost

    - name: Create each user
      ansible.builtin.user:
        name: "{{ item.username }}"
        uid: "{{ item.uid }}"
        shell: "{{ item.shell }}"
        groups: "{{ item.groups }}"
        comment: "{{ item.full_name }}"
      loop: "{{ csv_users.list }}"
```

The CSV file (`users.csv`) would look like this:

```csv
username,uid,shell,groups,full_name
alice,1001,/bin/bash,"sudo,docker",Alice Smith
bob,1002,/bin/zsh,docker,Bob Jones
charlie,1003,/bin/bash,developers,Charlie Brown
diana,1004,/bin/bash,"sudo,developers",Diana Prince
```

The `read_csv` module automatically uses the first row as column headers, so each item in `csv_users.list` is a dictionary like `{username: "alice", uid: "1001", shell: "/bin/bash", ...}`.

## Custom Delimiters

Not all CSV files use commas. Tab-separated (TSV) and semicolon-separated files are common in European locales.

```yaml
# custom-delimiter.yml
# Reads a TSV (tab-separated) file
- name: Read TSV file
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Read tab-separated data
      community.general.read_csv:
        path: data/servers.tsv
        delimiter: "\t"
      register: servers

    - name: Show server data
      ansible.builtin.debug:
        msg: "{{ item.hostname }} at {{ item.ip_address }}"
      loop: "{{ servers.list }}"
```

```yaml
# semicolon-separated.yml
# Reads a semicolon-separated CSV file
- name: Read semicolon-separated file
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Read data with semicolon delimiter
      community.general.read_csv:
        path: data/network.csv
        delimiter: ";"
      register: network_data

    - name: Process network entries
      ansible.builtin.debug:
        msg: "{{ item.interface }}: {{ item.ip }}/{{ item.netmask }}"
      loop: "{{ network_data.list }}"
```

## Custom Column Names

If your CSV file does not have a header row, you can specify column names manually.

```yaml
# no-header-csv.yml
# Reads a CSV file without headers, providing column names manually
- name: Read headerless CSV
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Read CSV with custom fieldnames
      community.general.read_csv:
        path: data/ports.csv
        fieldnames: hostname,port,protocol,description
      register: port_data

    - name: Open firewall ports
      ansible.builtin.debug:
        msg: "Allow {{ item.protocol }}/{{ item.port }} for {{ item.description }} on {{ item.hostname }}"
      loop: "{{ port_data.list }}"
```

The CSV file without headers:

```csv
web-01,80,tcp,HTTP
web-01,443,tcp,HTTPS
db-01,5432,tcp,PostgreSQL
cache-01,6379,tcp,Redis
```

## Using the csvfile Lookup Plugin

The `csvfile` lookup reads a specific value from a CSV file based on a key. It is useful for single-value lookups rather than iterating over entire files.

```yaml
# csvfile-lookup.yml
# Uses csvfile lookup to get specific values during a loop
- name: Look up values from CSV
  hosts: all
  gather_facts: false
  vars:
    server_names:
      - web-01
      - db-01
      - cache-01
  tasks:
    - name: Get IP for each server from CSV
      ansible.builtin.debug:
        msg: >
          {{ item }}: {{ lookup('csvfile', item + ' file=data/servers.csv delimiter=, col=1') }}
      loop: "{{ server_names }}"
```

The CSV file for this lookup:

```csv
web-01,10.0.1.10,web
db-01,10.0.2.10,database
cache-01,10.0.3.10,cache
```

The lookup finds the row where the first column matches the key, then returns the value from the specified column.

## Manual CSV Parsing

For simple CSV data or when the read_csv module is not available, you can parse CSV manually using Ansible's string filters.

```yaml
# manual-csv-parse.yml
# Parses CSV data manually from a variable or file content
- name: Manual CSV parsing
  hosts: localhost
  gather_facts: false
  vars:
    csv_content: |
      hostname,ip,role
      web-01,10.0.1.10,web
      web-02,10.0.1.11,web
      db-01,10.0.2.10,database
  tasks:
    - name: Parse CSV into list of dictionaries
      ansible.builtin.set_fact:
        parsed_data: >-
          {%- set lines = csv_content.strip().split('\n') -%}
          {%- set headers = lines[0].split(',') -%}
          {%- set result = [] -%}
          {%- for line in lines[1:] -%}
            {%- set values = line.split(',') -%}
            {%- set entry = {} -%}
            {%- for i in range(headers | length) -%}
              {%- set _ = entry.update({headers[i]: values[i]}) -%}
            {%- endfor -%}
            {%- set _ = result.append(entry) -%}
          {%- endfor -%}
          {{ result }}

    - name: Loop over parsed CSV data
      ansible.builtin.debug:
        msg: "{{ item.hostname }} ({{ item.role }}): {{ item.ip }}"
      loop: "{{ parsed_data }}"
```

This is verbose and fragile. Prefer `read_csv` when possible.

## Filtering CSV Data

After loading CSV data, you can filter it before looping.

```yaml
# filter-csv.yml
# Reads CSV and loops only over entries matching a condition
- name: Process filtered CSV data
  hosts: all
  become: true
  tasks:
    - name: Read server inventory CSV
      community.general.read_csv:
        path: data/inventory.csv
      register: inventory
      delegate_to: localhost

    - name: Process only web servers
      ansible.builtin.debug:
        msg: "Web server: {{ item.hostname }} at {{ item.ip }}"
      loop: "{{ inventory.list | selectattr('role', 'equalto', 'web') | list }}"

    - name: Process only active servers
      ansible.builtin.debug:
        msg: "Active: {{ item.hostname }}"
      loop: "{{ inventory.list | selectattr('status', 'equalto', 'active') | list }}"
```

## CSV with Embedded Commas

CSV files with commas inside quoted fields need proper handling. The `read_csv` module handles this correctly.

```yaml
# quoted-csv.yml
# Reads CSV with quoted fields containing commas
- name: Read CSV with quoted fields
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Read CSV file
      community.general.read_csv:
        path: data/addresses.csv
      register: addresses

    - name: Show addresses
      ansible.builtin.debug:
        msg: "{{ item.name }}: {{ item.address }}"
      loop: "{{ addresses.list }}"
```

The CSV file:

```csv
name,address,city,state
"Smith, John","123 Main St, Apt 4B",Springfield,IL
"Doe, Jane","456 Oak Ave",Portland,OR
```

## Practical Example: Network Configuration from CSV

A real-world use case is configuring network interfaces from a CSV that the network team maintains.

```yaml
# network-config-csv.yml
# Configures network interfaces based on a CSV allocation sheet
- name: Configure network from CSV
  hosts: all
  become: true
  tasks:
    - name: Read network allocation CSV
      community.general.read_csv:
        path: /opt/ansible/data/network-allocations.csv
      register: allocations
      delegate_to: localhost

    - name: Find this host's allocations
      ansible.builtin.set_fact:
        my_interfaces: "{{ allocations.list | selectattr('hostname', 'equalto', inventory_hostname) | list }}"

    - name: Configure network interfaces
      ansible.builtin.template:
        src: interface.j2
        dest: "/etc/network/interfaces.d/{{ item.interface }}"
      loop: "{{ my_interfaces }}"
      when: my_interfaces | length > 0
      notify: Restart networking
```

The CSV file maintained by the network team:

```csv
hostname,interface,ip_address,netmask,gateway,vlan
web-01,eth0,10.0.1.10,255.255.255.0,10.0.1.1,100
web-01,eth1,10.0.10.10,255.255.255.0,,200
db-01,eth0,10.0.2.10,255.255.255.0,10.0.2.1,100
db-01,eth1,10.0.20.10,255.255.255.0,,300
```

## Converting CSV to Other Formats

You can read CSV and convert it to YAML or JSON for other tools.

```yaml
# csv-to-yaml.yml
# Converts CSV data to a YAML file
- name: Convert CSV to YAML
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Read CSV
      community.general.read_csv:
        path: data/servers.csv
      register: csv_data

    - name: Write as YAML
      ansible.builtin.copy:
        dest: data/servers.yml
        content: "{{ {'servers': csv_data.list} | to_nice_yaml }}"
```

## Summary

CSV data can be loaded into Ansible using the `community.general.read_csv` module (best for full file iteration), the `csvfile` lookup (best for single-value lookups), or manual parsing (last resort). The `read_csv` module handles quoting, custom delimiters, and headerless files. Once loaded, CSV data becomes a list of dictionaries that you can filter with `selectattr`, transform with `map`, and iterate with `loop` just like any other Ansible data structure. For production use, keep your CSV files in a version-controlled repository and use `delegate_to: localhost` when reading them from the control node.
