# How to Use the containers.podman Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Podman, Containers, DevOps

Description: Manage Podman containers, pods, images, and networks with Ansible using the containers.podman collection for rootless container automation.

---

Podman has become a popular alternative to Docker, especially in environments where running a daemon with root privileges is not acceptable. The `containers.podman` collection for Ansible gives you modules and connection plugins to manage Podman containers, pods, images, volumes, and networks. If you are migrating away from Docker or building rootless container workflows, this collection fits right into your automation stack.

## Installing the Collection

The collection works with Podman installed on your target hosts. No extra Python libraries are needed beyond what Ansible already requires.

```bash
# Install the collection from Galaxy
ansible-galaxy collection install containers.podman
```

Pin the version in your requirements file.

```yaml
# requirements.yml - lock the collection version
collections:
  - name: containers.podman
    version: ">=1.12.0"
```

Make sure Podman is installed on your managed hosts.

```bash
# For RHEL/CentOS/Fedora
sudo dnf install -y podman

# For Ubuntu/Debian
sudo apt-get install -y podman
```

## Managing Container Images

Before running containers, you need images. The `podman_image` module handles pulling, building, and removing images.

```yaml
# playbook-images.yml - manage container images
- hosts: container_hosts
  tasks:
    - name: Pull application images
      containers.podman.podman_image:
        name: "{{ item }}"
        state: present
      loop:
        - "docker.io/library/nginx:1.25"
        - "docker.io/library/redis:7-alpine"
        - "docker.io/library/postgres:16-alpine"
        - "registry.example.com/myapp:latest"

    - name: Build an image from a Containerfile
      containers.podman.podman_image:
        name: "myapp-custom"
        tag: "v1.0"
        path: "/opt/build/myapp"
        build:
          file: "Containerfile"
          extra_args: "--no-cache"
        state: build

    - name: Remove old unused images
      containers.podman.podman_image:
        name: "registry.example.com/myapp"
        tag: "v0.9"
        state: absent
```

## Running Containers

The `podman_container` module is your workhorse for creating and managing containers.

```yaml
# playbook-containers.yml - run application containers
- hosts: container_hosts
  tasks:
    - name: Run a Redis cache container
      containers.podman.podman_container:
        name: redis-cache
        image: docker.io/library/redis:7-alpine
        state: started
        restart_policy: always
        ports:
          - "6379:6379"
        volumes:
          - "redis-data:/data:Z"
        command: ["redis-server", "--appendonly", "yes"]
        memory: "512m"
        cpus: "0.5"

    - name: Run a PostgreSQL database container
      containers.podman.podman_container:
        name: postgres-db
        image: docker.io/library/postgres:16-alpine
        state: started
        restart_policy: always
        ports:
          - "5432:5432"
        env:
          POSTGRES_DB: "myapp"
          POSTGRES_USER: "appuser"
          POSTGRES_PASSWORD: "{{ vault_db_password }}"
        volumes:
          - "pg-data:/var/lib/postgresql/data:Z"
        memory: "2g"
        cpus: "2.0"
        healthcheck: "pg_isready -U appuser -d myapp"
        healthcheck_interval: "10s"
        healthcheck_retries: 5

    - name: Run the application container
      containers.podman.podman_container:
        name: myapp
        image: registry.example.com/myapp:latest
        state: started
        restart_policy: always
        ports:
          - "8080:8080"
        env:
          DATABASE_URL: "postgresql://appuser:{{ vault_db_password }}@postgres-db:5432/myapp"
          REDIS_URL: "redis://redis-cache:6379"
          LOG_LEVEL: "info"
        network:
          - myapp-network
        memory: "1g"
        cpus: "1.0"
```

## Managing Podman Networks

Create custom networks for container communication.

```yaml
# playbook-networks.yml - set up container networks
- hosts: container_hosts
  tasks:
    - name: Create application network
      containers.podman.podman_network:
        name: myapp-network
        driver: bridge
        subnet: "10.88.1.0/24"
        gateway: "10.88.1.1"
        state: present

    - name: Create isolated database network
      containers.podman.podman_network:
        name: db-network
        driver: bridge
        internal: true  # no external access
        subnet: "10.88.2.0/24"
        state: present
```

## Working with Podman Pods

Pods group containers that share network namespace, similar to Kubernetes pods. This is one of Podman's unique features compared to Docker.

