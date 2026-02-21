# How to Create Inventory from a CSV File in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, CSV, Inventory, Python, Automation

Description: Learn how to generate Ansible inventory files from CSV data using Python scripts and custom inventory plugins.

---

Many organizations keep their server records in spreadsheets or CSV exports from asset management tools. Manually translating a CSV file with hundreds of servers into an Ansible inventory is tedious and error-prone. In this post, I will show you how to automate that conversion using both a standalone Python script and a dynamic inventory script approach.

## The Starting Point: A CSV File

Let us say your IT team exports server data from a spreadsheet or CMDB into a CSV file like this:

```csv
hostname,ip_address,group,ssh_port,os,environment,ansible_user
web01,10.0.1.10,webservers,22,ubuntu,production,deploy
web02,10.0.1.11,webservers,22,ubuntu,production,deploy
web03,10.0.1.12,webservers,2222,ubuntu,staging,deploy
app01,10.0.2.20,appservers,22,centos,production,appuser
app02,10.0.2.21,appservers,22,centos,production,appuser
db01,10.0.3.30,databases,3306,ubuntu,production,dbadmin
db02,10.0.3.31,databases,3306,ubuntu,staging,dbadmin
cache01,10.0.4.40,cacheservers,22,centos,production,redis
```

The goal is to turn this into a working Ansible inventory, grouped properly and with all variables assigned.

## Method 1: Python Script to Generate Static Inventory

The most straightforward approach is a Python script that reads the CSV and outputs an INI or YAML inventory file:

```python
#!/usr/bin/env python3
# csv_to_inventory.py
# Converts a CSV file to an Ansible INI inventory file

import csv
import sys
from collections import defaultdict

def csv_to_ini_inventory(csv_file, output_file):
    """Read CSV and produce an Ansible INI inventory."""
    groups = defaultdict(list)
    host_vars = {}

    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            hostname = row['hostname']
            group = row['group']
            groups[group].append(hostname)

            # Collect per-host variables
            host_vars[hostname] = {
                'ansible_host': row['ip_address'],
                'ansible_port': row['ssh_port'],
                'ansible_user': row['ansible_user'],
                'os_type': row['os'],
                'environment': row['environment'],
            }

    # Also group by environment
    env_groups = defaultdict(list)
    for hostname, vars_dict in host_vars.items():
        env_groups[vars_dict['environment']].append(hostname)

    with open(output_file, 'w') as f:
        # Write role-based groups
        for group_name, hosts in sorted(groups.items()):
            f.write(f'[{group_name}]\n')
            for host in hosts:
                v = host_vars[host]
                var_str = ' '.join(
                    f'{k}={v}' for k, v in {
                        'ansible_host': v['ansible_host'],
                        'ansible_port': v['ansible_port'],
                        'ansible_user': v['ansible_user'],
                    }.items()
                )
                f.write(f'{host} {var_str}\n')
            f.write('\n')

        # Write environment groups
        for env_name, hosts in sorted(env_groups.items()):
            f.write(f'[{env_name}]\n')
            for host in hosts:
                f.write(f'{host}\n')
            f.write('\n')

    print(f'Inventory written to {output_file}')

if __name__ == '__main__':
    csv_file = sys.argv[1] if len(sys.argv) > 1 else 'servers.csv'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'inventory.ini'
    csv_to_ini_inventory(csv_file, output_file)
```

Run the script:

```bash
# Generate the inventory file from your CSV export
python3 csv_to_inventory.py servers.csv inventory/hosts.ini
```

The output looks like this:

```ini
[appservers]
app01 ansible_host=10.0.2.20 ansible_port=22 ansible_user=appuser
app02 ansible_host=10.0.2.21 ansible_port=22 ansible_user=appuser

[cacheservers]
cache01 ansible_host=10.0.4.40 ansible_port=22 ansible_user=redis

[databases]
db01 ansible_host=10.0.3.30 ansible_port=3306 ansible_user=dbadmin
db02 ansible_host=10.0.3.31 ansible_port=3306 ansible_user=dbadmin

[webservers]
web01 ansible_host=10.0.1.10 ansible_port=22 ansible_user=deploy
web02 ansible_host=10.0.1.11 ansible_port=22 ansible_user=deploy
web03 ansible_host=10.0.1.12 ansible_port=2222 ansible_user=deploy

[production]
web01
web02
app01
app02
db01
cache01

[staging]
web03
db02
```

## Method 2: YAML Inventory Output

If you prefer YAML inventory format, modify the script to output YAML instead:

```python
#!/usr/bin/env python3
# csv_to_yaml_inventory.py
# Converts CSV to Ansible YAML inventory format

import csv
import sys
import yaml
from collections import defaultdict

def csv_to_yaml_inventory(csv_file, output_file):
    """Read CSV and produce an Ansible YAML inventory."""
    groups = defaultdict(dict)

    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            group = row['group']
            hostname = row['hostname']
            groups[group][hostname] = {
                'ansible_host': row['ip_address'],
                'ansible_port': int(row['ssh_port']),
                'ansible_user': row['ansible_user'],
            }

    # Build the inventory structure
    inventory = {
        'all': {
            'children': {}
        }
    }

    for group_name, hosts in groups.items():
        inventory['all']['children'][group_name] = {
            'hosts': hosts
        }

    with open(output_file, 'w') as f:
        yaml.dump(inventory, f, default_flow_style=False, sort_keys=True)

    print(f'YAML inventory written to {output_file}')

if __name__ == '__main__':
    csv_file = sys.argv[1] if len(sys.argv) > 1 else 'servers.csv'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'inventory/hosts.yml'
    csv_to_yaml_inventory(csv_file, output_file)
```

