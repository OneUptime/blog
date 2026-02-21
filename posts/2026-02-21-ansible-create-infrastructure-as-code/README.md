# How to Use Ansible to Create Infrastructure as Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Infrastructure as Code, IaC, DevOps, Automation

Description: Build infrastructure as code with Ansible by defining cloud resources, configurations, and deployments in version-controlled playbooks and roles.

---

Infrastructure as Code (IaC) means defining your servers, networks, storage, and configurations in files that live in version control rather than clicking through cloud consoles. While Terraform gets most of the IaC attention, Ansible is a legitimate IaC tool that handles both provisioning and configuration management in a single workflow.

This guide covers how to structure Ansible projects for IaC, provision cloud resources, manage configurations, and maintain your infrastructure as code over time.

## Ansible as an IaC Tool

Ansible occupies a unique spot in the IaC landscape. Unlike Terraform, which focuses purely on resource provisioning and tracks state, Ansible handles both provisioning and configuration. You can create a VM and configure it in the same playbook run.

The tradeoffs are worth understanding:

- Ansible does not maintain a state file, so it relies on idempotent modules to determine current state
- Ansible excels at configuration management after resources exist
- Ansible can provision cloud resources through provider-specific modules
- Ansible uses a procedural approach (step by step) rather than declarative

For many teams, using Ansible for IaC makes sense because they already use it for configuration management, and keeping everything in one tool reduces complexity.

## Project Structure for IaC

A well-organized Ansible IaC project looks like this:

```
infrastructure/
  ansible.cfg
  inventory/
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
    provision.yml
    configure.yml
    deploy.yml
    teardown.yml
  roles/
    vpc/
      tasks/main.yml
      defaults/main.yml
    compute/
      tasks/main.yml
      defaults/main.yml
    database/
      tasks/main.yml
      defaults/main.yml
    webserver/
      tasks/main.yml
      defaults/main.yml
      templates/
        nginx.conf.j2
  requirements.yml
```

The key principles:

- Separate inventory per environment
- Group variables for environment-specific values
- Roles for reusable infrastructure components
- Separate playbooks for different lifecycle stages

## Defining Cloud Infrastructure

Start with a playbook that provisions the base infrastructure. Here is an example creating a VPC, subnets, and security groups on AWS:

```yaml
# playbooks/provision.yml - Provision base cloud infrastructure
---
- name: Provision cloud infrastructure
  hosts: localhost
  connection: local
  gather_facts: false

  vars_files:
    - "../inventory/{{ env }}/group_vars/all.yml"

  roles:
    - role: vpc
    - role: compute
    - role: database
```

The VPC role defines networking:

```yaml
# roles/vpc/tasks/main.yml - Create VPC and networking components
---
- name: Create VPC
  amazon.aws.ec2_vpc_net:
    name: "{{ project_name }}-{{ env }}-vpc"
    cidr_block: "{{ vpc_cidr }}"
    region: "{{ aws_region }}"
    tags:
      Environment: "{{ env }}"
      Project: "{{ project_name }}"
      ManagedBy: ansible
  register: vpc

- name: Create public subnets
  amazon.aws.ec2_vpc_subnet:
    vpc_id: "{{ vpc.vpc.id }}"
    cidr: "{{ item.cidr }}"
    az: "{{ item.az }}"
    region: "{{ aws_region }}"
    map_public: true
    tags:
      Name: "{{ project_name }}-{{ env }}-public-{{ item.az }}"
      Environment: "{{ env }}"
  loop: "{{ public_subnets }}"
  register: public_subnet_results

- name: Create internet gateway
  amazon.aws.ec2_vpc_igw:
    vpc_id: "{{ vpc.vpc.id }}"
    region: "{{ aws_region }}"
    tags:
      Name: "{{ project_name }}-{{ env }}-igw"
  register: igw

- name: Create public route table
  amazon.aws.ec2_vpc_route_table:
    vpc_id: "{{ vpc.vpc.id }}"
    region: "{{ aws_region }}"
    subnets: "{{ public_subnet_results.results | map(attribute='subnet.id') | list }}"
    routes:
      - dest: 0.0.0.0/0
        gateway_id: "{{ igw.gateway_id }}"
    tags:
      Name: "{{ project_name }}-{{ env }}-public-rt"

- name: Create security group for web servers
  amazon.aws.ec2_security_group:
    name: "{{ project_name }}-{{ env }}-web-sg"
    description: Security group for web servers
    vpc_id: "{{ vpc.vpc.id }}"
    region: "{{ aws_region }}"
    rules:
      - proto: tcp
        ports: [80, 443]
        cidr_ip: 0.0.0.0/0
      - proto: tcp
        ports: [22]
        cidr_ip: "{{ admin_cidr }}"
  register: web_sg
```

