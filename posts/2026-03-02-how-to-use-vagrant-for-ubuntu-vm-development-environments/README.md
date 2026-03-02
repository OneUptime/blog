# How to Use Vagrant for Ubuntu VM Development Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Vagrant, Development Environments, Virtualization, Automation

Description: Set up reproducible Ubuntu development environments with Vagrant, including Vagrantfile configuration, provisioning, shared folders, and multi-machine setups for local development.

---

Vagrant solves a real problem: "works on my machine" syndrome. By defining development environments as code in a `Vagrantfile`, every team member spins up an identical Ubuntu VM with the same packages, configuration, and services. Onboarding a new developer goes from a half-day manual setup process to `vagrant up`.

This guide covers Vagrant with VirtualBox (the most portable provider) and the common patterns used in real development teams.

## Installing Vagrant and VirtualBox

### VirtualBox

```bash
# Download and add the Oracle VirtualBox GPG key
wget -O- https://www.virtualbox.org/download/oracle_vbox_2016.asc | \
    sudo gpg --dearmor -o /usr/share/keyrings/oracle-vbox.gpg

# Add the VirtualBox repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/oracle-vbox.gpg] \
    https://download.virtualbox.org/virtualbox/debian $(lsb_release -cs) contrib" | \
    sudo tee /etc/apt/sources.list.d/virtualbox.list

# Install VirtualBox
sudo apt-get update && sudo apt-get install -y virtualbox-7.0
```

### Vagrant

```bash
# Add HashiCorp GPG key
wget -O- https://apt.releases.hashicorp.com/gpg | \
    sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Add HashiCorp repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    sudo tee /etc/apt/sources.list.d/hashicorp.list

sudo apt-get update && sudo apt-get install -y vagrant

# Verify
vagrant version
```

## Basic Vagrantfile

Create a new project directory and initialize Vagrant:

```bash
mkdir ~/projects/my-dev-env
cd ~/projects/my-dev-env
vagrant init ubuntu/jammy64
```

This creates a basic `Vagrantfile`. Replace its contents with a more practical configuration:

```ruby
# Vagrantfile
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  # Base box - Ubuntu 22.04 LTS
  config.vm.box = "ubuntu/jammy64"
  config.vm.box_version = ">= 20240101.0.0"

  # VM hostname
  config.vm.hostname = "devbox"

  # Network configuration
  # Private network allows host-to-VM communication
  config.vm.network "private_network", ip: "192.168.56.10"

  # Forward specific ports from the VM to the host machine
  # Host port 8080 -> VM port 80 (for web development)
  config.vm.network "forwarded_port", guest: 80, host: 8080, auto_correct: true
  config.vm.network "forwarded_port", guest: 3000, host: 3000, auto_correct: true
  config.vm.network "forwarded_port", guest: 5432, host: 5432, auto_correct: true

  # Shared folders
  # The project directory is automatically shared as /vagrant
  # Add additional synced folders as needed
  config.vm.synced_folder ".", "/vagrant", type: "virtualbox"
  config.vm.synced_folder "./src", "/home/vagrant/src", type: "virtualbox",
    owner: "vagrant", group: "vagrant"

  # VirtualBox provider configuration
  config.vm.provider "virtualbox" do |vb|
    vb.name = "my-dev-env"
    vb.memory = 4096   # 4GB RAM
    vb.cpus = 2
    vb.gui = false     # No GUI window

    # Enable linked clones for faster VM creation
    vb.linked_clone = true

    # Optimize disk I/O
    vb.customize ["storagectl", :id, "--name", "SATA Controller",
                  "--hostiocache", "on"]
  end

  # Shell provisioner - runs on first 'vagrant up'
  config.vm.provision "shell", inline: <<-SHELL
    # Update package lists
    apt-get update

    # Install development tools
    apt-get install -y \
      git \
      curl \
      wget \
      vim \
      htop \
      jq \
      build-essential \
      python3 \
      python3-pip \
      nodejs \
      npm \
      docker.io \
      postgresql \
      postgresql-client

    # Add vagrant user to docker group
    usermod -aG docker vagrant

    # Configure PostgreSQL to accept connections from anywhere (dev only!)
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" \
      /etc/postgresql/14/main/postgresql.conf
    echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/14/main/pg_hba.conf
    systemctl restart postgresql

    # Create development database
    sudo -u postgres psql -c "CREATE USER devuser WITH PASSWORD 'devpassword';"
    sudo -u postgres psql -c "CREATE DATABASE devdb OWNER devuser;"

    echo "Development environment provisioning complete!"
  SHELL

  # Run a second provisioner as the vagrant user (not root)
  config.vm.provision "shell", privileged: false, inline: <<-SHELL
    # Configure git defaults
    git config --global core.editor vim
    git config --global pull.rebase false

    # Install Node.js global packages
    npm install -g yarn

    echo "User-level provisioning complete!"
  SHELL
end
```

## Basic Vagrant Commands