## Method 3: Dynamic Inventory Script

Instead of generating a static file, you can create a dynamic inventory script that Ansible calls directly. This is useful when your CSV file changes frequently:

```python
#!/usr/bin/env python3
# csv_dynamic_inventory.py
# Dynamic inventory script that reads CSV at runtime

import csv
import json
import sys
from collections import defaultdict

CSV_FILE = '/etc/ansible/servers.csv'

def get_inventory():
    """Build inventory JSON from CSV file."""
    groups = defaultdict(lambda: {'hosts': [], 'vars': {}})
    hostvars = {}

    with open(CSV_FILE, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            hostname = row['hostname']
            group = row['group']

            # Add host to its group
            groups[group]['hosts'].append(hostname)

            # Store per-host variables
            hostvars[hostname] = {
                'ansible_host': row['ip_address'],
                'ansible_port': int(row['ssh_port']),
                'ansible_user': row['ansible_user'],
                'os_type': row['os'],
                'environment': row['environment'],
            }

            # Also add to environment-based group
            env_group = row['environment']
            if hostname not in groups[env_group]['hosts']:
                groups[env_group]['hosts'].append(hostname)

    # Build final inventory with _meta for efficiency
    inventory = dict(groups)
    inventory['_meta'] = {'hostvars': hostvars}

    return inventory

def get_host(hostname):
    """Return variables for a single host."""
    with open(CSV_FILE, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['hostname'] == hostname:
                return {
                    'ansible_host': row['ip_address'],
                    'ansible_port': int(row['ssh_port']),
                    'ansible_user': row['ansible_user'],
                    'os_type': row['os'],
                    'environment': row['environment'],
                }
    return {}

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--host':
        print(json.dumps(get_host(sys.argv[2]), indent=2))
    else:
        print(json.dumps(get_inventory(), indent=2))
```

Make it executable and use it directly with Ansible:

```bash
# Make the script executable
chmod +x csv_dynamic_inventory.py

# Test the inventory output
./csv_dynamic_inventory.py --list | python3 -m json.tool

# Use it with ansible directly
ansible -i csv_dynamic_inventory.py all -m ping

# Run a playbook with the CSV-backed inventory
ansible-playbook -i csv_dynamic_inventory.py site.yml
```

## Handling Complex CSV Structures

Real-world CSV exports often have extra columns or use different headers. Here is a more robust version that handles column mapping:

```python
#!/usr/bin/env python3
# flexible_csv_inventory.py
# Handles various CSV formats with configurable column mapping

import csv
import json
import sys
import os

# Map your CSV columns to Ansible variables
COLUMN_MAP = {
    'Server Name': 'hostname',
    'IP Address': 'ansible_host',
    'Server Group': 'group',
    'SSH Port': 'ansible_port',
    'Login User': 'ansible_user',
    'Operating System': 'os_type',
    'Data Center': 'datacenter',
    'Env': 'environment',
}

CSV_FILE = os.environ.get('CSV_INVENTORY_FILE', 'servers.csv')

def normalize_row(row):
    """Map CSV columns to standardized names."""
    normalized = {}
    for csv_col, ansible_var in COLUMN_MAP.items():
        if csv_col in row:
            normalized[ansible_var] = row[csv_col].strip()
    return normalized

def get_inventory():
    """Build inventory from CSV with flexible column mapping."""
    from collections import defaultdict
    groups = defaultdict(lambda: {'hosts': [], 'vars': {}})
    hostvars = {}

    with open(CSV_FILE, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data = normalize_row(row)
            hostname = data.pop('hostname', None)
            group = data.pop('group', 'ungrouped')

            if not hostname:
                continue

            groups[group]['hosts'].append(hostname)
            hostvars[hostname] = data

    inventory = dict(groups)
    inventory['_meta'] = {'hostvars': hostvars}
    return inventory

if __name__ == '__main__':
    print(json.dumps(get_inventory(), indent=2))
```

Notice the `encoding='utf-8-sig'` parameter. This handles CSV files exported from Excel that include a BOM (byte order mark) at the start of the file. Without it, your first column header might not match.

## Automating the Workflow

You can integrate the CSV-to-inventory conversion into your CI/CD pipeline. Here is a simple Makefile target:

```makefile
# Makefile
INVENTORY_DIR = inventory
CSV_SOURCE = exports/servers.csv

# Regenerate static inventory from latest CSV export
inventory: $(CSV_SOURCE)
	python3 scripts/csv_to_yaml_inventory.py $(CSV_SOURCE) $(INVENTORY_DIR)/hosts.yml
	@echo "Inventory updated from CSV"
	ansible-inventory -i $(INVENTORY_DIR)/hosts.yml --graph

# Validate the generated inventory
validate-inventory: inventory
	ansible -i $(INVENTORY_DIR)/hosts.yml all -m ping --limit 'web01'
```

## Tips for Production Use

A few lessons from running CSV-based inventories in production:

Keep your CSV in version control alongside the generated inventory. This gives you a clear audit trail of what changed and when.

Add validation to your conversion script. Check for duplicate hostnames, missing required fields, and invalid IP addresses before generating the inventory.

If your CSV comes from an external system, schedule the conversion to run periodically (via cron or a CI job) so your inventory stays in sync.

Consider using the dynamic inventory approach if the CSV is updated more than once a day. With the static conversion approach, you need to regenerate the file after every CSV update. The dynamic script reads the CSV fresh on every Ansible run.

The CSV-to-inventory pattern bridges the gap between traditional IT asset management and modern infrastructure automation. Whether you go with a static conversion or a dynamic script, the result is the same: a reliable, automatically generated inventory that keeps your Ansible automation in sync with your server records.
