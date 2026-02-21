# How to Create a Basic Ansible Inventory File in INI Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, INI, DevOps, Configuration Management

Description: Step-by-step guide to creating Ansible inventory files in INI format with groups, variables, and practical examples for managing your infrastructure.

---

The INI format is the original and most widely used format for Ansible inventory files. If you have been working with configuration files on Linux systems, this format will feel immediately familiar. It uses a simple, human-readable syntax that makes it easy to define hosts, organize them into groups, and assign variables.

In this guide, we will walk through building an INI inventory file from scratch, starting with the simplest possible setup and gradually adding complexity.

## The Simplest Possible Inventory

At its most basic, an Ansible inventory file is just a list of hostnames or IP addresses, one per line.

Create a file called `inventory.ini`:

```ini
# inventory.ini
# Each line is a host that Ansible can manage
192.168.1.10
192.168.1.11
web-server-01.example.com
db-server-01.example.com
```

You can test this inventory immediately with a ping:

```bash
# Test connectivity to all hosts in the inventory
ansible all -i inventory.ini -m ping
```

This works, but without groups, every playbook will target every host. That is rarely what you want.

## Adding Groups

Groups let you organize hosts by role, location, environment, or any other logical category. In INI format, you define a group by wrapping its name in square brackets.

```ini
# inventory.ini
# Group hosts by their role in the infrastructure

[webservers]
web1.example.com
web2.example.com
web3.example.com

[databases]
db-primary.example.com
db-replica-01.example.com
db-replica-02.example.com

[loadbalancers]
lb1.example.com
lb2.example.com
```

Now you can target specific groups in your playbooks:

```yaml
# site.yml
# Deploy only to web servers
- hosts: webservers
  become: true
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present
```

Run the playbook against just the webservers group:

```bash
# Only targets hosts in the webservers group
ansible-playbook -i inventory.ini site.yml
```

## Built-in Groups: all and ungrouped

Ansible automatically creates two groups that you never need to define explicitly:

- **all** contains every host in the inventory
- **ungrouped** contains hosts that are not in any group (other than `all`)

```ini
# inventory.ini
# monitoring-server is "ungrouped" because it is not inside any [group] section
monitoring-server.example.com

[webservers]
web1.example.com
web2.example.com

[databases]
db1.example.com
```

In this example, `monitoring-server.example.com` belongs to both `all` and `ungrouped`. The other hosts belong to `all` and their respective named groups.

## Adding Host Variables Inline

You can assign variables to individual hosts on the same line, separated by spaces.

```ini
# inventory.ini
# Assign per-host variables after the hostname
[webservers]
web1.example.com ansible_host=10.0.1.10 http_port=8080
web2.example.com ansible_host=10.0.1.11 http_port=8081
web3.example.com ansible_host=10.0.1.12 http_port=8082

[databases]
db-primary.example.com ansible_host=10.0.2.10 db_role=primary
db-replica.example.com ansible_host=10.0.2.11 db_role=replica
```

The `ansible_host` variable is one of Ansible's built-in connection variables. It tells Ansible which IP address to connect to, even when the inventory name is a human-friendly hostname.

## Adding Group Variables

The `:vars` suffix lets you define variables that apply to every host in a group.

```ini
# inventory.ini
[webservers]
web1.example.com
web2.example.com
web3.example.com

# Variables that apply to all webservers
[webservers:vars]
ansible_user=deploy
ansible_port=22
nginx_worker_processes=4
document_root=/var/www/html

[databases]
db-primary.example.com
db-replica.example.com

# Variables that apply to all databases
[databases:vars]
ansible_user=dbadmin
ansible_port=2222
postgresql_version=15
max_connections=200
```

## Defining Children Groups (Nested Groups)

The `:children` suffix creates parent groups that contain other groups.

