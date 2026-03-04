# How to Install and Get Started with RHEL System Roles on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, System Roles, Ansible, Automation, Configuration Management

Description: Install and use RHEL System Roles to automate common system administration tasks like networking, storage, timesync, and SELinux configuration using Ansible playbooks.

---

RHEL System Roles are a collection of Ansible roles provided by Red Hat for automating common administration tasks. They provide a consistent, supported way to configure networking, storage, time synchronization, logging, and more across your RHEL fleet.

## Install RHEL System Roles

```bash
# Install the system roles package
sudo dnf install -y rhel-system-roles

# The roles are installed to /usr/share/ansible/roles/
ls /usr/share/ansible/roles/

# You should see roles like:
# rhel-system-roles.firewall
# rhel-system-roles.kdump
# rhel-system-roles.network
# rhel-system-roles.selinux
# rhel-system-roles.storage
# rhel-system-roles.timesync
# rhel-system-roles.logging
```

## Install Ansible

```bash
# Install Ansible (required to run the roles)
sudo dnf install -y ansible-core

# Verify installation
ansible --version
```

## Set Up an Inventory

```bash
# Create a simple inventory file
sudo mkdir -p /etc/ansible
sudo tee /etc/ansible/hosts << 'EOF'
[webservers]
web01.example.com
web02.example.com

[dbservers]
db01.example.com

[all:vars]
ansible_user=admin
ansible_become=true
EOF
```

## Example: Configure Time Synchronization

```bash
# Create a playbook using the timesync role
tee ~/timesync.yml << 'EOF'
---
- name: Configure NTP time synchronization
  hosts: all
  roles:
    - role: rhel-system-roles.timesync
      vars:
        timesync_ntp_servers:
          - hostname: 0.rhel.pool.ntp.org
            iburst: yes
          - hostname: 1.rhel.pool.ntp.org
            iburst: yes
        timesync_ntp_provider: chrony
EOF

# Run the playbook
ansible-playbook ~/timesync.yml
```

## Example: Configure Network Interface

```bash
tee ~/network.yml << 'EOF'
---
- name: Configure network interfaces
  hosts: webservers
  roles:
    - role: rhel-system-roles.network
      vars:
        network_connections:
          - name: eth0
            type: ethernet
            autoconnect: yes
            ip:
              address:
                - 192.168.1.50/24
              gateway4: 192.168.1.1
              dns:
                - 8.8.8.8
                - 8.8.4.4
            state: up
EOF

ansible-playbook ~/network.yml
```

## Example: Configure Storage

```bash
tee ~/storage.yml << 'EOF'
---
- name: Configure storage volumes
  hosts: dbservers
  roles:
    - role: rhel-system-roles.storage
      vars:
        storage_pools:
          - name: dbpool
            disks:
              - sdb
            volumes:
              - name: dbvol
                size: "80%"
                fs_type: xfs
                mount_point: /var/lib/pgsql
                mount_options: "defaults,noatime"
EOF

ansible-playbook ~/storage.yml
```

## Example: Configure SELinux

```bash
tee ~/selinux.yml << 'EOF'
---
- name: Configure SELinux
  hosts: all
  roles:
    - role: rhel-system-roles.selinux
      vars:
        selinux_state: enforcing
        selinux_policy: targeted
        selinux_booleans:
          - name: httpd_can_network_connect
            state: on
            persistent: yes
          - name: httpd_can_network_connect_db
            state: on
            persistent: yes
EOF

ansible-playbook ~/selinux.yml
```

## Example: Configure Firewall

```bash
tee ~/firewall.yml << 'EOF'
---
- name: Configure firewall rules
  hosts: webservers
  roles:
    - role: rhel-system-roles.firewall
      vars:
        firewall:
          - service:
              - http
              - https
              - ssh
            state: enabled
          - port:
              - 8080/tcp
            state: enabled
EOF

ansible-playbook ~/firewall.yml
```

## View Role Documentation

```bash
# Each role includes documentation
cat /usr/share/doc/rhel-system-roles/timesync/README.md

# List example playbooks
ls /usr/share/doc/rhel-system-roles/timesync/
```

RHEL System Roles provide Red Hat-tested and supported Ansible automation for the most common configuration tasks. They save time and reduce the risk of manual configuration errors across your RHEL infrastructure.
