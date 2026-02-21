# How to Use Ansible to Manage DigitalOcean Droplets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DigitalOcean, Cloud, Droplets, Automation

Description: Manage DigitalOcean Droplets with Ansible for automated provisioning, configuration, snapshots, and lifecycle management.

---

DigitalOcean is one of the most developer-friendly cloud providers out there. Their API is clean, their pricing is straightforward, and their Droplets are fast to provision. Pairing DigitalOcean with Ansible gives you a lightweight but powerful infrastructure automation setup that works great for startups, side projects, and production workloads alike.

This guide covers creating Droplets, managing SSH keys, configuring firewalls, taking snapshots, and building multi-server environments with Ansible.

## Prerequisites

You need:

- Ansible 2.12+ on your control node
- The `community.digitalocean` collection
- A DigitalOcean account with an API token
- Python `requests` library

```bash
# Install the DigitalOcean collection
ansible-galaxy collection install community.digitalocean

# Install Python dependencies
pip install requests
```

Generate an API token from the DigitalOcean control panel under API > Tokens. Store it securely.

```yaml
# vars/do_credentials.yml (encrypt with ansible-vault)
---
do_api_token: "dop_v1_your_api_token_here"
```

## Creating a Single Droplet

The `community.digitalocean.digital_ocean_droplet` module handles Droplet creation.

```yaml
# playbooks/create-droplet.yml
---
- name: Create a DigitalOcean Droplet
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/do_credentials.yml

  tasks:
    # Create a basic Ubuntu Droplet
    - name: Create web server Droplet
      community.digitalocean.digital_ocean_droplet:
        oauth_token: "{{ do_api_token }}"
        state: present
        name: web-01
        size: s-2vcpu-4gb
        region: nyc3
        image: ubuntu-22-04-x64
        ssh_keys:
          - "ab:cd:ef:12:34:56:78:90:ab:cd:ef:12:34:56:78:90"
        monitoring: true
        tags:
          - web
          - production
        wait: true
        wait_timeout: 300
        unique_name: true
      register: droplet_result

    - name: Show Droplet info
      ansible.builtin.debug:
        msg: "Droplet {{ droplet_result.data.droplet.name }} created at {{ droplet_result.data.droplet.networks.v4[0].ip_address }}"
```

## Managing SSH Keys

Before creating Droplets, upload your SSH keys.

```yaml
# playbooks/manage-ssh-keys.yml
---
- name: Manage DigitalOcean SSH keys
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/do_credentials.yml

  tasks:
    # Upload an SSH public key
    - name: Add deploy SSH key
      community.digitalocean.digital_ocean_sshkey:
        oauth_token: "{{ do_api_token }}"
        name: "deploy-key"
        ssh_pub_key: "{{ lookup('file', '~/.ssh/deploy.pub') }}"
        state: present
      register: ssh_key

    - name: Store SSH key fingerprint
      ansible.builtin.set_fact:
        deploy_key_id: "{{ ssh_key.data.ssh_key.id }}"

    - name: Show key fingerprint
      ansible.builtin.debug:
        msg: "SSH key ID: {{ deploy_key_id }}, Fingerprint: {{ ssh_key.data.ssh_key.fingerprint }}"
```

## Creating Multiple Droplets

For multi-server deployments, define your infrastructure in variables and loop.

