# How to Set Up Ansible for Ubuntu Server Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Ansible, Automation, DevOps, Configuration Management

Description: Set up Ansible for Ubuntu server automation with inventory management, playbooks, and roles for consistent infrastructure configuration.

---

Ansible is a powerful, agentless automation tool that simplifies server configuration, application deployment, and infrastructure orchestration. Unlike other configuration management tools, Ansible uses SSH for communication and requires no agents on managed nodes, making it ideal for Ubuntu server automation.

In this comprehensive guide, you will learn how to install Ansible, configure inventory files, set up passwordless SSH authentication, run ad-hoc commands, write playbooks, work with variables and facts, and leverage roles from Ansible Galaxy.

## Prerequisites

Before you begin, ensure you have:

- A control node (your local machine or a dedicated management server) running Ubuntu 20.04 or later
- One or more Ubuntu servers to manage (target nodes)
- Root or sudo access on all machines
- Basic familiarity with Linux command line and SSH

## Installing Ansible on Ubuntu

Ansible runs on the control node and connects to managed nodes via SSH. Let's install Ansible on your control machine.

### Method 1: Install from Ubuntu Repository

The simplest way to install Ansible is from the official Ubuntu repositories.

```bash
# Update package index to ensure we have the latest package information
sudo apt update

# Install Ansible and its dependencies
sudo apt install -y ansible

# Verify the installation by checking the version
ansible --version
```

### Method 2: Install from PPA (Recommended for Latest Version)

For the latest Ansible features and bug fixes, install from the official Ansible PPA.

```bash
# Install software-properties-common to manage PPAs
sudo apt update
sudo apt install -y software-properties-common

# Add the official Ansible PPA repository
sudo add-apt-repository --yes --update ppa:ansible/ansible

# Install Ansible from the PPA
sudo apt install -y ansible

# Confirm installation with version check
ansible --version
```

### Method 3: Install via pip (Most Flexible)

Installing via pip gives you the most control over Ansible versions.

```bash
# Install Python 3 pip if not already installed
sudo apt update
sudo apt install -y python3-pip python3-venv

# Create a virtual environment for Ansible (optional but recommended)
python3 -m venv ~/ansible-env
source ~/ansible-env/bin/activate

# Install Ansible using pip
pip install ansible

# Install additional useful packages
pip install ansible-lint  # For linting playbooks

# Verify installation
ansible --version
```

## Setting Up SSH Key Authentication

Ansible uses SSH to connect to managed nodes. Setting up passwordless SSH authentication is essential for smooth automation.

### Generate SSH Key Pair

Create an SSH key pair on your control node if you don't have one.

```bash
# Generate a new Ed25519 SSH key pair (more secure than RSA)
ssh-keygen -t ed25519 -C "ansible-control-node" -f ~/.ssh/ansible_key

# Alternatively, generate RSA key if Ed25519 is not supported
ssh-keygen -t rsa -b 4096 -C "ansible-control-node" -f ~/.ssh/ansible_key

# Set correct permissions on the private key
chmod 600 ~/.ssh/ansible_key
```

### Copy SSH Key to Managed Nodes

Distribute your public key to all managed nodes.

```bash
# Copy SSH key to a single managed node
# Replace 'username' with your actual username and 'server_ip' with the target IP
ssh-copy-id -i ~/.ssh/ansible_key.pub username@server_ip

# For multiple servers, you can use a loop
# Create a file with your server IPs first
cat << 'EOF' > ~/servers.txt
192.168.1.10
192.168.1.11
192.168.1.12
EOF

# Loop through servers and copy the key
for server in $(cat ~/servers.txt); do
    ssh-copy-id -i ~/.ssh/ansible_key.pub username@$server
done
```

### Configure SSH Config File

Create an SSH config to simplify connections and specify the Ansible key.

```bash
# Create or edit SSH config file
cat << 'EOF' >> ~/.ssh/config

# Ansible managed servers configuration
Host ansible-*
    User ubuntu
    IdentityFile ~/.ssh/ansible_key
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null

# Specific server aliases
Host web-server-1
    HostName 192.168.1.10
    User ubuntu
    IdentityFile ~/.ssh/ansible_key

Host db-server-1
    HostName 192.168.1.11
    User ubuntu
    IdentityFile ~/.ssh/ansible_key
EOF

# Set proper permissions on SSH config
chmod 600 ~/.ssh/config
```

