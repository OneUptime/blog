# How to Deploy Docker Containers with Ansible

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Ansible, IaC, DevOps, Automation

Description: Learn how to deploy and manage Docker containers with Ansible, including installing Docker, managing images, containers, networks, and orchestrating multi-container applications.

---

Ansible provides powerful modules for managing Docker infrastructure across multiple hosts. This guide covers using Ansible to install Docker, manage containers, and orchestrate complete application stacks.

## Prerequisites

### Install Ansible Docker Collection

```bash
# Install the Docker collection
ansible-galaxy collection install community.docker

# Verify installation
ansible-galaxy collection list | grep docker
```

### Inventory Setup

```ini
# inventory.ini
[docker_hosts]
docker1 ansible_host=192.168.1.10
docker2 ansible_host=192.168.1.11

[docker_hosts:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/.ssh/id_rsa
```

## Installing Docker

### Docker Installation Playbook

```yaml
# install-docker.yml
---
- name: Install Docker
  hosts: docker_hosts
  become: yes

  tasks:
    - name: Install prerequisites
      apt:
        name:
          - ca-certificates
          - curl
          - gnupg
          - lsb-release
        state: present
        update_cache: yes

    - name: Add Docker GPG key
      apt_key:
        url: https://download.docker.com/linux/ubuntu/gpg
        state: present

    - name: Add Docker repository
      apt_repository:
        repo: "deb [arch=amd64] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
        state: present

    - name: Install Docker
      apt:
        name:
          - docker-ce
          - docker-ce-cli
          - containerd.io
          - docker-buildx-plugin
          - docker-compose-plugin
        state: present
        update_cache: yes

    - name: Start Docker service
      service:
        name: docker
        state: started
        enabled: yes

    - name: Add user to docker group
      user:
        name: "{{ ansible_user }}"
        groups: docker
        append: yes
```

### Using Ansible Role

```yaml
# playbook.yml
---
- name: Install Docker using role
  hosts: docker_hosts
  become: yes
  roles:
    - geerlingguy.docker
  vars:
    docker_users:
      - "{{ ansible_user }}"
```

```bash
# Install role
ansible-galaxy install geerlingguy.docker
```

## Managing Images

### Pull Images

```yaml
- name: Pull Docker images
  community.docker.docker_image:
    name: "{{ item }}"
    source: pull
  loop:
    - nginx:latest
    - postgres:15
    - redis:7
```

### Build Images

```yaml
- name: Build application image
  community.docker.docker_image:
    name: myapp
    tag: "{{ app_version }}"
    source: build
    build:
      path: /opt/app
      dockerfile: Dockerfile
      args:
        VERSION: "{{ app_version }}"
    push: no
```

### Push to Registry

```yaml
- name: Login to registry
  community.docker.docker_login:
    registry_url: registry.example.com
    username: "{{ registry_user }}"
    password: "{{ registry_password }}"

- name: Push image to registry
  community.docker.docker_image:
    name: myapp
    tag: "{{ app_version }}"
    repository: registry.example.com/myapp
    push: yes
    source: local
```

## Managing Containers

### Basic Container

```yaml
- name: Run nginx container
  community.docker.docker_container:
    name: nginx
    image: nginx:latest
    state: started
    ports:
      - "8080:80"
```

### Container with Configuration

```yaml
- name: Run application container
  community.docker.docker_container:
    name: myapp
    image: myapp:latest
    state: started
    restart_policy: unless-stopped
    ports:
      - "3000:3000"
    env:
      NODE_ENV: production
      DATABASE_URL: "{{ database_url }}"
    volumes:
      - /opt/app/data:/app/data
      - app_logs:/app/logs
    networks:
      - name: app_network
    memory: 512m
    cpus: 1
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Multiple Containers

```yaml
- name: Deploy application stack
  community.docker.docker_container:
    name: "{{ item.name }}"
    image: "{{ item.image }}"
    state: started
    restart_policy: unless-stopped
    ports: "{{ item.ports | default(omit) }}"
    env: "{{ item.env | default(omit) }}"
    volumes: "{{ item.volumes | default(omit) }}"
    networks:
      - name: app_network
  loop:
    - name: postgres
      image: postgres:15
      env:
        POSTGRES_PASSWORD: "{{ db_password }}"
        POSTGRES_DB: myapp
      volumes:
        - postgres_data:/var/lib/postgresql/data

    - name: redis
      image: redis:7
      volumes:
        - redis_data:/data

    - name: app
      image: myapp:latest
      ports:
        - "3000:3000"
      env:
        DATABASE_URL: postgresql://postgres:{{ db_password }}@postgres:5432/myapp
        REDIS_URL: redis://redis:6379
```

## Managing Networks

### Create Network

```yaml
- name: Create Docker network
  community.docker.docker_network:
    name: app_network
    driver: bridge
    ipam_config:
      - subnet: 172.28.0.0/16
        gateway: 172.28.0.1
```

### Connect Containers

```yaml
- name: Run container in network
  community.docker.docker_container:
    name: app
    image: myapp:latest
    networks:
      - name: app_network
        aliases:
          - api
          - backend
```

## Managing Volumes

### Create Volume

```yaml
- name: Create Docker volumes
  community.docker.docker_volume:
    name: "{{ item }}"
    state: present
  loop:
    - postgres_data
    - redis_data
    - app_data
