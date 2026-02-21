# How to Debug Ansible Inventory Parse Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, YAML, Troubleshooting

Description: Learn how to diagnose and fix Ansible inventory parse errors for INI, YAML, and dynamic inventories with practical debugging steps.

---

Ansible inventory files define which hosts to manage and how to group them. When the inventory cannot be parsed, nothing works because Ansible does not even know which hosts to target. Inventory parse errors can be caused by YAML syntax problems, INI format mistakes, dynamic inventory script failures, or plugin configuration issues. This post covers how to debug each type.

## The Error Messages

Inventory parse errors typically look like:

```
[WARNING]: Unable to parse /home/deploy/inventory as an inventory source
[WARNING]: No inventory was parsed, only implicit localhost is available

ERROR! Attempted to read "/home/deploy/inventory" as ini file: ...

ERROR! Plugin inventory source returned invalid data
```

## Debugging Step 1: Verify the Inventory

The first thing to do is verify what Ansible sees in your inventory:

```bash
# List all hosts Ansible can see
ansible-inventory --list

# List hosts in a specific inventory file
ansible-inventory -i inventory.yml --list

# List a specific group
ansible-inventory -i inventory.yml --list --yaml | head -50

# Show graph of groups and hosts
ansible-inventory -i inventory.yml --graph

# Show variables for a specific host
ansible-inventory -i inventory.yml --host web-01
```

If these commands fail, the inventory file has a parsing problem.

## INI Format Inventory Errors

The INI format is the original inventory format. It has specific rules that are easy to violate.

### Common INI Mistakes

```ini
# WRONG: Space in group name
[web servers]
web-01
web-02

# CORRECT: Use underscores or hyphens
[web_servers]
web-01
web-02
```

```ini
# WRONG: Variables with spaces not quoted
[webservers:vars]
app_path = /opt/my app

# CORRECT: Quote values with spaces
[webservers:vars]
app_path="/opt/my app"
```

```ini
# WRONG: Mixing YAML syntax in INI file
[webservers]
web-01:
  ansible_host: 10.0.1.50

# CORRECT: Use INI variable syntax
[webservers]
web-01 ansible_host=10.0.1.50
```

```ini
# WRONG: Using colons for variables (YAML syntax in INI)
[webservers:vars]
ansible_user: deploy

# CORRECT: Use equals sign in INI format
[webservers:vars]
ansible_user=deploy
```

### INI Children Groups

```ini
# WRONG: Misspelled :children
[all_servers:childs]
webservers
dbservers

# CORRECT: Use :children
[all_servers:children]
webservers
dbservers
```

### Valid INI Inventory Example

```ini
# inventory/hosts.ini

# Individual hosts with variables
[webservers]
web-01 ansible_host=10.0.1.50 ansible_port=22
web-02 ansible_host=10.0.1.51
web-03 ansible_host=10.0.1.52

[dbservers]
db-primary ansible_host=10.0.2.10
db-replica ansible_host=10.0.2.11

# Group variables
[webservers:vars]
ansible_user=deploy
app_port=8080

[dbservers:vars]
ansible_user=dbadmin
db_port=5432

# Group of groups
[production:children]
webservers
dbservers

# Production-wide variables
[production:vars]
env=production
```

## YAML Format Inventory Errors

YAML inventories are more flexible but also more sensitive to formatting.

### Common YAML Mistakes

```yaml
# WRONG: Incorrect indentation
all:
  hosts:
  web-01:
    ansible_host: 10.0.1.50

# CORRECT: Proper nesting
all:
  hosts:
    web-01:
      ansible_host: 10.0.1.50
```

```yaml
# WRONG: Tab characters (YAML does not allow tabs)
all:
	hosts:
		web-01:

# CORRECT: Use spaces only
all:
  hosts:
    web-01:
```

```yaml
# WRONG: Missing colon after hostname
all:
  hosts:
    web-01
      ansible_host: 10.0.1.50

# CORRECT: Hostname needs a colon
all:
  hosts:
    web-01:
      ansible_host: 10.0.1.50
```

```yaml
# WRONG: Hosts as a list instead of a dictionary
all:
  hosts:
    - web-01
    - web-02

# CORRECT: Hosts as a dictionary
all:
  hosts:
    web-01:
    web-02:
```

### Valid YAML Inventory Example

```yaml
# inventory/hosts.yml
---
all:
  children:
    webservers:
      hosts:
        web-01:
          ansible_host: 10.0.1.50
        web-02:
          ansible_host: 10.0.1.51
        web-03:
          ansible_host: 10.0.1.52
      vars:
        ansible_user: deploy
        app_port: 8080

    dbservers:
      hosts:
        db-primary:
          ansible_host: 10.0.2.10
          db_role: primary
        db-replica:
          ansible_host: 10.0.2.11
          db_role: replica
      vars:
        ansible_user: dbadmin
        db_port: 5432

    production:
      children:
        webservers:
        dbservers:
      vars:
        env: production
```

## Dynamic Inventory Errors

Dynamic inventory scripts or plugins pull host data from external sources (AWS, GCP, Terraform, etc.).

### Script-Based Dynamic Inventory

If using a script, it must:
1. Be executable
2. Return valid JSON when called with `--list`
3. Return host variables when called with `--host <hostname>`

