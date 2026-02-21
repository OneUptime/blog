# How to Use ansible-navigator for Inventory Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-navigator, Inventory, DevOps

Description: Use ansible-navigator to inspect, validate, and manage Ansible inventories with interactive browsing and execution environment support.

---

Managing Ansible inventories gets complicated fast. You start with a simple YAML file and before you know it you have dynamic inventories from AWS, group hierarchies five levels deep, and host variables scattered across dozens of files. ansible-navigator includes an inventory browser that lets you explore your inventory interactively, inspect host and group variables, and validate that everything resolves correctly inside your Execution Environment.

## Viewing Your Inventory

The basic command to view an inventory:

```bash
# Browse inventory interactively
ansible-navigator inventory -i inventory.yml

# View inventory in stdout mode
ansible-navigator inventory -i inventory.yml --list --mode stdout
```

The interactive mode opens a TUI where you can browse groups, hosts, and variables. The stdout mode dumps the inventory as JSON, similar to `ansible-inventory --list`.

## Setting Up a Test Inventory

Let us create a sample inventory to work with:

```yaml
# inventory.yml - Sample inventory with groups and variables
---
all:
  vars:
    ansible_user: deploy
    ntp_server: ntp.example.com
  children:
    production:
      vars:
        environment: production
        monitoring_enabled: true
      children:
        webservers:
          hosts:
            web01.prod.example.com:
              http_port: 80
              max_connections: 1000
            web02.prod.example.com:
              http_port: 80
              max_connections: 2000
          vars:
            app_tier: frontend
        appservers:
          hosts:
            app01.prod.example.com:
              app_port: 8080
            app02.prod.example.com:
              app_port: 8081
          vars:
            app_tier: backend
        databases:
          hosts:
            db01.prod.example.com:
              db_port: 5432
              db_role: primary
            db02.prod.example.com:
              db_port: 5432
              db_role: replica
          vars:
            app_tier: data
    staging:
      vars:
        environment: staging
        monitoring_enabled: false
      hosts:
        staging01.example.com:
          http_port: 80
          app_port: 8080
          db_port: 5432
```

## Interactive Inventory Browsing

Run the inventory browser:

```bash
ansible-navigator inventory -i inventory.yml
```

You will see a list of groups. Navigate like this:

```
# The TUI shows:
# 0 all
# 1 production
# 2 staging
# 3 webservers
# 4 appservers
# 5 databases

# Type a number to drill into a group
# Type 3 to see webservers

# Inside a group you see hosts
# 0 web01.prod.example.com
# 1 web02.prod.example.com

# Select a host to see all its variables
# (including inherited group variables)
```

When you select a host, you see every variable that applies to it, including variables inherited from parent groups. This is extremely useful for debugging variable precedence issues.

## Viewing Host Variables

See all variables for a specific host:

```bash
# View variables for a specific host
ansible-navigator inventory -i inventory.yml --host web01.prod.example.com --mode stdout
```

This shows the fully resolved variable set, including inherited variables:

```json
{
    "ansible_user": "deploy",
    "app_tier": "frontend",
    "environment": "production",
    "http_port": 80,
    "max_connections": 1000,
    "monitoring_enabled": true,
    "ntp_server": "ntp.example.com"
}
```

## Viewing Group Variables

See variables defined at the group level:

```bash
# View group information
ansible-navigator inventory -i inventory.yml --graph --mode stdout
```

The `--graph` option shows the group hierarchy as a tree:

```
@all:
  |--@production:
  |  |--@appservers:
  |  |  |--app01.prod.example.com
  |  |  |--app02.prod.example.com
  |  |--@databases:
  |  |  |--db01.prod.example.com
  |  |  |--db02.prod.example.com
  |  |--@webservers:
  |  |  |--web01.prod.example.com
  |  |  |--web02.prod.example.com
  |--@staging:
  |  |--staging01.example.com
  |--@ungrouped:
```

## Working with Dynamic Inventories

ansible-navigator handles dynamic inventories the same way. The inventory script or plugin runs inside the Execution Environment, which means any Python libraries needed by the inventory plugin must be in the EE.

Test a dynamic AWS inventory:

```yaml
# aws_inventory.yml - AWS EC2 dynamic inventory
---
plugin: amazon.aws.ec2
regions:
  - us-east-1
  - us-west-2
keyed_groups:
  - key: tags.Environment
    prefix: env
    separator: _
  - key: instance_type
    prefix: type
    separator: _
  - key: placement.availability_zone
    prefix: az
    separator: _
filters:
  instance-state-name: running
  "tag:ManagedBy": ansible
compose:
  ansible_host: private_ip_address
```

Browse the dynamic inventory:

