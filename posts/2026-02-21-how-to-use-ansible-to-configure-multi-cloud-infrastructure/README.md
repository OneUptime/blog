# How to Use Ansible to Configure Multi-Cloud Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Multi-Cloud, AWS, Azure, GCP, Infrastructure

Description: Configure and manage infrastructure across AWS, Azure, and GCP with Ansible playbooks for a unified multi-cloud strategy.

---

Running infrastructure across multiple cloud providers is increasingly common. Some organizations do it for redundancy, others for cost optimization, and many end up multi-cloud because different teams chose different providers. Regardless of the reason, managing infrastructure across AWS, Azure, and GCP with separate tools for each is a maintenance nightmare. Ansible gives you a single automation layer that works across all of them.

This guide shows you how to structure Ansible projects for multi-cloud environments, provision resources on different providers, and maintain consistency across clouds.

## Why Multi-Cloud with Ansible?

Each cloud provider has its own CLI, API, and IaC tools. AWS has CloudFormation, Azure has ARM/Bicep, GCP has Deployment Manager. Learning and maintaining expertise in all of them is expensive. Ansible provides a consistent interface across all three.

```mermaid
graph TD
    A[Ansible Control Node] --> B[AWS]
    A --> C[Azure]
    A --> D[GCP]
    B --> E[EC2 Instances]
    B --> F[RDS Databases]
    C --> G[Azure VMs]
    C --> H[Azure SQL]
    D --> I[GCE Instances]
    D --> J[Cloud SQL]
    style A fill:#EE0000,color:#fff
    style B fill:#FF9900,color:#000
    style C fill:#0078D4,color:#fff
    style D fill:#4285F4,color:#fff
```

## Prerequisites

Install collections and SDKs for all three providers.

```bash
# Install Ansible collections for each cloud
ansible-galaxy collection install amazon.aws
ansible-galaxy collection install azure.azcollection
ansible-galaxy collection install google.cloud

# Install Python SDKs
pip install boto3 botocore
pip install azure-identity azure-mgmt-compute azure-mgmt-network azure-mgmt-resource
pip install google-auth google-cloud-compute
```

## Project Structure

A well-organized project structure is essential for multi-cloud.

```
multi-cloud/
├── ansible.cfg
├── inventory/
│   ├── aws/
│   │   ├── hosts.yml
│   │   └── group_vars/
│   │       └── all.yml
│   ├── azure/
│   │   ├── hosts.yml
│   │   └── group_vars/
│   │       └── all.yml
│   └── gcp/
│       ├── hosts.yml
│       └── group_vars/
│           └── all.yml
├── playbooks/
│   ├── provision-aws.yml
│   ├── provision-azure.yml
│   ├── provision-gcp.yml
│   ├── configure-all.yml
│   └── deploy-app.yml
├── roles/
│   ├── common/           # Shared across all clouds
│   ├── webserver/        # Cloud-agnostic web config
│   ├── database/         # Cloud-agnostic DB config
│   ├── aws_infra/        # AWS-specific provisioning
│   ├── azure_infra/      # Azure-specific provisioning
│   └── gcp_infra/        # GCP-specific provisioning
└── vars/
    ├── common.yml
    ├── aws.yml
    ├── azure.yml
    └── gcp.yml
```

## Credential Management

Each provider uses different authentication mechanisms. Keep them separate and secure.

```yaml
# vars/aws.yml (encrypt with ansible-vault)
---
aws_region: us-east-1
aws_access_key: "AKIAXXXXXXXXXXXXXXXX"
aws_secret_key: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# vars/azure.yml
---
azure_subscription_id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
azure_client_id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
azure_secret: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
azure_tenant: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
azure_location: eastus

# vars/gcp.yml
---
gcp_project: my-project-id
gcp_region: us-central1
gcp_zone: us-central1-a
gcp_auth_kind: serviceaccount
gcp_service_account_file: /path/to/service-account.json
```

## Provisioning on AWS

