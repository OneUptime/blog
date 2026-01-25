# How to Configure Ansible for Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Containers, DevOps, Container Management, Automation

Description: Use Ansible to manage Docker hosts, build images, deploy containers, and orchestrate multi-container applications with the community.docker collection.

---

Ansible and Docker complement each other well. While Docker Compose handles single-host container orchestration, Ansible excels at managing Docker across multiple hosts, building images as part of CI/CD pipelines, and integrating container deployments with traditional infrastructure automation.

This guide covers using the community.docker collection for comprehensive Docker management.

## Installing the Docker Collection

The community.docker collection provides modules for all Docker operations.

```bash
# Install the Docker collection
ansible-galaxy collection install community.docker

# Install Python Docker SDK (required by modules)
pip install docker docker-compose

# Verify installation
ansible-doc community.docker.docker_container
```

## Managing Docker Installation

Ensure Docker is installed consistently across hosts.

```yaml
# roles/docker/tasks/main.yml
---
- name: Install prerequisites
  apt:
    name:
      - apt-transport-https
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
      - docker-compose-plugin
    state: present
    update_cache: yes

- name: Start and enable Docker
  service:
    name: docker
    state: started
    enabled: yes

- name: Add users to docker group
  user:
    name: "{{ item }}"
    groups: docker
    append: yes
  loop: "{{ docker_users | default([]) }}"

- name: Configure Docker daemon
  template:
    src: daemon.json.j2
    dest: /etc/docker/daemon.json
    mode: '0644'
  notify: restart docker
```

```json
// templates/daemon.json.j2
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "{{ docker_log_max_size | default('100m') }}",
    "max-file": "{{ docker_log_max_file | default('3') }}"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-address-pools": [
    {"base": "172.17.0.0/16", "size": 24}
  ]
}
```

## Running Containers

Deploy and manage individual containers.

```yaml
# playbooks/docker-containers.yml
---
- name: Manage Docker containers
  hosts: docker_hosts
  become: yes

  tasks:
    - name: Pull latest Nginx image
      community.docker.docker_image:
        name: nginx
        tag: latest
        source: pull

    - name: Run Nginx container
      community.docker.docker_container:
        name: webserver
        image: nginx:latest
        state: started
        restart_policy: unless-stopped
        ports:
          - "80:80"
          - "443:443"
        volumes:
          - /var/www/html:/usr/share/nginx/html:ro
          - /etc/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
        env:
          NGINX_HOST: "{{ ansible_fqdn }}"
        labels:
          app: webserver
          environment: production

    - name: Run Redis container with health check
      community.docker.docker_container:
        name: redis
        image: redis:7-alpine
        state: started
        restart_policy: unless-stopped
        ports:
          - "6379:6379"
        volumes:
          - redis_data:/data
        command: redis-server --appendonly yes
        healthcheck:
          test: ["CMD", "redis-cli", "ping"]
          interval: 10s
          timeout: 5s
          retries: 3
          start_period: 30s

    - name: Run application container
      community.docker.docker_container:
        name: myapp
        image: "ghcr.io/company/myapp:{{ app_version }}"
        state: started
        restart_policy: unless-stopped
        ports:
          - "3000:3000"
        env:
          DATABASE_URL: "postgresql://{{ db_host }}:5432/{{ db_name }}"
          REDIS_URL: "redis://redis:6379"
          NODE_ENV: production
        links:
          - redis:redis
        networks:
          - name: app_network
```

## Building Docker Images

Build images as part of your deployment pipeline.

```yaml
# playbooks/docker-build.yml
---
- name: Build Docker images
  hosts: build_server
  become: yes

  vars:
    app_name: myapp
    registry: ghcr.io/company
    version: "{{ lookup('env', 'BUILD_VERSION') | default('latest') }}"

  tasks:
    - name: Copy application source
      synchronize:
        src: ../app/
        dest: /opt/build/{{ app_name }}/
        delete: yes
        recursive: yes

    - name: Build Docker image
      community.docker.docker_image:
        name: "{{ registry }}/{{ app_name }}"
        tag: "{{ version }}"
        source: build
        build:
          path: /opt/build/{{ app_name }}
          dockerfile: Dockerfile
          pull: yes
          args:
            BUILD_DATE: "{{ ansible_date_time.iso8601 }}"
            VERSION: "{{ version }}"
        push: no

    - name: Tag image as latest
      community.docker.docker_image:
        name: "{{ registry }}/{{ app_name }}"
        tag: "{{ version }}"
        repository: "{{ registry }}/{{ app_name }}"
        push: no
      when: version != 'latest'

    - name: Log in to container registry
      community.docker.docker_login:
        registry: ghcr.io
        username: "{{ registry_username }}"
        password: "{{ registry_password }}"

    - name: Push image to registry
      community.docker.docker_image:
        name: "{{ registry }}/{{ app_name }}"
        tag: "{{ item }}"
        push: yes
        source: local
      loop:
        - "{{ version }}"
        - latest
```