```yaml
# playbook-pods.yml - create and manage Podman pods
- hosts: container_hosts
  tasks:
    - name: Create a pod for the application stack
      containers.podman.podman_pod:
        name: myapp-pod
        state: started
        ports:
          - "8080:8080"
          - "9090:9090"
        network:
          - myapp-network

    - name: Add nginx sidecar to the pod
      containers.podman.podman_container:
        name: myapp-nginx
        image: docker.io/library/nginx:1.25
        pod: myapp-pod
        state: started
        volumes:
          - "/opt/myapp/nginx.conf:/etc/nginx/nginx.conf:ro,Z"

    - name: Add application container to the pod
      containers.podman.podman_container:
        name: myapp-backend
        image: registry.example.com/myapp:latest
        pod: myapp-pod
        state: started
        env:
          APP_PORT: "9090"

    - name: Add log collector sidecar to the pod
      containers.podman.podman_container:
        name: myapp-fluentbit
        image: docker.io/fluent/fluent-bit:latest
        pod: myapp-pod
        state: started
        volumes:
          - "/opt/myapp/fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf:ro,Z"
```

## Managing Volumes

Persistent volumes for container data.

```yaml
# playbook-volumes.yml - manage Podman volumes
- hosts: container_hosts
  tasks:
    - name: Create named volumes for data persistence
      containers.podman.podman_volume:
        name: "{{ item }}"
        state: present
      loop:
        - redis-data
        - pg-data
        - app-uploads
        - app-logs

    - name: Create a volume with custom options
      containers.podman.podman_volume:
        name: shared-data
        options:
          - "type=tmpfs"
          - "device=tmpfs"
          - "o=size=100m"
        state: present
```

## Rootless Container Management

One of Podman's biggest advantages is running containers without root. Here is how to automate rootless setups.

```yaml
# playbook-rootless.yml - configure rootless Podman containers
- hosts: container_hosts
  become: no  # run as the target user, not root
  vars:
    ansible_user: appuser
  tasks:
    - name: Enable lingering for the user (so containers survive logout)
      ansible.builtin.command:
        cmd: loginctl enable-linger {{ ansible_user }}
      become: yes

    - name: Run rootless container as appuser
      containers.podman.podman_container:
        name: myapp-rootless
        image: registry.example.com/myapp:latest
        state: started
        restart_policy: always
        ports:
          - "8080:8080"
        env:
          APP_ENV: production

    - name: Generate systemd unit for rootless container
      containers.podman.podman_generate_systemd:
        name: myapp-rootless
        new: true
        dest: "/home/{{ ansible_user }}/.config/systemd/user/"
        restart_policy: always
        restart_sec: 10

    - name: Enable the systemd user service
      ansible.builtin.systemd:
        name: "container-myapp-rootless"
        enabled: true
        state: started
        scope: user
```

## Generating Systemd Units

Podman integrates with systemd for container lifecycle management. The collection can generate systemd unit files automatically.

```yaml
# playbook-systemd.yml - generate systemd units for containers
- hosts: container_hosts
  become: yes
  tasks:
    - name: Generate systemd unit files for all app containers
      containers.podman.podman_generate_systemd:
        name: "{{ item }}"
        new: true
        dest: /etc/systemd/system/
        restart_policy: on-failure
        restart_sec: 30
        stop_timeout: 60
      loop:
        - redis-cache
        - postgres-db
        - myapp

    - name: Reload systemd daemon
      ansible.builtin.systemd:
        daemon_reload: yes

    - name: Enable container services
      ansible.builtin.systemd:
        name: "container-{{ item }}"
        enabled: yes
        state: started
      loop:
        - redis-cache
        - postgres-db
        - myapp
```

## Podman Login for Private Registries

Authenticate with private container registries.

```yaml
# playbook-registry-login.yml - authenticate to private registries
- hosts: container_hosts
  tasks:
    - name: Login to private container registry
      containers.podman.podman_login:
        registry: "registry.example.com"
        username: "{{ vault_registry_user }}"
        password: "{{ vault_registry_password }}"

    - name: Login to Docker Hub (for rate limit avoidance)
      containers.podman.podman_login:
        registry: "docker.io"
        username: "{{ vault_dockerhub_user }}"
        password: "{{ vault_dockerhub_token }}"
```

## Practical Tips

Here is what I have found works well with this collection:

1. **Use the `:Z` volume suffix on SELinux systems.** Without it, containers cannot read mounted volumes on RHEL and Fedora. The `:Z` flag applies the correct SELinux context.

2. **Generate systemd units with `new: true`.** The `new` parameter creates units that recreate containers from scratch on restart, which ensures the latest image and configuration are always used.

3. **Rootless needs lingering.** If your containers run as a non-root user, enable `loginctl enable-linger` for that user. Without it, containers stop when the user logs out.

4. **Pods simplify networking.** When containers need to communicate over localhost, put them in a pod instead of setting up network links. It is cleaner and more aligned with Kubernetes patterns.

5. **Use healthchecks.** The `healthcheck` parameter on containers lets Podman monitor container health and report it through `podman ps`. Combine this with systemd for automatic restart on failure.

The `containers.podman` collection gives you full control over Podman from Ansible, making it a solid choice for teams building container infrastructure without Docker.