```yaml
# playbooks/provision-aws.yml
---
- name: Provision AWS infrastructure
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/common.yml
    - ../vars/aws.yml

  tasks:
    # Create VPC
    - name: Create AWS VPC
      amazon.aws.ec2_vpc_net:
        name: "{{ project_name }}-vpc"
        cidr_block: 10.0.0.0/16
        region: "{{ aws_region }}"
        tags:
          Project: "{{ project_name }}"
          Cloud: aws
        state: present
      register: aws_vpc

    # Create subnet
    - name: Create public subnet
      amazon.aws.ec2_vpc_subnet:
        vpc_id: "{{ aws_vpc.vpc.id }}"
        cidr: 10.0.1.0/24
        az: "{{ aws_region }}a"
        region: "{{ aws_region }}"
        tags:
          Name: "{{ project_name }}-public"
        state: present
      register: aws_subnet

    # Create security group
    - name: Create web security group
      amazon.aws.ec2_security_group:
        name: "{{ project_name }}-web-sg"
        description: "Web server security group"
        vpc_id: "{{ aws_vpc.vpc.id }}"
        region: "{{ aws_region }}"
        rules:
          - proto: tcp
            ports: [80, 443]
            cidr_ip: 0.0.0.0/0
          - proto: tcp
            ports: [22]
            cidr_ip: 10.0.0.0/8
        state: present
      register: aws_sg

    # Launch instances
    - name: Create EC2 instances
      amazon.aws.ec2_instance:
        name: "{{ project_name }}-web-{{ item }}"
        instance_type: t3.medium
        image_id: ami-0c55b159cbfafe1f0
        key_name: deploy-key
        vpc_subnet_id: "{{ aws_subnet.subnet.id }}"
        security_group: "{{ aws_sg.group_id }}"
        region: "{{ aws_region }}"
        tags:
          Project: "{{ project_name }}"
          Role: webserver
          Cloud: aws
        state: running
        wait: true
      loop: ["01", "02"]
      register: aws_instances
```

## Provisioning on Azure

```yaml
# playbooks/provision-azure.yml
---
- name: Provision Azure infrastructure
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/common.yml
    - ../vars/azure.yml

  tasks:
    # Create resource group
    - name: Create Azure resource group
      azure.azcollection.azure_rm_resourcegroup:
        name: "{{ project_name }}-rg"
        location: "{{ azure_location }}"
        tags:
          Project: "{{ project_name }}"
          Cloud: azure
        state: present

    # Create virtual network
    - name: Create Azure VNet
      azure.azcollection.azure_rm_virtualnetwork:
        resource_group: "{{ project_name }}-rg"
        name: "{{ project_name }}-vnet"
        address_prefixes: "10.1.0.0/16"
        state: present

    # Create subnet
    - name: Create subnet
      azure.azcollection.azure_rm_subnet:
        resource_group: "{{ project_name }}-rg"
        virtual_network_name: "{{ project_name }}-vnet"
        name: "{{ project_name }}-subnet"
        address_prefix_cidr: "10.1.1.0/24"
        state: present

    # Create network security group
    - name: Create NSG
      azure.azcollection.azure_rm_securitygroup:
        resource_group: "{{ project_name }}-rg"
        name: "{{ project_name }}-nsg"
        rules:
          - name: AllowHTTP
            protocol: Tcp
            destination_port_range: [80, 443]
            access: Allow
            priority: 100
            direction: Inbound
          - name: AllowSSH
            protocol: Tcp
            destination_port_range: 22
            source_address_prefix: "10.0.0.0/8"
            access: Allow
            priority: 110
            direction: Inbound
        state: present

    # Create VMs
    - name: Create Azure VMs
      azure.azcollection.azure_rm_virtualmachine:
        resource_group: "{{ project_name }}-rg"
        name: "{{ project_name }}-web-{{ item }}"
        vm_size: Standard_B2s
        admin_username: deploy
        ssh_password_enabled: false
        ssh_public_keys:
          - path: /home/deploy/.ssh/authorized_keys
            key_data: "{{ lookup('file', '~/.ssh/deploy.pub') }}"
        image:
          offer: 0001-com-ubuntu-server-jammy
          publisher: Canonical
          sku: 22_04-lts
          version: latest
        virtual_network_name: "{{ project_name }}-vnet"
        subnet_name: "{{ project_name }}-subnet"
        tags:
          Project: "{{ project_name }}"
          Role: webserver
          Cloud: azure
        state: present
      loop: ["01", "02"]
      register: azure_instances
```

## Provisioning on GCP

