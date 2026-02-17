# How to Write Ansible Playbooks for Provisioning Azure Virtual Machines at Scale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Azure, Virtual Machines, Automation, Infrastructure as Code, DevOps, Configuration Management

Description: Learn how to write Ansible playbooks that provision and configure Azure virtual machines at scale with dynamic inventory and parallel execution.

---

Ansible is not the first tool most people think of for Azure infrastructure provisioning. Terraform and Bicep tend to dominate that conversation. But Ansible has a unique advantage - it handles both provisioning and configuration management in a single tool. You can create the VM and configure the software on it in the same playbook, without switching tools or passing state between systems.

In this post, I will show how to write Ansible playbooks that provision Azure VMs at scale, configure them consistently, and use dynamic inventory to keep everything in sync.

## Setting Up Ansible for Azure

Before writing playbooks, you need the Azure modules installed. Ansible uses the `azure.azcollection` collection for Azure resources:

```bash
# Install the Azure collection and its Python dependencies
ansible-galaxy collection install azure.azcollection --force

# Install the required Python packages
pip install -r ~/.ansible/collections/ansible_collections/azure/azcollection/requirements.txt
```

For authentication, Ansible supports service principals, managed identities, and Azure CLI credentials. The easiest way for local development is to use your existing Azure CLI session:

```bash
# Log in to Azure - Ansible will use these credentials
az login
```

For CI/CD, set these environment variables:

```bash
# Service principal credentials for automated pipelines
export AZURE_CLIENT_ID="your-client-id"
export AZURE_SECRET="your-client-secret"
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_TENANT="your-tenant-id"
```

## Project Structure

I organize Ansible Azure projects like this:

```
ansible-azure/
  inventories/
    azure_rm.yml          # Dynamic inventory plugin
  group_vars/
    all.yml               # Global variables
    webservers.yml        # Variables for web server group
    dbservers.yml         # Variables for database server group
  roles/
    common/               # Base configuration for all VMs
    webserver/            # Nginx/Apache configuration
    monitoring/           # Monitoring agent setup
  playbooks/
    provision-vms.yml     # Create Azure VMs
    configure-vms.yml     # Configure software on VMs
    site.yml              # Full deployment - provision + configure
```

## Provisioning VMs with a Playbook

Here is a playbook that creates a set of Azure VMs with all the required supporting resources:

```yaml
# playbooks/provision-vms.yml - Create Azure VMs and supporting infrastructure
---
- name: Provision Azure Virtual Machines
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    resource_group: "rg-myapp-{{ env }}"
    location: "eastus2"
    vnet_name: "vnet-myapp-{{ env }}"
    vnet_cidr: "10.0.0.0/16"
    subnet_name: "snet-vms"
    subnet_cidr: "10.0.1.0/24"
    nsg_name: "nsg-myapp-{{ env }}"

    # Define the VMs to create - scale by adding entries
    vm_definitions:
      - name: "vm-web-{{ env }}-001"
        role: webserver
        vm_size: "Standard_D2s_v5"
        os_disk_size: 128
      - name: "vm-web-{{ env }}-002"
        role: webserver
        vm_size: "Standard_D2s_v5"
        os_disk_size: 128
      - name: "vm-web-{{ env }}-003"
        role: webserver
        vm_size: "Standard_D2s_v5"
        os_disk_size: 128
      - name: "vm-db-{{ env }}-001"
        role: dbserver
        vm_size: "Standard_D4s_v5"
        os_disk_size: 256
      - name: "vm-db-{{ env }}-002"
        role: dbserver
        vm_size: "Standard_D4s_v5"
        os_disk_size: 256

  tasks:
    # Create the resource group
    - name: Create resource group
      azure.azcollection.azure_rm_resourcegroup:
        name: "{{ resource_group }}"
        location: "{{ location }}"
        tags:
          Environment: "{{ env }}"
          ManagedBy: Ansible

    # Create the virtual network
    - name: Create virtual network
      azure.azcollection.azure_rm_virtualnetwork:
        resource_group: "{{ resource_group }}"
        name: "{{ vnet_name }}"
        address_prefixes_cidr:
          - "{{ vnet_cidr }}"

    # Create the subnet
    - name: Create subnet for VMs
      azure.azcollection.azure_rm_subnet:
        resource_group: "{{ resource_group }}"
        virtual_network_name: "{{ vnet_name }}"
        name: "{{ subnet_name }}"
        address_prefix_cidr: "{{ subnet_cidr }}"

    # Create network security group with common rules
    - name: Create network security group
      azure.azcollection.azure_rm_securitygroup:
        resource_group: "{{ resource_group }}"
        name: "{{ nsg_name }}"
        rules:
          - name: AllowSSH
            protocol: Tcp
            destination_port_range: 22
            access: Allow
            priority: 1000
            direction: Inbound
            source_address_prefix: "10.0.0.0/8"  # Only from internal network
          - name: AllowHTTPS
            protocol: Tcp
            destination_port_range: 443
            access: Allow
            priority: 1010
            direction: Inbound

    # Create NICs for all VMs in parallel using async
    - name: Create network interfaces
      azure.azcollection.azure_rm_networkinterface:
        resource_group: "{{ resource_group }}"
        name: "nic-{{ item.name }}"
        virtual_network: "{{ vnet_name }}"
        subnet_name: "{{ subnet_name }}"
        security_group: "{{ nsg_name }}"
        ip_configurations:
          - name: ipconfig1
            private_ip_allocation_method: Dynamic
      loop: "{{ vm_definitions }}"
      async: 300    # Run in parallel, wait up to 5 minutes
      poll: 0       # Do not wait for each one
      register: nic_jobs

    # Wait for all NIC creation tasks to complete
    - name: Wait for NIC creation to complete
      async_status:
        jid: "{{ item.ansible_job_id }}"
      loop: "{{ nic_jobs.results }}"
      register: nic_results
      until: nic_results.finished
      retries: 30
      delay: 10

    # Create VMs in parallel
    - name: Create virtual machines
      azure.azcollection.azure_rm_virtualmachine:
        resource_group: "{{ resource_group }}"
        name: "{{ item.name }}"
        vm_size: "{{ item.vm_size }}"
        admin_username: azureuser
        ssh_password_enabled: false
        ssh_public_keys:
          - path: /home/azureuser/.ssh/authorized_keys
            key_data: "{{ lookup('file', '~/.ssh/id_rsa.pub') }}"
        network_interfaces:
          - "nic-{{ item.name }}"
        image:
          offer: 0001-com-ubuntu-server-jammy
          publisher: Canonical
          sku: 22_04-lts
          version: latest
        managed_disk_type: Premium_LRS
        os_disk_size_gb: "{{ item.os_disk_size }}"
        tags:
          Environment: "{{ env }}"
          Role: "{{ item.role }}"
          ManagedBy: Ansible
      loop: "{{ vm_definitions }}"
      async: 600    # VMs take longer, allow up to 10 minutes
      poll: 0
      register: vm_jobs

    # Wait for all VM creation to complete
    - name: Wait for VM creation to complete
      async_status:
        jid: "{{ item.ansible_job_id }}"
      loop: "{{ vm_jobs.results }}"
      register: vm_results
      until: vm_results.finished
      retries: 60
      delay: 10
```

The key pattern here is using `async` and `poll: 0` to run tasks in parallel. Without this, Ansible would create VMs one at a time, which is painfully slow when you have dozens of them.

## Dynamic Inventory

Static inventory files do not work well with cloud infrastructure that changes frequently. Azure dynamic inventory automatically discovers VMs based on tags and resource groups:

```yaml
# inventories/azure_rm.yml - Azure dynamic inventory configuration
plugin: azure.azcollection.azure_rm

# Authenticate using environment variables or Azure CLI
auth_source: auto

# Only include VMs from specific resource groups
include_vm_resource_groups:
  - "rg-myapp-*"

# Group VMs by their tags
keyed_groups:
  # Group by the 'Role' tag: webserver, dbserver, etc.
  - prefix: role
    key: tags.Role | default('untagged')

  # Group by the 'Environment' tag
  - prefix: env
    key: tags.Environment | default('unknown')

# Use the private IP as the ansible_host
hostvar_expressions:
  ansible_host: private_ipv4_addresses[0]

# Only include running VMs
conditional_groups:
  running: powerstate == "running"
```

Test the dynamic inventory to see what it discovers:

```bash
# List all discovered hosts and their groups
ansible-inventory -i inventories/azure_rm.yml --list

# Show a graph of the inventory grouping
ansible-inventory -i inventories/azure_rm.yml --graph
```

## Configuration Playbook

After provisioning, configure the VMs. This is where Ansible really shines compared to Terraform:

```yaml
# playbooks/configure-vms.yml - Configure software on provisioned VMs
---
- name: Base configuration for all VMs
  hosts: running
  become: true
  gather_facts: true

  roles:
    - common  # Install base packages, configure NTP, setup monitoring

- name: Configure web servers
  hosts: role_webserver
  become: true

  roles:
    - webserver

- name: Configure database servers
  hosts: role_dbserver
  become: true

  roles:
    - dbserver
```

And the common role that every VM gets:

```yaml
# roles/common/tasks/main.yml - Base configuration applied to all VMs
---
- name: Update apt package cache
  apt:
    update_cache: true
    cache_valid_time: 3600

- name: Install essential packages
  apt:
    name:
      - curl
      - vim
      - htop
      - unzip
      - jq
      - fail2ban
      - ufw
    state: present

- name: Configure UFW firewall - deny all incoming by default
  ufw:
    state: enabled
    policy: deny
    direction: incoming

- name: Allow SSH through UFW
  ufw:
    rule: allow
    port: "22"
    proto: tcp

- name: Set timezone to UTC
  timezone:
    name: UTC

- name: Configure automatic security updates
  apt:
    name: unattended-upgrades
    state: present

- name: Install Azure Monitor agent
  shell: |
    wget https://aka.ms/InstallAzureMonitorAgentLinux -O install_ama.sh
    bash install_ama.sh
  args:
    creates: /opt/microsoft/azuremonitoragent/  # Skip if already installed
```

## Running at Scale

When you have 50 or 100 VMs, Ansible's default serial execution is too slow. Tune these settings in `ansible.cfg`:

```ini
# ansible.cfg - Performance tuning for large-scale deployments
[defaults]
# Run tasks on 20 hosts simultaneously
forks = 20

# Use SSH pipelining to reduce connection overhead
pipelining = True

# Cache facts to avoid re-gathering on subsequent runs
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible-facts-cache
fact_caching_timeout = 3600

[ssh_connection]
# Reuse SSH connections for faster execution
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=no
```

For very large deployments, use the `serial` keyword to roll out changes in batches:

```yaml
# Roll out changes to web servers in batches of 5
- name: Configure web servers
  hosts: role_webserver
  become: true
  serial: 5  # Configure 5 at a time

  roles:
    - webserver
```

## The Full Site Playbook

Combine provisioning and configuration into a single entry point:

```yaml
# playbooks/site.yml - Full deployment: provision + configure
---
- import_playbook: provision-vms.yml
- import_playbook: configure-vms.yml
```

Run it with:

```bash
# Deploy to staging
ansible-playbook playbooks/site.yml -e env=staging -i inventories/azure_rm.yml

# Deploy to production with verbose output
ansible-playbook playbooks/site.yml -e env=production -i inventories/azure_rm.yml -v
```

## Wrapping Up

Ansible gives you a single tool for both provisioning Azure VMs and configuring the software on them. The combination of dynamic inventory, async parallel execution, and roles makes it practical even at large scale. While Terraform might be a better choice for pure infrastructure provisioning, Ansible fills the gap when you need to manage the full lifecycle from VM creation to application deployment. Use async tasks for parallel provisioning, dynamic inventory to keep track of your fleet, and roles to keep your configuration organized and reusable.