### Test SSH Connection

Verify that passwordless SSH authentication works.

```bash
# Test SSH connection to a managed node
ssh -i ~/.ssh/ansible_key username@server_ip "hostname && uptime"

# If using SSH config alias
ssh web-server-1 "hostname && uptime"
```

## Configuring Ansible Inventory

The inventory file defines the hosts and groups that Ansible will manage. It is the foundation of Ansible automation.

### Default Inventory Location

Ansible looks for inventory at `/etc/ansible/hosts` by default. However, it's best practice to maintain project-specific inventories.

### Create a Project Directory

Set up a dedicated directory for your Ansible project.

```bash
# Create Ansible project directory
mkdir -p ~/ansible-project/{inventories,playbooks,roles,group_vars,host_vars}

# Navigate to the project directory
cd ~/ansible-project
```

### Basic INI-Format Inventory

Create a simple inventory file using INI format.

```ini
# File: ~/ansible-project/inventories/hosts.ini
# This inventory defines our infrastructure groups

# Ungrouped hosts (accessible individually)
192.168.1.5

# Web servers group
[webservers]
web1.example.com
web2.example.com
192.168.1.10
192.168.1.11

# Database servers group
[dbservers]
db1.example.com ansible_host=192.168.1.20
db2.example.com ansible_host=192.168.1.21

# Application servers with custom SSH port
[appservers]
app1.example.com ansible_port=2222
app2.example.com ansible_port=2222

# Group containing other groups (children)
[production:children]
webservers
dbservers
appservers

# Variables for all production servers
[production:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/.ssh/ansible_key
environment=production
```

### YAML-Format Inventory

YAML format provides better readability for complex inventories.

```yaml
# File: ~/ansible-project/inventories/hosts.yml
# YAML inventory with detailed host definitions

all:
  # Global variables applied to all hosts
  vars:
    ansible_user: ubuntu
    ansible_ssh_private_key_file: ~/.ssh/ansible_key
    ansible_python_interpreter: /usr/bin/python3

  # Host groups definition
  children:
    # Web server tier
    webservers:
      hosts:
        web1.example.com:
          ansible_host: 192.168.1.10
          http_port: 80
        web2.example.com:
          ansible_host: 192.168.1.11
          http_port: 8080
      vars:
        nginx_worker_processes: 4

    # Database server tier
    dbservers:
      hosts:
        db-primary:
          ansible_host: 192.168.1.20
          mysql_role: primary
        db-replica:
          ansible_host: 192.168.1.21
          mysql_role: replica
      vars:
        mysql_port: 3306

    # Staging environment group
    staging:
      hosts:
        staging-server:
          ansible_host: 192.168.2.10
      vars:
        environment: staging

    # Production environment (combines multiple groups)
    production:
      children:
        webservers:
        dbservers:
      vars:
        environment: production
        monitoring_enabled: true
```

### Verify Inventory Configuration

Test your inventory to ensure Ansible can parse it correctly.

```bash
# List all hosts in the inventory
ansible-inventory -i inventories/hosts.yml --list

# Display inventory in graph format
ansible-inventory -i inventories/hosts.yml --graph

# List hosts in a specific group
ansible-inventory -i inventories/hosts.yml --graph webservers

# Test connectivity to all hosts
ansible -i inventories/hosts.yml all -m ping
```

## Running Ad-Hoc Commands

Ad-hoc commands let you execute quick tasks without writing a full playbook. They are perfect for one-off operations.

### Basic Ad-Hoc Command Syntax

The general syntax for ad-hoc commands follows this pattern.

```bash
# Basic syntax: ansible <pattern> -i <inventory> -m <module> -a "<arguments>"

# Ping all hosts to verify connectivity
ansible all -i inventories/hosts.yml -m ping

# Ping only webservers group
ansible webservers -i inventories/hosts.yml -m ping
```

### Common Ad-Hoc Operations

Perform typical system administration tasks with ad-hoc commands.

