# How to Use Ansible to Manage Linode Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Linode, Akamai Cloud, Cloud Provisioning, Automation

Description: Learn how to provision and manage Linode (Akamai Cloud) instances using Ansible for automated infrastructure management.

---

Linode, now part of Akamai Cloud, offers solid compute instances at competitive prices. Their API is well-documented, and the Ansible integration works reliably for automating instance lifecycle management. Whether you are running a handful of servers or managing a fleet, Ansible helps you keep things consistent and repeatable.

This guide covers creating Linode instances, managing volumes, configuring firewalls, and building automated deployment pipelines with Ansible.

## Prerequisites

You need:

- Ansible 2.12+ on your control node
- The `linode.cloud` collection
- A Linode API token with read/write access
- Python `linode_api4` library

```bash
# Install the Linode collection and Python SDK
ansible-galaxy collection install linode.cloud
pip install linode_api4
```

Create an API token from the Linode Cloud Manager under your profile settings. Give it the scopes you need (Linodes, Volumes, Firewalls, etc.).

```yaml
# vars/linode_credentials.yml (encrypt with ansible-vault)
---
linode_api_token: "your-linode-api-token-here"
```

## Creating a Single Instance

The `linode.cloud.instance` module handles Linode creation.

```yaml
# playbooks/create-linode.yml
---
- name: Create a Linode instance
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/linode_credentials.yml

  tasks:
    # Create a basic Ubuntu Linode
    - name: Create web server
      linode.cloud.instance:
        api_token: "{{ linode_api_token }}"
        label: web-01
        type: g6-standard-2
        region: us-east
        image: linode/ubuntu22.04
        root_pass: "{{ vault_root_password }}"
        authorized_keys:
          - "{{ lookup('file', '~/.ssh/deploy.pub') }}"
        tags:
          - web
          - production
        group: webservers
        state: present
      register: linode_instance

    - name: Show instance details
      ansible.builtin.debug:
        msg: "Linode {{ linode_instance.instance.label }} created at {{ linode_instance.instance.ipv4[0] }}"
```

## Creating Multiple Instances

For larger deployments, define your infrastructure in variables.

```yaml
# playbooks/create-infrastructure.yml
---
- name: Create Linode infrastructure
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/linode_credentials.yml

  vars:
    instances:
      - label: web-01
        type: g6-standard-2
        region: us-east
        image: linode/ubuntu22.04
        tags: [web, production]
      - label: web-02
        type: g6-standard-2
        region: us-east
        image: linode/ubuntu22.04
        tags: [web, production]
      - label: app-01
        type: g6-standard-4
        region: us-east
        image: linode/ubuntu22.04
        tags: [app, production]
      - label: db-01
        type: g6-dedicated-8
        region: us-east
        image: linode/ubuntu22.04
        tags: [database, production]

  tasks:
    # Create all instances
    - name: Provision Linode instances
      linode.cloud.instance:
        api_token: "{{ linode_api_token }}"
        label: "{{ item.label }}"
        type: "{{ item.type }}"
        region: "{{ item.region }}"
        image: "{{ item.image }}"
        root_pass: "{{ vault_root_password }}"
        authorized_keys:
          - "{{ lookup('file', '~/.ssh/deploy.pub') }}"
        tags: "{{ item.tags }}"
        state: present
      loop: "{{ instances }}"
      loop_control:
        label: "{{ item.label }}"
      register: created_instances

    # Add to in-memory inventory for configuration
    - name: Add instances to inventory
      ansible.builtin.add_host:
        name: "{{ item.instance.label }}"
        ansible_host: "{{ item.instance.ipv4[0] }}"
        ansible_user: root
        ansible_ssh_private_key_file: ~/.ssh/deploy
        groups: "{{ item.instance.tags }}"
      loop: "{{ created_instances.results }}"
      loop_control:
        label: "{{ item.instance.label }}"

- name: Wait for instances
  hosts: all
  gather_facts: false
  tasks:
    - name: Wait for SSH to be ready
      ansible.builtin.wait_for_connection:
        delay: 20
        timeout: 300

- name: Configure all instances
  hosts: all
  become: true
  gather_facts: true
  tasks:
    # Basic security hardening
    - name: Update all packages
      ansible.builtin.apt:
        upgrade: dist
        update_cache: true

    - name: Install common packages
      ansible.builtin.apt:
        name:
          - fail2ban
          - ufw
          - htop
          - curl
        state: present

    - name: Enable UFW with SSH allowed
      community.general.ufw:
        state: enabled
        rule: allow
        port: "22"
        proto: tcp
```

