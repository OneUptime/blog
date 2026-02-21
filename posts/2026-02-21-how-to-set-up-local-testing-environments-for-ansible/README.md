# How to Set Up Local Testing Environments for Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, Vagrant, Local Development, DevOps

Description: A complete guide to setting up local testing environments for Ansible using Vagrant, Docker, and LXD to test playbooks before deploying to production.

---

Testing Ansible playbooks against production servers is a recipe for disaster. You need a local environment that closely mirrors production, can be created and destroyed quickly, and does not cost anything to run. Over the years I have tried several approaches, and each has its sweet spot depending on what you are testing.

This post covers three main approaches to local Ansible testing: Vagrant with VirtualBox, Docker containers, and LXD system containers. I will walk through setting up each one and explain when to use which.

## Option 1: Vagrant for Full VM Testing

Vagrant gives you full virtual machines that behave exactly like production servers. This is the most accurate testing approach but also the slowest.

First, install Vagrant and VirtualBox:

```bash
# Install on macOS with Homebrew
brew install vagrant virtualbox

# Install on Ubuntu
sudo apt-get install -y vagrant virtualbox
```

Create a Vagrantfile that spins up multiple VMs matching your production topology:

```ruby
# Vagrantfile
# Local development environment mimicking a 3-tier production setup
Vagrant.configure("2") do |config|
  # Web server
  config.vm.define "web" do |web|
    web.vm.box = "ubuntu/jammy64"
    web.vm.hostname = "web.local"
    web.vm.network "private_network", ip: "192.168.56.10"
    web.vm.provider "virtualbox" do |vb|
      vb.memory = "1024"
      vb.cpus = 1
    end
  end

  # Application server
  config.vm.define "app" do |app|
    app.vm.box = "ubuntu/jammy64"
    app.vm.hostname = "app.local"
    app.vm.network "private_network", ip: "192.168.56.11"
    app.vm.provider "virtualbox" do |vb|
      vb.memory = "2048"
      vb.cpus = 2
    end
  end

  # Database server
  config.vm.define "db" do |db|
    db.vm.box = "ubuntu/jammy64"
    db.vm.hostname = "db.local"
    db.vm.network "private_network", ip: "192.168.56.12"
    db.vm.provider "virtualbox" do |vb|
      vb.memory = "2048"
      vb.cpus = 2
    end
  end

  # Ansible provisioner runs after all VMs are up
  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "site.yml"
    ansible.inventory_path = "inventories/local"
    ansible.limit = "all"
  end
end
```

Create the matching inventory:

```ini
# inventories/local/hosts
# Inventory file mapping to Vagrant VM IP addresses
[webservers]
web ansible_host=192.168.56.10

[appservers]
app ansible_host=192.168.56.11

[databases]
db ansible_host=192.168.56.12

[all:vars]
ansible_user=vagrant
ansible_ssh_private_key_file=.vagrant/machines/{{ inventory_hostname }}/virtualbox/private_key
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```

Start the environment and run your playbook:

```bash
# Create and provision all VMs
vagrant up

# Re-run just the Ansible provisioning
vagrant provision

# SSH into a specific VM for debugging
vagrant ssh web

# Destroy everything and start fresh
vagrant destroy -f
```

## Option 2: Docker Containers for Fast Testing

Docker containers start in seconds and use minimal resources. The trade-off is that they do not run a full init system by default, so testing systemd services requires some workarounds.

Create a Dockerfile that provides a systemd-enabled container:

```dockerfile
# docker/Dockerfile.ubuntu
# Ubuntu container with systemd for Ansible testing
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV container=docker

# Install systemd and SSH
RUN apt-get update && apt-get install -y \
    systemd \
    systemd-sysv \
    openssh-server \
    python3 \
    python3-apt \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Configure SSH
RUN mkdir /var/run/sshd
RUN echo 'root:ansible' | chpasswd
RUN sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config

# Remove unnecessary systemd units
RUN (cd /lib/systemd/system/sysinit.target.wants/ && \
    ls | grep -v systemd-tmpfiles-setup | xargs rm -f)
RUN rm -f /lib/systemd/system/multi-user.target.wants/* \
    /etc/systemd/system/*.wants/* \
    /lib/systemd/system/local-fs.target.wants/* \
    /lib/systemd/system/sockets.target.wants/*udev* \
    /lib/systemd/system/sockets.target.wants/*initctl*

# Enable SSH
RUN systemctl enable ssh

VOLUME ["/sys/fs/cgroup"]
CMD ["/sbin/init"]
```

Use Docker Compose to manage multiple containers:

