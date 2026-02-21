# How to Use Ansible to Manage Hetzner Cloud Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Hetzner Cloud, European Cloud, Server Management, Automation

Description: Learn to provision and manage Hetzner Cloud servers using Ansible with real examples for instances, networks, and firewalls.

---

Hetzner Cloud has earned a strong reputation among developers and small teams for offering excellent price-to-performance ratios, especially for European workloads. Their cloud servers are fast, their API is well-designed, and the Ansible integration through the `hetzner.hcloud` collection works reliably. If you are looking for affordable cloud compute with European data residency, Hetzner paired with Ansible is a solid choice.

This guide covers provisioning servers, managing networks, configuring firewalls, and handling volumes on Hetzner Cloud.

## Prerequisites

You need:

- Ansible 2.12+ on your control node
- The `hetzner.hcloud` collection
- Python `hcloud` library
- A Hetzner Cloud API token (generated from a project in the Hetzner Cloud Console)

```bash
# Install the Hetzner Cloud collection and Python SDK
ansible-galaxy collection install hetzner.hcloud
pip install hcloud
```

```yaml
# vars/hetzner_credentials.yml (encrypt with ansible-vault)
---
hcloud_api_token: "your-hetzner-api-token-here"
```

## Creating a Server

The `hetzner.hcloud.server` module handles server lifecycle.

```yaml
# playbooks/create-hetzner-server.yml
---
- name: Create a Hetzner Cloud server
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/hetzner_credentials.yml

  tasks:
    # Create a basic server in Nuremberg
    - name: Create web server
      hetzner.hcloud.server:
        api_token: "{{ hcloud_api_token }}"
        name: web-01
        server_type: cx21
        image: ubuntu-22.04
        location: nbg1
        ssh_keys:
          - deploy-key
        labels:
          role: web
          env: production
        state: present
      register: server

    - name: Show server details
      ansible.builtin.debug:
        msg: "Server {{ server.hcloud_server.name }} created at {{ server.hcloud_server.ipv4_address }}"
```

## Managing SSH Keys

Upload SSH keys to your Hetzner project.

```yaml
# playbooks/manage-ssh-keys.yml
---
- name: Manage Hetzner SSH keys
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/hetzner_credentials.yml

  tasks:
    - name: Upload deploy SSH key
      hetzner.hcloud.ssh_key:
        api_token: "{{ hcloud_api_token }}"
        name: deploy-key
        public_key: "{{ lookup('file', '~/.ssh/deploy.pub') }}"
        state: present
```

## Multi-Server Deployment

Provision a complete environment with web, application, and database servers.

```yaml
# playbooks/create-infrastructure.yml
---
- name: Create Hetzner Cloud infrastructure
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/hetzner_credentials.yml

  vars:
    servers:
      - name: web-01
        server_type: cx21
        location: nbg1
        labels: { role: web, env: prod }
      - name: web-02
        server_type: cx21
        location: nbg1
        labels: { role: web, env: prod }
      - name: app-01
        server_type: cx31
        location: nbg1
        labels: { role: app, env: prod }
      - name: db-01
        server_type: cx41
        location: nbg1
        labels: { role: database, env: prod }

  tasks:
    # Create all servers
    - name: Provision servers
      hetzner.hcloud.server:
        api_token: "{{ hcloud_api_token }}"
        name: "{{ item.name }}"
        server_type: "{{ item.server_type }}"
        image: ubuntu-22.04
        location: "{{ item.location }}"
        ssh_keys:
          - deploy-key
        labels: "{{ item.labels }}"
        state: present
      loop: "{{ servers }}"
      loop_control:
        label: "{{ item.name }}"
      register: created_servers

    # Build in-memory inventory
    - name: Add servers to inventory
      ansible.builtin.add_host:
        name: "{{ item.hcloud_server.name }}"
        ansible_host: "{{ item.hcloud_server.ipv4_address }}"
        ansible_user: root
        groups: "{{ item.hcloud_server.labels.role }}"
      loop: "{{ created_servers.results }}"
      loop_control:
        label: "{{ item.hcloud_server.name }}"

# Configure all servers
- name: Wait for connectivity
  hosts: all
  gather_facts: false
  tasks:
    - name: Wait for SSH
      ansible.builtin.wait_for_connection:
        delay: 10
        timeout: 300

- name: Base configuration
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true

    - name: Install base packages
      ansible.builtin.apt:
        name: [fail2ban, ufw, htop, curl, vim]
        state: present
```