```yaml
# playbooks/provision-gcp.yml
---
- name: Provision GCP infrastructure
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/common.yml
    - ../vars/gcp.yml

  tasks:
    # Create VPC network
    - name: Create GCP VPC
      google.cloud.gcp_compute_network:
        name: "{{ project_name }}-vpc"
        auto_create_subnetworks: false
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_auth_kind }}"
        service_account_file: "{{ gcp_service_account_file }}"
        state: present
      register: gcp_network

    # Create subnet
    - name: Create GCP subnet
      google.cloud.gcp_compute_subnetwork:
        name: "{{ project_name }}-subnet"
        network: "{{ gcp_network }}"
        ip_cidr_range: 10.2.1.0/24
        region: "{{ gcp_region }}"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_auth_kind }}"
        service_account_file: "{{ gcp_service_account_file }}"
        state: present
      register: gcp_subnet

    # Create firewall rules
    - name: Create web firewall rule
      google.cloud.gcp_compute_firewall:
        name: "{{ project_name }}-allow-web"
        network: "{{ gcp_network }}"
        allowed:
          - ip_protocol: tcp
            ports: ['80', '443']
        source_ranges: ['0.0.0.0/0']
        target_tags: ['web']
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_auth_kind }}"
        service_account_file: "{{ gcp_service_account_file }}"
        state: present

    # Create instances
    - name: Create GCP instances
      google.cloud.gcp_compute_instance:
        name: "{{ project_name }}-web-{{ item }}"
        machine_type: "e2-medium"
        zone: "{{ gcp_zone }}"
        disks:
          - auto_delete: true
            boot: true
            initialize_params:
              source_image: projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts
              disk_size_gb: 30
        network_interfaces:
          - network: "{{ gcp_network }}"
            subnetwork: "{{ gcp_subnet }}"
            access_configs:
              - name: External NAT
                type: ONE_TO_ONE_NAT
        tags:
          items: ['web']
        labels:
          project: "{{ project_name }}"
          role: webserver
          cloud: gcp
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_auth_kind }}"
        service_account_file: "{{ gcp_service_account_file }}"
        state: present
      loop: ["01", "02"]
      register: gcp_instances
```

## Cloud-Agnostic Configuration

The real value comes from configuration playbooks that work regardless of which cloud the server is on.

```yaml
# playbooks/configure-all.yml
---
- name: Configure all web servers across clouds
  hosts: webservers
  become: true

  roles:
    # Common role works on any Linux server
    - role: common
      vars:
        packages:
          - nginx
          - certbot
          - htop
          - curl
    - role: webserver
    - role: monitoring_agent
      vars:
        monitoring_endpoint: "https://monitoring.myapp.com"
```

```yaml
# roles/common/tasks/main.yml
---
- name: Update package cache
  ansible.builtin.apt:
    update_cache: true
    cache_valid_time: 3600
  when: ansible_os_family == "Debian"

- name: Install required packages
  ansible.builtin.apt:
    name: "{{ packages }}"
    state: present
  when: ansible_os_family == "Debian"

- name: Set hostname
  ansible.builtin.hostname:
    name: "{{ inventory_hostname }}"

- name: Configure NTP
  ansible.builtin.service:
    name: "{{ 'chrony' if ansible_os_family == 'Debian' else 'ntpd' }}"
    state: started
    enabled: true
```

## Multi-Cloud Orchestration

A master playbook that orchestrates the entire multi-cloud deployment.

```yaml
# playbooks/deploy-multi-cloud.yml
---
- name: Deploy on AWS
  ansible.builtin.import_playbook: provision-aws.yml

- name: Deploy on Azure
  ansible.builtin.import_playbook: provision-azure.yml

- name: Deploy on GCP
  ansible.builtin.import_playbook: provision-gcp.yml

- name: Configure all servers
  ansible.builtin.import_playbook: configure-all.yml

- name: Deploy application
  ansible.builtin.import_playbook: deploy-app.yml
```

## Practical Lessons

1. **Abstract cloud-specific details into roles.** Your configuration playbooks should not care which cloud a server runs on. Push all cloud-specific logic into provisioning roles.
2. **Use a consistent naming convention.** Same naming scheme across all clouds makes inventory management tractable. Include the cloud provider in the name or tags.
3. **Network CIDR planning is critical.** If your clouds need to talk to each other (via VPN or peering), their CIDR ranges must not overlap. Plan this before you write a single line of Ansible.
4. **Test on one cloud first.** Get your configuration roles working on one provider, then extend to others. Trying to debug issues across three clouds simultaneously is miserable.
5. **Centralize credentials management.** Use Ansible Vault, HashiCorp Vault, or your CI/CD platform's secrets management. Never store credentials in plaintext.

Multi-cloud with Ansible is not simple, but it is simpler than maintaining separate toolchains for each provider. The consistency you get from a single automation layer pays dividends as your infrastructure grows.
