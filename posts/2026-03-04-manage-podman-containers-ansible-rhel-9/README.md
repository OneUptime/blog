# How to Manage Podman Containers with Ansible on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Podman, Containers, Automation, Linux

Description: Use Ansible to manage Podman containers on RHEL 9, including rootless containers, pod management, and systemd integration.

---

Podman is the native container runtime on RHEL 9. Unlike Docker, it runs without a daemon and supports rootless containers out of the box. Ansible works well with Podman, and since Podman is Docker-compatible at the CLI level, many of the same Ansible modules work for both.

## Podman vs Docker on RHEL 9

```mermaid
graph LR
    A[Ansible] --> B{Container Runtime}
    B --> C[Podman - RHEL Native]
    B --> D[Docker - Needs Extra Repo]
    C --> E[No Daemon]
    C --> F[Rootless Support]
    C --> G[systemd Integration]
    D --> H[Requires dockerd]
    D --> I[Root by Default]
```

## Prerequisites

```bash
# Podman should already be installed on RHEL 9
rpm -q podman

# If not, install it
sudo dnf install podman

# Install the containers.podman Ansible collection
ansible-galaxy collection install containers.podman
```

## Basic Container Management

```yaml
# playbook-podman-basic.yml
# Deploy containers with Podman on RHEL 9
---
- name: Manage Podman containers
  hosts: container_hosts
  become: true

  tasks:
    - name: Pull container images
      containers.podman.podman_image:
        name: "{{ item }}"
        state: present
      loop:
        - docker.io/library/nginx:1.25
        - docker.io/library/redis:7-alpine

    - name: Run Nginx container
      containers.podman.podman_container:
        name: web
        image: docker.io/library/nginx:1.25
        state: started
        restart_policy: always
        ports:
          - "8080:80"
        volumes:
          - /srv/www:/usr/share/nginx/html:ro,Z

    - name: Run Redis container
      containers.podman.podman_container:
        name: cache
        image: docker.io/library/redis:7-alpine
        state: started
        restart_policy: always
        volumes:
          - redis-data:/data:Z
```

## Rootless Containers

One of Podman's best features is running containers without root:

```yaml
# playbook-podman-rootless.yml
# Deploy rootless containers as a regular user
---
- name: Configure rootless Podman containers
  hosts: container_hosts
  become: true
  become_user: appuser  # Run as a non-root user

  tasks:
    - name: Pull the application image
      containers.podman.podman_image:
        name: docker.io/library/httpd:2.4

    - name: Run Apache as a rootless container
      containers.podman.podman_container:
        name: my-httpd
        image: docker.io/library/httpd:2.4
        state: started
        # Rootless containers need ports above 1024
        ports:
          - "8080:80"
        volumes:
          - /home/appuser/www:/usr/local/apache2/htdocs:ro,Z

    - name: Generate systemd unit for the container
      containers.podman.podman_generate_systemd:
        name: my-httpd
        new: true
        dest: /home/appuser/.config/systemd/user/
        restart_policy: always
      notify: Reload user systemd

  handlers:
    - name: Reload user systemd
      ansible.builtin.systemd:
        daemon_reload: true
        scope: user
```

## Managing Pods

Podman pods group containers that share a network namespace, similar to Kubernetes pods:

```yaml
# playbook-podman-pod.yml
# Create a pod with multiple containers
---
- name: Deploy application pod
  hosts: container_hosts
  become: true

  tasks:
    - name: Create application pod
      containers.podman.podman_pod:
        name: myapp-pod
        state: started
        ports:
          - "80:80"
          - "443:443"

    - name: Run database in the pod
      containers.podman.podman_container:
        name: myapp-db
        image: docker.io/library/postgres:15
        pod: myapp-pod
        state: started
        env:
          POSTGRES_DB: myapp
          POSTGRES_USER: myapp
          POSTGRES_PASSWORD: "secretpassword"
        volumes:
          - pgdata:/var/lib/postgresql/data:Z

    - name: Run application in the pod
      containers.podman.podman_container:
        name: myapp-app
        image: registry.example.com/myapp:latest
        pod: myapp-pod
        state: started
        env:
          DATABASE_URL: "postgresql://myapp:secretpassword@localhost/myapp"

    - name: Run Nginx in the pod
      containers.podman.podman_container:
        name: myapp-web
        image: docker.io/library/nginx:1.25
        pod: myapp-pod
        state: started
        volumes:
          - /etc/nginx/conf.d:/etc/nginx/conf.d:ro,Z
```

Since all containers in a pod share the network namespace, they communicate via localhost.

## systemd Integration

Generate systemd service files so containers start on boot:

```yaml
# playbook-podman-systemd.yml
# Create systemd services for Podman containers
---
- name: Set up Podman containers with systemd
  hosts: container_hosts
  become: true

  tasks:
    - name: Run the container
      containers.podman.podman_container:
        name: webapp
        image: docker.io/library/nginx:1.25
        state: started
        ports:
          - "80:80"

    - name: Generate systemd unit file
      containers.podman.podman_generate_systemd:
        name: webapp
        new: true
        dest: /etc/systemd/system/
        restart_policy: always
        time: 30
        names: true
      register: systemd_unit

    - name: Enable the container service
      ansible.builtin.systemd:
        name: "container-webapp"
        enabled: true
        daemon_reload: true
        state: started
```

## Container Updates with Ansible

```yaml
# playbook-podman-update.yml
# Update container images and redeploy
---
- name: Update container images
  hosts: container_hosts
  become: true

  tasks:
    - name: Pull latest image
      containers.podman.podman_image:
        name: registry.example.com/myapp:latest
        force: true
      register: image_pull

    - name: Recreate container if image changed
      containers.podman.podman_container:
        name: myapp
        image: registry.example.com/myapp:latest
        state: started
        recreate: "{{ image_pull.changed }}"
        ports:
          - "8080:8080"
```

## Managing Container Networks

```yaml
# Create custom Podman networks
- name: Create application network
  containers.podman.podman_network:
    name: app-net
    subnet: 172.20.0.0/24
    gateway: 172.20.0.1
    state: present

- name: Run container on custom network
  containers.podman.podman_container:
    name: myapp
    image: registry.example.com/myapp:latest
    network:
      - app-net
    state: started
```

## Verifying Containers

```bash
# List running containers
podman ps

# Check container logs
podman logs webapp

# Inspect a container
podman inspect webapp

# Check pod status
podman pod ps

# View resource usage
podman stats --no-stream
```

## Wrapping Up

Podman with Ansible on RHEL 9 is a strong combination. You get rootless containers, no daemon dependency, and native systemd integration. The `containers.podman` collection provides everything you need. The pod concept is especially useful for multi-container applications since all containers in a pod share networking, just like in Kubernetes. If you are already using Kubernetes in production, Podman pods make your local development and staging environments more consistent.