## Network Management

Hetzner networks provide private networking between your servers. This is essential for keeping database traffic off the public internet.

```yaml
# playbooks/manage-networks.yml
---
- name: Manage Hetzner Cloud networks
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/hetzner_credentials.yml

  tasks:
    # Create a private network
    - name: Create production network
      hetzner.hcloud.network:
        api_token: "{{ hcloud_api_token }}"
        name: prod-network
        ip_range: 10.0.0.0/8
        state: present

    # Add subnets for different tiers
    - name: Create web subnet
      hetzner.hcloud.subnetwork:
        api_token: "{{ hcloud_api_token }}"
        network: prod-network
        ip_range: 10.0.1.0/24
        type: cloud
        network_zone: eu-central
        state: present

    - name: Create app subnet
      hetzner.hcloud.subnetwork:
        api_token: "{{ hcloud_api_token }}"
        network: prod-network
        ip_range: 10.0.2.0/24
        type: cloud
        network_zone: eu-central
        state: present

    - name: Create database subnet
      hetzner.hcloud.subnetwork:
        api_token: "{{ hcloud_api_token }}"
        network: prod-network
        ip_range: 10.0.3.0/24
        type: cloud
        network_zone: eu-central
        state: present

    # Attach servers to the network
    - name: Attach web-01 to network
      hetzner.hcloud.server_network:
        api_token: "{{ hcloud_api_token }}"
        server: web-01
        network: prod-network
        ip: 10.0.1.10
        state: present

    - name: Attach app-01 to network
      hetzner.hcloud.server_network:
        api_token: "{{ hcloud_api_token }}"
        server: app-01
        network: prod-network
        ip: 10.0.2.10
        state: present

    - name: Attach db-01 to network
      hetzner.hcloud.server_network:
        api_token: "{{ hcloud_api_token }}"
        server: db-01
        network: prod-network
        ip: 10.0.3.10
        state: present
```

## Firewall Management

Hetzner Cloud Firewalls filter traffic at the network level.

```yaml
# playbooks/manage-firewalls.yml
---
- name: Manage Hetzner Cloud Firewalls
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/hetzner_credentials.yml

  tasks:
    # Create firewall for web servers
    - name: Create web server firewall
      hetzner.hcloud.firewall:
        api_token: "{{ hcloud_api_token }}"
        name: fw-web
        rules:
          - description: Allow HTTP
            direction: in
            protocol: tcp
            port: "80"
            source_ips:
              - 0.0.0.0/0
              - ::/0
          - description: Allow HTTPS
            direction: in
            protocol: tcp
            port: "443"
            source_ips:
              - 0.0.0.0/0
              - ::/0
          - description: Allow SSH from management
            direction: in
            protocol: tcp
            port: "22"
            source_ips:
              - 10.0.0.0/8
        state: present

    # Apply firewall to servers by label
    - name: Apply web firewall to web servers
      hetzner.hcloud.firewall_resource:
        api_token: "{{ hcloud_api_token }}"
        firewall: fw-web
        label_selectors:
          - role=web
        state: present

    # Create database firewall
    - name: Create database firewall
      hetzner.hcloud.firewall:
        api_token: "{{ hcloud_api_token }}"
        name: fw-database
        rules:
          - description: Allow PostgreSQL from app subnet
            direction: in
            protocol: tcp
            port: "5432"
            source_ips:
              - 10.0.2.0/24
          - description: Allow SSH from management
            direction: in
            protocol: tcp
            port: "22"
            source_ips:
              - 10.0.0.0/8
        state: present

    - name: Apply database firewall
      hetzner.hcloud.firewall_resource:
        api_token: "{{ hcloud_api_token }}"
        firewall: fw-database
        label_selectors:
          - role=database
        state: present
```

