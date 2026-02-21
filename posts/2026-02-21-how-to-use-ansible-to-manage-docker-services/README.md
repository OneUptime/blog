# How to Use Ansible to Manage Docker Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Containers, DevOps, Automation

Description: Learn how to manage Docker containers and Docker Swarm services with Ansible modules for container lifecycle, networking, and orchestration.

---

Docker and Ansible together cover a lot of ground. Ansible handles the infrastructure provisioning and configuration, while Docker packages your applications. But Ansible also has first-class modules for managing Docker containers, images, networks, and Swarm services directly. This means you can use a single tool to provision a server, install Docker, pull images, and manage the complete container lifecycle.

In this guide, I will walk through the Ansible modules for managing Docker services, from basic container operations to Swarm service management.

## Prerequisites

You need the Docker SDK for Python on the control node or target hosts where Docker runs.

Install Docker and its Python SDK on target hosts:

```yaml
---
- name: Prepare Docker hosts
  hosts: docker_hosts
  become: yes
  tasks:
    - name: Install Docker prerequisites
      ansible.builtin.apt:
        name:
          - apt-transport-https
          - ca-certificates
          - curl
          - gnupg
          - lsb-release
        state: present
        update_cache: yes

    - name: Add Docker GPG key
      ansible.builtin.apt_key:
        url: https://download.docker.com/linux/ubuntu/gpg
        state: present

    - name: Add Docker repository
      ansible.builtin.apt_repository:
        repo: "deb https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
        state: present

    - name: Install Docker CE
      ansible.builtin.apt:
        name:
          - docker-ce
          - docker-ce-cli
          - containerd.io
        state: present

    - name: Install Docker SDK for Python
      ansible.builtin.pip:
        name: docker
        state: present

    - name: Ensure Docker is running
      ansible.builtin.systemd:
        name: docker
        state: started
        enabled: yes
```

## Managing Docker Containers

The `community.docker.docker_container` module manages individual containers.

Run a container with full configuration:

```yaml
---
- name: Deploy application containers
  hosts: docker_hosts
  become: yes
  tasks:
    - name: Run Redis container
      community.docker.docker_container:
        name: redis
        image: redis:7-alpine
        state: started
        restart_policy: unless-stopped
        published_ports:
          - "6379:6379"
        volumes:
          - redis_data:/data
        command: redis-server --appendonly yes
        memory: "512m"
        cpus: 1.0
        env:
          REDIS_PASSWORD: "{{ redis_password }}"

    - name: Run PostgreSQL container
      community.docker.docker_container:
        name: postgres
        image: postgres:15-alpine
        state: started
        restart_policy: unless-stopped
        published_ports:
          - "5432:5432"
        volumes:
          - pg_data:/var/lib/postgresql/data
        env:
          POSTGRES_DB: myapp
          POSTGRES_USER: myapp
          POSTGRES_PASSWORD: "{{ pg_password }}"
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U myapp"]
          interval: 10s
          timeout: 5s
          retries: 5

    - name: Run application container
      community.docker.docker_container:
        name: myapp
        image: "{{ docker_registry }}/myapp:{{ app_version }}"
        state: started
        restart_policy: unless-stopped
        published_ports:
          - "8080:8080"
        env:
          DATABASE_URL: "postgresql://myapp:{{ pg_password }}@postgres:5432/myapp"
          REDIS_URL: "redis://:{{ redis_password }}@redis:6379"
        links:
          - postgres
          - redis
        log_driver: json-file
        log_options:
          max-size: "10m"
          max-file: "3"
```

## Managing Docker Networks

For production setups, you want explicit networks instead of default bridge networking.

Create custom networks and attach containers:

```yaml
- name: Create application network
  community.docker.docker_network:
    name: myapp_network
    driver: bridge
    ipam_config:
      - subnet: 172.20.0.0/16
        gateway: 172.20.0.1

- name: Create database network (internal, no external access)
  community.docker.docker_network:
    name: db_network
    driver: bridge
    internal: yes

- name: Run app container on multiple networks
  community.docker.docker_container:
    name: myapp
    image: myapp:latest
    state: started
    networks:
      - name: myapp_network
      - name: db_network
    published_ports:
      - "8080:8080"
```

## Managing Docker Images

Pull and manage images across your hosts.

Pull images and clean up old ones:

```yaml
- name: Pull required images
  community.docker.docker_image:
    name: "{{ item.name }}"
    tag: "{{ item.tag }}"
    source: pull
  loop:
    - { name: nginx, tag: "1.25-alpine" }
    - { name: redis, tag: "7-alpine" }
    - { name: postgres, tag: "15-alpine" }

- name: Remove old unused images
  community.docker.docker_prune:
    images: yes
    images_filters:
      dangling: true
```

## Docker Swarm Service Management

For multi-host container orchestration, Docker Swarm is a simpler alternative to Kubernetes. Ansible can manage Swarm services directly.

Initialize a Swarm cluster:

