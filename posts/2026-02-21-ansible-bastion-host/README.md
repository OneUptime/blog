# How to Use Ansible to Set Up a Bastion Host

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Bastion, Security, SSH, Infrastructure

Description: Automate the deployment of a hardened bastion host with SSH jump configuration, fail2ban, and audit logging using Ansible playbooks.

---

A bastion host (also called a jump box) is the single entry point into your private network. Instead of exposing every server to the internet, you expose only the bastion and require all SSH connections to pass through it. This dramatically reduces your attack surface and creates a single point where you can enforce authentication policies, log all access, and apply security controls. Setting up a proper bastion host involves hardening SSH, configuring fail2ban, enabling session logging, and restricting which users can connect.

Ansible is ideal for this because a bastion host configuration needs to be rock-solid and reproducible. If the bastion goes down or gets compromised, you need to spin up an identical replacement quickly.

## Role Defaults

```yaml
# roles/bastion/defaults/main.yml - Bastion host configuration

bastion_ssh_port: 22
bastion_allowed_ssh_cidrs:
  - 0.0.0.0/0

# Users allowed to SSH through the bastion
bastion_users:
  - name: devops-john
    ssh_key: "ssh-rsa AAAAB3... john@laptop"
  - name: devops-jane
    ssh_key: "ssh-rsa AAAAB3... jane@laptop"

# SSH hardening settings
bastion_ssh_password_auth: false
bastion_ssh_root_login: false
bastion_ssh_max_auth_tries: 3
bastion_ssh_client_alive_interval: 300
bastion_ssh_client_alive_count_max: 2

# Fail2ban settings
bastion_fail2ban_maxretry: 5
bastion_fail2ban_bantime: 3600
bastion_fail2ban_findtime: 600

# Session recording
bastion_session_recording: true
bastion_session_log_dir: /var/log/bastion-sessions
```

## Main Tasks

```yaml
# roles/bastion/tasks/main.yml - Harden and configure the bastion host
---
- name: Update all packages to latest versions
  apt:
    upgrade: dist
    update_cache: yes

- name: Install security and monitoring packages
  apt:
    name:
      - fail2ban
      - ufw
      - auditd
      - audispd-plugins
      - unattended-upgrades
      - logwatch
      - tmux
      - mosh
    state: present

- name: Create bastion user accounts
  user:
    name: "{{ item.name }}"
    shell: /bin/bash
    create_home: yes
    groups: []
    state: present
  loop: "{{ bastion_users }}"

- name: Deploy SSH authorized keys for each user
  authorized_key:
    user: "{{ item.name }}"
    key: "{{ item.ssh_key }}"
    exclusive: yes
    state: present
  loop: "{{ bastion_users }}"

- name: Harden SSH server configuration
  template:
    src: sshd_config.j2
    dest: /etc/ssh/sshd_config
    owner: root
    group: root
    mode: '0600'
    validate: "sshd -t -f %s"
  notify: restart sshd

- name: Configure fail2ban for SSH protection
  template:
    src: jail.local.j2
    dest: /etc/fail2ban/jail.local
    mode: '0644'
  notify: restart fail2ban

- name: Configure UFW firewall rules
  include_tasks: firewall.yml

- name: Configure audit logging
  include_tasks: audit.yml

- name: Configure session recording
  include_tasks: session_recording.yml
  when: bastion_session_recording

- name: Enable automatic security updates
  template:
    src: 20auto-upgrades.j2
    dest: /etc/apt/apt.conf.d/20auto-upgrades
    mode: '0644'

- name: Ensure all security services are running
  systemd:
    name: "{{ item }}"
    state: started
    enabled: yes
  loop:
    - fail2ban
    - auditd
    - ufw
```

## SSH Configuration Template

```text
# roles/bastion/templates/sshd_config.j2 - Hardened SSH configuration
Port {{ bastion_ssh_port }}
HostKey /etc/ssh/ssh_host_ed25519_key
HostKey /etc/ssh/ssh_host_rsa_key

# Authentication settings
PermitRootLogin {{ 'yes' if bastion_ssh_root_login else 'no' }}
PasswordAuthentication {{ 'yes' if bastion_ssh_password_auth else 'no' }}
PubkeyAuthentication yes
MaxAuthTries {{ bastion_ssh_max_auth_tries }}
AuthenticationMethods publickey

# Session settings
ClientAliveInterval {{ bastion_ssh_client_alive_interval }}
ClientAliveCountMax {{ bastion_ssh_client_alive_count_max }}
MaxSessions 5
MaxStartups 10:30:60

# Disable unnecessary features
X11Forwarding no
PrintMotd yes
PermitTunnel no
GatewayPorts no

# Allow TCP forwarding for SSH jump functionality
AllowTcpForwarding yes
PermitOpen any

# Restrict to bastion users only
AllowUsers {{ bastion_users | map(attribute='name') | join(' ') }}

# Logging
LogLevel VERBOSE
SyslogFacility AUTH

# Banner
Banner /etc/ssh/banner.txt
```

