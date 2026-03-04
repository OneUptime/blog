# How to Use Docker for Ansible Test Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Docker, Testing, Molecule, Containers

Description: How to use Docker containers as lightweight, reproducible test environments for Ansible playbook and role development with Molecule integration.

---

Docker containers are the fastest way to test Ansible playbooks locally. They spin up in seconds, use minimal disk space, and can be destroyed and recreated without any leftover state. When combined with Molecule, Docker gives you a complete test harness that runs the same way on your laptop and in CI.

I switched from Vagrant to Docker for most of my Ansible testing after getting tired of waiting three minutes for a VM to boot just to test a five-line change in a template. Docker brought that feedback loop down to about ten seconds.

## Prerequisites

You need Docker and the Python packages for Molecule:

```bash
# Install Docker (Ubuntu)
sudo apt-get update
sudo apt-get install -y docker.io
sudo usermod -aG docker $USER

# Install Molecule and the Docker driver
pip install molecule molecule-docker ansible-core docker
```

## Basic Docker Images for Ansible Testing

Standard Docker images lack components Ansible expects, like systemd and Python. You need purpose-built images. Here are Dockerfiles for common distributions:

```dockerfile
# docker/Dockerfile.ubuntu2204
# Ubuntu 22.04 image with systemd for Ansible testing
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV container=docker

RUN apt-get update && apt-get install -y \
    systemd systemd-sysv \
    python3 python3-apt \
    sudo iproute2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Clean up systemd units that do not work in containers
RUN cd /lib/systemd/system/sysinit.target.wants/ \
    && ls | grep -v systemd-tmpfiles-setup | xargs rm -f
RUN rm -f /lib/systemd/system/multi-user.target.wants/* \
    /etc/systemd/system/*.wants/* \
    /lib/systemd/system/local-fs.target.wants/* \
    /lib/systemd/system/sockets.target.wants/*udev* \
    /lib/systemd/system/sockets.target.wants/*initctl*

VOLUME ["/sys/fs/cgroup", "/tmp", "/run"]
CMD ["/lib/systemd/systemd"]
```

```dockerfile
# docker/Dockerfile.rockylinux9
# Rocky Linux 9 image with systemd for Ansible testing
FROM rockylinux:9

ENV container=docker

RUN dnf -y install \
    systemd python3 python3-dnf \
    sudo iproute \
    && dnf clean all

RUN cd /lib/systemd/system/sysinit.target.wants/ \
    && ls | grep -v systemd-tmpfiles-setup | xargs rm -f
RUN rm -f /lib/systemd/system/multi-user.target.wants/* \
    /etc/systemd/system/*.wants/*

VOLUME ["/sys/fs/cgroup", "/tmp", "/run"]
CMD ["/usr/sbin/init"]
```

Build these images locally:

```bash
# Build test images
docker build -t ansible-test/ubuntu2204 -f docker/Dockerfile.ubuntu2204 .
docker build -t ansible-test/rockylinux9 -f docker/Dockerfile.rockylinux9 .
```

## Molecule with Docker

The most common pattern is using Molecule with its Docker driver. Initialize a role with Molecule:

```bash
# Create a new role with Molecule test scaffold
molecule init role my_role --driver-name docker
cd my_role
```

Configure the Molecule scenario to use your Docker images:

```yaml
# molecule/default/molecule.yml
# Molecule configuration using Docker for test instances
dependency:
  name: galaxy
  options:
    requirements-file: requirements.yml
driver:
  name: docker
platforms:
  - name: ubuntu2204
    image: ansible-test/ubuntu2204
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: /lib/systemd/systemd
    tmpfs:
      - /run
      - /tmp
  - name: rockylinux9
    image: ansible-test/rockylinux9
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: /usr/sbin/init
    tmpfs:
      - /run
      - /tmp
provisioner:
  name: ansible
  env:
    ANSIBLE_FORCE_COLOR: "true"
  playbooks:
    converge: converge.yml
    verify: verify.yml
verifier:
  name: ansible
```

The converge playbook applies your role:

```yaml
# molecule/default/converge.yml
# Apply the role under test
- name: Converge
  hosts: all
  become: true
  vars:
    app_port: 8080
    app_workers: 2
  roles:
    - role: my_role
```

The verify playbook checks the results:

```yaml
# molecule/default/verify.yml
# Verify the role produced correct results
- name: Verify
  hosts: all
  become: true
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Check application service
      ansible.builtin.assert:
        that:
          - ansible_facts.services['myapp.service'].state == 'running'
        fail_msg: "myapp service is not running"

    - name: Check port is listening
      ansible.builtin.wait_for:
        port: 8080
        timeout: 10
```

