# How to List All Hosts in Ansible Inventory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, CLI, DevOps, Troubleshooting

Description: Every method for listing and inspecting hosts in your Ansible inventory including command-line tools, playbook tasks, and filtering techniques for inventory auditing.

---

Before running any playbook, you should know exactly which hosts will be affected. Ansible provides several ways to list, inspect, and audit the hosts in your inventory. Whether you need a quick count, a detailed variable dump, or a filtered list for a specific group, there is a command for it.

## Using ansible-inventory --list

The `ansible-inventory` command is the primary tool for inspecting inventory. The `--list` flag outputs the complete inventory as JSON.

```bash
# List all hosts and groups as JSON
ansible-inventory -i inventory.ini --list
```

Output:

```json
{
    "_meta": {
        "hostvars": {
            "web1.example.com": {
                "ansible_host": "10.0.1.10",
                "http_port": 8080
            },
            "web2.example.com": {
                "ansible_host": "10.0.1.11",
                "http_port": 8081
            },
            "db1.example.com": {
                "ansible_host": "10.0.2.10"
            }
        }
    },
    "all": {
        "children": ["ungrouped", "webservers", "databases"]
    },
    "webservers": {
        "hosts": ["web1.example.com", "web2.example.com"]
    },
    "databases": {
        "hosts": ["db1.example.com"]
    }
}
```

Format the output for readability:

```bash
# Pretty-print the JSON output
ansible-inventory -i inventory.ini --list | python3 -m json.tool
```

## Using ansible-inventory --graph

The `--graph` flag shows the group hierarchy as a tree, which is much easier to scan visually.

```bash
# Show the full inventory tree
ansible-inventory -i inventory.ini --graph
```

Output:

```
@all:
  |--@ungrouped:
  |--@webservers:
  |  |--web1.example.com
  |  |--web2.example.com
  |--@databases:
  |  |--db1.example.com
  |--@production:
  |  |--@webservers:
  |  |  |--web1.example.com
  |  |  |--web2.example.com
  |  |--@databases:
  |  |  |--db1.example.com
```

Show only a specific group's subtree:

```bash
# Show only the webservers group
ansible-inventory -i inventory.ini --graph webservers
```

Output:

```
@webservers:
  |--web1.example.com
  |--web2.example.com
```

## Adding Variables to the Graph

Use `--vars` with `--graph` to include variables in the tree output:

```bash
# Show groups, hosts, and their variables
ansible-inventory -i inventory.ini --graph --vars
```

Output:

```
@all:
  |--@webservers:
  |  |--web1.example.com
  |  |  |--{ansible_host = 10.0.1.10}
  |  |  |--{http_port = 8080}
  |  |--web2.example.com
  |  |  |--{ansible_host = 10.0.1.11}
  |  |  |--{http_port = 8081}
  |--@databases:
  |  |--db1.example.com
  |  |  |--{ansible_host = 10.0.2.10}
```

## Listing Hosts for a Specific Group

Use the `--list-hosts` flag with the `ansible` command to see which hosts match a pattern:

```bash
# List hosts in the webservers group
ansible webservers -i inventory.ini --list-hosts

# List all hosts
ansible all -i inventory.ini --list-hosts

# List hosts matching a pattern
ansible 'production:&webservers' -i inventory.ini --list-hosts

# List hosts matching a wildcard
ansible '*prod*' -i inventory.ini --list-hosts

# List hosts matching a regex
ansible '~^web-[0-9]+' -i inventory.ini --list-hosts
```

## Inspecting a Single Host

Use `--host` to see all variables for a specific host:

```bash
# Show all variables for web1.example.com
ansible-inventory -i inventory.ini --host web1.example.com
```

Output:

```json
{
    "ansible_host": "10.0.1.10",
    "http_port": 8080,
    "ansible_user": "deploy",
    "nginx_version": "1.24"
}
```

This is invaluable for debugging variable precedence. The output shows the final merged value of every variable the host will receive, after all group_vars, host_vars, and inline variables are merged.

## Counting Hosts

Get a quick count of hosts in your inventory:

```bash
# Count all hosts
ansible all -i inventory.ini --list-hosts | head -1

# The first line shows the count, like: "hosts (15):"

# Count hosts in a specific group
ansible webservers -i inventory.ini --list-hosts | head -1

# Count with a pattern
ansible 'production:!databases' -i inventory.ini --list-hosts | head -1
```

## Listing Hosts in YAML Format