```

### Volume with Options

```yaml
- name: Create NFS volume
  community.docker.docker_volume:
    name: shared_data
    driver: local
    driver_options:
      type: nfs
      o: addr=nfs-server.example.com,rw
      device: ":/exports/data"
```

## Docker Compose Integration

### Deploy with Compose

```yaml
- name: Deploy with Docker Compose
  community.docker.docker_compose_v2:
    project_src: /opt/app
    state: present
  register: output

- name: Show deployed containers
  debug:
    var: output.containers
```

### Compose with Variables

```yaml
- name: Template docker-compose file
  template:
    src: docker-compose.yml.j2
    dest: /opt/app/docker-compose.yml

- name: Deploy stack
  community.docker.docker_compose_v2:
    project_src: /opt/app
    env_files:
      - /opt/app/.env
    state: present
```

## Complete Application Playbook

```yaml
# deploy-app.yml
---
- name: Deploy Application Stack
  hosts: docker_hosts
  become: yes
  vars:
    app_version: "{{ lookup('env', 'APP_VERSION') | default('latest') }}"
    db_password: "{{ lookup('env', 'DB_PASSWORD') }}"

  tasks:
    - name: Create Docker network
      community.docker.docker_network:
        name: app_network
        state: present

    - name: Create volumes
      community.docker.docker_volume:
        name: "{{ item }}"
        state: present
      loop:
        - postgres_data
        - redis_data

    - name: Pull images
      community.docker.docker_image:
        name: "{{ item }}"
        source: pull
      loop:
        - postgres:15
        - redis:7-alpine
        - nginx:alpine

    - name: Deploy PostgreSQL
      community.docker.docker_container:
        name: postgres
        image: postgres:15
        state: started
        restart_policy: unless-stopped
        env:
          POSTGRES_PASSWORD: "{{ db_password }}"
          POSTGRES_DB: myapp
        volumes:
          - postgres_data:/var/lib/postgresql/data
        networks:
          - name: app_network
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U postgres"]
          interval: 10s
          timeout: 5s
          retries: 5

    - name: Wait for PostgreSQL
      community.docker.docker_container_info:
        name: postgres
      register: postgres_info
      until: postgres_info.container.State.Health.Status == "healthy"
      retries: 30
      delay: 5

    - name: Deploy Redis
      community.docker.docker_container:
        name: redis
        image: redis:7-alpine
        state: started
        restart_policy: unless-stopped
        command: redis-server --appendonly yes
        volumes:
          - redis_data:/data
        networks:
          - name: app_network

    - name: Deploy Application
      community.docker.docker_container:
        name: "app-{{ item }}"
        image: "myapp:{{ app_version }}"
        state: started
        restart_policy: unless-stopped
        env:
          NODE_ENV: production
          DATABASE_URL: "postgresql://postgres:{{ db_password }}@postgres:5432/myapp"
          REDIS_URL: redis://redis:6379
        networks:
          - name: app_network
        labels:
          traefik.enable: "true"
          traefik.http.routers.app.rule: "Host(`app.example.com`)"
      loop: "{{ range(1, app_replicas + 1) | list }}"
      vars:
        app_replicas: 2

    - name: Deploy Nginx
      community.docker.docker_container:
        name: nginx
        image: nginx:alpine
        state: started
        restart_policy: unless-stopped
        ports:
          - "80:80"
          - "443:443"
        volumes:
          - /opt/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
          - /opt/nginx/certs:/etc/nginx/certs:ro
        networks:
          - name: app_network
```

## Handlers and Notifications

```yaml
- name: Update application
  community.docker.docker_container:
    name: app
    image: "myapp:{{ new_version }}"
    state: started
    recreate: yes
  notify: Notify deployment

handlers:
  - name: Notify deployment
    uri:
      url: "{{ slack_webhook }}"
      method: POST
      body_format: json
      body:
        text: "Application deployed: version {{ new_version }}"
```

## Rolling Updates

```yaml
- name: Rolling update
  community.docker.docker_container:
    name: "app-{{ item }}"
    image: "myapp:{{ new_version }}"
    state: started
    recreate: yes
  loop: "{{ range(1, app_replicas + 1) | list }}"
  loop_control:
    pause: 30  # Wait between updates
```

## Cleanup Tasks

```yaml
- name: Remove old containers
  community.docker.docker_container:
    name: "{{ item }}"
    state: absent
  loop:
    - old_app
    - deprecated_service

- name: Prune unused resources
  community.docker.docker_prune:
    containers: yes
    images: yes
    networks: yes
    volumes: no  # Be careful with volumes
    builder_cache: yes
```

## Summary

| Module | Purpose |
|--------|---------|
| docker_image | Pull, build, push images |
| docker_container | Manage containers |
| docker_network | Create and manage networks |
| docker_volume | Manage persistent volumes |
| docker_compose_v2 | Deploy Compose stacks |
| docker_login | Registry authentication |
| docker_prune | Cleanup unused resources |

Ansible provides idempotent Docker management across multiple hosts. Use it for automated deployments, configuration management, and orchestrating container infrastructure. For managing Docker with Terraform, see our post on [Managing Docker with Terraform](https://oneuptime.com/blog/post/2026-01-16-docker-terraform/view).

