# How to Use Ansible to Manage Vultr Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vultr, Cloud Computing, Server Provisioning, Automation

Description: Provision and manage Vultr cloud instances with Ansible including server creation, firewalls, snapshots, and block storage.

---

Vultr is a cloud provider that offers compute instances across a wide network of global datacenters. Their pricing is competitive, the API is clean, and Ansible has good module support through the community collection. If you are looking for an alternative to the major cloud providers for simpler workloads, Vultr paired with Ansible is worth considering.

This guide covers creating instances, managing firewalls, working with block storage, and automating full deployments on Vultr.

## Prerequisites

You need:

- Ansible 2.12+ on your control node
- The `vultr.cloud` collection
- A Vultr API key (generated from the Vultr control panel under Account > API)

```bash
# Install the Vultr Ansible collection
ansible-galaxy collection install vultr.cloud

# Install Python dependencies
pip install requests
```

```yaml
# vars/vultr_credentials.yml (encrypt with ansible-vault)
---
vultr_api_key: "your-vultr-api-key-here"
```

Set the API key as an environment variable or pass it through module parameters.

```bash
# Set the API key in your environment
export VULTR_API_KEY="your-vultr-api-key-here"
```

## Creating a Single Instance

The `vultr.cloud.instance` module manages Vultr compute instances.

```yaml
# playbooks/create-vultr-instance.yml
---
- name: Create a Vultr instance
  hosts: localhost
  gather_facts: false

  environment:
    VULTR_API_KEY: "{{ lookup('env', 'VULTR_API_KEY') }}"

  tasks:
    # Create a basic compute instance
    - name: Create web server
      vultr.cloud.instance:
        label: web-01
        hostname: web-01
        region: ewr
        plan: vc2-2c-4gb
        os: "Ubuntu 22.04 LTS x64"
        ssh_keys:
          - deploy-key
        enable_ipv6: true
        backups: true
        tags:
          - web
          - production
        state: present
      register: instance

    - name: Show instance info
      ansible.builtin.debug:
        msg: "Instance {{ instance.vultr_instance.label }} at {{ instance.vultr_instance.main_ip }}"
```

## Managing SSH Keys

Upload SSH keys before creating instances.

```yaml
# playbooks/manage-ssh-keys.yml
---
- name: Manage Vultr SSH keys
  hosts: localhost
  gather_facts: false

  tasks:
    # Upload your deployment SSH key
    - name: Add deploy SSH key to Vultr
      vultr.cloud.ssh_key:
        name: deploy-key
        ssh_key: "{{ lookup('file', '~/.ssh/deploy.pub') }}"
        state: present
      register: ssh_key_result

    - name: Show SSH key info
      ansible.builtin.debug:
        msg: "SSH key {{ ssh_key_result.vultr_ssh_key.name }} uploaded"
```

## Multi-Instance Deployment

Define your server fleet in variables and provision everything at once.

```yaml
# playbooks/create-infrastructure.yml
---
- name: Create Vultr infrastructure
  hosts: localhost
  gather_facts: false

  vars:
    instances:
      - label: web-01
        plan: vc2-2c-4gb
        region: ewr
        os: "Ubuntu 22.04 LTS x64"
        tags: [web, production]
      - label: web-02
        plan: vc2-2c-4gb
        region: ewr
        os: "Ubuntu 22.04 LTS x64"
        tags: [web, production]
      - label: app-01
        plan: vc2-4c-8gb
        region: ewr
        os: "Ubuntu 22.04 LTS x64"
        tags: [app, production]
      - label: db-01
        plan: vdc-4c-16gb-320gb-amd
        region: ewr
        os: "Ubuntu 22.04 LTS x64"
        tags: [database, production]

  tasks:
    # Create all instances in a loop
    - name: Provision instances
      vultr.cloud.instance:
        label: "{{ item.label }}"
        hostname: "{{ item.label }}"
        region: "{{ item.region }}"
        plan: "{{ item.plan }}"
        os: "{{ item.os }}"
        ssh_keys:
          - deploy-key
        tags: "{{ item.tags }}"
        backups: true
        state: present
      loop: "{{ instances }}"
      loop_control:
        label: "{{ item.label }}"
      register: created_instances

    # Build in-memory inventory
    - name: Add instances to inventory
      ansible.builtin.add_host:
        name: "{{ item.vultr_instance.label }}"
        ansible_host: "{{ item.vultr_instance.main_ip }}"
        ansible_user: root
        ansible_ssh_private_key_file: ~/.ssh/deploy
        groups: "{{ item.vultr_instance.tags }}"
      loop: "{{ created_instances.results }}"
      loop_control:
        label: "{{ item.vultr_instance.label }}"

# Configure the provisioned servers
- name: Wait for servers to boot
  hosts: all
  gather_facts: false
  tasks:
    - name: Wait for SSH
      ansible.builtin.wait_for_connection:
        delay: 30
        timeout: 300

- name: Base configuration
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Update packages
      ansible.builtin.apt:
        upgrade: dist
        update_cache: true

    - name: Install essential packages
      ansible.builtin.apt:
        name:
          - fail2ban
          - ufw
          - htop
          - curl
          - wget
        state: present
```

