# How to Use Ansible to Deploy to Container Registries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Container Registry, DevOps, CI/CD

Description: Automate building, tagging, and pushing container images to Docker Hub, AWS ECR, and private registries using Ansible playbooks.

---

Container registries are the distribution mechanism for your container images. Whether you use Docker Hub, AWS ECR, Google Container Registry, or a self-hosted Harbor instance, Ansible can automate the entire workflow of building images, tagging them, and pushing them to the registry. This is particularly useful when you want your infrastructure automation tool to also handle image lifecycle management.

I started using Ansible for registry operations when our team needed a single tool to manage both the infrastructure and the application deployment pipeline. Running separate CI tools for image builds and Ansible for deployments created unnecessary complexity.

## Working with Docker Hub

The simplest registry to work with is Docker Hub. Ansible's community.docker collection has modules for all registry operations.

```bash
# Install the Docker collection
ansible-galaxy collection install community.docker
```

```yaml
# roles/container_build/tasks/dockerhub.yml
# Build and push images to Docker Hub
- name: Log in to Docker Hub
  community.docker.docker_login:
    username: "{{ dockerhub_username }}"
    password: "{{ vault_dockerhub_password }}"
    reauthorize: true

- name: Build application image
  community.docker.docker_image:
    name: "{{ dockerhub_username }}/{{ app_name }}"
    tag: "{{ app_version }}"
    source: build
    build:
      path: "{{ app_source_dir }}"
      dockerfile: Dockerfile
      pull: true
      args:
        BUILD_DATE: "{{ ansible_date_time.iso8601 }}"
        VERSION: "{{ app_version }}"
    push: true

- name: Tag as latest
  community.docker.docker_image:
    name: "{{ dockerhub_username }}/{{ app_name }}"
    tag: "{{ app_version }}"
    repository: "{{ dockerhub_username }}/{{ app_name }}"
    push: true
    source: local

- name: Log out of Docker Hub
  community.docker.docker_login:
    state: absent
```

## Working with AWS ECR

AWS Elastic Container Registry requires an authentication token refresh:

```yaml
# roles/container_build/tasks/ecr.yml
# Build and push images to AWS ECR
- name: Get ECR login token
  ansible.builtin.command:
    cmd: aws ecr get-login-password --region {{ aws_region }}
  register: ecr_token
  changed_when: false

- name: Log in to ECR
  community.docker.docker_login:
    registry_url: "{{ aws_account_id }}.dkr.ecr.{{ aws_region }}.amazonaws.com"
    username: AWS
    password: "{{ ecr_token.stdout }}"
    reauthorize: true

- name: Ensure ECR repository exists
  ansible.builtin.command:
    cmd: >
      aws ecr describe-repositories
      --repository-names {{ app_name }}
      --region {{ aws_region }}
  register: ecr_repo_check
  failed_when: false
  changed_when: false

- name: Create ECR repository if it does not exist
  ansible.builtin.command:
    cmd: >
      aws ecr create-repository
      --repository-name {{ app_name }}
      --region {{ aws_region }}
      --image-scanning-configuration scanOnPush=true
  when: ecr_repo_check.rc != 0
  changed_when: true

- name: Build and push to ECR
  community.docker.docker_image:
    name: "{{ aws_account_id }}.dkr.ecr.{{ aws_region }}.amazonaws.com/{{ app_name }}"
    tag: "{{ app_version }}"
    source: build
    build:
      path: "{{ app_source_dir }}"
      dockerfile: Dockerfile
    push: true
```

## Working with Private Registries

For self-hosted registries like Harbor or Nexus:

```yaml
# roles/container_build/tasks/private_registry.yml
# Build and push to a private container registry
- name: Log in to private registry
  community.docker.docker_login:
    registry_url: "{{ private_registry_url }}"
    username: "{{ registry_username }}"
    password: "{{ vault_registry_password }}"

- name: Build image for private registry
  community.docker.docker_image:
    name: "{{ private_registry_url }}/{{ registry_project }}/{{ app_name }}"
    tag: "{{ app_version }}"
    source: build
    build:
      path: "{{ app_source_dir }}"
    push: true

- name: Push additional tags
  community.docker.docker_image:
    name: "{{ private_registry_url }}/{{ registry_project }}/{{ app_name }}"
    tag: "{{ item }}"
    source: local
    push: true
  loop:
    - "latest"
    - "{{ git_branch }}"
    - "{{ git_short_sha }}"
```

## Multi-Service Build Playbook

```yaml
# playbooks/build_all_services.yml
# Build and push all microservice images
- name: Build all microservice images
  hosts: build_server
  become: true
  vars:
    registry: "registry.example.com"
    services:
      - name: user-service
        path: ./services/user
        version: "{{ user_service_version | default('latest') }}"
      - name: order-service
        path: ./services/order
        version: "{{ order_service_version | default('latest') }}"
      - name: payment-service
        path: ./services/payment
        version: "{{ payment_service_version | default('latest') }}"
  tasks:
    - name: Log in to registry
      community.docker.docker_login:
        registry_url: "{{ registry }}"
        username: "{{ registry_user }}"
        password: "{{ vault_registry_pass }}"

    - name: Build and push each service
      community.docker.docker_image:
        name: "{{ registry }}/{{ item.name }}"
        tag: "{{ item.version }}"
        source: build
        build:
          path: "{{ item.path }}"
          pull: true
        push: true
      loop: "{{ services }}"
      loop_control:
        label: "{{ item.name }}:{{ item.version }}"
```

## Image Lifecycle Management

```yaml
# roles/container_build/tasks/lifecycle.yml
# Manage image tags and cleanup old images
- name: List local images
  community.docker.docker_image_info:
    name: "{{ registry }}/{{ app_name }}"
  register: local_images

- name: Remove old local images
  community.docker.docker_image:
    name: "{{ item.RepoTags[0].split(':')[0] }}"
    tag: "{{ item.RepoTags[0].split(':')[1] }}"
    state: absent
  loop: "{{ local_images.images }}"
  when:
    - item.RepoTags | length > 0
    - item.RepoTags[0].split(':')[1] not in keep_tags
  loop_control:
    label: "{{ item.RepoTags | default(['untagged']) }}"
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

Ansible handles container registry operations smoothly through the community.docker collection. Whether you are pushing to Docker Hub, AWS ECR, or a private registry, the pattern is the same: authenticate, build, tag, and push. For teams that already use Ansible for infrastructure management, adding image builds to the workflow keeps everything in one place and makes the entire deployment pipeline auditable and repeatable.
