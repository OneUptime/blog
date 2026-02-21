# How to Use Ansible for Container Orchestration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Containers, Docker, Kubernetes, Orchestration

Description: Learn how to use Ansible to manage container workloads including Docker Compose deployments, Kubernetes cluster setup, and container lifecycle management.

---

Containers have become the standard packaging format for applications, but orchestrating them across multiple hosts still requires tooling. While Kubernetes is the go-to orchestrator for large-scale deployments, Ansible fills an important gap: it can set up container hosts, deploy Docker Compose stacks, manage Kubernetes clusters, and handle the infrastructure that containers run on.

This post covers practical patterns for using Ansible to manage container workloads at every level.

## Setting Up Docker Hosts

Before you can run containers, you need Docker installed and configured on your hosts. Here is a role that handles that:

```yaml
# roles/docker/tasks/main.yml
# Install and configure Docker on target hosts
---
- name: Install Docker prerequisites
  ansible.builtin.apt:
    name:
      - apt-transport-https
      - ca-certificates
      - curl
      - gnupg
      - lsb-release
    state: present
    update_cache: true

- name: Add Docker GPG key
  ansible.builtin.apt_key:
    url: https://download.docker.com/linux/ubuntu/gpg
    state: present

- name: Add Docker repository
  ansible.builtin.apt_repository:
    repo: "deb https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
    state: present

- name: Install Docker Engine
  ansible.builtin.apt:
    name:
      - docker-ce
      - docker-ce-cli
      - containerd.io
      - docker-compose-plugin
    state: present

- name: Configure Docker daemon
  ansible.builtin.template:
    src: daemon.json.j2
    dest: /etc/docker/daemon.json
    mode: '0644'
  notify: restart docker

- name: Add deploy user to docker group
  ansible.builtin.user:
    name: "{{ deploy_user }}"
    groups: docker
    append: true

- name: Ensure Docker service is running
  ansible.builtin.service:
    name: docker
    state: started
    enabled: true
```

The Docker daemon configuration template:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  },
  "default-address-pools": [
    {
      "base": "172.17.0.0/12",
      "size": 24
    }
  ],
  "storage-driver": "overlay2",
  "live-restore": true,
  "metrics-addr": "0.0.0.0:9323"
}
```

## Deploying Docker Compose Stacks

For applications that use Docker Compose, Ansible can manage the full lifecycle:

```yaml
# roles/compose_deploy/tasks/main.yml
# Deploy a Docker Compose application stack
---
- name: Create application directory
  ansible.builtin.file:
    path: "{{ app_dir }}"
    state: directory
    owner: "{{ deploy_user }}"
    mode: '0755'

- name: Copy Docker Compose file
  ansible.builtin.template:
    src: docker-compose.yml.j2
    dest: "{{ app_dir }}/docker-compose.yml"
    owner: "{{ deploy_user }}"
    mode: '0644'
  register: compose_file

- name: Copy environment file
  ansible.builtin.template:
    src: env.j2
    dest: "{{ app_dir }}/.env"
    owner: "{{ deploy_user }}"
    mode: '0600'
  register: env_file

- name: Log in to private registry
  community.docker.docker_login:
    registry_url: "{{ docker_registry }}"
    username: "{{ registry_user }}"
    password: "{{ registry_password }}"
  when: docker_registry is defined

- name: Pull latest images
  ansible.builtin.command:
    cmd: docker compose pull
    chdir: "{{ app_dir }}"
  changed_when: true
  when: compose_file.changed or env_file.changed

- name: Deploy the stack
  community.docker.docker_compose_v2:
    project_src: "{{ app_dir }}"
    state: present
    pull: "always"
    recreate: "{{ 'always' if force_redeploy | default(false) else 'smart' }}"
  register: deploy_result

- name: Wait for health checks to pass
  ansible.builtin.uri:
    url: "http://localhost:{{ app_port }}/health"
    status_code: 200
  retries: 30
  delay: 5
  register: health
  until: health.status == 200

- name: Prune old images
  community.docker.docker_prune:
    images: true
    images_filters:
      dangling: true
```

The Compose template:

```yaml
# roles/compose_deploy/templates/docker-compose.yml.j2
# Docker Compose stack definition
version: "3.8"

services:
  app:
    image: {{ docker_registry }}/{{ app_name }}:{{ app_version }}
    restart: unless-stopped
    ports:
      - "{{ app_port }}:8080"
    environment:
      - DATABASE_URL=postgresql://{{ db_user }}:{{ db_password }}@db:5432/{{ db_name }}
      - REDIS_URL=redis://redis:6379/0
      - APP_ENV={{ env_name }}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB={{ db_name }}
      - POSTGRES_USER={{ db_user }}
      - POSTGRES_PASSWORD={{ db_password }}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U {{ db_user }}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/var/lib/redis/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