```bash
# Browse AWS dynamic inventory using an EE with boto3
ansible-navigator inventory -i aws_inventory.yml \
  --execution-environment-image quay.io/myorg/ee-aws:2.1.0

# List all hosts from the dynamic inventory
ansible-navigator inventory -i aws_inventory.yml \
  --execution-environment-image quay.io/myorg/ee-aws:2.1.0 \
  --list --mode stdout
```

## Combining Multiple Inventories

You can point ansible-navigator at a directory containing multiple inventory files:

```bash
# Directory structure
# inventory/
#   static.yml     - Static hosts
#   aws_ec2.yml    - AWS dynamic inventory
#   group_vars/
#     all.yml
#     webservers.yml
#   host_vars/
#     web01.yml

# Browse the combined inventory
ansible-navigator inventory -i inventory/
```

All inventory sources are merged and you can browse the combined result.

## Validating Inventory Correctness

Use ansible-navigator to validate that your inventory resolves correctly before running playbooks:

```bash
# List all hosts (validates inventory parsing)
ansible-navigator inventory -i inventory.yml --list --mode stdout | python3 -m json.tool

# Check a specific host's resolved variables
ansible-navigator inventory -i inventory.yml \
  --host web01.prod.example.com --mode stdout | python3 -m json.tool

# Show the group graph to verify hierarchy
ansible-navigator inventory -i inventory.yml --graph --mode stdout
```

Create a validation playbook that checks inventory consistency:

```yaml
---
# validate-inventory.yml - Check inventory is correct
- name: Validate inventory
  hosts: all
  gather_facts: false
  tasks:
    - name: Verify all hosts have required variables
      ansible.builtin.assert:
        that:
          - ansible_user is defined
          - environment is defined
        fail_msg: "Host {{ inventory_hostname }} is missing required variables"
        success_msg: "Host {{ inventory_hostname }} has all required variables"

    - name: Verify webservers have http_port
      ansible.builtin.assert:
        that:
          - http_port is defined
          - http_port | int > 0
        fail_msg: "Webserver {{ inventory_hostname }} missing http_port"
      when: "'webservers' in group_names"

    - name: Verify databases have db_role
      ansible.builtin.assert:
        that:
          - db_role is defined
          - db_role in ['primary', 'replica']
        fail_msg: "Database {{ inventory_hostname }} has invalid db_role"
      when: "'databases' in group_names"

    - name: Show host group membership
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} is in groups: {{ group_names }}"
```

Run the validation:

```bash
ansible-navigator run validate-inventory.yml \
  -i inventory.yml \
  --mode stdout
```

## Debugging Variable Precedence

When variables are defined at multiple levels, it can be confusing which value wins. ansible-navigator helps by showing the final resolved value.

Create an inventory with overlapping variables:

```yaml
# precedence-test.yml
---
all:
  vars:
    log_level: info
  children:
    webservers:
      vars:
        log_level: warning
      hosts:
        web01:
          log_level: debug
```

Check the resolved value for web01:

```bash
# See what log_level web01 actually gets
ansible-navigator inventory -i precedence-test.yml --host web01 --mode stdout
```

The output shows `log_level: debug` because host variables take precedence over group variables.

## Inventory with Execution Environment

When your inventory uses plugins that need specific Python libraries (like boto3 for AWS or azure-identity for Azure), you must use an EE that includes those libraries:

```bash
# This will fail if the default EE doesn't have boto3
ansible-navigator inventory -i aws_ec2.yml

# This works because the AWS EE has boto3
ansible-navigator inventory -i aws_ec2.yml \
  --execution-environment-image quay.io/myorg/ee-aws:2.1.0
```

Configure this in your navigator settings so you do not have to specify it every time:

```yaml
# ansible-navigator.yml - EE for inventory operations
---
ansible-navigator:
  execution-environment:
    image: quay.io/myorg/ee-aws:2.1.0
    pull:
      policy: missing
  inventories:
    - inventory/
```

## Exporting Inventory Data

Extract inventory data for use in other tools:

```bash
# Export full inventory as JSON
ansible-navigator inventory -i inventory.yml --list --mode stdout > inventory-export.json

# Export just the host list
ansible-navigator inventory -i inventory.yml --list --mode stdout | \
  python3 -c "import json,sys; data=json.load(sys.stdin); print('\n'.join(data.get('_meta',{}).get('hostvars',{}).keys()))"

# Export specific group members
ansible-navigator inventory -i inventory.yml --graph webservers --mode stdout
```

## Wrapping Up

ansible-navigator's inventory browsing capability turns inventory management from guesswork into certainty. The interactive TUI lets you explore group hierarchies and drill into individual hosts to see their fully resolved variable set. Running inventory commands inside an Execution Environment ensures that dynamic inventory plugins have the right Python libraries available. Make it a habit to validate your inventory with ansible-navigator before running playbooks, especially after making changes to group structures or variable files. It takes seconds and prevents hours of debugging caused by misplaced variables or incorrect group membership.
