# How to Set Up Ansible Pull Mode on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Pull Mode, Git, Automation, Linux

Description: Configure Ansible pull mode on RHEL 9 so servers pull their own configuration from a Git repository instead of being pushed to.

---

Normal Ansible is push-based: a control node connects to managed hosts and runs playbooks. Ansible pull flips this model. Each server pulls its own configuration from a Git repository and applies it locally. This is useful for auto-scaling environments, edge deployments, or situations where you cannot maintain a central control node.

## Push vs Pull Architecture

```mermaid
graph TD
    subgraph Push Mode
        A[Control Node] -->|SSH| B[Server 1]
        A -->|SSH| C[Server 2]
        A -->|SSH| D[Server 3]
    end

    subgraph Pull Mode
        E[Git Repository] <--|git pull| F[Server 1]
        E <--|git pull| G[Server 2]
        E <--|git pull| H[Server 3]
    end
```

## How ansible-pull Works

1. Each server has Ansible installed locally
2. A cron job or systemd timer runs `ansible-pull` periodically
3. `ansible-pull` clones/updates a Git repository
4. It runs a designated playbook from the repository
5. The server configures itself based on its hostname

## Step 1: Set Up the Git Repository

Create a repository with your playbooks:

```bash
# Create the configuration repository
mkdir rhel-config && cd rhel-config
git init

# Create the main playbook that ansible-pull will run
cat > local.yml << 'PLAYBOOK'
---
# local.yml - the default playbook for ansible-pull
- name: Configure this server
  hosts: localhost
  connection: local
  become: true

  tasks:
    - name: Install base packages
      ansible.builtin.dnf:
        name:
          - vim
          - tmux
          - curl
          - bind-utils
          - bash-completion
        state: present

    - name: Ensure chronyd is running
      ansible.builtin.systemd:
        name: chronyd
        enabled: true
        state: started

    - name: Ensure firewalld is running
      ansible.builtin.systemd:
        name: firewalld
        enabled: true
        state: started

    - name: Set timezone
      community.general.timezone:
        name: UTC

    - name: Configure sshd
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: "^PermitRootLogin", line: "PermitRootLogin no" }
        - { regexp: "^PasswordAuthentication", line: "PasswordAuthentication no" }
      notify: Restart sshd

  handlers:
    - name: Restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted
PLAYBOOK

# Commit and push
git add .
git commit -m "Initial configuration"
git remote add origin git@git.example.com:ops/rhel-config.git
git push -u origin main
```

## Step 2: Install Ansible on Target Servers

```bash
# Install Ansible on each server that will use pull mode
sudo dnf install ansible-core git
```

## Step 3: Test ansible-pull Manually

```bash
# Run ansible-pull manually to verify it works
sudo ansible-pull -U https://git.example.com/ops/rhel-config.git -C main
```

The `-U` flag specifies the Git URL and `-C` specifies the branch. By default, it looks for `local.yml` in the repository root.

## Step 4: Set Up a Cron Job

```bash
# Add a cron job to run ansible-pull every 30 minutes
sudo crontab -e
```

Add:

```
# Run ansible-pull every 30 minutes
*/30 * * * * /usr/bin/ansible-pull -U https://git.example.com/ops/rhel-config.git -C main -d /var/lib/ansible/local >> /var/log/ansible-pull.log 2>&1
```

## Step 5: Use systemd Timer (Better Than Cron)

```bash
# Create the service unit
sudo cat > /etc/systemd/system/ansible-pull.service << 'SERVICE'
[Unit]
Description=Ansible Pull Configuration
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
# Pull and apply configuration from Git
ExecStart=/usr/bin/ansible-pull \
    -U https://git.example.com/ops/rhel-config.git \
    -C main \
    -d /var/lib/ansible/local \
    --clean \
    -f
# Log output
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ansible-pull
SERVICE

# Create the timer unit
sudo cat > /etc/systemd/system/ansible-pull.timer << 'TIMER'
[Unit]
Description=Run Ansible Pull every 30 minutes

[Timer]
# Run 2 minutes after boot
OnBootSec=2min
# Then every 30 minutes
OnUnitActiveSec=30min
# Add random delay up to 5 minutes to prevent thundering herd
RandomizedDelaySec=5min

[Install]
WantedBy=timers.target
TIMER

# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable --now ansible-pull.timer
```

## Host-Specific Configuration

Use hostnames to apply different configurations to different servers:

```yaml
# local.yml - with host-specific includes
---
- name: Base configuration for all servers
  hosts: localhost
  connection: local
  become: true
  tasks:
    - name: Include base tasks
      ansible.builtin.include_tasks: tasks/base.yml

    - name: Include web server tasks
      ansible.builtin.include_tasks: tasks/webserver.yml
      when: "'web' in ansible_hostname"

    - name: Include database server tasks
      ansible.builtin.include_tasks: tasks/database.yml
      when: "'db' in ansible_hostname"
```

Or use a dynamic inventory approach:

```yaml
# local.yml
---
- name: Configure based on hostname
  hosts: localhost
  connection: local
  become: true

  vars:
    host_roles:
      web1: [base, webserver, monitoring]
      web2: [base, webserver, monitoring]
      db1: [base, database, monitoring]
      app1: [base, appserver, monitoring]

    my_roles: "{{ host_roles[ansible_hostname] | default(['base']) }}"

  tasks:
    - name: Apply base role
      ansible.builtin.include_role:
        name: base
      when: "'base' in my_roles"

    - name: Apply webserver role
      ansible.builtin.include_role:
        name: webserver
      when: "'webserver' in my_roles"

    - name: Apply database role
      ansible.builtin.include_role:
        name: database
      when: "'database' in my_roles"
```

## Monitoring Pull Status

```bash
# Check the timer status
sudo systemctl status ansible-pull.timer

# View recent runs
sudo journalctl -u ansible-pull.service --since "24 hours ago"

# Check last run result
sudo systemctl status ansible-pull.service
```

## Wrapping Up

Ansible pull mode is ideal for environments where servers need to be self-configuring. Auto-scaling groups, edge deployments, and disconnected environments all benefit from this model. The server pulls its configuration, applies it, and you just need to push changes to Git. The systemd timer approach is better than cron because you get proper logging via journald and can control the exact timing with randomized delays to prevent all servers from hitting Git at the same time.