## Firewall Groups

Vultr firewall groups let you define network-level access rules.

```yaml
# playbooks/manage-firewalls.yml
---
- name: Manage Vultr firewall groups
  hosts: localhost
  gather_facts: false

  tasks:
    # Create a firewall group for web servers
    - name: Create web server firewall group
      vultr.cloud.firewall_group:
        description: "Web server firewall"
        state: present
      register: web_fw

    # Add rules to the firewall group
    - name: Allow HTTP
      vultr.cloud.firewall_rule:
        group: "{{ web_fw.vultr_firewall_group.id }}"
        ip_type: v4
        protocol: tcp
        port: "80"
        subnet: 0.0.0.0
        subnet_size: 0
        action: accept
        state: present

    - name: Allow HTTPS
      vultr.cloud.firewall_rule:
        group: "{{ web_fw.vultr_firewall_group.id }}"
        ip_type: v4
        protocol: tcp
        port: "443"
        subnet: 0.0.0.0
        subnet_size: 0
        action: accept
        state: present

    - name: Allow SSH from management
      vultr.cloud.firewall_rule:
        group: "{{ web_fw.vultr_firewall_group.id }}"
        ip_type: v4
        protocol: tcp
        port: "22"
        subnet: 10.0.0.0
        subnet_size: 8
        action: accept
        state: present

    # Create database firewall group
    - name: Create database firewall group
      vultr.cloud.firewall_group:
        description: "Database server firewall"
        state: present
      register: db_fw

    - name: Allow PostgreSQL from app subnet
      vultr.cloud.firewall_rule:
        group: "{{ db_fw.vultr_firewall_group.id }}"
        ip_type: v4
        protocol: tcp
        port: "5432"
        subnet: 10.10.0.0
        subnet_size: 16
        action: accept
        state: present
```

## Block Storage Management

Attach persistent block storage volumes to your instances.

```yaml
# playbooks/manage-block-storage.yml
---
- name: Manage Vultr block storage
  hosts: localhost
  gather_facts: false

  tasks:
    # Create a block storage volume
    - name: Create database volume
      vultr.cloud.block_storage:
        label: db-data
        region: ewr
        size_gb: 100
        block_type: storage_opt
        state: present
      register: volume

    - name: Show volume details
      ansible.builtin.debug:
        msg: "Volume {{ volume.vultr_block_storage.label }} created, {{ volume.vultr_block_storage.size_gb }}GB"

    # Attach volume to an instance
    - name: Attach volume to db-01
      vultr.cloud.block_storage:
        label: db-data
        attached_to_instance: db-01
        live: true
        state: present
```

## Startup Scripts

Vultr supports startup scripts that run when an instance first boots. Manage them with Ansible.