```yaml
# docker-compose.test.yml
# Docker Compose setup for Ansible testing with multiple hosts
services:
  web:
    build:
      context: docker
      dockerfile: Dockerfile.ubuntu
    hostname: web.local
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    networks:
      testnet:
        ipv4_address: 172.20.0.10
    ports:
      - "2221:22"

  app:
    build:
      context: docker
      dockerfile: Dockerfile.ubuntu
    hostname: app.local
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    networks:
      testnet:
        ipv4_address: 172.20.0.11
    ports:
      - "2222:22"

  db:
    build:
      context: docker
      dockerfile: Dockerfile.ubuntu
    hostname: db.local
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    networks:
      testnet:
        ipv4_address: 172.20.0.12
    ports:
      - "2223:22"

networks:
  testnet:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
```

Inventory for Docker containers:

```ini
# inventories/docker/hosts
# Inventory targeting Docker test containers via SSH
[webservers]
web ansible_host=172.20.0.10

[appservers]
app ansible_host=172.20.0.11

[databases]
db ansible_host=172.20.0.12

[all:vars]
ansible_user=root
ansible_password=ansible
ansible_ssh_common_args='-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
```

Workflow:

```bash
# Start test containers
docker compose -f docker-compose.test.yml up -d

# Run your playbook against them
ansible-playbook -i inventories/docker/hosts site.yml

# Tear down
docker compose -f docker-compose.test.yml down
```

## Option 3: LXD for System Container Testing

LXD system containers give you the full OS experience of a VM with the speed of containers:

```bash
# Initialize LXD
sudo lxd init --auto

# Launch test containers
lxc launch ubuntu:22.04 web
lxc launch ubuntu:22.04 app
lxc launch ubuntu:22.04 db

# Get container IP addresses
lxc list --format=json | python3 -c "
import json, sys
for c in json.load(sys.stdin):
    name = c['name']
    for net in c['state']['network'].values():
        for addr in net.get('addresses', []):
            if addr['family'] == 'inet' and addr['scope'] == 'global':
                print(f'{name}: {addr[\"address\"]}')
"
```

Configure SSH access:

```bash
#!/bin/bash
# scripts/setup_lxd_ssh.sh
# Configure SSH access for Ansible on LXD containers
for container in web app db; do
    echo "Configuring SSH on $container..."
    lxc exec "$container" -- bash -c "
        apt-get update -qq
        apt-get install -y -qq openssh-server python3
        echo 'root:ansible' | chpasswd
        sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
        systemctl restart ssh
    "
done
echo "All containers configured for SSH access"
```

## Helper Script for Environment Management

Create a unified script that manages all three environment types:

```bash
#!/bin/bash
# scripts/testenv.sh
# Manage local testing environments for Ansible
set -euo pipefail

COMMAND="${1:-help}"
BACKEND="${2:-docker}"

case "$COMMAND" in
    up)
        case "$BACKEND" in
            docker)
                docker compose -f docker-compose.test.yml up -d
                echo "Docker test environment is up"
                ;;
            vagrant)
                vagrant up
                echo "Vagrant test environment is up"
                ;;
            lxd)
                bash scripts/setup_lxd.sh
                echo "LXD test environment is up"
                ;;
        esac
        ;;
    down)
        case "$BACKEND" in
            docker)
                docker compose -f docker-compose.test.yml down
                ;;
            vagrant)
                vagrant destroy -f
                ;;
            lxd)
                lxc delete web app db --force
                ;;
        esac
        echo "$BACKEND test environment destroyed"
        ;;
    test)
        INVENTORY="inventories/${BACKEND}/hosts"
        ansible-playbook -i "$INVENTORY" site.yml
        ansible-playbook -i "$INVENTORY" tests/validate.yml
        ;;
    *)
        echo "Usage: $0 {up|down|test} {docker|vagrant|lxd}"
        ;;
esac
```

## Choosing the Right Approach

Use Vagrant when you need full kernel-level testing, network stack testing, or when your playbooks manage kernel modules, firewall rules with iptables, or disk partitioning. Use Docker when you need fast iteration on package installation, configuration file management, and service setup. Use LXD when you want the speed of containers with the full systemd experience.

For most day-to-day development, Docker is the best default. Reserve Vagrant for final pre-production validation.

## Conclusion

A good local testing environment lets you iterate on your Ansible code without risking production systems. Pick the approach that matches your needs, script the setup and teardown so it is reproducible, and make it easy enough that running tests locally is faster than waiting for CI. The five minutes it takes to set up a local environment saves hours of debugging production issues.