```bash
# Execute a shell command on all hosts
ansible all -i inventories/hosts.yml -m shell -a "uptime"

# Check disk space on database servers
ansible dbservers -i inventories/hosts.yml -m shell -a "df -h"

# Get system information using the setup module
ansible webservers -i inventories/hosts.yml -m setup -a "filter=ansible_os_family"

# Copy a file to remote hosts
ansible all -i inventories/hosts.yml -m copy \
  -a "src=/local/path/file.txt dest=/remote/path/file.txt mode=0644"

# Install a package on all servers (requires privilege escalation)
ansible all -i inventories/hosts.yml -m apt \
  -a "name=htop state=present" --become

# Restart a service on web servers
ansible webservers -i inventories/hosts.yml -m service \
  -a "name=nginx state=restarted" --become

# Create a user on all hosts
ansible all -i inventories/hosts.yml -m user \
  -a "name=deploy state=present groups=sudo" --become

# Remove a package from servers
ansible all -i inventories/hosts.yml -m apt \
  -a "name=apache2 state=absent" --become
```

### Controlling Execution

Use various flags to control how ad-hoc commands run.

```bash
# Run with verbose output for debugging
ansible all -i inventories/hosts.yml -m ping -v

# Run with maximum verbosity
ansible all -i inventories/hosts.yml -m ping -vvvv

# Limit execution to specific hosts
ansible all -i inventories/hosts.yml -m ping --limit "web1.example.com"

# Run on a subset of hosts (first 2 servers)
ansible all -i inventories/hosts.yml -m ping --limit "all[0:1]"

# Run with parallel execution (default is 5)
ansible all -i inventories/hosts.yml -m ping -f 10

# Check mode (dry run) to see what would happen
ansible all -i inventories/hosts.yml -m apt \
  -a "name=nginx state=present" --become --check

# Prompt for SSH password instead of key
ansible all -i inventories/hosts.yml -m ping --ask-pass

# Prompt for sudo password
ansible all -i inventories/hosts.yml -m apt \
  -a "name=nginx state=present" --become --ask-become-pass
```

## Writing Ansible Playbooks

Playbooks are YAML files that define a series of tasks to execute on managed nodes. They provide a repeatable and version-controlled way to manage configurations.

### Basic Playbook Structure

Create your first playbook to understand the fundamental structure.

```yaml
# File: ~/ansible-project/playbooks/first-playbook.yml
# A simple playbook demonstrating basic structure

---
# Each playbook contains one or more plays
- name: My First Ansible Playbook
  # Target hosts or groups from inventory
  hosts: webservers
  # Become root for privilege escalation
  become: true
  # Variables for this play
  vars:
    package_name: nginx

  # Tasks are executed in order
  tasks:
    # Each task uses a module and has a descriptive name
    - name: Update apt cache
      apt:
        update_cache: yes
        cache_valid_time: 3600

    - name: Install Nginx web server
      apt:
        name: "{{ package_name }}"
        state: present

    - name: Ensure Nginx is running and enabled
      service:
        name: nginx
        state: started
        enabled: yes

    - name: Create custom index page
      copy:
        content: |
          <!DOCTYPE html>
          <html>
          <head><title>Welcome</title></head>
          <body><h1>Server configured by Ansible</h1></body>
          </html>
        dest: /var/www/html/index.html
        mode: '0644'
```

### Run the Playbook

Execute your playbook with the ansible-playbook command.

```bash
# Run the playbook
ansible-playbook -i inventories/hosts.yml playbooks/first-playbook.yml

# Run in check mode (dry run)
ansible-playbook -i inventories/hosts.yml playbooks/first-playbook.yml --check

# Run with diff to show file changes
ansible-playbook -i inventories/hosts.yml playbooks/first-playbook.yml --diff

# Limit to specific hosts
ansible-playbook -i inventories/hosts.yml playbooks/first-playbook.yml \
  --limit "web1.example.com"

# Start from a specific task
ansible-playbook -i inventories/hosts.yml playbooks/first-playbook.yml \
  --start-at-task="Install Nginx web server"
```

### Advanced Playbook with Handlers and Conditions

Create a more sophisticated playbook with handlers and conditional logic.

