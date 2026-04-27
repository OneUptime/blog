# OpenTofu vs Ansible: Choosing the Right Infrastructure Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ansible, Infrastructure as Code, Comparison, DevOps

Description: Learn the key differences between OpenTofu and Ansible for infrastructure management, and how to decide when to use each tool or both together.

## Introduction

OpenTofu and Ansible are both popular infrastructure automation tools, but they serve different purposes. OpenTofu excels at provisioning immutable infrastructure declaratively, while Ansible is better suited for configuration management and procedural automation. Understanding their differences helps you choose the right tool - or the right combination.

## Core Philosophy

### OpenTofu: Declarative Provisioning

OpenTofu uses a declarative approach. You describe the **desired state** of your infrastructure, and OpenTofu figures out the steps to get there:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.medium"
  count         = 3
}
```

OpenTofu compares the current state with the desired state and applies only the necessary changes.

### Ansible: Procedural Configuration

Ansible uses a procedural approach. You describe **the steps** to configure systems:

```yaml
- name: Install and configure nginx
  hosts: web_servers
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present

    - name: Start nginx
      service:
        name: nginx
        state: started
        enabled: yes
```

Ansible executes tasks in order, though it supports idempotency through module design.

## Key Differences

| Aspect | OpenTofu | Ansible |
|---|---|---|
| Approach | Declarative | Procedural (idempotent) |
| Primary use | Provisioning infrastructure | Configuring systems |
| State management | Stateful (tfstate) | Stateless |
| Agentless | Yes | Yes (SSH) |
| Language | HCL | YAML |
| Provider ecosystem | Cloud APIs | Any system via modules |
| Idempotency | Built-in (state) | Module-dependent |
| Rollback | State-based | Limited |

## When to Use OpenTofu

OpenTofu is the right choice for:

- **Cloud resource provisioning**: VMs, databases, networks, IAM roles
- **Infrastructure that rarely changes**: VPCs, DNS zones, storage buckets
- **Multi-cloud coordination**: Provisioning across AWS, Azure, GCP simultaneously
- **Resources with dependencies**: OpenTofu tracks and manages ordering
- **Desired state convergence**: You want to declare what you want, not how to achieve it

```hcl
# OpenTofu is ideal for this

module "vpc" { source = "./modules/vpc" }
module "eks" {
  source = "./modules/eks"
  vpc_id = module.vpc.vpc_id
}
```

## When to Use Ansible

Ansible is the right choice for:

- **OS and software configuration**: Installing packages, managing services
- **Application deployment**: Pushing code, running migrations
- **Ad-hoc operations**: Restarting services, running one-off commands
- **Configuration drift remediation**: Ensuring configurations stay compliant
- **Mixed environment automation**: Linux, Windows, network devices

```yaml
# Ansible is ideal for this
- name: Configure application
  tasks:
    - name: Deploy application config
      template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
      notify: restart app
```

## Using Both Together

The most powerful pattern is using OpenTofu for provisioning and Ansible for configuration:

### Step 1: OpenTofu Provisions Infrastructure

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name

  provisioner "local-exec" {
    command = <<-EOF
      sleep 30
      ansible-playbook \
        -i '${self.public_ip},' \
        --private-key ${var.ssh_key_path} \
        -u ubuntu \
        playbooks/configure_app.yml
    EOF
  }
}
```

### Step 2: Ansible Configures the Instance

```yaml
# playbooks/configure_app.yml
- hosts: all
  become: yes
  vars_files:
    - vars/app_config.yml
  roles:
    - common
    - nginx
    - app
```

### Step 3: Dynamic Inventory

Generate Ansible inventory from OpenTofu outputs:

```bash
tofu output -json | python3 generate_inventory.py > inventory/hosts.yml
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml
```

## Tool Selection Matrix

| Scenario | Best Tool |
|---|---|
| Create an S3 bucket | OpenTofu |
| Install Docker on a VM | Ansible |
| Set up a Kubernetes cluster | OpenTofu |
| Deploy an application to Kubernetes | Ansible or Helm |
| Create a VPC with subnets | OpenTofu |
| Configure SSH hardening | Ansible |
| Provision a managed database | OpenTofu |
| Run a database migration | Ansible |

## Best Practices for Using Both

- Use OpenTofu to provision all cloud infrastructure.
- Use Ansible for anything that requires SSH-based or WinRM-based configuration.
- Pass OpenTofu outputs to Ansible via generated inventory files.
- Store OpenTofu state remotely; Ansible doesn't need state files.
- Run OpenTofu in a separate pipeline stage before Ansible configuration.

## Conclusion

OpenTofu and Ansible are complementary rather than competing tools. OpenTofu handles the "what infrastructure exists" question; Ansible handles the "how is it configured" question. Used together, they form a complete infrastructure automation pipeline that covers provisioning, configuration, and ongoing operations.
