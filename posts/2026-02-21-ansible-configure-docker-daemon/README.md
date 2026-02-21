# How to Use Ansible to Configure Docker Daemon Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Configuration, Daemon, DevOps

Description: Configure the Docker daemon with Ansible by managing daemon.json settings for logging, storage, networking, and security.

---

The Docker daemon has dozens of configuration options that affect how containers run, how images are stored, how logging works, and how networking behaves. These settings live in `/etc/docker/daemon.json` and can also be passed as command-line flags to the dockerd process. Ansible is the right tool for managing these configurations across a fleet of Docker hosts, ensuring consistency and catching configuration drift.

## Where Docker Configuration Lives

Docker reads its configuration from two places:

1. `/etc/docker/daemon.json` - The primary configuration file (JSON format)
2. Systemd unit file flags - Arguments passed to dockerd in the service file

The `daemon.json` file is preferred because it is easier to manage with configuration management tools. You should avoid mixing both approaches for the same settings, as it can cause conflicts.

```mermaid
flowchart TD
    A[/etc/docker/daemon.json] --> C[Docker Daemon]
    B[systemd unit flags] --> C
    C --> D[Container Runtime]
    C --> E[Image Storage]
    C --> F[Networking]
    C --> G[Logging]
```

## Basic daemon.json Management

Here is a playbook that writes a daemon.json file with common production settings:

```yaml
# configure_daemon.yml - Configure Docker daemon settings
---
- name: Configure Docker Daemon
  hosts: docker_hosts
  become: true
  vars:
    docker_daemon_config:
      storage-driver: overlay2
      log-driver: json-file
      log-opts:
        max-size: "50m"
        max-file: "5"
      default-address-pools:
        - base: "172.17.0.0/12"
          size: 24
      live-restore: true
      userland-proxy: false
      default-ulimits:
        nofile:
          Name: nofile
          Hard: 65536
          Soft: 65536

  tasks:
    - name: Create Docker config directory
      ansible.builtin.file:
        path: /etc/docker
        state: directory
        mode: '0755'

    - name: Write daemon.json
      ansible.builtin.copy:
        content: "{{ docker_daemon_config | to_nice_json }}"
        dest: /etc/docker/daemon.json
        mode: '0644'
        backup: true
      notify: restart docker

  handlers:
    - name: restart docker
      ansible.builtin.service:
        name: docker
        state: restarted
```

## Logging Configuration

Docker supports multiple log drivers. The default `json-file` driver writes logs to local files, but in production you often want to ship logs to a centralized system:

```yaml
# logging_config.yml - Configure Docker logging
---
- name: Configure Docker Logging
  hosts: docker_hosts
  become: true
  vars:
    logging_config:
      # Use journald for systemd-based log management
      log-driver: journald
      log-opts:
        tag: "docker/{{.Name}}"

  tasks:
    - name: Read current daemon.json
      ansible.builtin.slurp:
        src: /etc/docker/daemon.json
      register: current_config
      ignore_errors: true

    - name: Parse current config
      ansible.builtin.set_fact:
        existing_config: "{{ (current_config.content | b64decode | from_json) if current_config is succeeded else {} }}"

    - name: Merge logging config into existing daemon.json
      ansible.builtin.copy:
        content: "{{ existing_config | combine(logging_config) | to_nice_json }}"
        dest: /etc/docker/daemon.json
        mode: '0644'
        backup: true
      notify: restart docker

  handlers:
    - name: restart docker
      ansible.builtin.service:
        name: docker
        state: restarted
```

For Fluentd log shipping:

```yaml
    logging_fluentd:
      log-driver: fluentd
      log-opts:
        fluentd-address: "localhost:24224"
        fluentd-async: "true"
        fluentd-retry-wait: "1s"
        fluentd-max-retries: "10"
        tag: "docker.{{.Name}}"
```

For Syslog:

```yaml
    logging_syslog:
      log-driver: syslog
      log-opts:
        syslog-address: "tcp://logserver.example.com:514"
        syslog-facility: daemon
        tag: "docker/{{.Name}}"
```

## Storage Configuration

Storage driver settings have a major impact on performance:

```yaml
# storage_config.yml - Configure Docker storage
---
- name: Configure Docker Storage
  hosts: docker_hosts
  become: true
  vars:
    storage_config:
      storage-driver: overlay2
      storage-opts:
        - "overlay2.override_kernel_check=true"
      data-root: "/mnt/docker-data"  # Move Docker data to a dedicated disk

  tasks:
    - name: Create Docker data directory
      ansible.builtin.file:
        path: /mnt/docker-data
        state: directory
        mode: '0711'

    - name: Stop Docker before changing data root
      ansible.builtin.service:
        name: docker
        state: stopped

    - name: Check if existing data needs migration
      ansible.builtin.stat:
        path: /var/lib/docker/overlay2
      register: old_data

    - name: Migrate existing data to new location
      ansible.builtin.command:
        cmd: rsync -aP /var/lib/docker/ /mnt/docker-data/
      when: old_data.stat.exists
      changed_when: true

    - name: Update daemon.json with storage settings
      ansible.builtin.copy:
        content: "{{ storage_config | to_nice_json }}"
        dest: /etc/docker/daemon.json
        mode: '0644'

    - name: Start Docker with new configuration
      ansible.builtin.service:
        name: docker
        state: started
```