```yaml
# File: ~/ansible-project/playbooks/webserver-setup.yml
# Complete web server configuration playbook

---
- name: Configure Ubuntu Web Servers
  hosts: webservers
  become: true
  gather_facts: true

  vars:
    http_port: 80
    https_port: 443
    server_admin: admin@example.com
    document_root: /var/www/html
    required_packages:
      - nginx
      - ufw
      - fail2ban
      - certbot
      - python3-certbot-nginx

  # Handlers are triggered by notify and run at the end
  handlers:
    - name: Restart Nginx
      service:
        name: nginx
        state: restarted

    - name: Reload Nginx
      service:
        name: nginx
        state: reloaded

    - name: Restart fail2ban
      service:
        name: fail2ban
        state: restarted

  # Pre-tasks run before main tasks
  pre_tasks:
    - name: Update apt cache if older than 1 hour
      apt:
        update_cache: yes
        cache_valid_time: 3600

  tasks:
    # Install required packages using loop
    - name: Install required packages
      apt:
        name: "{{ required_packages }}"
        state: present

    # Configure Nginx only if Ubuntu version is 20.04 or later
    - name: Configure Nginx virtual host
      template:
        src: templates/nginx-vhost.conf.j2
        dest: /etc/nginx/sites-available/default
        mode: '0644'
      notify: Reload Nginx
      when: ansible_distribution_version is version('20.04', '>=')

    # Conditional task based on environment variable
    - name: Enable UFW firewall
      ufw:
        state: enabled
        policy: deny
      when: environment == 'production'

    # Allow HTTP and HTTPS traffic
    - name: Allow web traffic through firewall
      ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "{{ http_port }}"
        - "{{ https_port }}"
      when: environment == 'production'

    # Block task to group related tasks
    - name: Configure fail2ban for SSH protection
      block:
        - name: Create fail2ban jail configuration
          copy:
            content: |
              [sshd]
              enabled = true
              port = ssh
              filter = sshd
              logpath = /var/log/auth.log
              maxretry = 3
              bantime = 3600
            dest: /etc/fail2ban/jail.local
            mode: '0644'
          notify: Restart fail2ban

        - name: Ensure fail2ban is running
          service:
            name: fail2ban
            state: started
            enabled: yes
      when: ansible_distribution == 'Ubuntu'

    # Create document root and set permissions
    - name: Ensure document root exists
      file:
        path: "{{ document_root }}"
        state: directory
        owner: www-data
        group: www-data
        mode: '0755'

    # Verify Nginx configuration
    - name: Test Nginx configuration
      command: nginx -t
      register: nginx_test
      changed_when: false
      failed_when: nginx_test.rc != 0

  # Post-tasks run after main tasks
  post_tasks:
    - name: Display server information
      debug:
        msg: |
          Web server configured successfully!
          Server: {{ ansible_hostname }}
          IP: {{ ansible_default_ipv4.address }}
          OS: {{ ansible_distribution }} {{ ansible_distribution_version }}
```

### Create Template File

Ansible uses Jinja2 templates for dynamic configuration files.

```jinja2
# File: ~/ansible-project/templates/nginx-vhost.conf.j2
# Nginx virtual host template with Jinja2 variables

server {
    listen {{ http_port }} default_server;
    listen [::]:{{ http_port }} default_server;

    root {{ document_root }};
    index index.html index.htm index.nginx-debian.html;

    server_name {{ ansible_hostname }} {{ ansible_fqdn }};

    # Server admin email for error pages
    # Admin: {{ server_admin }}

    location / {
        try_files $uri $uri/ =404;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/{{ ansible_hostname }}_access.log;
    error_log /var/log/nginx/{{ ansible_hostname }}_error.log;
}
```

## Working with Variables and Facts

Variables and facts make playbooks dynamic and reusable across different environments.

### Variable Definition Methods

Define variables at different levels with varying precedence.

```yaml
# File: ~/ansible-project/group_vars/all.yml
# Variables applied to all hosts

---
# System configuration
ansible_user: ubuntu
ansible_python_interpreter: /usr/bin/python3

# Common packages for all servers
common_packages:
  - vim
  - htop
  - curl
  - wget
  - git
  - unzip

# NTP configuration
ntp_servers:
  - 0.ubuntu.pool.ntp.org
  - 1.ubuntu.pool.ntp.org

# Security settings
ssh_port: 22
password_authentication: "no"
permit_root_login: "no"
```

