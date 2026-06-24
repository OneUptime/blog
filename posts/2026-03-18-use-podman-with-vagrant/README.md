# How to Use Podman with Vagrant

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Vagrant, Development Environment, Container, DevOps

Description: Learn how to use Podman as a provider for Vagrant to create lightweight, container-based development environments that are faster and more resource-efficient than virtual machines.

---

> Using Podman with Vagrant's Docker provider gives you the familiar Vagrant workflow with container-speed performance, creating development environments that start in seconds instead of minutes.

Vagrant has long been the standard tool for creating reproducible development environments. Traditionally it uses virtual machine providers like VirtualBox or VMware, but these are heavyweight and slow to start. Podman can power Vagrant's built-in Docker provider, giving you the familiar `vagrant up` workflow and, with an SSH-capable image, `vagrant ssh` while using containers instead of virtual machines. The result is development environments that launch almost instantly, use a fraction of the resources, and still provide the isolation developers expect.

---

## Setting Up Vagrant with Podman

First, install Vagrant and Podman. Vagrant ships with a Docker provider, which can work with Podman:

```bash
# Install Vagrant and Podman on Fedora

sudo dnf install -y dnf-plugins-core
sudo dnf config-manager addrepo --from-repofile=https://rpm.releases.hashicorp.com/fedora/hashicorp.repo
sudo dnf -y install vagrant podman

# or on Ubuntu/Debian
wget -O - https://apt.releases.hashicorp.com/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release || lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y vagrant podman

# If you are using the Docker CLI against Podman's API socket:
systemctl --user enable --now podman.socket
export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"
```

Vagrant's built-in Docker provider does not require any Vagrant plugins. It does invoke `docker` subcommands under the hood, so make sure a Docker-compatible `docker` command is available on your `PATH` when using Podman, for example via the `podman-docker` compatibility package on distributions that provide it.

## Basic Vagrantfile with Podman

Create a `Vagrantfile` that uses the Docker provider:

```ruby
# Vagrantfile
Vagrant.configure("2") do |config|
  config.vm.provider "docker" do |d|
    d.image = "fedora:40"
    d.remains_running = true
    d.cmd = ["sleep", "infinity"]
  end
end
```

A stock Fedora image is fine for a basic container, but it does not include an SSH server or a `vagrant` user. If you want `vagrant ssh`, synced folders over `rsync`, or SSH-based provisioners, build a custom image that includes them:

```dockerfile
# Dockerfile.vagrant
FROM fedora:40

RUN dnf install -y \
    curl \
    openssh-server \
    openssh-clients \
    passwd \
    python3 \
    rsync \
    sudo \
    && dnf clean all

# Create vagrant user
RUN useradd -m -s /bin/bash vagrant && \
    echo "vagrant:vagrant" | chpasswd && \
    echo "vagrant ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/vagrant && \
    chmod 0440 /etc/sudoers.d/vagrant

# Configure SSH
RUN ssh-keygen -A
RUN mkdir -p /home/vagrant/.ssh /run/sshd && \
    chmod 700 /home/vagrant/.ssh

# Add Vagrant insecure key
RUN curl -fsSL https://raw.githubusercontent.com/hashicorp/vagrant/main/keys/vagrant.pub \
    > /home/vagrant/.ssh/authorized_keys && \
    chmod 600 /home/vagrant/.ssh/authorized_keys && \
    chown -R vagrant:vagrant /home/vagrant/.ssh

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]
```

Build the image:

```bash
podman build -t vagrant-fedora -f Dockerfile.vagrant .
```

Now use it in your Vagrantfile:

```ruby
# Vagrantfile
Vagrant.configure("2") do |config|
  config.vm.provider "docker" do |d|
    d.build_dir = "."
    d.dockerfile = "Dockerfile.vagrant"
    d.has_ssh = true
    d.remains_running = true
  end

  config.ssh.username = "vagrant"
end
```

## Multi-Machine Development Environment

Define multiple interconnected containers:

```ruby
# Vagrantfile
Vagrant.configure("2") do |config|
  # Application server
  config.vm.define "app" do |app|
    app.vm.provider "docker" do |d|
      d.build_dir = "."
      d.dockerfile = "Dockerfile.vagrant"
      d.has_ssh = true
      d.remains_running = true
      d.name = "vagrant-app"
      d.ports = ["3000:3000"]
    end

    app.vm.hostname = "app"
    app.ssh.username = "vagrant"

    app.vm.provision "shell", inline: <<-SHELL
      dnf install -y nodejs npm
      cd /vagrant
      npm install
    SHELL
  end

  # Database server
  config.vm.define "db" do |db|
    db.vm.provider "docker" do |d|
      d.build_dir = "."
      d.dockerfile = "Dockerfile.vagrant"
      d.has_ssh = true
      d.remains_running = true
      d.name = "vagrant-db"
      d.cmd = ["/bin/bash", "-lc", "if id postgres >/dev/null 2>&1 && [ -s /var/lib/pgsql/data/PG_VERSION ]; then su - postgres -c 'postgres -D /var/lib/pgsql/data' & fi; exec /usr/sbin/sshd -D"]
      d.ports = ["5432:5432"]
    end

    db.vm.hostname = "db"
    db.ssh.username = "vagrant"

    db.vm.provision "shell", inline: <<-SHELL
      dnf install -y postgresql-server postgresql
      if [ ! -s /var/lib/pgsql/data/PG_VERSION ]; then
        postgresql-setup --initdb
      fi
    SHELL
  end
end
```