```yaml
---
- name: Initialize Docker Swarm
  hosts: swarm_managers[0]
  become: yes
  tasks:
    - name: Initialize Swarm on first manager
      community.docker.docker_swarm:
        state: present
        advertise_addr: "{{ ansible_default_ipv4.address }}"
      register: swarm_init

    - name: Store join tokens
      ansible.builtin.set_fact:
        manager_token: "{{ swarm_init.swarm_facts.JoinTokens.Manager }}"
        worker_token: "{{ swarm_init.swarm_facts.JoinTokens.Worker }}"

- name: Join worker nodes to the swarm
  hosts: swarm_workers
  become: yes
  tasks:
    - name: Join as worker
      community.docker.docker_swarm:
        state: join
        advertise_addr: "{{ ansible_default_ipv4.address }}"
        join_token: "{{ hostvars[groups['swarm_managers'][0]].worker_token }}"
        remote_addrs:
          - "{{ hostvars[groups['swarm_managers'][0]].ansible_default_ipv4.address }}:2377"
```

## Deploying Swarm Services

The `community.docker.docker_swarm_service` module manages Swarm services with replicas, rolling updates, and placement constraints.

Deploy a replicated web service with rolling updates:

```yaml
---
- name: Deploy Swarm services
  hosts: swarm_managers[0]
  become: yes
  tasks:
    - name: Create overlay network for services
      community.docker.docker_network:
        name: app_overlay
        driver: overlay
        attachable: yes

    - name: Deploy web application service
      community.docker.docker_swarm_service:
        name: web
        image: "{{ docker_registry }}/myapp:{{ app_version }}"
        replicas: 3
        networks:
          - app_overlay
        publish:
          - published_port: 80
            target_port: 8080
            protocol: tcp
            mode: ingress
        env:
          NODE_ENV: production
          DATABASE_URL: "{{ database_url }}"
        update_config:
          parallelism: 1
          delay: 10s
          failure_action: rollback
          max_failure_ratio: 0.25
          order: start-first
        rollback_config:
          parallelism: 1
          delay: 5s
        restart_config:
          condition: on-failure
          delay: 5s
          max_attempts: 3
          window: 120s
        placement:
          constraints:
            - node.role == worker
        resources:
          limits:
            cpus: "1.0"
            memory: 512M
          reservations:
            cpus: "0.25"
            memory: 128M
        healthcheck:
          test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
          interval: 30s
          timeout: 10s
          retries: 3
          start_period: 60s
```

## Rolling Updates for Swarm Services

Update a service to a new image version:

```yaml
- name: Update web service to new version
  community.docker.docker_swarm_service:
    name: web
    image: "{{ docker_registry }}/myapp:{{ new_version }}"
    update_config:
      parallelism: 1
      delay: 30s
      failure_action: rollback
      order: start-first
```

The `start-first` order means a new container starts before the old one stops, giving you zero-downtime deployments.

## Docker Compose with Ansible

If you already have docker-compose files, you can manage them with Ansible.

Deploy a stack from a docker-compose file:

```yaml
- name: Copy docker-compose file
  ansible.builtin.template:
    src: docker-compose.yml.j2
    dest: /opt/myapp/docker-compose.yml
    owner: root
    group: docker
    mode: '0640'

- name: Start services with docker compose
  community.docker.docker_compose_v2:
    project_src: /opt/myapp
    state: present
    pull: always
  register: compose_output

- name: Show compose status
  ansible.builtin.debug:
    var: compose_output.services
```

## Container Health Checks

Monitor container health through Ansible:

```yaml
- name: Check container health
  community.docker.docker_container_info:
    name: myapp
  register: container_info

- name: Fail if container is unhealthy
  ansible.builtin.fail:
    msg: "Container myapp is {{ container_info.container.State.Health.Status }}"
  when:
    - container_info.container.State.Health is defined
    - container_info.container.State.Health.Status != "healthy"

- name: Get container logs
  community.docker.docker_container_info:
    name: myapp
  register: info

- name: Show container details
  ansible.builtin.debug:
    msg: |
      Container: {{ info.container.Name }}
      Status: {{ info.container.State.Status }}
      Started: {{ info.container.State.StartedAt }}
      Restarts: {{ info.container.RestartCount }}
```

## Cleanup and Maintenance

Regular cleanup prevents disk space issues on Docker hosts.

Automated Docker cleanup playbook:

```yaml
---
- name: Docker maintenance
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

    - name: Remove unused networks
      community.docker.docker_prune:
        networks: yes

    - name: Check disk usage
      ansible.builtin.command: docker system df
      register: disk_usage
      changed_when: false

    - name: Report disk usage
      ansible.builtin.debug:
        var: disk_usage.stdout_lines
```

## Summary

Ansible gives you a comprehensive set of modules for managing Docker at every level, from individual containers to Swarm clusters. The key modules are `docker_container` for standalone containers, `docker_swarm_service` for Swarm services, `docker_network` for networking, and `docker_image` for image management. By combining these with Ansible's standard configuration management capabilities, you can manage the full lifecycle of your containerized applications from a single automation platform.
