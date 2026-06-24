# How to Deploy Portainer Using Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Ansible, Automation, Docker, DevOps

Description: Automate the initial deployment and configuration of Portainer across multiple servers using Ansible playbooks.

## Introduction

Deploying Portainer manually on multiple servers is time-consuming and error-prone. Ansible playbooks allow you to automate the Portainer installation process - from installing Docker to deploying Portainer Server and Agents - across dozens or hundreds of servers simultaneously. This guide covers deploying Portainer CE and can be adapted for Business Edition by switching the image and supplying a license key.

## Prerequisites

- Ansible 2.12+ on your control machine
- `community.docker` collection on your control machine (`ansible-galaxy collection install community.docker`)
- SSH access to target servers (Ubuntu 22.04 / Debian 12)
- Python 3.8+ on target servers
- TCP port 9001 reachable from the Portainer server to each agent host

## Project Structure

```text
portainer-ansible/
├── inventory/
│   ├── production/
│   │   ├── hosts.yml
│   │   └── group_vars/
│   │       ├── all.yml
│   │       └── vault.yml
│   └── staging/
│       └── hosts.yml
├── roles/
│   ├── docker/
│   │   └── tasks/
│   │       └── main.yml
│   ├── portainer/
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   ├── templates/
│   │   │   └── docker-compose.yml.j2
│   │   └── defaults/
│   │       └── main.yml
│   └── portainer-agent/
│       └── tasks/
│           └── main.yml
├── site.yml
└── README.md
```

## Step 1: Configure Inventory

```yaml
# inventory/production/hosts.yml

all:
  children:
    portainer_primary:
      hosts:
        portainer-01:
          ansible_host: 192.168.1.10
          portainer_role: primary
    
    portainer_agents:
      hosts:
        docker-node-01:
          ansible_host: 192.168.1.11
        docker-node-02:
          ansible_host: 192.168.1.12
        docker-node-03:
          ansible_host: 192.168.1.13
  
  vars:
    ansible_user: ubuntu
    ansible_ssh_private_key_file: ~/.ssh/prod_key
    ansible_python_interpreter: /usr/bin/python3
```

```yaml
# inventory/production/group_vars/all.yml
docker_edition: ce
portainer_version: "lts"
portainer_data_dir: /opt/portainer/data
portainer_http_port: 9000
portainer_https_port: 9443
portainer_agent_port: 9001
portainer_admin_username: admin
```

## Step 2: Create Docker Installation Role

```yaml
# roles/docker/tasks/main.yml
---
- name: Update apt package cache
  apt:
    update_cache: true
    cache_valid_time: 3600

- name: Install Docker dependencies
  package:
    name:
      - ca-certificates
      - curl
      - python3-requests
    state: present

- name: Create apt keyrings directory
  file:
    path: /etc/apt/keyrings
    state: directory
    mode: '0755'

- name: Add Docker repository key
  get_url:
    url: "https://download.docker.com/linux/{{ ansible_distribution | lower }}/gpg"
    dest: /etc/apt/keyrings/docker.asc
    mode: '0644'

- name: Add Docker repository
  apt_repository:
    repo: >-
      deb [arch={{ ansible_architecture | replace('x86_64', 'amd64') | replace('aarch64', 'arm64') }} signed-by=/etc/apt/keyrings/docker.asc]
      https://download.docker.com/linux/{{ ansible_distribution | lower }}
      {{ ansible_distribution_release }} stable
    state: present
    filename: docker
    update_cache: true

- name: Install Docker CE
  package:
    name:
      - docker-ce
      - docker-ce-cli
      - containerd.io
      - docker-compose-plugin
    state: present

- name: Start and enable Docker service
  systemd:
    name: docker
    state: started
    enabled: true

- name: Add deployment user to docker group
  user:
    name: "{{ ansible_user }}"
    groups: docker
    append: true

- name: Configure Docker daemon
  copy:
    content: |
      {
        "log-driver": "json-file",
        "log-opts": {
          "max-size": "100m",
          "max-file": "3"
        },
        "storage-driver": "overlay2",
        "live-restore": true
      }
    dest: /etc/docker/daemon.json
    owner: root
    group: root
    mode: '0644'
  register: docker_daemon_config

- name: Restart Docker to apply daemon configuration
  systemd:
    name: docker
    state: restarted
  when: docker_daemon_config.changed
```

## Step 3: Create Portainer Deployment Role

