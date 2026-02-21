# How to Use Ansible AWS Dynamic Inventory with Tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, Dynamic Inventory, EC2, Automation

Description: Set up AWS dynamic inventory in Ansible to automatically discover EC2 instances using tags for flexible, maintenance-free host grouping.

---

Static inventory files work fine when you have a handful of servers that rarely change. But in AWS, instances come and go. Auto Scaling groups spin up new ones, old ones get terminated, and IP addresses change with every stop/start cycle. Maintaining a static inventory in this environment is a losing battle. Dynamic inventory queries AWS in real time to discover your instances, and when combined with tag-based grouping, it gives you a powerful way to target playbooks at exactly the right set of hosts without ever editing an inventory file.

## How Dynamic Inventory Works

Instead of reading from a static file, Ansible calls a plugin that queries the AWS API and builds the inventory on the fly:

```mermaid
graph LR
    A[Ansible Playbook] --> B[Dynamic Inventory Plugin]
    B --> C[AWS EC2 API]
    C --> D[Returns Instance List]
    D --> E[Plugin Groups by Tags]
    E --> F[Ansible Runs Against Groups]
```

The `amazon.aws.aws_ec2` inventory plugin handles this. It queries EC2, processes the results, and creates host groups based on the criteria you define.

## Prerequisites

- Ansible 2.9+ with the `amazon.aws` collection
- AWS credentials with `ec2:DescribeInstances` permission
- EC2 instances with consistent tags

```bash
# Install the collection
ansible-galaxy collection install amazon.aws
```

## Basic Dynamic Inventory Configuration

Create an inventory file with the `.aws_ec2.yml` or `.aws_ec2.yaml` extension. The naming convention matters because that is how Ansible identifies it as a dynamic inventory source:

```yaml
# inventory/aws_ec2.yml - Basic AWS dynamic inventory configuration
---
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
  - us-west-2

# Only include running instances
filters:
  instance-state-name: running

# Use the private IP for SSH connections
hostnames:
  - private-ip-address

# Compose variables for each host
compose:
  ansible_host: private_ip_address
  ansible_user: "'ec2-user'"
```

Test your inventory to see what it discovers:

```bash
# List all hosts discovered by the dynamic inventory
ansible-inventory -i inventory/aws_ec2.yml --list

# Show the inventory as a graph to visualize grouping
ansible-inventory -i inventory/aws_ec2.yml --graph
```

## Grouping Instances by Tags

The real power of dynamic inventory comes from tag-based grouping. The `keyed_groups` configuration creates Ansible host groups from EC2 tag values:

```yaml
# inventory/aws_ec2.yml - Group instances by tag values
---
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1

filters:
  instance-state-name: running
  "tag:ManagedBy": ansible

hostnames:
  - private-ip-address

compose:
  ansible_host: private_ip_address
  ansible_user: "'ec2-user'"

# Create groups based on tag values
keyed_groups:
  # Group by Environment tag (creates groups like env_production, env_staging)
  - key: tags.Environment
    prefix: env
    separator: "_"

  # Group by Role tag (creates groups like role_web, role_db, role_worker)
  - key: tags.Role
    prefix: role
    separator: "_"

  # Group by Team tag (creates groups like team_platform, team_frontend)
  - key: tags.Team
    prefix: team
    separator: "_"

  # Group by instance type
  - key: instance_type
    prefix: instance_type
    separator: "_"
```

With this configuration, if you have an instance tagged with `Environment=production`, `Role=web`, and `Team=platform`, it will appear in the groups `env_production`, `role_web`, and `team_platform`. You can then target playbooks at any of these groups:

```bash
# Run a playbook against all production web servers
ansible-playbook -i inventory/aws_ec2.yml deploy.yml --limit "env_production:&role_web"

# Run against all staging instances regardless of role
ansible-playbook -i inventory/aws_ec2.yml update.yml --limit "env_staging"

# Run against platform team's database servers
ansible-playbook -i inventory/aws_ec2.yml db-maintenance.yml --limit "team_platform:&role_db"
```

The `:&` syntax is an intersection operator. It means "hosts that are in BOTH groups." This is how you combine multiple tag-based filters.

## Advanced Filtering

You can filter which instances the plugin discovers using AWS API filters:

```yaml
# inventory/production_ec2.yml - Targeted inventory for production only
---
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
  - us-west-2

# Only discover production instances managed by Ansible
filters:
  instance-state-name: running
  "tag:Environment": production
  "tag:ManagedBy": ansible

# Exclude specific instance types (like spot instances used for batch jobs)
exclude_filters:
  - "tag:Ephemeral":
      - "true"

hostnames:
  - tag:Name
  - private-ip-address

compose:
  ansible_host: private_ip_address
  ansible_user: "'ec2-user'"
  ansible_ssh_private_key_file: "'/opt/keys/prod.pem'"

keyed_groups:
  - key: tags.Role
    prefix: ""
    separator: ""
  - key: tags.Application
    prefix: app
    separator: "_"
```

Setting `prefix: ""` and `separator: ""` on the Role group means the group name is just the tag value itself. So an instance with `Role=webserver` ends up in a group called `webserver` rather than `role_webserver`. This can make your playbooks cleaner if you prefer short group names.

## Using Dynamic Inventory in Playbooks

Once your inventory file is set up, reference it like any other inventory:

```yaml
# deploy-web.yml - Deploy to web servers discovered dynamically
---
- name: Deploy Web Application
  hosts: role_web
  become: true

  tasks:
    - name: Pull the latest application code
      ansible.builtin.git:
        repo: "https://github.com/myorg/webapp.git"
        dest: /opt/webapp
        version: main

    - name: Install dependencies
      ansible.builtin.pip:
        requirements: /opt/webapp/requirements.txt
        virtualenv: /opt/webapp/venv

    - name: Restart the application service
      ansible.builtin.systemd:
        name: webapp
        state: restarted
        daemon_reload: true
```

```bash
# Run the deployment against dynamically discovered hosts
ansible-playbook -i inventory/aws_ec2.yml deploy-web.yml
```

## Caching Inventory Results

Dynamic inventory queries the AWS API on every run. For large environments, this can be slow. Enable caching to speed things up:

```yaml
# inventory/cached_aws_ec2.yml - Dynamic inventory with caching enabled
---
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1

filters:
  instance-state-name: running

hostnames:
  - private-ip-address

compose:
  ansible_host: private_ip_address

keyed_groups:
  - key: tags.Environment
    prefix: env
  - key: tags.Role
    prefix: role

# Cache settings
cache: true
cache_plugin: ansible.builtin.jsonfile
cache_connection: /tmp/ansible_inventory_cache
cache_timeout: 300
```

The cache stores the inventory results for 300 seconds (5 minutes). During that window, subsequent playbook runs use the cached data instead of hitting the API. To force a refresh:

```bash
# Force inventory refresh by clearing the cache
ansible-inventory -i inventory/cached_aws_ec2.yml --list --flush-cache
```

## Combining Multiple Inventory Sources

You can use a directory as your inventory source and include both static and dynamic files:

```yaml
# inventory/static_hosts.yml - Static hosts alongside dynamic inventory
---
all:
  children:
    bastion:
      hosts:
        bastion-east:
          ansible_host: 52.10.20.30
          ansible_user: ec2-user
    monitoring:
      hosts:
        prometheus:
          ansible_host: 10.0.5.100
          ansible_user: ubuntu
```

Place both files in the same directory and point Ansible at the directory:

```bash
# Use the inventory directory which contains both static and dynamic sources
ansible-playbook -i inventory/ site.yml
```

Ansible merges hosts from all sources in the directory. Your static bastion host and dynamically discovered EC2 instances all appear in the same inventory.

## Setting Default Inventory in ansible.cfg

To avoid typing `-i inventory/` every time:

```ini
# ansible.cfg - Set the default inventory source
[defaults]
inventory = inventory/
host_key_checking = False

[inventory]
enable_plugins = amazon.aws.aws_ec2, host_list, auto
```

The `enable_plugins` setting tells Ansible which inventory plugins to try when loading inventory files.

## Debugging Inventory Issues

When instances are not showing up where you expect:

```bash
# See the raw output from the inventory plugin with full details
ansible-inventory -i inventory/aws_ec2.yml --list --yaml

# Check which group a specific host belongs to
ansible-inventory -i inventory/aws_ec2.yml --host 10.0.1.50

# See the full group hierarchy
ansible-inventory -i inventory/aws_ec2.yml --graph
```

Common issues include: instances missing expected tags (the filter excludes them), instances in the wrong region (the plugin only queries configured regions), and SSH connectivity problems (the composed `ansible_host` resolves to an IP that the control machine cannot reach).

## Summary

AWS dynamic inventory with tag-based grouping eliminates the pain of maintaining static host lists in elastic cloud environments. The setup is straightforward: create an inventory file with the right naming convention, configure your tag-based groups, and Ansible handles the rest. The combination of AWS API filters and `keyed_groups` gives you precise control over which instances get discovered and how they are organized. Once this is in place, adding new instances to your Ansible management is as simple as tagging them correctly.