```yaml
# File: ~/ansible-project/group_vars/webservers.yml
# Variables specific to web servers group

---
# Web server configuration
http_port: 80
https_port: 443
nginx_worker_processes: auto
nginx_worker_connections: 1024

# SSL configuration
ssl_certificate_path: /etc/ssl/certs
ssl_key_path: /etc/ssl/private

# Application settings
app_user: www-data
app_group: www-data
document_root: /var/www/html
```

```yaml
# File: ~/ansible-project/group_vars/dbservers.yml
# Variables specific to database servers group

---
# MySQL configuration
mysql_port: 3306
mysql_bind_address: 0.0.0.0
mysql_max_connections: 151
mysql_root_password: "{{ vault_mysql_root_password }}"

# Backup settings
backup_enabled: true
backup_directory: /var/backups/mysql
backup_retention_days: 7
```

```yaml
# File: ~/ansible-project/host_vars/web1.example.com.yml
# Variables specific to a single host

---
# Override group variables for this specific host
http_port: 8080
nginx_worker_processes: 2

# Host-specific settings
virtual_hosts:
  - domain: app1.example.com
    root: /var/www/app1
  - domain: app2.example.com
    root: /var/www/app2
```

### Using Ansible Facts

Facts are system information gathered automatically from managed nodes.

```yaml
# File: ~/ansible-project/playbooks/facts-demo.yml
# Demonstrate gathering and using Ansible facts

---
- name: Working with Ansible Facts
  hosts: all
  become: true
  # gather_facts is true by default
  gather_facts: true

  tasks:
    # Display basic system facts
    - name: Show operating system information
      debug:
        msg: |
          Hostname: {{ ansible_hostname }}
          FQDN: {{ ansible_fqdn }}
          OS Family: {{ ansible_os_family }}
          Distribution: {{ ansible_distribution }}
          Version: {{ ansible_distribution_version }}
          Kernel: {{ ansible_kernel }}

    # Display hardware facts
    - name: Show hardware information
      debug:
        msg: |
          CPU Cores: {{ ansible_processor_cores }}
          Total Memory: {{ ansible_memtotal_mb }} MB
          Architecture: {{ ansible_architecture }}

    # Display network facts
    - name: Show network information
      debug:
        msg: |
          Default IPv4: {{ ansible_default_ipv4.address | default('N/A') }}
          Default Interface: {{ ansible_default_ipv4.interface | default('N/A') }}
          All IPv4 Addresses: {{ ansible_all_ipv4_addresses }}

    # Conditional task using facts
    - name: Install package based on distribution
      apt:
        name: "{{ item }}"
        state: present
      loop: "{{ common_packages }}"
      when: ansible_os_family == 'Debian'

    # Set configuration based on available memory
    - name: Configure swap if memory is less than 2GB
      shell: |
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
      args:
        creates: /swapfile
      when: ansible_memtotal_mb < 2048

    # Save facts to a file for later analysis
    - name: Save system facts to file
      copy:
        content: "{{ ansible_facts | to_nice_json }}"
        dest: "/tmp/{{ ansible_hostname }}_facts.json"
```

### Custom Facts and Variables

Create custom facts and use advanced variable techniques.