```bash
# Start the VM (runs provisioners on first boot)
vagrant up

# SSH into the VM
vagrant ssh

# Stop the VM (saves state)
vagrant halt

# Destroy and remove the VM
vagrant destroy

# Check VM status
vagrant status

# Re-run provisioners (without rebuilding)
vagrant provision

# Reload VM (restart with new Vagrantfile settings)
vagrant reload

# Reload and re-provision
vagrant reload --provision
```

## Using Multiple Provisioners

For complex environments, separate concerns across multiple provisioners:

```ruby
# Install base packages with shell
config.vm.provision "shell", name: "base-packages", inline: <<-SHELL
  apt-get update
  apt-get install -y curl git build-essential
SHELL

# Configure the system with Ansible
config.vm.provision "ansible_local" do |ansible|
  ansible.playbook = "provisioning/playbook.yml"
  ansible.install_mode = "pip"
end

# Run application-specific setup
config.vm.provision "shell", name: "app-setup",
  path: "scripts/setup-app.sh",
  privileged: false
```

## Multi-Machine Vagrantfiles

Define multiple VMs in a single Vagrantfile for realistic development environments:

```ruby
Vagrant.configure("2") do |config|
  # Shared box and settings
  config.vm.box = "ubuntu/jammy64"

  # Web application server
  config.vm.define "web" do |web|
    web.vm.hostname = "web-dev"
    web.vm.network "private_network", ip: "192.168.56.10"
    web.vm.network "forwarded_port", guest: 80, host: 8080

    web.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
    end

    web.vm.provision "shell", inline: <<-SHELL
      apt-get update
      apt-get install -y nginx nodejs npm
      systemctl enable nginx
    SHELL
  end

  # Database server
  config.vm.define "db" do |db|
    db.vm.hostname = "db-dev"
    db.vm.network "private_network", ip: "192.168.56.11"

    db.vm.provider "virtualbox" do |vb|
      vb.memory = 2048
      vb.cpus = 2
    end

    db.vm.provision "shell", inline: <<-SHELL
      apt-get update
      apt-get install -y postgresql postgresql-contrib

      # Configure PostgreSQL to listen on all interfaces
      sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" \
        /etc/postgresql/14/main/postgresql.conf
      echo "host all all 192.168.56.0/24 md5" >> /etc/postgresql/14/main/pg_hba.conf
      systemctl restart postgresql
      sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD 'apppassword';"
      sudo -u postgres psql -c "CREATE DATABASE appdb OWNER appuser;"
    SHELL
  end

  # Redis cache
  config.vm.define "cache" do |cache|
    cache.vm.hostname = "cache-dev"
    cache.vm.network "private_network", ip: "192.168.56.12"

    cache.vm.provider "virtualbox" do |vb|
      vb.memory = 512
      vb.cpus = 1
    end

    cache.vm.provision "shell", inline: <<-SHELL
      apt-get update
      apt-get install -y redis-server
      sed -i "s/bind 127.0.0.1/bind 0.0.0.0/" /etc/redis/redis.conf
      systemctl restart redis
    SHELL
  end
end
```

```bash
# Start all machines
vagrant up

# Start only the database machine
vagrant up db

# SSH into a specific machine
vagrant ssh web

# Stop all machines
vagrant halt

# Get status of all machines
vagrant status
```

## Managing Vagrant Boxes

```bash
# List installed boxes
vagrant box list

# Add a new box manually
vagrant box add ubuntu/focal64

# Update a box to the latest version
vagrant box update --box ubuntu/jammy64

# Remove old box versions
vagrant box prune

# Remove a specific box
vagrant box remove ubuntu/focal64
```

## Sharing Files Efficiently

The default VirtualBox synced folder can be slow for large file trees. For better performance:

```ruby
# Use NFS for better performance on Linux hosts
config.vm.synced_folder ".", "/vagrant", type: "nfs",
  nfs_udp: false

# For macOS hosts, the nfs option is good
# For Windows hosts, use SMB or rsync

# Use rsync for one-way sync (faster, but not bidirectional)
config.vm.synced_folder ".", "/vagrant", type: "rsync",
  rsync__exclude: [".git/", "node_modules/", ".vagrant/"]

# To sync rsync folders after changes:
# vagrant rsync-auto  (watches for changes and syncs automatically)
```

## Persisting Data Between Destroys

Use a separate disk or dedicated synced folder for data that should survive `vagrant destroy`:

```ruby
config.vm.provision "shell", inline: <<-SHELL
  # Store PostgreSQL data in a synced folder that persists
  # (configure PostgreSQL to use /vagrant/pgdata as data directory)
  mkdir -p /vagrant/pgdata
  chown postgres:postgres /vagrant/pgdata
SHELL
```

## Summary

Vagrant provides a straightforward path to reproducible development environments. The `Vagrantfile` becomes a form of documentation for your development setup, and `vagrant up` replaces a page of setup instructions.

The most important practices:
- Commit the `Vagrantfile` to source control alongside your application code
- Pin the box version to avoid unexpected changes when the base box is updated
- Use multiple provisioners for separation of concerns
- Use rsync or NFS synced folders when default VirtualBox sharing is too slow
- Document any manual steps that remain after provisioning in your README