```bash
# Test the script manually
./inventory_script.py --list | python3 -m json.tool

# Check if it is executable
ls -la inventory_script.py
chmod +x inventory_script.py

# Check for Python errors
python3 inventory_script.py --list
```

A valid `--list` output looks like:

```json
{
    "webservers": {
        "hosts": ["web-01", "web-02"],
        "vars": {
            "app_port": 8080
        }
    },
    "dbservers": {
        "hosts": ["db-01"],
        "vars": {}
    },
    "_meta": {
        "hostvars": {
            "web-01": {
                "ansible_host": "10.0.1.50"
            },
            "web-02": {
                "ansible_host": "10.0.1.51"
            },
            "db-01": {
                "ansible_host": "10.0.2.10"
            }
        }
    }
}
```

### Plugin-Based Dynamic Inventory

For inventory plugins (like AWS EC2), errors often come from configuration:

```yaml
# aws_ec2.yml - inventory plugin configuration
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
keyed_groups:
  - key: tags.Environment
    prefix: env
filters:
  tag:ManagedBy: ansible
```

**Common plugin errors:**

```
[WARNING]: * Failed to parse /home/deploy/aws_ec2.yml with auto plugin: Failed to describe instances: ...
```

**Debugging plugin inventories:**

```bash
# List available inventory plugins
ansible-doc -t inventory -l

# Check plugin documentation
ansible-doc -t inventory amazon.aws.aws_ec2

# Test the inventory file
ansible-inventory -i aws_ec2.yml --list --yaml

# Debug with verbose output
ansible-inventory -i aws_ec2.yml --list -vvv
```

## Debugging Inventory Directories

When using an inventory directory (multiple files), Ansible tries to parse each file:

```
inventory/
  hosts.yml         # YAML inventory
  group_vars/
    all.yml
    webservers.yml
  host_vars/
    web-01.yml
```

**Common issue: Files that should not be parsed:**

```bash
# Ansible tries to parse ALL files in the inventory directory
# Backup files, swap files, and editor temp files cause errors

# Check for problematic files
ls -la inventory/
# Look for: .bak, .swp, .retry, ~, .pyc files
```

**Fix: Tell Ansible to ignore certain extensions:**

```ini
# ansible.cfg
[defaults]
# Ignore files matching these patterns
inventory_ignore_extensions = .pyc, .retry, .bak, ~, .swp, .orig
```

## Using YAML Linting

Catch YAML errors before Ansible sees them:

```bash
# Install yamllint
pip install yamllint

# Lint your inventory file
yamllint inventory/hosts.yml

# Lint with Ansible-specific rules
yamllint -d relaxed inventory/hosts.yml
```

Example yamllint output:

```
inventory/hosts.yml
  3:1       error    wrong indentation: expected 2 but found 4  (indentation)
  7:21      error    trailing spaces  (trailing-spaces)
  12:1      error    syntax error: could not find expected ':'
```

## Debugging with ansible-inventory

The `ansible-inventory` command is your primary debugging tool:

```bash
# Show the complete parsed inventory as JSON
ansible-inventory -i inventory/ --list

# Show as YAML (easier to read)
ansible-inventory -i inventory/ --list --yaml

# Show the inventory graph
ansible-inventory -i inventory/ --graph
# Output:
# @all:
#   |--@ungrouped:
#   |--@webservers:
#   |  |--web-01
#   |  |--web-02
#   |--@dbservers:
#   |  |--db-primary
#   |  |--db-replica

# Show variables for a specific host
ansible-inventory -i inventory/ --host web-01 --yaml

# Show with verbose output for debugging
ansible-inventory -i inventory/ --list -vvv
```

## Multiple Inventory Sources

When using multiple inventory sources, parse errors might come from any of them:

```bash
# Using multiple inventory sources
ansible-playbook deploy.yml -i inventory/hosts.yml -i inventory/aws_ec2.yml

# Debug each source individually
ansible-inventory -i inventory/hosts.yml --list
ansible-inventory -i inventory/aws_ec2.yml --list
```

```ini
# ansible.cfg - comma-separated inventory sources
[defaults]
inventory = inventory/hosts.yml,inventory/aws_ec2.yml
```

## Practical Debugging Checklist

When you hit an inventory parse error, work through this list:

```bash
# 1. Check the file exists and has content
cat inventory/hosts.yml

# 2. Validate YAML syntax (for YAML inventories)
python3 -c "import yaml; yaml.safe_load(open('inventory/hosts.yml'))"

# 3. Check for tab characters
grep -P '\t' inventory/hosts.yml

# 4. Try parsing with ansible-inventory
ansible-inventory -i inventory/hosts.yml --list -vvv

# 5. Check for encoding issues
file inventory/hosts.yml
# Should show: UTF-8 Unicode text or ASCII text

# 6. Check file permissions
ls -la inventory/hosts.yml
```

## Summary

Inventory parse errors come from format violations (INI vs YAML syntax rules), file corruption (encoding, tabs, merge conflicts), dynamic inventory issues (script errors, plugin misconfiguration), or stray files in inventory directories. Debug with `ansible-inventory --list -vvv` to see exactly what Ansible is parsing and where it fails. Use `yamllint` to catch YAML syntax issues before they reach Ansible. For dynamic inventories, always test the script or plugin independently before integrating it into your playbook runs.