```yaml
# playbooks/create-infrastructure.yml
---
- name: Create DigitalOcean infrastructure
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/do_credentials.yml

  vars:
    ssh_key_fingerprint: "ab:cd:ef:12:34:56:78:90:ab:cd:ef:12:34:56:78:90"
    droplets:
      - name: web-01
        size: s-2vcpu-4gb
        region: nyc3
        image: ubuntu-22-04-x64
        tags: [web, production]
      - name: web-02
        size: s-2vcpu-4gb
        region: nyc3
        image: ubuntu-22-04-x64
        tags: [web, production]
      - name: app-01
        size: s-4vcpu-8gb
        region: nyc3
        image: ubuntu-22-04-x64
        tags: [app, production]
      - name: db-01
        size: s-8vcpu-16gb
        region: nyc3
        image: ubuntu-22-04-x64
        tags: [database, production]

  tasks:
    # Create all Droplets
    - name: Provision Droplets
      community.digitalocean.digital_ocean_droplet:
        oauth_token: "{{ do_api_token }}"
        state: present
        name: "{{ item.name }}"
        size: "{{ item.size }}"
        region: "{{ item.region }}"
        image: "{{ item.image }}"
        ssh_keys:
          - "{{ ssh_key_fingerprint }}"
        monitoring: true
        tags: "{{ item.tags }}"
        wait: true
        unique_name: true
      loop: "{{ droplets }}"
      loop_control:
        label: "{{ item.name }}"
      register: created_droplets

    # Build a dynamic inventory from the created Droplets
    - name: Add Droplets to in-memory inventory
      ansible.builtin.add_host:
        name: "{{ item.data.droplet.name }}"
        ansible_host: "{{ item.data.droplet.networks.v4 | selectattr('type', 'equalto', 'public') | map(attribute='ip_address') | first }}"
        ansible_user: root
        ansible_ssh_private_key_file: ~/.ssh/deploy
        groups: "{{ item.data.droplet.tags }}"
      loop: "{{ created_droplets.results }}"
      loop_control:
        label: "{{ item.data.droplet.name }}"

# Configure the newly created servers
- name: Wait for Droplets to be ready
  hosts: all
  gather_facts: false
  tasks:
    - name: Wait for SSH
      ansible.builtin.wait_for_connection:
        delay: 15
        timeout: 300

- name: Configure web servers
  hosts: web
  become: true
  gather_facts: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true
    - name: Start nginx
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
```

## Managing Firewalls

DigitalOcean Cloud Firewalls are applied at the network level, outside the Droplet. Configure them with Ansible.

```yaml
# playbooks/manage-firewalls.yml
---
- name: Configure DigitalOcean Cloud Firewalls
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/do_credentials.yml

  tasks:
    # Create a firewall for web servers
    - name: Create web server firewall
      community.digitalocean.digital_ocean_firewall:
        oauth_token: "{{ do_api_token }}"
        name: fw-web-servers
        state: present
        inbound_rules:
          - protocol: tcp
            ports: "80"
            sources:
              addresses: ["0.0.0.0/0", "::/0"]
          - protocol: tcp
            ports: "443"
            sources:
              addresses: ["0.0.0.0/0", "::/0"]
          - protocol: tcp
            ports: "22"
            sources:
              addresses: ["10.0.0.0/8"]
        outbound_rules:
          - protocol: tcp
            ports: "all"
            destinations:
              addresses: ["0.0.0.0/0", "::/0"]
          - protocol: udp
            ports: "all"
            destinations:
              addresses: ["0.0.0.0/0", "::/0"]
        droplet_ids: []
        tags:
          - web

    # Create a firewall for database servers
    - name: Create database firewall
      community.digitalocean.digital_ocean_firewall:
        oauth_token: "{{ do_api_token }}"
        name: fw-database-servers
        state: present
        inbound_rules:
          - protocol: tcp
            ports: "5432"
            sources:
              tags: [app]
          - protocol: tcp
            ports: "22"
            sources:
              addresses: ["10.0.0.0/8"]
        outbound_rules:
          - protocol: tcp
            ports: "all"
            destinations:
              addresses: ["0.0.0.0/0", "::/0"]
        tags:
          - database
```

## Managing Volumes

Attach block storage volumes to your Droplets for persistent data.

