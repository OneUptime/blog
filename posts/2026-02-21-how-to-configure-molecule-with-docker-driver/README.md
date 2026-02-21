# How to Configure Molecule with Docker Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Docker, Testing, DevOps

Description: Configure Molecule to use Docker containers for fast Ansible role testing with proper systemd support, networking, and multi-platform setups.

---

Docker is the most popular driver for Molecule testing, and for good reason. Containers start in seconds, use minimal resources, and give you isolated test environments that are easy to tear down. But getting the Docker driver configured properly, especially for roles that manage services with systemd, takes some attention to detail. This post covers everything from basic setup to advanced multi-container configurations.

## Prerequisites

You need Docker and the Molecule Docker driver installed.

```bash
# Install Docker (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo usermod -aG docker $USER

# Install Molecule with Docker support
pip install molecule molecule-plugins[docker]

# Verify both are working
docker info
molecule drivers
```

## Basic Docker Configuration

The simplest Molecule Docker setup looks like this.

```yaml
# molecule/default/molecule.yml - minimal Docker configuration
driver:
  name: docker

platforms:
  - name: instance
    image: "ubuntu:22.04"
    pre_build_image: true

provisioner:
  name: ansible

verifier:
  name: ansible
```

This pulls the `ubuntu:22.04` image and runs your role against it. However, for most real-world roles, you need more configuration because the base Ubuntu image does not include systemd, Python, or other tools your role likely depends on.

## Using Ansible-Ready Images

Jeff Geerling maintains Docker images specifically designed for Ansible testing. These include systemd, Python, and common tools pre-installed.

```yaml
# molecule/default/molecule.yml - using Ansible-ready images
driver:
  name: docker

platforms:
  - name: ubuntu2204
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

provisioner:
  name: ansible

verifier:
  name: ansible
```

Let me explain the key configuration options:

- **`pre_build_image: true`** tells Molecule to pull the image instead of building it from a Dockerfile
- **`privileged: true`** gives the container full access to the host, which is needed for systemd to work
- **`volumes`** mounts cgroups so systemd can manage services
- **`cgroupns_mode: host`** shares the host's cgroup namespace (needed on Docker with cgroup v2)
- **`tmpfs`** mounts `/run` and `/tmp` as tmpfs, which systemd expects

## Multi-Platform Testing

Test your role across multiple operating systems in a single scenario.

```yaml
# molecule/default/molecule.yml - test across multiple distros
driver:
  name: docker

platforms:
  - name: ubuntu2204
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

  - name: ubuntu2004
    image: "geerlingguy/docker-ubuntu2004-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

  - name: rocky9
    image: "geerlingguy/docker-rockylinux9-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

  - name: debian12
    image: "geerlingguy/docker-debian12-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

provisioner:
  name: ansible
  inventory:
    host_vars:
      ubuntu2204:
        ansible_python_interpreter: /usr/bin/python3
      ubuntu2004:
        ansible_python_interpreter: /usr/bin/python3
      rocky9:
        ansible_python_interpreter: /usr/bin/python3
      debian12:
        ansible_python_interpreter: /usr/bin/python3

verifier:
  name: ansible
```

## Exposing Ports

If your role installs a service and you want to verify it is listening, expose ports from the container.

```yaml
# molecule/default/molecule.yml - expose ports for testing
platforms:
  - name: webserver
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp
    published_ports:
      - "0.0.0.0:8080:80/tcp"
      - "0.0.0.0:8443:443/tcp"
    exposed_ports:
      - "80/tcp"
      - "443/tcp"
```

## Custom Docker Networks

When testing roles that need container-to-container communication, create Docker networks.

```yaml
# molecule/default/molecule.yml - containers on a custom network
driver:
  name: docker

platforms:
  - name: webserver
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp
    networks:
      - name: molecule-test-net

  - name: database
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp
    networks:
      - name: molecule-test-net

provisioner:
  name: ansible
  inventory:
    group_vars:
      all:
        db_host: database
    hosts:
      webservers:
        hosts:
          webserver: {}
      databases:
        hosts:
          database: {}
```