## Managing Individual Containers

Sometimes you need to manage containers directly without Compose:

```yaml
# tasks/manage-containers.yml
# Manage individual Docker containers
---
- name: Run a background worker container
  community.docker.docker_container:
    name: "{{ app_name }}-worker"
    image: "{{ docker_registry }}/{{ app_name }}:{{ app_version }}"
    state: started
    restart_policy: unless-stopped
    command: ["python", "worker.py"]
    env:
      QUEUE_URL: "{{ queue_url }}"
      WORKER_CONCURRENCY: "{{ worker_concurrency }}"
    networks:
      - name: app_network
    log_driver: json-file
    log_options:
      max-size: "50m"
      max-file: "3"
    memory: "512m"
    cpus: 1.0

- name: Run a scheduled task container
  community.docker.docker_container:
    name: "{{ app_name }}-cron"
    image: "{{ docker_registry }}/{{ app_name }}:{{ app_version }}"
    state: started
    restart_policy: unless-stopped
    command: ["python", "scheduler.py"]
    env:
      DATABASE_URL: "{{ database_url }}"
    volumes:
      - /var/log/app:/app/logs
    networks:
      - name: app_network
```

## Setting Up a Kubernetes Cluster

Ansible can bootstrap a Kubernetes cluster using kubeadm:

```yaml
# roles/k8s_control_plane/tasks/main.yml
# Initialize Kubernetes control plane
---
- name: Initialize the cluster
  ansible.builtin.command:
    cmd: >
      kubeadm init
      --pod-network-cidr={{ pod_network_cidr }}
      --service-cidr={{ service_cidr }}
      --apiserver-advertise-address={{ ansible_default_ipv4.address }}
    creates: /etc/kubernetes/admin.conf

- name: Create .kube directory for admin user
  ansible.builtin.file:
    path: "/home/{{ admin_user }}/.kube"
    state: directory
    owner: "{{ admin_user }}"
    mode: '0755'

- name: Copy admin config
  ansible.builtin.copy:
    src: /etc/kubernetes/admin.conf
    dest: "/home/{{ admin_user }}/.kube/config"
    remote_src: true
    owner: "{{ admin_user }}"
    mode: '0600'

- name: Install Calico network plugin
  ansible.builtin.command:
    cmd: kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.0/manifests/calico.yaml
  become: false
  environment:
    KUBECONFIG: "/home/{{ admin_user }}/.kube/config"

- name: Get join token
  ansible.builtin.command:
    cmd: kubeadm token create --print-join-command
  register: join_command
  changed_when: false

- name: Store join command
  ansible.builtin.set_fact:
    kubeadm_join_command: "{{ join_command.stdout }}"
```

## Deploying to Kubernetes with Ansible

Once the cluster is up, deploy workloads using the kubernetes.core collection:

```yaml
# roles/k8s_deploy/tasks/main.yml
# Deploy application to Kubernetes
---
- name: Create namespace
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: Namespace
      metadata:
        name: "{{ k8s_namespace }}"

- name: Deploy application
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: "{{ app_name }}"
        namespace: "{{ k8s_namespace }}"
      spec:
        replicas: "{{ app_replicas }}"
        selector:
          matchLabels:
            app: "{{ app_name }}"
        template:
          metadata:
            labels:
              app: "{{ app_name }}"
          spec:
            containers:
              - name: "{{ app_name }}"
                image: "{{ app_image }}:{{ app_version }}"
                ports:
                  - containerPort: 8080
                readinessProbe:
                  httpGet:
                    path: /health
                    port: 8080
                  initialDelaySeconds: 10
                  periodSeconds: 5
                resources:
                  requests:
                    memory: "256Mi"
                    cpu: "250m"
                  limits:
                    memory: "512Mi"
                    cpu: "500m"

- name: Create service
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: Service
      metadata:
        name: "{{ app_name }}"
        namespace: "{{ k8s_namespace }}"
      spec:
        selector:
          app: "{{ app_name }}"
        ports:
          - port: 80
            targetPort: 8080
        type: ClusterIP
```

## Key Takeaways

Ansible works at every level of the container stack. Use it to prepare Docker hosts, deploy Compose stacks, bootstrap Kubernetes clusters, and manage workloads. The community.docker and kubernetes.core collections give you modules for nearly every container operation. For simple setups, Docker Compose managed by Ansible is often enough. For larger deployments, use Ansible to set up and manage Kubernetes, then let Kubernetes handle the container scheduling.
