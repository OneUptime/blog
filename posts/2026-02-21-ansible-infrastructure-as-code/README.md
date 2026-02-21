# How to Use Ansible for Infrastructure as Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Infrastructure as Code, DevOps, Automation

Description: Learn how to use Ansible as a powerful Infrastructure as Code tool to define, provision, and manage your infrastructure through declarative playbooks and roles.

---

Infrastructure as Code (IaC) has changed the way teams manage servers, networks, and cloud resources. Instead of clicking through web consoles or running ad-hoc commands, you define your infrastructure in version-controlled files. Ansible fits into this model naturally because its playbooks are human-readable YAML files that describe the desired state of your systems.

In this post, I will walk through how to use Ansible as an IaC tool, covering project structure, inventory management, playbook design, and real-world patterns that work at scale.

## Why Ansible for IaC

Ansible is agentless. You do not need to install anything on target machines beyond SSH and Python. This makes it a solid choice for IaC because you can start managing infrastructure immediately without any bootstrap process.

Unlike Terraform, which focuses on cloud resource provisioning, Ansible handles both provisioning and configuration. You can spin up a VM on AWS and then configure the OS, install packages, and deploy applications all in the same playbook run.

## Project Structure

A well-organized Ansible IaC project looks like this:

```
infrastructure/
  inventories/
    production/
      hosts.yml
      group_vars/
        all.yml
        webservers.yml
        databases.yml
    staging/
      hosts.yml
      group_vars/
        all.yml
  playbooks/
    site.yml
    webservers.yml
    databases.yml
    networking.yml
  roles/
    common/
    nginx/
    postgresql/
    firewall/
  ansible.cfg
  requirements.yml
```

This structure separates concerns cleanly. Inventories define where things run. Playbooks define what runs. Roles contain the reusable logic.

## Defining Your Inventory

The inventory is the foundation of your IaC setup. It describes all the machines and their groupings.

Here is a production inventory using YAML format:

```yaml
# inventories/production/hosts.yml
# Defines all production hosts grouped by function
all:
  children:
    webservers:
      hosts:
        web01.prod.example.com:
          ansible_host: 10.0.1.10
          http_port: 8080
        web02.prod.example.com:
          ansible_host: 10.0.1.11
          http_port: 8080
    databases:
      hosts:
        db01.prod.example.com:
          ansible_host: 10.0.2.10
          postgresql_port: 5432
        db02.prod.example.com:
          ansible_host: 10.0.2.11
          postgresql_port: 5432
    loadbalancers:
      hosts:
        lb01.prod.example.com:
          ansible_host: 10.0.0.10
```

Group variables let you set defaults for entire groups:

```yaml
# inventories/production/group_vars/all.yml
# Variables that apply to every host in production
ansible_user: deploy
ansible_ssh_private_key_file: ~/.ssh/prod_deploy
ntp_servers:
  - 0.pool.ntp.org
  - 1.pool.ntp.org
dns_servers:
  - 10.0.0.2
  - 10.0.0.3
environment_name: production
```

## Writing IaC Playbooks

The main site playbook ties everything together. It is the single entry point to converge your entire infrastructure.

```yaml
# playbooks/site.yml
# Master playbook that applies all infrastructure configuration
---
- name: Apply common configuration to all hosts
  hosts: all
  become: true
  roles:
    - common
    - firewall

- name: Configure web servers
  hosts: webservers
  become: true
  roles:
    - nginx
    - app_deploy

- name: Configure database servers
  hosts: databases
  become: true
  roles:
    - postgresql
    - backup_agent

- name: Configure load balancers
  hosts: loadbalancers
  become: true
  roles:
    - haproxy
```

## Building Idempotent Roles

Idempotency is critical for IaC. Running the same playbook twice should produce the same result. Ansible modules are designed to be idempotent, but you need to use them correctly.

Here is a common role that sets up baseline configuration:

```yaml
# roles/common/tasks/main.yml
# Baseline configuration applied to every server
---
- name: Set hostname
  ansible.builtin.hostname:
    name: "{{ inventory_hostname }}"

- name: Configure timezone
  community.general.timezone:
    name: "{{ timezone | default('UTC') }}"

- name: Install essential packages
  ansible.builtin.apt:
    name:
      - curl
      - wget
      - vim
      - htop
      - net-tools
      - unzip
    state: present
    update_cache: true
    cache_valid_time: 3600

- name: Configure NTP
  ansible.builtin.template:
    src: ntp.conf.j2
    dest: /etc/ntp.conf
    owner: root
    group: root
    mode: '0644'
  notify: restart ntp

- name: Ensure NTP service is running
  ansible.builtin.service:
    name: ntp
    state: started
    enabled: true

- name: Configure sysctl parameters
  ansible.posix.sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    sysctl_set: true
    state: present
    reload: true
  loop:
    - { key: 'net.core.somaxconn', value: '65535' }
    - { key: 'vm.swappiness', value: '10' }
    - { key: 'net.ipv4.tcp_max_syn_backlog', value: '65535' }
```