The converge playbook can target different groups.

```yaml
# molecule/default/converge.yml - apply roles to different groups
- name: Configure database server
  hosts: databases
  become: true
  roles:
    - role: my_database

- name: Configure web server
  hosts: webservers
  become: true
  roles:
    - role: my_webserver
```

## Using a Custom Dockerfile

If the pre-built images do not meet your needs, you can build a custom image.

```yaml
# molecule/default/molecule.yml - build from Dockerfile
platforms:
  - name: custom-instance
    image: "molecule-custom:latest"
    pre_build_image: false  # build the image
    dockerfile: Dockerfile.j2
```

Create the Dockerfile template.

```dockerfile
# molecule/default/Dockerfile.j2 - custom test image
FROM {{ item.image | default('ubuntu:22.04') }}

# Install Python and systemd
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-apt \
        systemd \
        systemd-sysv \
        sudo \
        iproute2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Remove unnecessary systemd units
RUN rm -f /lib/systemd/system/multi-user.target.wants/* \
    /etc/systemd/system/*.wants/* \
    /lib/systemd/system/local-fs.target.wants/* \
    /lib/systemd/system/sockets.target.wants/*udev* \
    /lib/systemd/system/sockets.target.wants/*initctl* \
    /lib/systemd/system/sysinit.target.wants/systemd-tmpfiles-setup*

VOLUME ["/sys/fs/cgroup", "/tmp", "/run"]
CMD ["/lib/systemd/systemd"]
```

## Mounting Volumes

Mount host directories or named volumes into the test container.

```yaml
# molecule/default/molecule.yml - mount test data into container
platforms:
  - name: instance
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
      - "${MOLECULE_PROJECT_DIRECTORY}/test-data:/opt/test-data:ro"
      - "shared-vol:/shared:rw"
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp
```

## Environment Variables

Pass environment variables to the container.

```yaml
# molecule/default/molecule.yml - set environment variables
platforms:
  - name: instance
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp
    env:
      APP_ENV: testing
      DATABASE_URL: "postgresql://test:test@localhost:5432/test"
      http_proxy: "${http_proxy}"
```

## Docker Connection Options

Fine-tune how Molecule connects to Docker.

```yaml
# molecule/default/molecule.yml - Docker connection settings
driver:
  name: docker

provisioner:
  name: ansible
  connection_options:
    ansible_connection: docker
  config_options:
    defaults:
      interpreter_python: auto_silent
```

## Performance Tips

Docker-based testing can be made faster with a few tweaks.

```yaml
# molecule/default/molecule.yml - optimized for speed
driver:
  name: docker

platforms:
  - name: instance
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true  # never build, always pull
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp
    docker_host: "${DOCKER_HOST:-unix:///var/run/docker.sock}"

provisioner:
  name: ansible
  config_options:
    defaults:
      gathering: smart
      fact_caching: jsonfile
      fact_caching_connection: /tmp/molecule-facts
      fact_caching_timeout: 3600
    ssh_connection:
      pipelining: true
  env:
    ANSIBLE_FORCE_COLOR: "true"
    ANSIBLE_PIPELINING: "true"
```

## Troubleshooting

Common issues and their fixes:

1. **Systemd not starting in container.** Make sure you have `privileged: true`, the cgroup volume mount, and `cgroupns_mode: host`. Also check that the image actually has systemd installed.

2. **Container exits immediately.** The `command: ""` setting tells Molecule to use the image's default CMD (usually systemd). If you override it accidentally, the container may exit.

3. **Slow image pulls.** Set `pre_build_image: true` and make sure Docker's layer cache is working. Consider using a local registry mirror for CI environments.

4. **Network issues between containers.** Put containers on the same Docker network using the `networks` option. Containers can then reach each other by name.

5. **Permission denied errors.** On SELinux-enabled systems, you may need to add `:Z` to volume mounts. On systems with AppArmor, `privileged: true` bypasses restrictions.

The Docker driver gives you the fastest feedback loop for Ansible role testing. Get the configuration right once and you will have tests running in seconds rather than minutes.
