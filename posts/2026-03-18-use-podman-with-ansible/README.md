# How to Use Podman with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Ansible, Container, Automation, Configuration Management

Description: Learn how to use Podman with Ansible to automate container management, build images, orchestrate multi-container deployments, and manage container infrastructure at scale.

---

> Ansible and Podman together create a powerful automation platform where container infrastructure is managed through declarative playbooks that are idempotent, version-controlled, and auditable.

Ansible is one of the most popular automation tools for managing infrastructure, and its support for Podman has matured significantly. Using Ansible to manage Podman containers gives you the best of both worlds: the simplicity and rootless security of Podman combined with the declarative, idempotent automation of Ansible. This combination is particularly valuable for managing container deployments across multiple servers without requiring a full orchestration platform like Kubernetes.

---

## Installing the Ansible Podman Collection

Ansible interacts with Podman through the `containers.podman` collection. Install it:

```bash
ansible-galaxy collection install containers.podman
```

Verify the installation:

```bash
ansible-galaxy collection list | grep podman
```

Ensure Podman is installed on all target hosts. You can use Ansible itself for this:

```yaml
# install-podman.yml

---
- name: Install Podman on target hosts
  hosts: all
  become: true
  tasks:
    - name: Install Podman (Fedora/RHEL)
      ansible.builtin.dnf:
        name: podman
        state: present
      when: ansible_os_family == "RedHat"

    - name: Install Podman (Debian/Ubuntu)
      ansible.builtin.apt:
        name: podman
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"
```

## Managing Containers with Ansible

The `containers.podman.podman_container` module lets you manage containers declaratively:

```yaml
# deploy-app.yml
---
- name: Deploy application containers
  hosts: app_servers
  tasks:
    - name: Create application network
      containers.podman.podman_network:
        name: app-network
        state: present

    - name: Run PostgreSQL container
      containers.podman.podman_container:
        name: app-db
        image: postgres:16
        state: started
        restart_policy: always
        network: app-network
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: "{{ db_password }}"
          POSTGRES_DB: production
        volumes:
          - pgdata:/var/lib/postgresql/data
        publish:
          - "5432:5432"

    - name: Run Redis container
      containers.podman.podman_container:
        name: app-cache
        image: redis:7-alpine
        state: started
        restart_policy: always
        network: app-network
        command: redis-server --requirepass "{{ redis_password }}"

    - name: Run application container
      containers.podman.podman_container:
        name: app-web
        image: "{{ app_image }}:{{ app_version }}"
        state: started
        restart_policy: always
        network: app-network
        env:
          DATABASE_URL: "postgresql://app:{{ db_password }}@app-db:5432/production"
          REDIS_URL: "redis://:{{ redis_password }}@app-cache:6379"
          NODE_ENV: production
        publish:
          - "8080:3000"
        memory: 1g
        cpus: 2.0
```

## Building Images with Ansible

Use Ansible to build container images consistently across your infrastructure:

If you use `synchronize`, install the `ansible.posix` collection as well:

```bash
ansible-galaxy collection install ansible.posix
```

The `synchronize` module also requires `rsync` on the control node and the target host.

```yaml
# build-images.yml
---
- name: Build application images
  hosts: build_servers
  vars:
    app_version: "{{ lookup('pipe', 'git rev-parse --short HEAD') }}"
    registry: registry.example.com
  tasks:
    - name: Copy application source
      ansible.posix.synchronize:
        src: ./app/
        dest: /tmp/app-build/

    - name: Build application image
      containers.podman.podman_image:
        name: "{{ registry }}/myapp"
        tag: "{{ app_version }}"
        path: /tmp/app-build/
        build:
          file: Containerfile
          extra_args: "--no-cache"
        state: present

    - name: Tag as latest
      containers.podman.podman_tag:
        image: "{{ registry }}/myapp:{{ app_version }}"
        target_names:
          - "{{ registry }}/myapp:latest"

    - name: Push image to registry
      containers.podman.podman_image:
        name: "{{ registry }}/myapp:{{ app_version }}"
        push: true
        push_args:
          dest: "{{ registry }}/myapp:{{ app_version }}"

    - name: Cleanup build directory
      ansible.builtin.file:
        path: /tmp/app-build/
        state: absent
```

## Managing Pods with Ansible

Podman pods group related containers, similar to Kubernetes pods:

