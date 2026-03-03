# How to Use Ansible Pull for Self-Managing Ubuntu Servers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Ansible, Automation, Configuration Management, DevOps

Description: Learn how to use ansible-pull on Ubuntu to create self-managing servers that pull and apply configuration from a Git repository on a schedule, without a central Ansible controller.

---

Standard Ansible uses a push model: a control node connects to managed hosts over SSH and applies configurations. Ansible Pull inverts this: each managed server pulls its configuration from a Git repository and applies it locally. This eliminates the need for a dedicated Ansible control machine and works well for environments where servers need to self-configure, or where a centralized push model is impractical.

The pattern is simple: a cron job or systemd timer on each server runs `ansible-pull` on a schedule, clones the playbook repository, and runs the local playbook. Each server manages itself.

## When Ansible Pull Makes Sense

- Autoscaling environments where new instances must configure themselves
- Environments without a dedicated configuration management server
- Air-gapped servers that can reach a Git server but not be reached from outside
- Bootstrapping new servers from cloud-init before a push model is ready

## Installing Ansible on Ubuntu

```bash
# Add Ansible's official PPA (newer than Ubuntu's repository)
sudo add-apt-repository --yes ppa:ansible/ansible

# Install ansible
sudo apt update
sudo apt install -y ansible git

# Verify
ansible --version
ansible-pull --version
```

## Repository Structure

Your playbook repository needs a specific layout for ansible-pull. By default, `ansible-pull` looks for a playbook named after the hostname, falling back to `local.yml`:

```text
ansible-config/
├── local.yml              # Fallback playbook (runs if no hostname match)
├── web-server-01.yml      # Runs only on web-server-01
├── roles/
│   ├── common/
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   ├── handlers/
│   │   │   └── main.yml
│   │   └── files/
│   ├── webserver/
│   │   └── tasks/
│   │       └── main.yml
│   └── database/
│       └── tasks/
│           └── main.yml
├── group_vars/
│   └── all.yml
└── host_vars/
    └── web-server-01.yml
```

## Example Playbook

A `local.yml` that configures a base Ubuntu server:

```yaml
# local.yml - Applied to all servers
---
- name: Base Ubuntu Server Configuration
  hosts: localhost
  connection: local
  become: yes

  vars:
    ntp_servers:
      - "0.ubuntu.pool.ntp.org"
      - "1.ubuntu.pool.ntp.org"
    ssh_allowed_users:
      - deploy
      - sysadmin

  roles:
    - common

  tasks:
    - name: Ensure base packages are installed
      apt:
        name:
          - curl
          - wget
          - vim
          - htop
          - tmux
          - git
          - unzip
          - fail2ban
          - ufw
          - chrony
        state: present
        update_cache: yes

    - name: Configure timezone
      timezone:
        name: UTC

    - name: Ensure SSH is configured securely
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
        backup: yes
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^X11Forwarding', line: 'X11Forwarding no' }
      notify: restart sshd

    - name: Configure UFW
      block:
        - name: Set UFW default policies
          ufw:
            state: enabled
            policy: deny
            direction: incoming

        - name: Allow outgoing
          ufw:
            policy: allow
            direction: outgoing

        - name: Allow SSH
          ufw:
            rule: allow
            port: '22'
            proto: tcp

    - name: Enable fail2ban
      service:
        name: fail2ban
        state: started
        enabled: yes

  handlers:
    - name: restart sshd
      service:
        name: sshd
        state: restarted
```

A role for webservers:

```yaml
# roles/webserver/tasks/main.yml
---
- name: Install nginx
  apt:
    name: nginx
    state: present

- name: Open HTTP and HTTPS in firewall
  ufw:
    rule: allow
    port: "{{ item }}"
    proto: tcp
  loop:
    - '80'
    - '443'

- name: Ensure nginx is running
  service:
    name: nginx
    state: started
    enabled: yes

- name: Deploy nginx configuration
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    validate: 'nginx -t -c %s'
  notify: reload nginx
```

## Basic ansible-pull Usage

