# How to Use Ansible to Install Docker CE Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Containers, Linux, DevOps

Description: A step-by-step guide to installing Docker CE on Ubuntu and RHEL-based systems using Ansible, including repository setup, package installation, and post-install configuration.

---

Installing Docker is one of the most common tasks in modern infrastructure automation. Nearly every deployment pipeline, CI/CD system, and container-based application requires Docker on the host. While Docker provides installation scripts, those are not idempotent and not suitable for production automation. Ansible gives you a proper, repeatable, and auditable way to install Docker CE across your fleet.

This post walks through the complete Docker CE installation process on both Ubuntu and RHEL-based systems, covering everything from repository setup to post-installation configuration.

## Installing Docker CE on Ubuntu

The official Docker CE installation on Ubuntu involves adding the Docker repository, importing the GPG key, and installing the packages. Here is the full playbook.

```yaml
---
# playbook: install-docker-ubuntu.yml
# Install Docker CE on Ubuntu 22.04/24.04
- hosts: ubuntu_servers
  become: true

  vars:
    docker_users:
      - deploy
      - ci-runner

  tasks:
    - name: Remove old Docker packages if present
      ansible.builtin.apt:
        name:
          - docker
          - docker-engine
          - docker.io
          - containerd
          - runc
        state: absent

    - name: Install prerequisite packages
      ansible.builtin.apt:
        name:
          - apt-transport-https
          - ca-certificates
          - curl
          - gnupg
          - lsb-release
        state: present
        update_cache: true

    - name: Create keyrings directory
      ansible.builtin.file:
        path: /etc/apt/keyrings
        state: directory
        mode: '0755'

    - name: Download Docker GPG key
      ansible.builtin.get_url:
        url: https://download.docker.com/linux/ubuntu/gpg
        dest: /etc/apt/keyrings/docker.asc
        mode: '0644'

    - name: Add Docker APT repository
      ansible.builtin.apt_repository:
        repo: >-
          deb [arch={{ ansible_architecture | replace('x86_64', 'amd64') }}
          signed-by=/etc/apt/keyrings/docker.asc]
          https://download.docker.com/linux/ubuntu
          {{ ansible_distribution_release }} stable
        filename: docker
        state: present

    - name: Install Docker CE packages
      ansible.builtin.apt:
        name:
          - docker-ce
          - docker-ce-cli
          - containerd.io
          - docker-buildx-plugin
          - docker-compose-plugin
        state: present
        update_cache: true

    - name: Ensure Docker service is started and enabled
      ansible.builtin.systemd:
        name: docker
        state: started
        enabled: true

    - name: Add users to the docker group
      ansible.builtin.user:
        name: "{{ item }}"
        groups: docker
        append: true
      loop: "{{ docker_users }}"
```

## Installing Docker CE on RHEL/CentOS

The process for RHEL-based systems uses the `yum_repository` module and `dnf` for installation.

```yaml
---
# playbook: install-docker-rhel.yml
# Install Docker CE on RHEL 8/9 and CentOS Stream
- hosts: rhel_servers
  become: true

  vars:
    docker_users:
      - deploy

  tasks:
    - name: Remove old Docker packages
      ansible.builtin.dnf:
        name:
          - docker
          - docker-client
          - docker-client-latest
          - docker-common
          - docker-latest
          - docker-latest-logrotate
          - docker-logrotate
          - docker-engine
          - podman
          - runc
        state: absent

    - name: Install required packages
      ansible.builtin.dnf:
        name:
          - yum-utils
          - device-mapper-persistent-data
          - lvm2
        state: present

    - name: Import Docker GPG key
      ansible.builtin.rpm_key:
        key: https://download.docker.com/linux/centos/gpg
        state: present

    - name: Add Docker CE repository
      ansible.builtin.yum_repository:
        name: docker-ce-stable
        description: Docker CE Stable
        baseurl: "https://download.docker.com/linux/centos/$releasever/$basearch/stable"
        gpgcheck: true
        gpgkey: https://download.docker.com/linux/centos/gpg
        enabled: true

    - name: Install Docker CE packages
      ansible.builtin.dnf:
        name:
          - docker-ce
          - docker-ce-cli
          - containerd.io
          - docker-buildx-plugin
          - docker-compose-plugin
        state: present

    - name: Start and enable Docker
      ansible.builtin.systemd:
        name: docker
        state: started
        enabled: true

    - name: Add users to docker group
      ansible.builtin.user:
        name: "{{ item }}"
        groups: docker
        append: true
      loop: "{{ docker_users }}"
```

## A Cross-Platform Role

For mixed environments, wrapping this in a role is the way to go. Here is the role structure.

```yaml
# roles/docker/tasks/main.yml
# Cross-platform Docker CE installation
- name: Include OS-specific variables
  ansible.builtin.include_vars: "{{ ansible_os_family | lower }}.yml"

- name: Include Debian installation tasks
  ansible.builtin.include_tasks: debian.yml
  when: ansible_os_family == "Debian"

- name: Include RedHat installation tasks
  ansible.builtin.include_tasks: redhat.yml
  when: ansible_os_family == "RedHat"

- name: Configure Docker daemon
  ansible.builtin.include_tasks: configure.yml

- name: Manage Docker users
  ansible.builtin.include_tasks: users.yml
```