```yaml
# deploy-pod.yml
---
- name: Deploy application pod
  hosts: app_servers
  tasks:
    - name: Create application pod
      containers.podman.podman_pod:
        name: myapp-pod
        state: started
        publish:
          - "8080:3000"
          - "9100:9100"

    - name: Run app in pod
      containers.podman.podman_container:
        name: myapp-web
        image: myapp:latest
        pod: myapp-pod
        state: started
        env:
          PORT: "3000"

    - name: Run metrics sidecar in pod
      containers.podman.podman_container:
        name: myapp-metrics
        image: prom/node-exporter:latest
        pod: myapp-pod
        state: started
```

## Rolling Deployments

Implement rolling deployments across multiple hosts:

```yaml
# rolling-deploy.yml
---
- name: Rolling deployment
  hosts: app_servers
  serial: 1
  max_fail_percentage: 0
  vars:
    app_image: registry.example.com/myapp
    app_version: "{{ deploy_version }}"
  tasks:
    - name: Pull new image
      containers.podman.podman_image:
        name: "{{ app_image }}:{{ app_version }}"
        state: present

    - name: Stop old container
      containers.podman.podman_container:
        name: myapp
        state: stopped
      ignore_errors: true

    - name: Start new container
      containers.podman.podman_container:
        name: myapp
        image: "{{ app_image }}:{{ app_version }}"
        state: started
        restart_policy: always
        publish:
          - "8080:3000"
        env:
          NODE_ENV: production
        memory: 1g

    - name: Wait for health check
      ansible.builtin.uri:
        url: "http://localhost:8080/health"
        status_code: 200
      register: health_result
      until: health_result.status == 200
      retries: 30
      delay: 2

    - name: Prune unused images
      containers.podman.podman_prune:
        image: true
        image_filters:
          dangling_only: false
      ignore_errors: true
```

Run it:

```bash
ansible-playbook rolling-deploy.yml -e deploy_version=v2.1.0
```

## Systemd Integration with Ansible

> **Note:** `podman generate systemd`, which the `generate_systemd` option relies on, is deprecated in current Podman releases. The recommended approach for new deployments is to use Quadlet files for systemd integration. The example below still works for existing workflows, but new deployments should prefer Quadlet.

Generate and manage systemd units for Podman containers:

```yaml
# systemd-containers.yml
---
- name: Setup systemd-managed containers
  hosts: app_servers
  tasks:
    - name: Create container for systemd generation
      containers.podman.podman_container:
        name: myapp
        image: myapp:latest
        rm: true
        state: created
        publish:
          - "8080:3000"
        generate_systemd:
          path: ~/.config/systemd/user/
          restart_policy: always
          stop_timeout: 30
          names: true
          new: true

    - name: Enable systemd service
      ansible.builtin.systemd:
        name: container-myapp
        enabled: true
        state: started
        scope: user
        daemon_reload: true
```

## Inventory-Driven Container Management

Use Ansible inventory to define container configurations per host:

```yaml
# inventory/host_vars/web1.yml
containers:
  - name: nginx
    image: nginx:latest
    publish: ["80:80", "443:443"]
    volumes:
      - /etc/nginx/conf.d:/etc/nginx/conf.d:ro
      - /var/www:/var/www:ro
    memory: 512m

  - name: app
    image: myapp:latest
    publish: ["3000:3000"]
    env:
      NODE_ENV: production
    memory: 1g
```

```yaml
# manage-containers.yml
---
- name: Manage containers from inventory
  hosts: all
  tasks:
    - name: Manage each container
      containers.podman.podman_container:
        name: "{{ item.name }}"
        image: "{{ item.image }}"
        state: started
        restart_policy: always
        publish: "{{ item.publish | default([]) }}"
        volumes: "{{ item.volumes | default([]) }}"
        env: "{{ item.env | default({}) }}"
        memory: "{{ item.memory | default(omit) }}"
      loop: "{{ containers | default([]) }}"
```

## Conclusion

Ansible and Podman form a powerful combination for managing containerized infrastructure. Ansible's declarative playbooks bring idempotency and repeatability to container management, while Podman's rootless, daemonless architecture provides security and simplicity. Whether you are deploying a single application or orchestrating containers across a fleet of servers, the `containers.podman` collection gives you the modules needed to automate every aspect of the container lifecycle. This approach scales well for organizations that need container management without the complexity of Kubernetes.