```bash
# Manual run - pull from repo and apply
ansible-pull -U https://github.com/yourorg/ansible-config.git

# Specify a branch
ansible-pull -U https://github.com/yourorg/ansible-config.git -C main

# Run a specific playbook
ansible-pull -U https://github.com/yourorg/ansible-config.git -i localhost local.yml

# Full options for a private repo with SSH key
ansible-pull \
    -U git@github.com:yourorg/ansible-config.git \
    -C main \
    --private-key /home/ansible/.ssh/deploy_key \
    -i localhost \
    --accept-host-key \
    local.yml
```

## Setting Up Scheduled ansible-pull

### Using Cron

```bash
# Add to root's crontab
sudo crontab -e
```

```cron
# Run ansible-pull every 30 minutes
*/30 * * * * /usr/bin/ansible-pull -U https://github.com/yourorg/ansible-config.git \
    -C main \
    -i localhost \
    >> /var/log/ansible-pull.log 2>&1
```

### Using a Systemd Timer (Better Option)

A service/timer pair provides better logging and failure handling:

```ini
# /etc/systemd/system/ansible-pull.service
[Unit]
Description=Ansible Pull Configuration
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=root
Environment="HOME=/root"
ExecStart=/usr/bin/ansible-pull \
    -U https://github.com/yourorg/ansible-config.git \
    -C main \
    -i localhost \
    --accept-host-key
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ansible-pull
```

```ini
# /etc/systemd/system/ansible-pull.timer
[Unit]
Description=Run ansible-pull every 30 minutes
Requires=ansible-pull.service

[Timer]
OnCalendar=*:0/30
RandomizedDelaySec=5min
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ansible-pull.timer

# Check timer status
systemctl status ansible-pull.timer
systemctl list-timers ansible-pull.timer
```

## Authentication for Private Repositories

### SSH Deploy Keys

```bash
# Generate a deploy key on the server
sudo ssh-keygen -t ed25519 -C "ansible-pull@$(hostname)" \
    -f /root/.ssh/ansible_deploy_key -N ""

# Display the public key
sudo cat /root/.ssh/ansible_deploy_key.pub
# Add this as a read-only deploy key in GitHub/GitLab

# Configure SSH to use this key for the Git server
sudo tee -a /root/.ssh/config <<'EOF'
Host github.com
    IdentityFile /root/.ssh/ansible_deploy_key
    StrictHostKeyChecking no
EOF
```

### HTTPS with Tokens

```bash
# Store credentials using git credential helper
# Not recommended for production - use SSH keys instead
git config --global credential.helper store
echo "https://token:ghp_yourtoken@github.com" > ~/.git-credentials
```

## Bootstrap Script

For cloud-init or initial server setup, a bootstrap script that installs Ansible and sets up the pull mechanism:

```bash
#!/bin/bash
# bootstrap.sh - Install ansible-pull and configure auto-apply

set -euo pipefail

REPO_URL="https://github.com/yourorg/ansible-config.git"
BRANCH="main"

echo "Installing Ansible..."
apt-get update -qq
apt-get install -y -qq ansible git

echo "Running initial ansible-pull..."
ansible-pull -U "$REPO_URL" -C "$BRANCH" -i localhost --accept-host-key

echo "Setting up systemd timer for ongoing pulls..."
# Create the systemd service and timer units here
# (content from above)

systemctl daemon-reload
systemctl enable --now ansible-pull.timer

echo "Bootstrap complete"
```

## Viewing Logs

```bash
# View recent ansible-pull runs
journalctl -u ansible-pull -n 100

# Follow in real time
journalctl -u ansible-pull -f

# Check last run time
systemctl status ansible-pull.service
```

## Security Considerations

```bash
# The repository should require signed commits or use a trusted branch
# Protect the branch that ansible-pull targets from direct pushes

# Run ansible-pull as a dedicated low-privilege user where possible
# For most tasks, root is needed, so protect the SSH key carefully

# Monitor changes - any push to the repo affects all servers
# Use PR reviews and branch protection in your Git provider
```

Ansible Pull is not a replacement for a full Ansible setup in large environments - the lack of central visibility into which servers ran successfully is a significant operational drawback. Tools like Ansible Tower/AWX solve this for pull models with callback plugins. For smaller deployments or bootstrapping automation, ansible-pull is a practical and reliable approach.