## Using Variables for Environment Parity

One of the biggest benefits of IaC is running the same code against different environments. Ansible's variable precedence system makes this straightforward.

```yaml
# inventories/staging/group_vars/all.yml
# Staging-specific overrides
environment_name: staging
app_replicas: 1
db_max_connections: 50
ssl_certificate_path: /etc/ssl/staging/cert.pem

# inventories/production/group_vars/all.yml
# Production-specific values
environment_name: production
app_replicas: 3
db_max_connections: 200
ssl_certificate_path: /etc/ssl/production/cert.pem
```

Then your roles reference these variables without knowing which environment they are targeting:

```yaml
# roles/postgresql/tasks/main.yml
# PostgreSQL setup using environment-aware variables
---
- name: Configure PostgreSQL max connections
  ansible.builtin.lineinfile:
    path: /etc/postgresql/15/main/postgresql.conf
    regexp: '^max_connections'
    line: "max_connections = {{ db_max_connections }}"
  notify: restart postgresql
```

## Cloud Provisioning with Ansible

Ansible can also create cloud resources, making it a full IaC solution:

```yaml
# playbooks/provision-aws.yml
# Provision AWS infrastructure from scratch
---
- name: Provision AWS infrastructure
  hosts: localhost
  connection: local
  gather_facts: false
  vars:
    region: us-east-1
    vpc_cidr: 10.0.0.0/16

  tasks:
    - name: Create VPC
      amazon.aws.ec2_vpc_net:
        name: "production-vpc"
        cidr_block: "{{ vpc_cidr }}"
        region: "{{ region }}"
        tags:
          Environment: production
          ManagedBy: ansible
      register: vpc_result

    - name: Create public subnet
      amazon.aws.ec2_vpc_subnet:
        vpc_id: "{{ vpc_result.vpc.id }}"
        cidr: 10.0.1.0/24
        az: "{{ region }}a"
        tags:
          Name: public-subnet-1a
          ManagedBy: ansible
      register: public_subnet

    - name: Launch web server instances
      amazon.aws.ec2_instance:
        name: "web-{{ item }}"
        instance_type: t3.medium
        image_id: ami-0abcdef1234567890
        subnet_id: "{{ public_subnet.subnet.id }}"
        security_group: web-sg
        key_name: deploy-key
        tags:
          Role: webserver
          ManagedBy: ansible
        state: present
      loop: "{{ range(1, app_replicas + 1) | list }}"
```

## Version Control and CI/CD Integration

Since your infrastructure is now code, treat it like code. Store it in Git, use pull requests for reviews, and run it through CI/CD.

Here is a simple CI pipeline that validates and applies infrastructure changes:

```yaml
# .github/workflows/infrastructure.yml
# GitHub Actions pipeline for infrastructure changes
name: Infrastructure Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Ansible
        run: pip install ansible ansible-lint
      - name: Lint playbooks
        run: ansible-lint playbooks/
      - name: Syntax check
        run: ansible-playbook playbooks/site.yml --syntax-check

  apply:
    needs: validate
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Apply infrastructure
        run: |
          ansible-playbook playbooks/site.yml \
            -i inventories/production/hosts.yml \
            --diff
```

## Drift Detection

One often overlooked aspect of IaC is detecting configuration drift. You can use Ansible's check mode to compare desired state against actual state:

```bash
# Run in check mode to detect drift without making changes
ansible-playbook playbooks/site.yml \
  -i inventories/production/hosts.yml \
  --check --diff
```

Any differences in the output indicate drift that needs to be corrected.

## Key Takeaways

Ansible works well as an IaC tool when you follow a few principles. Keep your project structure clean with separate inventories, playbooks, and roles. Use variables to handle environment differences. Make everything idempotent so running the same playbook multiple times is safe. Store everything in version control and run it through CI/CD pipelines. Finally, use check mode regularly to detect drift before it becomes a problem.

The combination of agentless operation, human-readable YAML, and a massive module library makes Ansible a practical choice for teams that want IaC without the learning curve of domain-specific languages.