```yaml
# File: ~/ansible-project/playbooks/custom-facts.yml
# Working with custom facts and set_fact module

---
- name: Custom Facts and Variables Demo
  hosts: all
  become: true

  vars:
    # Dictionary variable
    app_config:
      name: myapp
      version: 1.2.3
      port: 3000
      workers: 4

    # List variable
    allowed_users:
      - alice
      - bob
      - charlie

  tasks:
    # Create custom fact using set_fact
    - name: Set custom fact based on conditions
      set_fact:
        server_role: >-
          {% if 'webservers' in group_names %}web
          {% elif 'dbservers' in group_names %}database
          {% else %}unknown{% endif %}

    # Use register to capture command output
    - name: Get current timestamp
      command: date +%Y-%m-%d_%H-%M-%S
      register: timestamp_result
      changed_when: false

    - name: Set timestamp as fact
      set_fact:
        deployment_timestamp: "{{ timestamp_result.stdout }}"

    # Create local facts directory for persistent custom facts
    - name: Create facts directory
      file:
        path: /etc/ansible/facts.d
        state: directory
        mode: '0755'

    # Create a custom fact file (will be available as ansible_local)
    - name: Create custom fact file
      copy:
        content: |
          [application]
          name={{ app_config.name }}
          version={{ app_config.version }}
          deployed={{ deployment_timestamp }}
        dest: /etc/ansible/facts.d/application.fact
        mode: '0644'

    # Re-gather facts to pick up new local facts
    - name: Refresh facts
      setup:
        filter: ansible_local

    # Display custom local facts
    - name: Show local custom facts
      debug:
        var: ansible_local.application
      when: ansible_local.application is defined

    # Loop through dictionary
    - name: Display app configuration
      debug:
        msg: "{{ item.key }}: {{ item.value }}"
      loop: "{{ app_config | dict2items }}"

    # Filter and transform data
    - name: Create users from list
      user:
        name: "{{ item }}"
        state: present
        groups: developers
        shell: /bin/bash
      loop: "{{ allowed_users }}"
```

## Ansible Roles and Galaxy

Roles provide a structured way to organize playbooks into reusable components. Ansible Galaxy is a repository of community-shared roles.

### Creating a Custom Role

Create a role to encapsulate related tasks, handlers, variables, and templates.

```bash
# Create role directory structure using ansible-galaxy
cd ~/ansible-project
ansible-galaxy init roles/webserver

# This creates the following structure:
# roles/webserver/
# |-- README.md
# |-- defaults/
# |   `-- main.yml
# |-- files/
# |-- handlers/
# |   `-- main.yml
# |-- meta/
# |   `-- main.yml
# |-- tasks/
# |   `-- main.yml
# |-- templates/
# |-- tests/
# |   |-- inventory
# |   `-- test.yml
# `-- vars/
#     `-- main.yml
```

### Role Files Content

Define the content for each role component.

```yaml
# File: ~/ansible-project/roles/webserver/defaults/main.yml
# Default variables (lowest precedence, easily overridden)

---
# Nginx settings
nginx_worker_processes: auto
nginx_worker_connections: 1024
nginx_keepalive_timeout: 65

# HTTP settings
http_port: 80
https_port: 443
server_name: localhost

# Document root
document_root: /var/www/html

# Enable SSL
ssl_enabled: false
ssl_certificate: ""
ssl_certificate_key: ""

# Logging
access_log: /var/log/nginx/access.log
error_log: /var/log/nginx/error.log
```

```yaml
# File: ~/ansible-project/roles/webserver/vars/main.yml
# Role variables (higher precedence than defaults)

---
# Package names for Ubuntu
nginx_packages:
  - nginx
  - nginx-extras

# Required directories
nginx_directories:
  - /var/www/html
  - /etc/nginx/sites-available
  - /etc/nginx/sites-enabled
  - /etc/nginx/conf.d
```

```yaml
# File: ~/ansible-project/roles/webserver/tasks/main.yml
# Main task file that includes other task files

---
# Include modular task files
- name: Include installation tasks
  include_tasks: install.yml
  tags: install

- name: Include configuration tasks
  include_tasks: configure.yml
  tags: configure

- name: Include security tasks
  include_tasks: security.yml
  tags: security
```

```yaml
# File: ~/ansible-project/roles/webserver/tasks/install.yml
# Installation tasks for the webserver role

---
- name: Update apt cache
  apt:
    update_cache: yes
    cache_valid_time: 3600

- name: Install Nginx packages
  apt:
    name: "{{ nginx_packages }}"
    state: present

- name: Ensure Nginx is started and enabled
  service:
    name: nginx
    state: started
    enabled: yes
```

```yaml
# File: ~/ansible-project/roles/webserver/tasks/configure.yml
# Configuration tasks for the webserver role

---
- name: Create required directories
  file:
    path: "{{ item }}"
    state: directory
    owner: www-data
    group: www-data
    mode: '0755'
  loop: "{{ nginx_directories }}"

- name: Deploy Nginx main configuration
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'
    validate: nginx -t -c %s
  notify: Reload nginx