## Managing Linode Firewalls

Linode Cloud Firewalls work at the network level, providing an additional security layer outside your instances.

```yaml
# playbooks/manage-firewalls.yml
---
- name: Manage Linode Cloud Firewalls
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/linode_credentials.yml

  tasks:
    # Create a firewall for web servers
    - name: Create web firewall
      linode.cloud.firewall:
        api_token: "{{ linode_api_token }}"
        label: fw-web-servers
        rules:
          inbound:
            - label: allow-http
              action: ACCEPT
              protocol: TCP
              ports: "80"
              addresses:
                ipv4: ["0.0.0.0/0"]
                ipv6: ["::/0"]
            - label: allow-https
              action: ACCEPT
              protocol: TCP
              ports: "443"
              addresses:
                ipv4: ["0.0.0.0/0"]
                ipv6: ["::/0"]
            - label: allow-ssh
              action: ACCEPT
              protocol: TCP
              ports: "22"
              addresses:
                ipv4: ["10.0.0.0/8"]
          inbound_policy: DROP
          outbound:
            - label: allow-all-outbound
              action: ACCEPT
              protocol: TCP
              ports: "1-65535"
              addresses:
                ipv4: ["0.0.0.0/0"]
                ipv6: ["::/0"]
          outbound_policy: DROP
        state: present
      register: web_fw

    # Create a firewall for databases
    - name: Create database firewall
      linode.cloud.firewall:
        api_token: "{{ linode_api_token }}"
        label: fw-database-servers
        rules:
          inbound:
            - label: allow-postgres-from-app
              action: ACCEPT
              protocol: TCP
              ports: "5432"
              addresses:
                ipv4: ["192.168.0.0/16"]
            - label: allow-ssh
              action: ACCEPT
              protocol: TCP
              ports: "22"
              addresses:
                ipv4: ["10.0.0.0/8"]
          inbound_policy: DROP
          outbound_policy: ACCEPT
        state: present
```

## Managing Volumes

Attach persistent block storage to your instances.

```yaml
# playbooks/manage-volumes.yml
---
- name: Manage Linode volumes
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/linode_credentials.yml

  tasks:
    # Create a volume for database storage
    - name: Create database volume
      linode.cloud.volume:
        api_token: "{{ linode_api_token }}"
        label: db-data-vol
        region: us-east
        size: 100
        state: present
      register: db_volume

    - name: Display volume info
      ansible.builtin.debug:
        msg: "Volume {{ db_volume.volume.label }} created, {{ db_volume.volume.size }}GB"

    # Attach volume to the database instance
    - name: Attach volume to db-01
      linode.cloud.volume:
        api_token: "{{ linode_api_token }}"
        label: db-data-vol
        linode_id: "{{ db_linode_id }}"
        state: present
```

After attaching, format and mount the volume on the instance.

```yaml
# playbooks/configure-volume.yml
---
- name: Configure attached volume
  hosts: database
  become: true

  tasks:
    # Format the volume (only if not already formatted)
    - name: Check if volume is formatted
      ansible.builtin.command: blkid /dev/disk/by-id/scsi-0Linode_Volume_db-data-vol
      register: blkid_result
      changed_when: false
      failed_when: false

    - name: Format volume with ext4
      community.general.filesystem:
        fstype: ext4
        dev: /dev/disk/by-id/scsi-0Linode_Volume_db-data-vol
      when: blkid_result.rc != 0

    # Mount the volume
    - name: Create mount point
      ansible.builtin.file:
        path: /mnt/data
        state: directory
        mode: '0755'

    - name: Mount volume
      ansible.posix.mount:
        path: /mnt/data
        src: /dev/disk/by-id/scsi-0Linode_Volume_db-data-vol
        fstype: ext4
        opts: defaults,noatime
        state: mounted
```