```ini
# inventory.ini
[webservers]
web1.example.com
web2.example.com

[databases]
db1.example.com
db2.example.com

[loadbalancers]
lb1.example.com

# Create a parent group called "production" that includes all three groups
[production:children]
webservers
databases
loadbalancers

# You can now target all production servers at once
# ansible production -i inventory.ini -m ping
```

This is especially useful when you have environments like staging and production that share the same group structure.

## A Complete Real-World Example

Here is a full inventory file for a typical web application deployment:

```ini
# inventory.ini
# Complete inventory for a multi-tier web application

# ---- Web Tier ----
[webservers]
web-prod-01.example.com ansible_host=10.0.1.10
web-prod-02.example.com ansible_host=10.0.1.11
web-prod-03.example.com ansible_host=10.0.1.12

[webservers:vars]
ansible_user=deploy
nginx_worker_processes=auto
ssl_cert_path=/etc/ssl/certs/app.pem

# ---- Database Tier ----
[databases]
db-prod-primary.example.com ansible_host=10.0.2.10
db-prod-replica-01.example.com ansible_host=10.0.2.11
db-prod-replica-02.example.com ansible_host=10.0.2.12

[databases:vars]
ansible_user=dbadmin
postgresql_version=16
backup_schedule="0 2 * * *"

# ---- Cache Tier ----
[cache]
redis-01.example.com ansible_host=10.0.3.10
redis-02.example.com ansible_host=10.0.3.11

[cache:vars]
redis_maxmemory=4gb
redis_maxmemory_policy=allkeys-lru

# ---- Load Balancers ----
[loadbalancers]
lb-01.example.com ansible_host=10.0.0.10
lb-02.example.com ansible_host=10.0.0.11

# ---- Environment Grouping ----
[production:children]
webservers
databases
cache
loadbalancers

[production:vars]
env=production
monitoring_enabled=true
log_level=warn
```

## Verifying Your Inventory

After creating your inventory, always verify it parses correctly:

```bash
# List all hosts in the inventory
ansible-inventory -i inventory.ini --list

# Show hosts in a specific group
ansible-inventory -i inventory.ini --graph webservers

# Display the inventory as a tree
ansible-inventory -i inventory.ini --graph
```

The `--graph` output will show your group hierarchy:

```
@all:
  |--@production:
  |  |--@webservers:
  |  |  |--web-prod-01.example.com
  |  |  |--web-prod-02.example.com
  |  |  |--web-prod-03.example.com
  |  |--@databases:
  |  |  |--db-prod-primary.example.com
  |  |  |--db-prod-replica-01.example.com
  |  |  |--db-prod-replica-02.example.com
  |  |--@cache:
  |  |  |--redis-01.example.com
  |  |  |--redis-02.example.com
  |  |--@loadbalancers:
  |  |  |--lb-01.example.com
  |  |  |--lb-02.example.com
  |--@ungrouped:
```

## Common Pitfalls

A few things that catch people off guard with INI inventories:

1. **Duplicate hostnames**: If the same host appears in multiple groups, it only gets one entry in `all`. The variables from each group merge together.

2. **Variable types**: INI inventory treats all values as strings. If you need booleans or integers in your playbooks, use `| bool` or `| int` filters, or switch to YAML format for the inventory.

3. **Spaces in values**: You cannot have spaces in variable values in INI format. Use quotes if needed: `my_var="hello world"`.

4. **Comments**: Lines starting with `#` or `;` are comments. Use them liberally to document your inventory.

## Setting the Default Inventory

Instead of passing `-i inventory.ini` every time, set the default in your `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
inventory = ./inventory.ini
```

With this configuration, Ansible will automatically use `inventory.ini` without the `-i` flag.

## Wrapping Up

The INI format is the fastest way to get an Ansible inventory up and running. It works well for small to medium environments where you want a single file that anyone on the team can read and edit without learning a new syntax. For larger deployments or when you need complex data structures in your variables, consider the YAML format instead, but for most teams, INI gets the job done with minimal fuss.