- name: Deploy default virtual host
  template:
    src: default-vhost.conf.j2
    dest: /etc/nginx/sites-available/default
    owner: root
    group: root
    mode: '0644'
  notify: Reload nginx

- name: Enable default virtual host
  file:
    src: /etc/nginx/sites-available/default
    dest: /etc/nginx/sites-enabled/default
    state: link
  notify: Reload nginx
```

```yaml
# File: ~/ansible-project/roles/webserver/tasks/security.yml
# Security hardening tasks

---
- name: Remove default Nginx page
  file:
    path: /var/www/html/index.nginx-debian.html
    state: absent

- name: Set secure permissions on web root
  file:
    path: "{{ document_root }}"
    owner: www-data
    group: www-data
    mode: '0755'
    recurse: yes

- name: Hide Nginx version
  lineinfile:
    path: /etc/nginx/nginx.conf
    regexp: '^(\s*)#?\s*server_tokens'
    line: '\1server_tokens off;'
    backrefs: yes
  notify: Reload nginx
```

```yaml
# File: ~/ansible-project/roles/webserver/handlers/main.yml
# Handlers for the webserver role

---
- name: Reload nginx
  service:
    name: nginx
    state: reloaded

- name: Restart nginx
  service:
    name: nginx
    state: restarted

- name: Test nginx configuration
  command: nginx -t
  changed_when: false
```

```jinja2
# File: ~/ansible-project/roles/webserver/templates/nginx.conf.j2
# Main Nginx configuration template

user www-data;
worker_processes {{ nginx_worker_processes }};
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections {{ nginx_worker_connections }};
    multi_accept on;
    use epoll;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout {{ nginx_keepalive_timeout }};
    types_hash_max_size 2048;
    server_tokens off;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging Settings
    access_log {{ access_log }};
    error_log {{ error_log }};

    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript
               application/rss+xml application/atom+xml image/svg+xml;

    # Virtual Host Configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### Using the Role in a Playbook

Apply your custom role in a playbook.

```yaml
# File: ~/ansible-project/playbooks/site.yml
# Main site playbook using roles

---
- name: Configure Web Servers
  hosts: webservers
  become: true

  # Override role defaults
  vars:
    nginx_worker_processes: 4
    nginx_worker_connections: 2048
    server_name: "{{ ansible_fqdn }}"

  # Pre-tasks before roles
  pre_tasks:
    - name: Update apt cache
      apt:
        update_cache: yes
        cache_valid_time: 3600

  # Apply roles
  roles:
    # Simple role reference
    - webserver

    # Role with custom variables
    - role: webserver
      vars:
        http_port: 8080
      tags: web
      when: custom_web_port | default(false)

- name: Configure Database Servers
  hosts: dbservers
  become: true

  roles:
    - role: common
      tags: common
    - role: mysql
      tags: database
```

### Installing Roles from Ansible Galaxy

Use Ansible Galaxy to install community roles.

```bash
# Search for roles on Galaxy
ansible-galaxy search nginx --author geerlingguy

# Get information about a role
ansible-galaxy info geerlingguy.nginx

# Install a single role
ansible-galaxy install geerlingguy.nginx

# Install role to specific directory
ansible-galaxy install geerlingguy.nginx -p ~/ansible-project/roles/

# Install multiple roles from requirements file
cat << 'EOF' > ~/ansible-project/requirements.yml
---
roles:
  # Install from Galaxy
  - name: geerlingguy.nginx
    version: 3.1.0

  - name: geerlingguy.mysql
    version: 4.3.0

  # Install from GitHub
  - name: custom-role
    src: https://github.com/username/ansible-role-custom
    version: main

  # Install from Git with specific name
  - name: my-company.webserver
    src: git+ssh://git@github.com/mycompany/ansible-webserver.git
    version: v2.0.0

# Collections can also be included
collections:
  - name: community.general
    version: ">=5.0.0"

  - name: ansible.posix
    version: "1.5.0"
EOF

# Install all roles from requirements file
ansible-galaxy install -r requirements.yml

# Install roles and collections
ansible-galaxy install -r requirements.yml --force

# List installed roles
ansible-galaxy list
```

### Creating a Collection

Organize multiple roles and plugins into a collection.