## Using Vagrant Provisioners

SSH-based Vagrant provisioners work much the same way with a Podman-backed container as they do with a VM provider:

```ruby
# Vagrantfile
Vagrant.configure("2") do |config|
  config.vm.provider "docker" do |d|
    d.build_dir = "."
    d.dockerfile = "Dockerfile.vagrant"
    d.has_ssh = true
    d.remains_running = true
  end

  config.ssh.username = "vagrant"

  # Shell provisioner
  config.vm.provision "shell", inline: <<-SHELL
    dnf update -y
    dnf install -y git vim tmux
  SHELL

  # File provisioner
  config.vm.provision "file",
    source: "config/app.conf",
    destination: "/home/vagrant/app.conf"

  # Shell script provisioner
  config.vm.provision "shell",
    path: "scripts/setup-dev-env.sh"

  # Ansible provisioner
  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "ansible/dev-setup.yml"
    ansible.extra_vars = {
      app_env: "development"
    }
  end
end
```

The `ansible` provisioner runs `ansible-playbook` on the Vagrant host, so Ansible still needs to be installed on the machine running Vagrant.

## Synced Folders

Map host directories into the container:

```ruby
Vagrant.configure("2") do |config|
  config.vm.provider "docker" do |d|
    d.build_dir = "."
    d.dockerfile = "Dockerfile.vagrant"
    d.has_ssh = true
    d.remains_running = true
    d.volumes = [
      "#{Dir.pwd}/src:/home/vagrant/src:Z",
      "#{Dir.pwd}/config:/home/vagrant/config:ro,Z"
    ]
  end

  config.ssh.username = "vagrant"

  config.vm.synced_folder ".", "/vagrant", type: "rsync",
    rsync__exclude: [".git/", "node_modules/"]
end
```

If you force `type: "rsync"`, make sure `rsync` is installed on both the host and the image.

## Language-Specific Development Environments

Python development environment:

```ruby
Vagrant.configure("2") do |config|
  config.vm.provider "docker" do |d|
    d.build_dir = "."
    d.dockerfile = "Dockerfile.vagrant"
    d.has_ssh = true
    d.remains_running = true
    d.ports = ["8000:8000"]
  end

  config.ssh.username = "vagrant"

  config.vm.provision "shell", inline: <<-SHELL
    dnf install -y python3 python3-pip python3-devel
    pip3 install virtualenv
    su - vagrant -c "
      cd /vagrant
      python3 -m venv venv
      source venv/bin/activate
      pip install -r requirements.txt
    "
  SHELL
end
```

## Vagrant Commands Reference

The standard Vagrant commands work with this Podman-backed Docker setup:

```bash
# Start the environment
vagrant up --provider=docker

# SSH into a container
vagrant ssh

# SSH into a specific machine
vagrant ssh app

# Check status
vagrant status

# Provision again
vagrant provision

# Stop containers
vagrant halt

# Destroy everything
vagrant destroy -f

# Reload with new configuration
vagrant reload
```

## Helper Script

Create a wrapper to ensure the Podman socket is available and to default new environments to the Docker provider:

```bash
#!/bin/bash
# vagrant-podman.sh

# Ensure Podman socket is running
if ! systemctl --user is-active podman.socket > /dev/null 2>&1; then
    echo "Starting Podman socket..."
    systemctl --user start podman.socket
fi

export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"
export VAGRANT_DEFAULT_PROVIDER=docker

vagrant "$@"
```

```bash
chmod +x vagrant-podman.sh
./vagrant-podman.sh up
./vagrant-podman.sh ssh
```

## Comparison with VM-Based Vagrant

A Podman-backed Vagrant environment trades some features for speed:

```text
Feature              | VirtualBox Provider | Podman-Backed Docker Provider
---------------------|--------------------|-------------------------------
Start time           | 30-120 seconds     | 2-5 seconds
Memory overhead      | 512MB+ per VM      | ~50MB per container
Disk overhead        | 2GB+ per VM        | Shared layers
Full OS isolation    | Yes                | Namespace isolation
GUI support          | Yes                | Requires X11 forwarding
Nested virtualization| Yes                | No
Network isolation    | Full               | Container networking
```

For most development workflows, the container-based approach is faster and more resource-efficient while providing sufficient isolation.

## Conclusion

Vagrant with Podman gives you the best of both worlds: the familiar, well-documented Vagrant workflow combined with the speed and efficiency of containers. Development environments start in seconds, use minimal resources, and provide the same provisioning and multi-machine capabilities that make Vagrant valuable. While there are some limitations compared to full VM providers, the dramatic improvement in startup time and resource usage makes Podman an excellent choice for development environments where full hardware virtualization is not required.