## Network Configuration

Control Docker's default networking behavior:

```yaml
# network_config.yml - Configure Docker networking
---
- name: Configure Docker Networking
  hosts: docker_hosts
  become: true
  vars:
    network_config:
      bip: "172.26.0.1/16"  # Bridge IP, avoids conflicts with host networks
      fixed-cidr: "172.26.0.0/24"
      default-address-pools:
        - base: "172.27.0.0/16"
          size: 24
      dns:
        - "8.8.8.8"
        - "8.8.4.4"
      dns-search:
        - "example.com"
      ip-forward: true
      iptables: true
      ip-masq: true
      ipv6: false

  tasks:
    - name: Read current daemon.json
      ansible.builtin.slurp:
        src: /etc/docker/daemon.json
      register: current_config
      ignore_errors: true

    - name: Merge network config
      ansible.builtin.copy:
        content: >-
          {{ ((current_config.content | b64decode | from_json) if current_config is succeeded else {})
          | combine(network_config) | to_nice_json }}
        dest: /etc/docker/daemon.json
        mode: '0644'
        backup: true
      notify: restart docker

  handlers:
    - name: restart docker
      ansible.builtin.service:
        name: docker
        state: restarted
```

## Security Hardening

Apply security-related daemon settings:

```yaml
# security_config.yml - Harden Docker daemon security
---
- name: Harden Docker Daemon
  hosts: docker_hosts
  become: true
  vars:
    security_config:
      icc: false              # Disable inter-container communication by default
      userland-proxy: false   # Use iptables instead of userland proxy
      no-new-privileges: true # Prevent containers from gaining new privileges
      seccomp-profile: "/etc/docker/seccomp-default.json"
      userns-remap: "default" # Enable user namespace remapping
      live-restore: true      # Keep containers running during daemon restart

  tasks:
    - name: Copy custom seccomp profile
      ansible.builtin.copy:
        src: files/seccomp-default.json
        dest: /etc/docker/seccomp-default.json
        mode: '0644'

    - name: Merge security settings into daemon.json
      ansible.builtin.copy:
        content: >-
          {{ ((current_config.content | b64decode | from_json) if current_config is succeeded else {})
          | combine(security_config) | to_nice_json }}
        dest: /etc/docker/daemon.json
        mode: '0644'
        backup: true
      notify: restart docker

  handlers:
    - name: restart docker
      ansible.builtin.service:
        name: docker
        state: restarted
```

## Template-Based Configuration

For complex setups, use a Jinja2 template instead of the `to_nice_json` filter:

```yaml
# template_config.yml - Use a template for daemon.json
---
- name: Configure Docker via Template
  hosts: docker_hosts
  become: true
  vars:
    docker_storage_driver: overlay2
    docker_data_root: /var/lib/docker
    docker_log_max_size: "50m"
    docker_log_max_file: "5"
    docker_bridge_ip: "172.26.0.1/16"
    docker_dns_servers:
      - "8.8.8.8"
      - "8.8.4.4"
    docker_insecure_registries: []
    docker_registry_mirrors: []

  tasks:
    - name: Deploy daemon.json from template
      ansible.builtin.template:
        src: templates/daemon.json.j2
        dest: /etc/docker/daemon.json
        mode: '0644'
        validate: "python3 -c 'import json; json.load(open(\"%s\"))'"
        backup: true
      notify: restart docker

  handlers:
    - name: restart docker
      ansible.builtin.service:
        name: docker
        state: restarted
```

The template:

```json
{
  "storage-driver": "{{ docker_storage_driver }}",
  "data-root": "{{ docker_data_root }}",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "{{ docker_log_max_size }}",
    "max-file": "{{ docker_log_max_file }}"
  },
  "bip": "{{ docker_bridge_ip }}",
  "dns": {{ docker_dns_servers | to_json }},
  "live-restore": true,
  "userland-proxy": false
{% if docker_insecure_registries | length > 0 %},
  "insecure-registries": {{ docker_insecure_registries | to_json }}
{% endif %}
{% if docker_registry_mirrors | length > 0 %},
  "registry-mirrors": {{ docker_registry_mirrors | to_json }}
{% endif %}
}
```

## Validating Configuration

Always validate the config before restarting Docker:

```yaml
    - name: Validate daemon.json syntax
      ansible.builtin.command:
        cmd: python3 -c "import json; json.load(open('/etc/docker/daemon.json'))"
      changed_when: false

    - name: Test Docker daemon config
      ansible.builtin.command:
        cmd: dockerd --validate --config-file /etc/docker/daemon.json
      changed_when: false
      ignore_errors: true
      register: config_validation

    - name: Report validation result
      ansible.builtin.debug:
        msg: "Config validation: {{ 'PASSED' if config_validation.rc == 0 else 'FAILED' }}"
```

## Summary

Managing the Docker daemon configuration with Ansible ensures every Docker host in your infrastructure runs with identical settings. The key areas to configure are logging (driver, rotation, remote shipping), storage (driver, data root location), networking (bridge IP, DNS, address pools), and security (user namespaces, seccomp profiles, inter-container communication). Use the merge pattern to update specific settings without overwriting the entire file, always validate JSON syntax before restarting, and keep backups of the previous configuration so you can roll back if needed.
