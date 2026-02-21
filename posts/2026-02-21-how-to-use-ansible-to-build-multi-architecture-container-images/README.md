# How to Use Ansible to Build Multi-Architecture Container Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Multi-Architecture, Containers, DevOps

Description: Build Docker images for multiple CPU architectures like amd64 and arm64 using Ansible with Docker Buildx and QEMU emulation.

---

Multi-architecture container images allow a single image tag to work on different CPU architectures like x86_64 (amd64) and ARM64 (aarch64). This is increasingly important as ARM-based servers gain popularity in cloud environments (AWS Graviton, Apple Silicon Macs). Ansible can automate the entire multi-arch build process using Docker Buildx and QEMU emulation.

## Prerequisites

```yaml
# roles/multiarch_build/tasks/setup.yml
# Set up Docker Buildx and QEMU for multi-architecture builds
- name: Install QEMU user static binaries
  ansible.builtin.package:
    name: qemu-user-static
    state: present

- name: Register QEMU binary formats
  ansible.builtin.command:
    cmd: docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
  changed_when: true

- name: Create Buildx builder instance
  ansible.builtin.command:
    cmd: docker buildx create --name multiarch --driver docker-container --use
  register: buildx_create
  failed_when: false
  changed_when: "'multiarch' not in buildx_create.stderr"

- name: Bootstrap Buildx builder
  ansible.builtin.command:
    cmd: docker buildx inspect --bootstrap
  changed_when: true
```

## Building Multi-Arch Images

```yaml
# roles/multiarch_build/tasks/build.yml
# Build and push multi-architecture container images
- name: Build multi-architecture image
  ansible.builtin.command:
    cmd: >
      docker buildx build
      --platform {{ target_platforms | join(',') }}
      --tag {{ registry }}/{{ image_name }}:{{ image_tag }}
      --tag {{ registry }}/{{ image_name }}:latest
      --push
      --builder multiarch
      {{ build_context }}
  changed_when: true

# defaults/main.yml variables
# target_platforms:
#   - linux/amd64
#   - linux/arm64
#   - linux/arm/v7
```

```yaml
# defaults/main.yml
target_platforms:
  - linux/amd64
  - linux/arm64
registry: "registry.example.com"
image_name: myapp
image_tag: "{{ app_version }}"
build_context: "."
```

## Multi-Service Build Playbook

```yaml
# playbooks/build_multiarch.yml
# Build multi-arch images for all services
- name: Build multi-architecture images
  hosts: build_server
  become: true
  tasks:
    - name: Set up Buildx
      ansible.builtin.include_role:
        name: multiarch_build
        tasks_from: setup

    - name: Log in to registry
      community.docker.docker_login:
        registry_url: "{{ registry }}"
        username: "{{ registry_user }}"
        password: "{{ vault_registry_pass }}"

    - name: Build each service image
      ansible.builtin.command:
        cmd: >
          docker buildx build
          --platform {{ target_platforms | join(',') }}
          --tag {{ registry }}/{{ item.name }}:{{ item.version }}
          --push
          --builder multiarch
          {{ item.context }}
      loop: "{{ services }}"
      loop_control:
        label: "{{ item.name }}"
      changed_when: true

  vars:
    services:
      - name: api-service
        version: "v2.1.0"
        context: "./services/api"
      - name: worker-service
        version: "v1.5.0"
        context: "./services/worker"
      - name: web-frontend
        version: "v3.0.0"
        context: "./services/web"
```

## Verifying Multi-Arch Images

```yaml
# roles/multiarch_build/tasks/verify.yml
# Verify multi-architecture image manifest
- name: Inspect image manifest
  ansible.builtin.command:
    cmd: docker buildx imagetools inspect {{ registry }}/{{ image_name }}:{{ image_tag }}
  register: manifest
  changed_when: false

- name: Display manifest details
  ansible.builtin.debug:
    var: manifest.stdout_lines

- name: Verify all platforms are present
  ansible.builtin.assert:
    that:
      - "'linux/amd64' in manifest.stdout"
      - "'linux/arm64' in manifest.stdout"
    fail_msg: "Not all target platforms found in manifest"
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

Multi-architecture Docker images are becoming essential as ARM processors gain traction in cloud and edge computing. Ansible automates the Buildx setup, QEMU registration, and multi-platform build process, making it easy to produce images that work across architectures. This workflow integrates cleanly into CI pipelines and ensures your containerized applications run on any platform your users need.