## Using StackScripts with Ansible

Linode StackScripts are like cloud-init scripts specific to Linode. You can reference them when creating instances.

```yaml
# playbooks/create-with-stackscript.yml
---
- name: Create instance with StackScript
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/linode_credentials.yml

  tasks:
    # Create a Linode using a StackScript for initial setup
    - name: Create instance with StackScript
      linode.cloud.instance:
        api_token: "{{ linode_api_token }}"
        label: app-auto-01
        type: g6-standard-4
        region: us-east
        image: linode/ubuntu22.04
        root_pass: "{{ vault_root_password }}"
        authorized_keys:
          - "{{ lookup('file', '~/.ssh/deploy.pub') }}"
        stackscript_id: 12345
        stackscript_data:
          app_version: "2.5.0"
          db_host: "192.168.1.10"
        tags: [app, production]
        state: present
```

## NodeBalancers

Linode's load balancers (NodeBalancers) can be managed through the API, though direct Ansible module support varies. Use the URI module for full control.

```yaml
# playbooks/manage-nodebalancer.yml
---
- name: Manage Linode NodeBalancer
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/linode_credentials.yml

  tasks:
    # Create a NodeBalancer via API
    - name: Create NodeBalancer
      ansible.builtin.uri:
        url: "https://api.linode.com/v4/nodebalancers"
        method: POST
        headers:
          Authorization: "Bearer {{ linode_api_token }}"
          Content-Type: "application/json"
        body_format: json
        body:
          region: us-east
          label: web-lb
          tags:
            - production
        status_code: 200
      register: nodebalancer

    # Add a configuration to the NodeBalancer
    - name: Configure NodeBalancer port 443
      ansible.builtin.uri:
        url: "https://api.linode.com/v4/nodebalancers/{{ nodebalancer.json.id }}/configs"
        method: POST
        headers:
          Authorization: "Bearer {{ linode_api_token }}"
          Content-Type: "application/json"
        body_format: json
        body:
          port: 443
          protocol: https
          algorithm: roundrobin
          check: http
          check_path: "/health"
          check_interval: 10
          check_timeout: 5
          check_attempts: 3
          ssl_cert: "{{ lookup('file', '/path/to/cert.pem') }}"
          ssl_key: "{{ lookup('file', '/path/to/key.pem') }}"
        status_code: 200
      register: nb_config
```

## Instance Lifecycle Management

Handle common operational tasks like resizing, rebooting, and deleting.

```yaml
# playbooks/lifecycle-management.yml
---
- name: Manage Linode instance lifecycle
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/linode_credentials.yml

  tasks:
    # Resize an instance (requires a reboot)
    - name: Resize app-01 to a larger plan
      linode.cloud.instance:
        api_token: "{{ linode_api_token }}"
        label: app-01
        type: g6-standard-8
        state: present

    # Delete an instance
    - name: Remove decommissioned server
      linode.cloud.instance:
        api_token: "{{ linode_api_token }}"
        label: old-web-03
        state: absent
```

## Practical Tips

1. **Use private networking.** Linode instances in the same datacenter can communicate over private IPs at no extra cost. Use the VLAN feature for network isolation between different application tiers.
2. **Dedicated CPU plans for databases.** Shared instances are fine for web servers, but database servers benefit from dedicated CPU plans where you get consistent compute performance.
3. **Backups are cheap insurance.** Enable Linode's backup service for critical instances. It costs a fraction of the instance price and gives you daily, weekly, and bi-weekly snapshots.
4. **Use labels consistently.** Linode labels must be unique across your account. Adopt a naming convention early (like `project-role-number`) and stick with it.
5. **API rate limits exist.** If you are creating many instances at once, add `throttle: 5` to your Ansible tasks to avoid hitting Linode's API rate limits.

Linode with Ansible gives you a clean, no-frills infrastructure automation setup that is easy to understand and maintain. The API is straightforward, the pricing is predictable, and the instances perform well for the cost.