The variables file keeps environment-specific values separate:

```yaml
# inventory/production/group_vars/all.yml - Production environment variables
---
env: production
project_name: myapp
aws_region: us-east-1
vpc_cidr: 10.0.0.0/16
admin_cidr: 10.0.0.0/8

public_subnets:
  - cidr: 10.0.1.0/24
    az: us-east-1a
  - cidr: 10.0.2.0/24
    az: us-east-1b

instance_type: t3.medium
instance_count: 3
db_instance_class: db.r5.large
```

## Compute Role for EC2 Instances

```yaml
# roles/compute/tasks/main.yml - Provision EC2 instances
---
- name: Create EC2 instances
  amazon.aws.ec2_instance:
    name: "{{ project_name }}-{{ env }}-web-{{ item }}"
    instance_type: "{{ instance_type }}"
    image_id: "{{ ami_id }}"
    key_name: "{{ ssh_key_name }}"
    vpc_subnet_id: "{{ public_subnet_results.results[item % (public_subnets | length)].subnet.id }}"
    security_group: "{{ web_sg.group_id }}"
    region: "{{ aws_region }}"
    wait: true
    tags:
      Environment: "{{ env }}"
      Role: webserver
      ManagedBy: ansible
  loop: "{{ range(0, instance_count) | list }}"
  register: ec2_instances

# Add new instances to in-memory inventory for configuration
- name: Add instances to webservers group
  add_host:
    name: "{{ item.instances[0].public_ip_address }}"
    groups: webservers
    ansible_user: ubuntu
    ansible_ssh_private_key_file: "{{ ssh_key_path }}"
  loop: "{{ ec2_instances.results }}"
```

## Configuration Management After Provisioning

After provisioning, configure the instances. This is where Ansible really shines compared to pure provisioning tools:

```yaml
# playbooks/configure.yml - Configure provisioned infrastructure
---
- name: Configure web servers
  hosts: webservers
  become: true
  gather_facts: true

  roles:
    - role: webserver

  tasks:
    # Install required packages
    - name: Install packages
      apt:
        name:
          - nginx
          - python3
          - certbot
        state: present
        update_cache: true

    # Deploy nginx configuration from template
    - name: Configure nginx
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/sites-available/default
        mode: '0644'
      notify: Restart nginx

  handlers:
    - name: Restart nginx
      service:
        name: nginx
        state: restarted
```

## Idempotency is Everything

The most important property of IaC with Ansible is idempotency. Running the same playbook twice should produce the same result. This means:

- Use module parameters that check for existing state (`state: present`)
- Avoid `command` and `shell` modules when a dedicated module exists
- Use `creates` and `removes` parameters on command modules when you must use them
- Test by running playbooks multiple times and checking for `changed=0`

```yaml
# Example of idempotent vs non-idempotent approach
# BAD - not idempotent, runs every time
- name: Create directory
  command: mkdir -p /opt/myapp

# GOOD - idempotent, only changes when needed
- name: Create directory
  file:
    path: /opt/myapp
    state: directory
    mode: '0755'
```

## Environment Promotion

With IaC, promoting changes between environments means changing which inventory you point at:

```bash
# Deploy to staging first
ansible-playbook playbooks/provision.yml -e env=staging

# After testing, promote to production
ansible-playbook playbooks/provision.yml -e env=production
```

The playbooks are identical. Only the variables differ between environments.

## Teardown Playbook

Every IaC project needs a teardown playbook for cleaning up environments:

```yaml
# playbooks/teardown.yml - Destroy all infrastructure for an environment
---
- name: Teardown infrastructure
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Terminate EC2 instances
      amazon.aws.ec2_instance:
        state: absent
        filters:
          "tag:Environment": "{{ env }}"
          "tag:ManagedBy": ansible
        region: "{{ aws_region }}"

    - name: Delete security groups
      amazon.aws.ec2_security_group:
        name: "{{ project_name }}-{{ env }}-web-sg"
        state: absent
        region: "{{ aws_region }}"

    - name: Delete VPC (removes subnets, IGW, route tables)
      amazon.aws.ec2_vpc_net:
        name: "{{ project_name }}-{{ env }}-vpc"
        cidr_block: "{{ vpc_cidr }}"
        state: absent
        region: "{{ aws_region }}"
```

## Version Control Practices

Treat your Ansible IaC like application code:

- Every change goes through a pull request
- Use branch protection on your main branch
- Run `ansible-playbook --check --diff` in CI to preview changes
- Tag releases for production deployments
- Never store secrets in plain text; use Ansible Vault or an external secrets manager

Ansible gives you a practical path to IaC that many teams overlook. If you already know Ansible for configuration management, extending it to provision infrastructure keeps your toolchain simple and your team productive.