```bash
# Create a collection skeleton
ansible-galaxy collection init mycompany.infrastructure

# Collection structure:
# mycompany/infrastructure/
# |-- README.md
# |-- galaxy.yml
# |-- plugins/
# |   |-- modules/
# |   |-- inventory/
# |   `-- filter/
# |-- roles/
# |   |-- webserver/
# |   `-- database/
# `-- playbooks/

# Build the collection for distribution
cd mycompany/infrastructure
ansible-galaxy collection build

# Install a local collection
ansible-galaxy collection install mycompany-infrastructure-1.0.0.tar.gz
```

## Best Practices and Tips

Follow these best practices for maintainable Ansible automation.

### Project Structure

Organize your Ansible project for scalability.

```
ansible-project/
|-- ansible.cfg              # Project-specific configuration
|-- inventories/
|   |-- production/
|   |   |-- hosts.yml
|   |   |-- group_vars/
|   |   `-- host_vars/
|   `-- staging/
|       |-- hosts.yml
|       |-- group_vars/
|       `-- host_vars/
|-- playbooks/
|   |-- site.yml             # Main playbook
|   |-- webservers.yml
|   `-- dbservers.yml
|-- roles/
|   |-- common/
|   |-- webserver/
|   `-- database/
|-- group_vars/
|   |-- all.yml
|   |-- webservers.yml
|   `-- dbservers.yml
|-- host_vars/
|-- templates/
|-- files/
|-- library/                 # Custom modules
|-- filter_plugins/          # Custom filters
`-- requirements.yml         # Galaxy dependencies
```

### Ansible Configuration File

Create a project-specific configuration file.

```ini
# File: ~/ansible-project/ansible.cfg
# Project-specific Ansible configuration

[defaults]
# Inventory file location
inventory = inventories/production/hosts.yml

# Roles path
roles_path = roles:~/.ansible/roles

# Disable host key checking for automation
host_key_checking = False

# Increase parallelism
forks = 20

# Retry failed hosts
retry_files_enabled = True
retry_files_save_path = ~/.ansible/retry

# Output formatting
stdout_callback = yaml
callback_whitelist = timer, profile_tasks

# Fact caching for performance
gathering = smart
fact_caching = jsonfile
fact_caching_connection = ~/.ansible/facts_cache
fact_caching_timeout = 86400

[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False

[ssh_connection]
# Use SSH pipelining for better performance
pipelining = True
# SSH control path for multiplexing
control_path = %(directory)s/%%h-%%r
# SSH connection timeout
timeout = 30
```

### Ansible Vault for Secrets

Securely manage sensitive data with Ansible Vault.

```bash
# Create an encrypted file for secrets
ansible-vault create group_vars/all/vault.yml

# Edit an encrypted file
ansible-vault edit group_vars/all/vault.yml

# Encrypt an existing file
ansible-vault encrypt secrets.yml

# Decrypt a file
ansible-vault decrypt secrets.yml

# View encrypted file without editing
ansible-vault view group_vars/all/vault.yml

# Run playbook with vault password prompt
ansible-playbook site.yml --ask-vault-pass

# Run playbook with vault password file
ansible-playbook site.yml --vault-password-file ~/.vault_pass

# Encrypt a single string for use in YAML
ansible-vault encrypt_string 'supersecretpassword' --name 'mysql_root_password'
```

## Conclusion

You have now learned how to set up Ansible for Ubuntu server automation. From installing Ansible and configuring SSH key authentication to writing playbooks and creating reusable roles, you have the foundation to automate your entire infrastructure.

Key takeaways:

1. **Agentless Architecture**: Ansible uses SSH, requiring no agents on managed nodes
2. **Inventory Management**: Organize hosts into groups with variables at multiple levels
3. **Idempotent Operations**: Playbooks safely run multiple times without side effects
4. **Roles and Galaxy**: Structure automation into reusable components and leverage community roles
5. **Variables and Facts**: Create dynamic, flexible playbooks that adapt to different environments

Start with simple playbooks and gradually adopt more advanced patterns like roles, vault encryption, and custom modules as your automation needs grow. Consistent infrastructure management with Ansible reduces configuration drift, minimizes human error, and enables rapid deployment across your Ubuntu server fleet.
