# How to Use Ansible to Manage Podman Compose Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Podman, Containers, Deployment, DevOps

Description: Deploy and manage Podman Compose applications with Ansible for rootless container deployments, systemd integration, and pod management.

---

Podman is a daemonless container engine that runs containers without root privileges by default. It is fully compatible with Docker images and Dockerfiles, but has a fundamentally different architecture. Podman Compose provides Docker Compose compatibility, and Ansible can manage the entire lifecycle of Podman-based deployments. If your organization requires rootless containers or needs to avoid the Docker daemon, Podman with Ansible is a solid alternative.

## Why Podman Over Docker?

Podman runs without a daemon, which eliminates a single point of failure. It supports rootless containers natively, which is a security requirement in many enterprise environments. It also generates systemd unit files from containers, which integrates with the standard Linux service management.

## Installing Podman with Ansible

```yaml
# roles/podman/tasks/install.yml
# Install Podman and related tools
- name: Install Podman on Debian/Ubuntu
  ansible.builtin.apt:
    name:
      - podman
      - podman-compose
      - slirp4netns
      - fuse-overlayfs
    state: present
    update_cache: true
  when: ansible_os_family == 'Debian'

- name: Install Podman on RHEL/CentOS
  ansible.builtin.dnf:
    name:
      - podman
      - podman-compose
    state: present
  when: ansible_os_family == 'RedHat'

- name: Configure rootless Podman for deploy user
  ansible.builtin.command:
    cmd: loginctl enable-linger {{ deploy_user }}
  changed_when: true

- name: Configure subuids for rootless operation
  ansible.builtin.lineinfile:
    path: /etc/subuid
    line: "{{ deploy_user }}:100000:65536"
    create: true
    mode: '0644'

- name: Configure subgids for rootless operation
  ansible.builtin.lineinfile:
    path: /etc/subgid
    line: "{{ deploy_user }}:100000:65536"
    create: true
    mode: '0644'
```

## Deploying with Podman Compose

```yaml
# roles/podman_deploy/tasks/main.yml
# Deploy application using Podman Compose
- name: Create application directory
  ansible.builtin.file:
    path: "{{ app_dir }}"
    state: directory
    owner: "{{ deploy_user }}"
    mode: '0755'

- name: Deploy compose file
  ansible.builtin.template:
    src: docker-compose.yml.j2
    dest: "{{ app_dir }}/docker-compose.yml"
    owner: "{{ deploy_user }}"
    mode: '0644'

- name: Deploy environment file
  ansible.builtin.template:
    src: env.j2
    dest: "{{ app_dir }}/.env"
    owner: "{{ deploy_user }}"
    mode: '0600'

- name: Pull images with Podman
  ansible.builtin.command:
    cmd: podman-compose pull
    chdir: "{{ app_dir }}"
  become: true
  become_user: "{{ deploy_user }}"
  changed_when: true

- name: Start application with Podman Compose
  ansible.builtin.command:
    cmd: podman-compose up -d
    chdir: "{{ app_dir }}"
  become: true
  become_user: "{{ deploy_user }}"
  changed_when: true
```

## Using Podman Pods

Podman's pod concept groups containers that share network namespace:

```yaml
# roles/podman_deploy/tasks/pods.yml
# Create and manage Podman pods
- name: Create application pod
  containers.podman.podman_pod:
    name: "{{ pod_name }}"
    state: started
    ports:
      - "{{ app_port }}:8080"
      - "{{ db_port }}:5432"
  become: true
  become_user: "{{ deploy_user }}"

- name: Run database in pod
  containers.podman.podman_container:
    name: "{{ pod_name }}-db"
    pod: "{{ pod_name }}"
    image: "postgres:16"
    state: started
    env:
      POSTGRES_DB: "{{ db_name }}"
      POSTGRES_USER: "{{ db_user }}"
      POSTGRES_PASSWORD: "{{ db_password }}"
    volumes:
      - "{{ pod_name }}-pgdata:/var/lib/postgresql/data"
  become: true
  become_user: "{{ deploy_user }}"

- name: Run application in pod
  containers.podman.podman_container:
    name: "{{ pod_name }}-app"
    pod: "{{ pod_name }}"
    image: "{{ app_image }}:{{ app_version }}"
    state: started
    env:
      DATABASE_URL: "postgresql://{{ db_user }}:{{ db_password }}@127.0.0.1:5432/{{ db_name }}"
  become: true
  become_user: "{{ deploy_user }}"
```

## Generating Systemd Services

```yaml
# roles/podman_deploy/tasks/systemd.yml
# Generate systemd services from Podman containers
- name: Generate systemd unit for pod
  ansible.builtin.command:
    cmd: podman generate systemd --new --name {{ pod_name }} --files
    chdir: "/home/{{ deploy_user }}/.config/systemd/user/"
  become: true
  become_user: "{{ deploy_user }}"
  changed_when: true

- name: Enable and start pod service
  ansible.builtin.systemd:
    name: "pod-{{ pod_name }}"
    enabled: true
    state: started
    scope: user
  become: true
  become_user: "{{ deploy_user }}"
  environment:
    XDG_RUNTIME_DIR: "/run/user/{{ deploy_user_uid }}"
```

## Registry Authentication

```yaml
# roles/podman_deploy/tasks/auth.yml
# Configure registry authentication for Podman
- name: Log in to container registry
  containers.podman.podman_login:
    registry: "{{ registry_url }}"
    username: "{{ registry_username }}"
    password: "{{ vault_registry_password }}"
  become: true
  become_user: "{{ deploy_user }}"
```

## Health Checks and Monitoring

```yaml
# roles/podman_deploy/tasks/health.yml
# Verify Podman container health
- name: Check container status
  ansible.builtin.command:
    cmd: podman ps --format json --filter name={{ pod_name }}
  become: true
  become_user: "{{ deploy_user }}"
  register: container_status
  changed_when: false

- name: Verify all containers are running
  ansible.builtin.assert:
    that:
      - (container_status.stdout | from_json | length) == expected_container_count
    fail_msg: "Expected {{ expected_container_count }} containers, found {{ (container_status.stdout | from_json | length) }}"

- name: Check application health endpoint
  ansible.builtin.uri:
    url: "http://127.0.0.1:{{ app_port }}/health"
    status_code: 200
  register: health
  until: health.status == 200
  retries: 20
  delay: 5
```


## Common Use Cases

Here are several practical scenarios where this module proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this module
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      ansible.builtin.timezone:
        name: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: all
  become: true
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling with this module
- name: Robust task execution
  hosts: all
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /opt/app/primary-task.sh
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /opt/app/fallback-task.sh
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: ansible
```


## Conclusion

Podman with Ansible provides a secure, daemonless container deployment workflow. The rootless operation, systemd integration, and pod concept make Podman particularly well-suited for enterprise environments. Ansible handles the deployment orchestration, configuration templating, and service management, while Podman provides the container runtime. The containers.podman Ansible collection offers native modules that make the integration seamless.