## Volume Management

Attach persistent volumes for data that needs to survive server deletion.

```yaml
# playbooks/manage-volumes.yml
---
- name: Manage Hetzner Cloud volumes
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/hetzner_credentials.yml

  tasks:
    # Create a volume for the database
    - name: Create database volume
      hetzner.hcloud.volume:
        api_token: "{{ hcloud_api_token }}"
        name: db-data
        size: 100
        location: nbg1
        format: ext4
        server: db-01
        automount: true
        state: present
      register: db_volume

    - name: Show volume mount point
      ansible.builtin.debug:
        msg: "Volume mounted at {{ db_volume.hcloud_volume.linux_device }}"
```

## Floating IPs

Floating IPs persist across server rebuilds and can be moved between servers.

```yaml
# playbooks/manage-floating-ips.yml
---
- name: Manage Hetzner floating IPs
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/hetzner_credentials.yml

  tasks:
    # Create a floating IP
    - name: Create floating IP for load balancer
      hetzner.hcloud.floating_ip:
        api_token: "{{ hcloud_api_token }}"
        name: lb-floating-ip
        type: ipv4
        home_location: nbg1
        server: web-01
        labels:
          purpose: load-balancer
        state: present
      register: floating_ip

    - name: Show floating IP
      ansible.builtin.debug:
        msg: "Floating IP: {{ floating_ip.hcloud_floating_ip.ip }}"
```

## Load Balancers

Hetzner offers managed load balancers that integrate well with their server infrastructure.

```yaml
# playbooks/manage-load-balancer.yml
---
- name: Manage Hetzner load balancer
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../vars/hetzner_credentials.yml

  tasks:
    # Create a load balancer
    - name: Create web load balancer
      hetzner.hcloud.load_balancer:
        api_token: "{{ hcloud_api_token }}"
        name: lb-web
        load_balancer_type: lb11
        location: nbg1
        labels:
          role: loadbalancer
        state: present

    # Add targets by label
    - name: Add web servers as targets
      hetzner.hcloud.load_balancer_target:
        api_token: "{{ hcloud_api_token }}"
        load_balancer: lb-web
        type: label_selector
        label_selector: role=web
        state: present

    # Add a service
    - name: Configure HTTPS service
      hetzner.hcloud.load_balancer_service:
        api_token: "{{ hcloud_api_token }}"
        load_balancer: lb-web
        listen_port: 443
        destination_port: 443
        protocol: tcp
        health_check:
          protocol: http
          port: 80
          interval: 10
          timeout: 5
          retries: 3
          http:
            path: /health
        state: present
```

## Practical Tips

1. **Hetzner pricing is location-dependent.** Nuremberg (nbg1) and Falkenstein (fsn1) are typically the cheapest locations. Helsinki and US locations cost slightly more.
2. **Use labels for everything.** Labels drive firewall assignment, load balancer targeting, and make it easy to filter servers in the API. A consistent labeling strategy pays off quickly.
3. **Private networks are free.** There is no extra charge for Hetzner's private networking feature. Use it to keep internal traffic off the public internet.
4. **ARM servers (CAX) are cheaper.** If your software supports ARM64, Hetzner's Ampere-based servers offer the best price per core.
5. **Snapshots are charged per GB.** Unlike the free backup slots some providers offer, Hetzner charges for every gigabyte of snapshot storage. Plan your retention policy accordingly.
6. **API tokens are project-scoped.** Each Hetzner project has its own API tokens. This is actually a nice security feature since you can limit automation access to specific projects.

Hetzner Cloud with Ansible is one of the most cost-effective infrastructure automation setups available, especially for European deployments where data residency requirements apply.