Run the full test lifecycle:

```bash
# Run the complete Molecule test sequence
molecule test

# Or step through phases individually for debugging
molecule create    # Start containers
molecule converge  # Run the playbook
molecule verify    # Run verification tests
molecule destroy   # Clean up containers
```

## Using the Docker Connection Plugin Directly

For quick tests without Molecule, use Ansible's Docker connection plugin:

```bash
# Start a test container
docker run -d --name ansible-test --privileged \
    -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
    ansible-test/ubuntu2204

# Run a playbook against the container using the docker connection
ansible-playbook -i 'ansible-test,' -c docker site.yml
```

Create an inventory file for Docker containers:

```yaml
# inventories/docker/hosts.yml
# Inventory using Docker connection plugin
all:
  hosts:
    web-test:
      ansible_connection: docker
      ansible_docker_extra_args: ""
    db-test:
      ansible_connection: docker
  vars:
    ansible_python_interpreter: /usr/bin/python3
```

## Multi-Container Testing with Docker Compose

For testing roles that involve multiple hosts communicating with each other:

```yaml
# docker-compose.test.yml
# Multi-container setup for testing inter-host communication
services:
  loadbalancer:
    image: ansible-test/ubuntu2204
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    networks:
      testnet:
        ipv4_address: 172.28.0.10
    hostname: lb.test.local

  web1:
    image: ansible-test/ubuntu2204
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    networks:
      testnet:
        ipv4_address: 172.28.0.11
    hostname: web1.test.local

  web2:
    image: ansible-test/ubuntu2204
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    networks:
      testnet:
        ipv4_address: 172.28.0.12
    hostname: web2.test.local

  database:
    image: ansible-test/ubuntu2204
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    networks:
      testnet:
        ipv4_address: 172.28.0.20
    hostname: db.test.local

networks:
  testnet:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/24
```

## Handling Docker Limitations

Docker containers have limitations that can affect Ansible testing. Here are workarounds for the most common issues:

```yaml
# molecule/default/prepare.yml
# Prepare step to work around Docker container limitations
- name: Prepare containers for Ansible testing
  hosts: all
  become: true
  tasks:
    - name: Install packages needed by Ansible modules
      ansible.builtin.raw: |
        if command -v apt-get > /dev/null; then
          apt-get update -qq && apt-get install -y -qq python3-pip
        elif command -v dnf > /dev/null; then
          dnf install -y python3-pip
        fi
      changed_when: true

    - name: Wait for systemd to fully initialize
      ansible.builtin.command: systemctl is-system-running --wait
      register: systemd_status
      until: systemd_status.rc == 0 or 'degraded' in systemd_status.stdout
      retries: 30
      delay: 2
      changed_when: false
      failed_when: false
```

## CI Pipeline with Docker Testing

```yaml
# .github/workflows/molecule-docker.yml
# CI pipeline running Molecule Docker tests
name: Molecule Docker Tests
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        distro: [ubuntu2204, rockylinux9]
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install molecule molecule-docker ansible-core docker
      - name: Build test image
        run: docker build -t ansible-test/${{ matrix.distro }} -f docker/Dockerfile.${{ matrix.distro }} .
      - name: Run Molecule
        run: molecule test
        env:
          MOLECULE_DISTRO: ${{ matrix.distro }}
```

## Performance Tips

Speed up your Docker-based testing with these practices:

```yaml
# molecule/default/molecule.yml (optimized)
# Speed-optimized Molecule configuration
provisioner:
  name: ansible
  env:
    ANSIBLE_FORCE_COLOR: "true"
    # Disable host key checking for faster connections
    ANSIBLE_HOST_KEY_CHECKING: "false"
    # Use pipelining for faster execution
    ANSIBLE_PIPELINING: "true"
    # Reduce SSH connection timeout
    ANSIBLE_TIMEOUT: "10"
  config_options:
    defaults:
      gathering: smart
      fact_caching: jsonfile
      fact_caching_connection: /tmp/ansible_facts
      fact_caching_timeout: 3600
```

## Conclusion

Docker provides the fastest feedback loop for Ansible development. With Molecule handling the test lifecycle and purpose-built Docker images providing systemd support, you can test roles against multiple operating systems in parallel without the overhead of full virtual machines. Build your test images once, configure Molecule to use them, and enjoy sub-minute test cycles. For anything that Docker cannot handle well (kernel modules, network stack changes, disk operations), fall back to Vagrant or cloud instances.