## Firewall Tasks

```yaml
# roles/bastion/tasks/firewall.yml - UFW firewall configuration
---
- name: Set UFW default deny incoming
  ufw:
    direction: incoming
    default: deny

- name: Set UFW default allow outgoing
  ufw:
    direction: outgoing
    default: allow

- name: Allow SSH from approved CIDRs
  ufw:
    rule: allow
    port: "{{ bastion_ssh_port }}"
    proto: tcp
    src: "{{ item }}"
  loop: "{{ bastion_allowed_ssh_cidrs }}"

- name: Allow Mosh UDP range
  ufw:
    rule: allow
    port: "60000:61000"
    proto: udp

- name: Enable UFW
  ufw:
    state: enabled
```

## Session Recording Tasks

```yaml
# roles/bastion/tasks/session_recording.yml - Record all SSH sessions
---
- name: Create session log directory
  file:
    path: "{{ bastion_session_log_dir }}"
    state: directory
    owner: root
    group: root
    mode: '1733'

- name: Deploy session recording script
  copy:
    content: |
      #!/bin/bash
      # Record SSH session with timestamp
      export BASTION_RECORDING_ACTIVE=1
      SESSION_LOG="$(mktemp "{{ bastion_session_log_dir }}/${USER}_$(date +%Y%m%d_%H%M%S)_$$.XXXXXX.log")"
      chmod 0600 "$SESSION_LOG"
      echo "Session started: $(date)" >> "$SESSION_LOG"
      echo "User: $USER" >> "$SESSION_LOG"
      echo "Source: $SSH_CLIENT" >> "$SESSION_LOG"
      echo "---" >> "$SESSION_LOG"
      script -q -a "$SESSION_LOG"
    dest: /usr/local/bin/session-record.sh
    mode: '0755'

- name: Set session recording as default shell wrapper
  copy:
    dest: /etc/profile.d/session-record.sh
    content: |
      if [ -n "$SSH_CLIENT" ] && [ "$TERM" != "dumb" ] && [ -z "$BASTION_RECORDING_ACTIVE" ]; then
        exec /usr/local/bin/session-record.sh
      fi
    mode: '0644'
```

## Fail2ban Configuration Template

```text
# roles/bastion/templates/jail.local.j2 - Fail2ban SSH jail
[DEFAULT]
bantime = {{ bastion_fail2ban_bantime }}
findtime = {{ bastion_fail2ban_findtime }}
maxretry = {{ bastion_fail2ban_maxretry }}

[sshd]
enabled = true
port = {{ bastion_ssh_port }}
filter = sshd
logpath = /var/log/auth.log
maxretry = {{ bastion_fail2ban_maxretry }}
banaction = ufw
```

## SSH Banner

```yaml
# Task to deploy an SSH login banner
- name: Deploy SSH warning banner
  copy:
    content: |
      ================================================================
      WARNING: This is a restricted access bastion host.
      All sessions are monitored and recorded.
      Unauthorized access is prohibited and will be prosecuted.
      ================================================================
    dest: /etc/ssh/banner.txt
    mode: '0644'
```

## Client SSH Configuration

Users connect through the bastion using SSH ProxyJump:

```text
# Example ~/.ssh/config for users connecting through the bastion
Host bastion
    HostName bastion.example.com
    User devops-john
    IdentityFile ~/.ssh/id_rsa
    Port 22

Host 10.0.*
    ProxyJump bastion
    User ubuntu
    IdentityFile ~/.ssh/id_rsa
```

## Handlers

```yaml
# roles/bastion/handlers/main.yml
---
- name: restart sshd
  systemd:
    name: ssh
    state: restarted

- name: restart fail2ban
  systemd:
    name: fail2ban
    state: restarted
```

## Running the Playbook

```bash
# Deploy the bastion host
ansible-playbook -i inventory/hosts.ini playbook.yml
```

## Summary

A properly configured bastion host is one of the most important security components in your infrastructure. This Ansible playbook automates SSH hardening, fail2ban setup, firewall configuration, session recording, and audit logging. If you ever need to rebuild the bastion, which you should plan for, the entire configuration is captured in code and can be redeployed in minutes. Keep the playbook in version control and review changes carefully, since any misconfiguration on the bastion could either lock you out of your infrastructure or create a security gap.