```yaml
# playbooks/manage-startup-scripts.yml
---
- name: Manage Vultr startup scripts
  hosts: localhost
  gather_facts: false

  tasks:
    # Create a startup script for web servers
    - name: Create web server startup script
      vultr.cloud.startup_script:
        name: web-server-setup
        type: boot
        script: |
          #!/bin/bash
          apt-get update
          apt-get install -y nginx certbot python3-certbot-nginx
          systemctl enable nginx
          systemctl start nginx

          # Configure basic firewall
          ufw allow 80/tcp
          ufw allow 443/tcp
          ufw allow 22/tcp
          ufw --force enable

          # Signal that setup is complete
          touch /tmp/setup-complete
        state: present
      register: startup_script

    # Use the startup script when creating an instance
    - name: Create instance with startup script
      vultr.cloud.instance:
        label: web-auto-01
        hostname: web-auto-01
        region: ewr
        plan: vc2-2c-4gb
        os: "Ubuntu 22.04 LTS x64"
        ssh_keys:
          - deploy-key
        script_id: "{{ startup_script.vultr_startup_script.id }}"
        state: present
```

## Snapshots

Take and manage instance snapshots for backup and cloning.

```yaml
# playbooks/manage-snapshots.yml
---
- name: Manage Vultr snapshots
  hosts: localhost
  gather_facts: false

  tasks:
    # Create a snapshot of an instance
    - name: Snapshot web-01
      vultr.cloud.snapshot:
        description: "web-01 pre-upgrade snapshot"
        instance: web-01
        state: present
      register: snapshot

    - name: Show snapshot info
      ansible.builtin.debug:
        msg: "Snapshot created: {{ snapshot.vultr_snapshot.id }}"

    # Create an instance from a snapshot
    - name: Create instance from snapshot
      vultr.cloud.instance:
        label: web-01-restored
        hostname: web-01-restored
        region: ewr
        plan: vc2-2c-4gb
        snapshot: "{{ snapshot.vultr_snapshot.id }}"
        ssh_keys:
          - deploy-key
        state: present
```

## VPC Networking

Vultr VPC (Virtual Private Cloud) lets you create isolated networks.

```yaml
# playbooks/manage-vpc.yml
---
- name: Manage Vultr VPC
  hosts: localhost
  gather_facts: false

  tasks:
    # Create a VPC for the application
    - name: Create application VPC
      vultr.cloud.vpc2:
        description: "Production application VPC"
        region: ewr
        ip_block: 10.10.0.0
        prefix_length: 16
        state: present
      register: vpc

    # Create instance attached to the VPC
    - name: Create instance in VPC
      vultr.cloud.instance:
        label: app-vpc-01
        hostname: app-vpc-01
        region: ewr
        plan: vc2-4c-8gb
        os: "Ubuntu 22.04 LTS x64"
        ssh_keys:
          - deploy-key
        vpc:
          - "{{ vpc.vultr_vpc2.id }}"
        state: present
```

## Cleanup Playbook

Clean up resources when they are no longer needed.

```yaml
# playbooks/teardown.yml
---
- name: Tear down Vultr infrastructure
  hosts: localhost
  gather_facts: false

  vars:
    instances_to_remove:
      - web-01
      - web-02
      - app-01
      - db-01

  tasks:
    - name: Delete instances
      vultr.cloud.instance:
        label: "{{ item }}"
        state: absent
      loop: "{{ instances_to_remove }}"

    - name: Delete block storage
      vultr.cloud.block_storage:
        label: db-data
        state: absent

    - name: Delete snapshots
      vultr.cloud.snapshot:
        description: "web-01 pre-upgrade snapshot"
        state: absent
```

## Tips from Experience

1. **Vultr instances boot fast.** Typical boot time is under 60 seconds, which is faster than most providers. Adjust your wait timeouts accordingly.
2. **Use high-frequency compute for latency-sensitive workloads.** Vultr's high-frequency plans use NVMe storage and high-clock CPUs, which make a noticeable difference for database servers.
3. **Private networking uses VPC.** Vultr deprecated their old private network feature in favor of VPC 2.0. Make sure you are using the VPC modules.
4. **Vultr has many regions.** With datacenters across North America, Europe, Asia, and Australia, you can place instances close to your users. Just keep your infrastructure definitions consistent across regions.
5. **API rate limits are generous.** Vultr allows 3 requests per second for most endpoints. For large deployments, this is usually not a problem, but add a small throttle if you are creating many resources at once.

Vultr plus Ansible is a lean combination that works well for teams that want cloud infrastructure without the complexity overhead of the major providers.