## Configuring the Docker Daemon

After installation, you almost always need to configure the Docker daemon. Common settings include log rotation, storage driver, and insecure registries.

```yaml
# roles/docker/tasks/configure.yml
# Configure the Docker daemon with production-ready settings
- name: Create Docker configuration directory
  ansible.builtin.file:
    path: /etc/docker
    state: directory
    mode: '0755'

- name: Configure Docker daemon
  ansible.builtin.copy:
    dest: /etc/docker/daemon.json
    content: |
      {
        "log-driver": "json-file",
        "log-opts": {
          "max-size": "10m",
          "max-file": "3"
        },
        "storage-driver": "overlay2",
        "live-restore": true,
        "default-address-pools": [
          {"base": "172.17.0.0/12", "size": 24}
        ],
        "metrics-addr": "0.0.0.0:9323",
        "experimental": false
      }
    mode: '0644'
  notify: restart docker

- name: Create systemd override directory for Docker
  ansible.builtin.file:
    path: /etc/systemd/system/docker.service.d
    state: directory
    mode: '0755'
```

```yaml
# roles/docker/handlers/main.yml
- name: restart docker
  ansible.builtin.systemd:
    name: docker
    state: restarted
    daemon_reload: true
```

## Installing a Specific Docker Version

In production, you might need a specific Docker version for compatibility reasons.

```yaml
# Install a specific version of Docker CE on Ubuntu
- name: Get available Docker CE versions
  ansible.builtin.command:
    cmd: apt-cache madison docker-ce
  register: docker_versions
  changed_when: false

- name: Install specific Docker CE version
  ansible.builtin.apt:
    name:
      - "docker-ce=5:24.0.7-1~ubuntu.{{ ansible_distribution_release }}~{{ ansible_distribution_release }}"
      - "docker-ce-cli=5:24.0.7-1~ubuntu.{{ ansible_distribution_release }}~{{ ansible_distribution_release }}"
      - containerd.io
    state: present
```

## Holding Docker Packages

After installing a specific version, you might want to prevent automatic upgrades.

```yaml
# Hold Docker packages to prevent automatic upgrades
- name: Hold Docker CE packages at current version
  ansible.builtin.dpkg_selections:
    name: "{{ item }}"
    selection: hold
  loop:
    - docker-ce
    - docker-ce-cli
    - containerd.io
```

## Setting Up Docker with TLS

For Docker daemons that need remote access, configure TLS certificates.

```yaml
# Configure Docker daemon for TLS remote access
- name: Create Docker TLS directory
  ansible.builtin.file:
    path: /etc/docker/tls
    state: directory
    mode: '0700'

- name: Copy TLS certificates
  ansible.builtin.copy:
    src: "{{ item.src }}"
    dest: "/etc/docker/tls/{{ item.dest }}"
    mode: "{{ item.mode }}"
  loop:
    - { src: "certs/ca.pem", dest: "ca.pem", mode: "0644" }
    - { src: "certs/server-cert.pem", dest: "server-cert.pem", mode: "0644" }
    - { src: "certs/server-key.pem", dest: "server-key.pem", mode: "0600" }
  notify: restart docker

- name: Configure Docker for TLS
  ansible.builtin.copy:
    dest: /etc/docker/daemon.json
    content: |
      {
        "tls": true,
        "tlscacert": "/etc/docker/tls/ca.pem",
        "tlscert": "/etc/docker/tls/server-cert.pem",
        "tlskey": "/etc/docker/tls/server-key.pem",
        "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],
        "tlsverify": true,
        "log-driver": "json-file",
        "log-opts": {
          "max-size": "10m",
          "max-file": "3"
        },
        "storage-driver": "overlay2"
      }
    mode: '0644'
  notify: restart docker
```

## Verifying the Installation

Always verify that Docker is installed and functioning correctly.

```yaml
# Verify Docker installation
- name: Check Docker version
  ansible.builtin.command:
    cmd: docker --version
  register: docker_version
  changed_when: false

- name: Display Docker version
  ansible.builtin.debug:
    msg: "Docker installed: {{ docker_version.stdout }}"

- name: Run Docker hello-world test
  ansible.builtin.command:
    cmd: docker run --rm hello-world
  register: docker_test
  changed_when: false

- name: Confirm Docker is working
  ansible.builtin.assert:
    that:
      - "'Hello from Docker!' in docker_test.stdout"
    fail_msg: "Docker test failed"
    success_msg: "Docker is working correctly"
```

## Wrapping Up

Installing Docker CE with Ansible gives you a consistent, repeatable process that works across your entire infrastructure. The key steps are: clean up old packages, add the official repository with GPG key verification, install the packages, configure the daemon for production use, and manage user access. By wrapping this in a role, you get a reusable component that handles both Ubuntu and RHEL systems and can be customized through variables for different environments.