```yaml
# roles/portainer/defaults/main.yml
portainer_image: portainer/portainer-ce  # Use portainer/portainer-ee for Business Edition
portainer_tag: "{{ portainer_version }}"
portainer_container_name: portainer
portainer_restart_policy: always
portainer_log_max_size: 10m
portainer_log_max_file: "3"
portainer_license_key: ""
```

```yaml
# roles/portainer/tasks/main.yml
---
- name: Create Portainer data directory
  file:
    path: "{{ portainer_data_dir }}"
    state: directory
    owner: root
    group: root
    mode: '0755'

- name: Create Portainer docker-compose file
  template:
    src: docker-compose.yml.j2
    dest: "{{ portainer_data_dir | dirname }}/docker-compose.yml"
    owner: root
    group: root
    mode: '0644'

- name: Pull Portainer image
  community.docker.docker_image:
    name: "{{ portainer_image }}:{{ portainer_tag }}"
    source: pull
    force_source: false

- name: Deploy Portainer container
  community.docker.docker_compose_v2:
    project_src: "{{ portainer_data_dir | dirname }}"
    state: present
    pull: missing

- name: Wait for Portainer to be healthy
  uri:
    url: "http://localhost:{{ portainer_http_port }}/api/system/status"
    status_code: 200
    timeout: 30
  register: portainer_health
  until: portainer_health.status == 200
  retries: 12
  delay: 10
  when: not ansible_check_mode

- name: Initialize Portainer admin user
  uri:
    url: "http://localhost:{{ portainer_http_port }}/api/users/admin/init"
    method: POST
    body_format: json
    body:
      Username: "{{ portainer_admin_username }}"
      Password: "{{ portainer_admin_password }}"
    status_code: [200, 409]  # 409 = already initialized
  no_log: true
  when:
    - not ansible_check_mode
    - portainer_init_admin | default(true)
```

## Step 4: Create Docker Compose Template

```yaml
# roles/portainer/templates/docker-compose.yml.j2
services:
  portainer:
    image: {{ portainer_image }}:{{ portainer_tag }}
    container_name: {{ portainer_container_name }}
    restart: {{ portainer_restart_policy }}
    # Expose Portainer UI and API
    ports:
      - "{{ portainer_http_port }}:9000"
      - "{{ portainer_https_port }}:9443"
    volumes:
      # Persist Portainer data
      - {{ portainer_data_dir }}:/data
      # Docker socket for container management
      - /var/run/docker.sock:/var/run/docker.sock
    {% if portainer_license_key | default('') %}
    environment:
      PORTAINER_LICENSE_KEY: "{{ portainer_license_key }}"
    {% endif %}
    logging:
      driver: json-file
      options:
        max-size: "{{ portainer_log_max_size }}"
        max-file: "{{ portainer_log_max_file }}"
```

## Step 5: Create Portainer Agent Role

```yaml
# roles/portainer-agent/tasks/main.yml
---
- name: Pull Portainer Agent image
  community.docker.docker_image:
    name: "portainer/agent:{{ portainer_version }}"
    source: pull

- name: Deploy Portainer Agent
  community.docker.docker_container:
    name: portainer_agent
    image: "portainer/agent:{{ portainer_version }}"
    restart_policy: always
    ports:
      - "{{ portainer_agent_port }}:9001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    state: started
```

## Step 6: Create the Main Site Playbook

```yaml
# site.yml
---
- name: Install Docker on all nodes
  hosts: all
  become: true
  roles:
    - docker

- name: Deploy Portainer Primary
  hosts: portainer_primary
  become: true
  roles:
    - role: portainer
      vars:
        portainer_init_admin: true

- name: Deploy Portainer Agents
  hosts: portainer_agents
  become: true
  roles:
    - portainer-agent
```

## Step 7: Run the Playbook

```bash
# Install required collection
ansible-galaxy collection install community.docker

# Check syntax
ansible-playbook -i inventory/production/hosts.yml site.yml --syntax-check --ask-vault-pass

# Dry run
ansible-playbook -i inventory/production/hosts.yml site.yml --check --diff --ask-vault-pass

# Deploy
ansible-playbook -i inventory/production/hosts.yml site.yml \
  --ask-vault-pass \
  -v

# Deploy only to specific groups
ansible-playbook -i inventory/production/hosts.yml site.yml \
  --ask-vault-pass \
  --limit portainer_primary -v
```

## Conclusion

Using Ansible to deploy Portainer provides a repeatable, version-controlled installation process that scales across any number of servers. The role-based structure makes it easy to customize for different environments and Portainer editions. Combined with Ansible Vault for secret management, this approach ensures that your Portainer deployments are consistent, secure, and maintainable across your entire infrastructure.
