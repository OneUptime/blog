# How to Use Ansible to Set Up a Private Docker Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Registry, DevOps, Containers

Description: Step-by-step guide to deploying a secure private Docker registry with TLS, authentication, and storage backends using Ansible automation.

---

Running your own Docker registry gives you full control over your container images. You avoid rate limits from Docker Hub, keep proprietary images in-house, and reduce pull times since the registry sits on your own network. Setting one up by hand involves generating TLS certificates, configuring htpasswd authentication, writing Docker Compose files, and setting up storage backends. Ansible makes this entire process repeatable and consistent.

This guide walks through automating a private Docker registry deployment with TLS encryption, basic authentication, and persistent storage using Ansible.

## Prerequisites

You need Ansible 2.12+ on your control node, a target server running Ubuntu 22.04, and a domain name pointing to your server if you want proper TLS certificates. If you are running this internally, self-signed certificates work fine too.

## Project Layout

```
docker-registry/
  inventory/
    hosts.ini
  roles/
    registry/
      tasks/
        main.yml
        tls.yml
        auth.yml
      templates/
        docker-compose.yml.j2
        config.yml.j2
        nginx.conf.j2
      defaults/
        main.yml
      handlers/
        main.yml
  playbook.yml
```

## Inventory

```ini
# inventory/hosts.ini - Registry server target
[registry]
registry-server ansible_host=10.0.1.20 ansible_user=ubuntu
```

## Default Variables

```yaml
# roles/registry/defaults/main.yml - Configurable registry settings
registry_domain: registry.example.com
registry_port: 5000
registry_data_dir: /opt/registry/data
registry_config_dir: /opt/registry/config
registry_certs_dir: /opt/registry/certs
registry_auth_dir: /opt/registry/auth
registry_version: "2.8"
registry_storage_delete_enabled: true

# Users who can push/pull images
registry_users:
  - username: deployer
    password: "{{ vault_registry_deployer_password }}"
  - username: ci
    password: "{{ vault_registry_ci_password }}"

# Use letsencrypt for production, selfsigned for internal
registry_tls_mode: selfsigned
```

## Installing Docker

The main tasks start with ensuring Docker is available:

```yaml
# roles/registry/tasks/main.yml - Docker install and registry deployment
---
- name: Install required packages for Docker
  apt:
    name:
      - apt-transport-https
      - ca-certificates
      - curl
      - gnupg
      - lsb-release
      - python3-docker
    state: present
    update_cache: yes

- name: Add Docker GPG key
  apt_key:
    url: https://download.docker.com/linux/ubuntu/gpg
    state: present

- name: Add Docker apt repository
  apt_repository:
    repo: "deb [arch=amd64] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
    state: present

- name: Install Docker CE and Docker Compose
  apt:
    name:
      - docker-ce
      - docker-ce-cli
      - containerd.io
      - docker-compose-plugin
    state: present

- name: Ensure Docker service is running
  systemd:
    name: docker
    state: started
    enabled: yes

- name: Create registry directories
  file:
    path: "{{ item }}"
    state: directory
    owner: root
    group: root
    mode: '0755'
  loop:
    - "{{ registry_data_dir }}"
    - "{{ registry_config_dir }}"
    - "{{ registry_certs_dir }}"
    - "{{ registry_auth_dir }}"

- name: Include TLS certificate tasks
  include_tasks: tls.yml

- name: Include authentication tasks
  include_tasks: auth.yml

- name: Deploy registry configuration
  template:
    src: config.yml.j2
    dest: "{{ registry_config_dir }}/config.yml"
    mode: '0644'
  notify: restart registry

- name: Deploy Docker Compose file
  template:
    src: docker-compose.yml.j2
    dest: /opt/registry/docker-compose.yml
    mode: '0644'
  notify: restart registry

- name: Start the registry with Docker Compose
  community.docker.docker_compose_v2:
    project_src: /opt/registry
    state: present
```

## TLS Certificate Generation

Handle both self-signed and Let's Encrypt certificates:

```yaml
# roles/registry/tasks/tls.yml - Generate or obtain TLS certificates
---
- name: Generate self-signed certificates (internal use)
  when: registry_tls_mode == "selfsigned"
  block:
    - name: Generate private key
      community.crypto.openssl_privatekey:
        path: "{{ registry_certs_dir }}/domain.key"
        size: 4096

    - name: Generate CSR
      community.crypto.openssl_csr:
        path: "{{ registry_certs_dir }}/domain.csr"
        privatekey_path: "{{ registry_certs_dir }}/domain.key"
        common_name: "{{ registry_domain }}"
        subject_alt_name:
          - "DNS:{{ registry_domain }}"

    - name: Generate self-signed certificate
      community.crypto.x509_certificate:
        path: "{{ registry_certs_dir }}/domain.crt"
        privatekey_path: "{{ registry_certs_dir }}/domain.key"
        csr_path: "{{ registry_certs_dir }}/domain.csr"
        provider: selfsigned
        selfsigned_not_after: "+365d"

- name: Obtain Let's Encrypt certificate (production)
  when: registry_tls_mode == "letsencrypt"
  block:
    - name: Install certbot
      apt:
        name: certbot
        state: present

    - name: Obtain certificate from Let's Encrypt
      command: >
        certbot certonly --standalone
        -d {{ registry_domain }}
        --non-interactive --agree-tos
        --email admin@{{ registry_domain }}
      args:
        creates: "/etc/letsencrypt/live/{{ registry_domain }}/fullchain.pem"

    - name: Copy Let's Encrypt certificates to registry directory
      copy:
        src: "/etc/letsencrypt/live/{{ registry_domain }}/{{ item.src }}"
        dest: "{{ registry_certs_dir }}/{{ item.dest }}"
        remote_src: yes
        mode: '0600'
      loop:
        - { src: "fullchain.pem", dest: "domain.crt" }
        - { src: "privkey.pem", dest: "domain.key" }
```

## Authentication Setup

Create htpasswd entries for registry users:

```yaml
# roles/registry/tasks/auth.yml - Set up basic authentication
---
- name: Install apache2-utils for htpasswd
  apt:
    name: apache2-utils
    state: present

- name: Create htpasswd file for first user
  command: >
    htpasswd -Bbn {{ registry_users[0].username }} {{ registry_users[0].password }}
  register: htpasswd_first
  changed_when: false
  no_log: true

- name: Write initial htpasswd file
  copy:
    content: "{{ htpasswd_first.stdout }}\n"
    dest: "{{ registry_auth_dir }}/htpasswd"
    mode: '0644'
  no_log: true

- name: Add additional users to htpasswd
  command: >
    htpasswd -Bb {{ registry_auth_dir }}/htpasswd {{ item.username }} {{ item.password }}
  loop: "{{ registry_users[1:] }}"
  when: registry_users | length > 1
  no_log: true
```

## Docker Compose Template

```yaml
# roles/registry/templates/docker-compose.yml.j2 - Registry container definition
version: '3.8'

services:
  registry:
    image: registry:{{ registry_version }}
    restart: always
    ports:
      - "{{ registry_port }}:5000"
    volumes:
      - {{ registry_data_dir }}:/var/lib/registry
      - {{ registry_config_dir }}/config.yml:/etc/docker/registry/config.yml:ro
      - {{ registry_certs_dir }}:/certs:ro
      - {{ registry_auth_dir }}:/auth:ro
    environment:
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/domain.crt
      REGISTRY_HTTP_TLS_KEY: /certs/domain.key
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: "Docker Registry"
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
```

## Registry Configuration Template

```yaml
# roles/registry/templates/config.yml.j2 - Docker registry configuration
version: 0.1
log:
  fields:
    service: registry
storage:
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: {{ registry_storage_delete_enabled | lower }}
  cache:
    blobdescriptor: inmemory
http:
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]
health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
```

## Handlers

```yaml
# roles/registry/handlers/main.yml - Restart registry on config changes
---
- name: restart registry
  community.docker.docker_compose_v2:
    project_src: /opt/registry
    state: present
    recreate: always
```

## Running the Playbook

```bash
# Deploy the private Docker registry
ansible-playbook -i inventory/hosts.ini playbook.yml --ask-vault-pass
```

## Testing the Registry

After deployment, verify it works from a client machine:

```bash
# Log in to your private registry
docker login registry.example.com:5000

# Tag and push an image
docker tag nginx:latest registry.example.com:5000/nginx:latest
docker push registry.example.com:5000/nginx:latest

# List images in the registry via API
curl -u deployer:password https://registry.example.com:5000/v2/_catalog
```

## Garbage Collection

Add a cron job for periodic garbage collection:

```yaml
# Task to schedule registry garbage collection
- name: Add garbage collection cron job
  cron:
    name: "Docker registry garbage collection"
    minute: "0"
    hour: "3"
    job: "docker exec registry-registry-1 bin/registry garbage-collect /etc/docker/registry/config.yml --delete-untagged"
    user: root
```

## Summary

This Ansible setup gives you a fully functional private Docker registry with TLS encryption, user authentication, and persistent storage. You can extend it with S3-compatible storage backends, webhook notifications, or a web UI like Docker Registry UI. The entire configuration is version-controlled and reproducible, so spinning up additional registries for different environments takes just a single playbook run.