```yaml
# playbooks/manage-volumes.yml
---
- name: Manage DigitalOcean volumes
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/do_credentials.yml

  tasks:
    # Create a block storage volume
    - name: Create database data volume
      community.digitalocean.digital_ocean_block_storage:
        oauth_token: "{{ do_api_token }}"
        state: present
        command: create
        volume_name: db-data-vol
        region: nyc3
        block_size: 100
        description: "Database data volume"
      register: volume

    # Attach volume to a Droplet
    - name: Attach volume to db-01
      community.digitalocean.digital_ocean_block_storage:
        oauth_token: "{{ do_api_token }}"
        state: present
        command: attach
        volume_name: db-data-vol
        region: nyc3
        droplet_id: "{{ droplet_id }}"
```

## Taking Snapshots

Snapshots are essential for backups and creating golden images.

```yaml
# playbooks/manage-snapshots.yml
---
- name: Manage Droplet snapshots
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/do_credentials.yml

  tasks:
    # Get Droplet info first
    - name: Get Droplet details
      community.digitalocean.digital_ocean_droplet_info:
        oauth_token: "{{ do_api_token }}"
      register: all_droplets

    # Take snapshots of production Droplets
    - name: Create snapshot of web-01
      community.digitalocean.digital_ocean_snapshot:
        oauth_token: "{{ do_api_token }}"
        snapshot_type: droplet
        snapshot_name: "web-01-backup-{{ ansible_date_time.date | default('manual') }}"
        droplet_id: "{{ all_droplets.data | selectattr('name', 'equalto', 'web-01') | map(attribute='id') | first }}"
        state: present
        wait: true
        wait_timeout: 600
```

## Using Dynamic Inventory

Instead of manually tracking IPs, use the DigitalOcean dynamic inventory plugin.

```yaml
# inventory/digitalocean.yml
---
plugin: community.digitalocean.digitalocean
api_token: "{{ lookup('env', 'DO_API_TOKEN') }}"
attributes:
  - id
  - name
  - networks
  - region
  - size_slug
  - tags
keyed_groups:
  - key: do_tags
    prefix: tag
  - key: do_region.slug
    prefix: region
compose:
  ansible_host: do_networks.v4 | selectattr('type', 'equalto', 'public') | map(attribute='ip_address') | first
```

Run your playbooks with this dynamic inventory.

```bash
# Use the dynamic inventory to target Droplets by tag
DO_API_TOKEN=your_token ansible-playbook -i inventory/digitalocean.yml playbooks/configure-web.yml
```

## Droplet Resize

Scale Droplets up when you need more resources.

```yaml
# playbooks/resize-droplet.yml
---
- name: Resize a DigitalOcean Droplet
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/do_credentials.yml

  tasks:
    # Resize requires the Droplet to be powered off first
    - name: Power off Droplet before resize
      community.digitalocean.digital_ocean_droplet:
        oauth_token: "{{ do_api_token }}"
        state: present
        name: app-01
        unique_name: true
        region: nyc3
        size: s-4vcpu-8gb
        image: ubuntu-22-04-x64

    - name: Resize Droplet
      community.digitalocean.digital_ocean_droplet:
        oauth_token: "{{ do_api_token }}"
        state: present
        name: app-01
        unique_name: true
        size: s-8vcpu-16gb
        region: nyc3
        image: ubuntu-22-04-x64
        wait: true
```

## Tips for Managing DigitalOcean with Ansible

1. **Always use `unique_name: true`.** Without it, running the playbook twice creates duplicate Droplets with the same name. The unique_name flag makes the module idempotent.
2. **Use tags extensively.** Tags drive firewall rules and dynamic inventory grouping. Assign them during Droplet creation and reference them in your security rules.
3. **VPC networking is free.** DigitalOcean assigns a private IP to every Droplet in the same region. Use private IPs for inter-service communication to avoid bandwidth charges.
4. **Snapshots cost money.** Unlike some providers, DigitalOcean charges for snapshot storage. Automate snapshot cleanup to remove old backups.
5. **Monitoring is built in.** Enable the `monitoring: true` flag when creating Droplets to get metrics without installing a separate agent.

DigitalOcean plus Ansible is a combination that punches well above its weight. You get the simplicity of DigitalOcean with the power of Ansible's configuration management, and the whole setup is easier to maintain than most enterprise cloud deployments.