```dockerfile
# Dockerfile referenced in the build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine

ARG BUILD_DATE
ARG VERSION

LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.version="${VERSION}"

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

## Managing Docker Networks

Create and configure Docker networks.

```yaml
# playbooks/docker-networks.yml
---
- name: Configure Docker networks
  hosts: docker_hosts
  become: yes

  tasks:
    - name: Create application network
      community.docker.docker_network:
        name: app_network
        driver: bridge
        ipam_config:
          - subnet: 172.20.0.0/24
            gateway: 172.20.0.1

    - name: Create database network (internal)
      community.docker.docker_network:
        name: db_network
        driver: bridge
        internal: yes
        ipam_config:
          - subnet: 172.21.0.0/24

    - name: Create overlay network for swarm
      community.docker.docker_network:
        name: service_mesh
        driver: overlay
        attachable: yes
        scope: swarm
      when: docker_swarm_enabled | default(false)
```

## Managing Docker Volumes

Create and manage persistent storage.

```yaml
# playbooks/docker-volumes.yml
---
- name: Manage Docker volumes
  hosts: docker_hosts
  become: yes

  tasks:
    - name: Create application data volume
      community.docker.docker_volume:
        name: app_data
        driver: local
        driver_options:
          type: none
          device: /mnt/data/app
          o: bind

    - name: Create database volume
      community.docker.docker_volume:
        name: postgres_data
        driver: local

    - name: Create Redis volume
      community.docker.docker_volume:
        name: redis_data
        driver: local

    - name: List volumes
      community.docker.docker_host_info:
        volumes: yes
      register: docker_info

    - name: Display volume information
      debug:
        msg: "Volume: {{ item.Name }} - Mountpoint: {{ item.Mountpoint }}"
      loop: "{{ docker_info.volumes }}"
```

## Docker Compose Deployments

Deploy multi-container applications with Docker Compose.

```yaml
# playbooks/docker-compose-deploy.yml
---
- name: Deploy with Docker Compose
  hosts: docker_hosts
  become: yes

  vars:
    app_name: mystack
    compose_dir: /opt/{{ app_name }}

  tasks:
    - name: Create application directory
      file:
        path: "{{ compose_dir }}"
        state: directory
        mode: '0755'

    - name: Deploy docker-compose.yml
      template:
        src: docker-compose.yml.j2
        dest: "{{ compose_dir }}/docker-compose.yml"
        mode: '0644'

    - name: Deploy environment file
      template:
        src: env.j2
        dest: "{{ compose_dir }}/.env"
        mode: '0600'

    - name: Pull images
      community.docker.docker_compose_v2:
        project_src: "{{ compose_dir }}"
        pull: always
        state: present

    - name: Start application stack
      community.docker.docker_compose_v2:
        project_src: "{{ compose_dir }}"
        state: present
      register: compose_output

    - name: Display running containers
      debug:
        msg: "{{ compose_output.containers }}"
```

```yaml
# templates/docker-compose.yml.j2
version: '3.8'

services:
  app:
    image: {{ app_image }}:{{ app_version }}
    restart: unless-stopped
    ports:
      - "{{ app_port }}:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/{{ db_name }}
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - frontend
      - backend

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB={{ db_name }}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

networks:
  frontend:
  backend:
    internal: true

volumes:
  postgres_data:
  redis_data:
```

## Container Health Monitoring

Monitor and manage container health.

```yaml
# playbooks/docker-health.yml
---
- name: Monitor Docker containers
  hosts: docker_hosts
  become: yes

  tasks:
    - name: Get container information
      community.docker.docker_host_info:
        containers: yes
        containers_filters:
          status: running
      register: docker_info

    - name: Check container health status
      community.docker.docker_container_info:
        name: "{{ item.Names[0] | regex_replace('^/', '') }}"
      loop: "{{ docker_info.containers }}"
      register: container_health

    - name: Report unhealthy containers
      debug:
        msg: "Container {{ item.container.Name }} is {{ item.container.State.Health.Status }}"
      loop: "{{ container_health.results }}"
      when:
        - item.container.State.Health is defined
        - item.container.State.Health.Status != 'healthy'

    - name: Restart unhealthy containers
      community.docker.docker_container:
        name: "{{ item.container.Name }}"
        state: started
        restart: yes
      loop: "{{ container_health.results }}"
      when:
        - item.container.State.Health is defined
        - item.container.State.Health.Status == 'unhealthy'
        - auto_restart_unhealthy | default(false)
```

## Cleanup Operations

Maintain Docker hosts by removing unused resources.

```yaml
# playbooks/docker-cleanup.yml
---
- name: Clean up Docker resources
  hosts: docker_hosts
  become: yes

  tasks:
    - name: Remove stopped containers
      community.docker.docker_prune:
        containers: yes
        containers_filters:
          until: 24h

    - name: Remove unused images
      community.docker.docker_prune:
        images: yes
        images_filters:
          dangling: true

    - name: Remove unused volumes
      community.docker.docker_prune:
        volumes: yes
      when: prune_volumes | default(false)

    - name: Remove unused networks
      community.docker.docker_prune:
        networks: yes

    - name: Full system prune
      community.docker.docker_prune:
        containers: yes
        images: yes
        networks: yes
        volumes: no
        builder_cache: yes
      when: full_prune | default(false)
```

---

Ansible provides a consistent way to manage Docker across your infrastructure, from installing Docker on new hosts to deploying complex multi-container applications. The community.docker collection covers the full container lifecycle, making it straightforward to integrate containerized workloads into your existing automation. Use Ansible for multi-host orchestration and CI/CD integration while letting Docker Compose handle the local development experience.