Use `--yaml` with `--list` for YAML output:

```bash
# Output inventory as YAML
ansible-inventory -i inventory.ini --list --yaml
```

This is useful for converting an inventory to YAML format or for piping into other tools.

## Listing Hosts from a Playbook

Sometimes you want to see what a playbook would target without running it:

```bash
# List hosts that a playbook would target
ansible-playbook -i inventory.ini site.yml --list-hosts
```

Output:

```
playbook: site.yml

  play #1 (webservers): Deploy web application    TAGS: []
    pattern: ['webservers']
    hosts (2):
      web1.example.com
      web2.example.com

  play #2 (databases): Configure databases    TAGS: []
    pattern: ['databases']
    hosts (1):
      db1.example.com
```

This is the safest way to preview a playbook run. It shows exactly which hosts each play will target.

## Using the Debug Module for Runtime Inspection

Inside a playbook, you can list host information at runtime:

```yaml
# list-hosts.yml
# Display all hosts and their groups at runtime
- hosts: all
  gather_facts: false
  tasks:
    - name: Show hostname and IP
      debug:
        msg: "Host: {{ inventory_hostname }} -> {{ ansible_host | default('no ansible_host set') }}"

    - name: Show group membership
      debug:
        msg: "{{ inventory_hostname }} is in groups: {{ group_names }}"

    - name: Show all hosts in each group
      debug:
        msg: "Group {{ item }}: {{ groups[item] }}"
      loop: "{{ groups.keys() | list }}"
      run_once: true
```

```bash
# Run the inspection playbook
ansible-playbook -i inventory.ini list-hosts.yml
```

## Filtering and Sorting Inventory Output

Combine `ansible-inventory` with command-line tools for more specific queries:

```bash
# Get just the hostnames (no groups, no variables)
ansible all -i inventory.ini --list-hosts | tail -n +2 | sed 's/^ *//'

# Sort hosts alphabetically
ansible all -i inventory.ini --list-hosts | tail -n +2 | sort

# Find hosts with a specific variable value using jq
ansible-inventory -i inventory.ini --list | jq -r '
  ._meta.hostvars | to_entries[] |
  select(.value.http_port == 8080) | .key'

# List all group names
ansible-inventory -i inventory.ini --list | jq -r 'keys[] | select(. != "_meta")'
```

## Checking Inventory from Multiple Sources

When using a directory of inventory files:

```bash
# List all hosts from all inventory sources in a directory
ansible-inventory -i inventory/ --list

# Show the merged graph
ansible-inventory -i inventory/ --graph

# Check a specific host across all sources
ansible-inventory -i inventory/ --host web1.example.com
```

## Exporting Inventory for Documentation

Generate a clean list for documentation or auditing:

```bash
# Export a clean host list per group
for group in $(ansible-inventory -i inventory.ini --list | python3 -c "
import json, sys
data = json.load(sys.stdin)
for k in sorted(data.keys()):
    if k != '_meta' and 'hosts' in data.get(k, {}):
        print(k)
"); do
    echo "=== $group ==="
    ansible "$group" -i inventory.ini --list-hosts | tail -n +2
    echo ""
done
```

Or use a simple playbook to generate a report:

```yaml
# inventory-report.yml
# Generate a formatted inventory report
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Generate inventory report
      copy:
        content: |
          Ansible Inventory Report
          Generated: {{ now() }}

          Total hosts: {{ groups['all'] | length }}

          {% for group in groups | sort %}
          {% if group != 'all' and group != 'ungrouped' %}
          Group: {{ group }}
            Hosts: {{ groups[group] | length }}
          {% for host in groups[group] | sort %}
              - {{ host }}
          {% endfor %}

          {% endif %}
          {% endfor %}
        dest: ./inventory-report.txt
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `ansible-inventory --list` | Full inventory as JSON |
| `ansible-inventory --graph` | Group hierarchy tree |
| `ansible-inventory --graph --vars` | Tree with variables |
| `ansible-inventory --host HOST` | All variables for one host |
| `ansible GROUP --list-hosts` | Hosts in a group |
| `ansible-playbook --list-hosts` | Hosts a playbook targets |
| `ansible-inventory --list --yaml` | Full inventory as YAML |

Listing and inspecting your inventory is a safety habit. Run `--list-hosts` before every playbook, use `--host` to debug variable issues, and use `--graph` to verify your group hierarchy. These commands cost nothing to run and can prevent costly mistakes.
