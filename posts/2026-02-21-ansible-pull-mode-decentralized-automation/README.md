# How to Use Ansible Pull Mode for Decentralized Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Pull Mode, Decentralized, Configuration Management

Description: Learn how to use ansible-pull for decentralized automation where nodes pull their own configuration from a Git repository instead of being pushed to.

---

Standard Ansible works in push mode: a control node connects to remote hosts and pushes configuration to them. This works well for most scenarios, but it has limitations. The control node needs SSH access to every host. It needs to be running when configuration changes happen. And scaling to thousands of hosts puts pressure on a single point.

Ansible pull mode flips this model. Each node pulls its own configuration from a Git repository and applies it locally. There is no central control node needed at runtime. Each host is responsible for keeping itself configured correctly.

## How ansible-pull Works

The `ansible-pull` command is included with Ansible. When you run it on a host, it:

1. Clones (or updates) a Git repository to the local machine
2. Looks for a playbook in the cloned repository
3. Runs that playbook against localhost

```mermaid
flowchart LR
    subgraph Push["Push Mode (standard)"]
        A[Control Node] -->|SSH| B[Host 1]
        A -->|SSH| C[Host 2]
        A -->|SSH| D[Host 3]
    end

    subgraph Pull["Pull Mode"]
        E[Git Repository] <--|git clone| F[Host 1]
        E <--|git clone| G[Host 2]
        E <--|git clone| H[Host 3]
    end
```

## Basic Usage

Run `ansible-pull` on any host that has Ansible installed.

```bash
# Basic ansible-pull command
ansible-pull -U https://github.com/yourorg/ansible-configs.git
```

By default, it looks for a playbook named `local.yml` in the root of the repository. You can specify a different playbook with the `-d` and playbook path arguments.

```bash
# Specify the playbook to run
ansible-pull -U https://github.com/yourorg/ansible-configs.git site.yml

# Specify a branch
ansible-pull -U https://github.com/yourorg/ansible-configs.git -C production

# Specify the checkout directory
ansible-pull -U https://github.com/yourorg/ansible-configs.git -d /opt/ansible-local
```

## Setting Up the Repository

Your Git repository needs a playbook that targets `localhost`. Here is a typical structure.

```
ansible-configs/
  local.yml              # Main playbook (default entry point)
  requirements.yml       # Ansible Galaxy requirements
  roles/
    common/
      tasks/main.yml
    webserver/
      tasks/main.yml
      templates/
      files/
    monitoring/
      tasks/main.yml
  group_vars/
    all.yml
  host_vars/
    web01.example.com.yml
    web02.example.com.yml
```

```yaml
# local.yml - the main playbook for ansible-pull
---
- name: Configure this host
  hosts: localhost
  connection: local
  become: yes

  roles:
    - common
    - "{{ host_role | default('common') }}"
```

The key differences from a regular playbook:
- `hosts: localhost` because the playbook runs locally
- `connection: local` because there is no SSH needed
- No inventory file is needed (localhost is implicit)

## A Complete Example

Let us build a working ansible-pull setup for a web server.

```yaml
# local.yml - configures the local host based on its role
---
- name: Apply base configuration
  hosts: localhost
  connection: local
  become: yes

  vars:
    node_role: "{{ lookup('file', '/etc/ansible-role', errors='ignore') | default('base') }}"

  pre_tasks:
    - name: Display the detected node role
      debug:
        msg: "Configuring this host as: {{ node_role }}"

  tasks:
    - name: Include base tasks
      include_tasks: tasks/base.yml

    - name: Include role-specific tasks
      include_tasks: "tasks/{{ node_role }}.yml"
      when: node_role != 'base'
```

```yaml
# tasks/base.yml - applies to all hosts
---
- name: Set timezone to UTC
  timezone:
    name: UTC

- name: Install common packages
  apt:
    name:
      - vim
      - curl
      - htop
      - git
      - unattended-upgrades
    state: present
    update_cache: yes
    cache_valid_time: 3600

- name: Configure automatic security updates
  copy:
    content: |
      APT::Periodic::Update-Package-Lists "1";
      APT::Periodic::Unattended-Upgrade "1";
      APT::Periodic::AutocleanInterval "7";
    dest: /etc/apt/apt.conf.d/20auto-upgrades

- name: Ensure SSH is hardened
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: "{{ item.regexp }}"
    line: "{{ item.line }}"
  loop:
    - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
    - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
    - { regexp: '^X11Forwarding', line: 'X11Forwarding no' }
  notify: Restart sshd

  handlers:
    - name: Restart sshd
      service:
        name: sshd
        state: restarted
```

```yaml
# tasks/webserver.yml - web server specific configuration
---
- name: Install nginx
  apt:
    name: nginx
    state: present

- name: Deploy nginx configuration
  copy:
    src: files/nginx/default.conf
    dest: /etc/nginx/sites-available/default
  notify: Reload nginx

- name: Install certbot for SSL
  apt:
    name:
      - certbot
      - python3-certbot-nginx
    state: present

- name: Ensure nginx is running
  service:
    name: nginx
    state: started
    enabled: yes

  handlers:
    - name: Reload nginx
      service:
        name: nginx
        state: reloaded
```

## Scheduling with Cron

The real power of ansible-pull comes from scheduling it to run periodically. Each host automatically checks for configuration changes and applies them.

```bash
# Set up a cron job to run ansible-pull every 30 minutes
ansible-pull -U https://github.com/yourorg/ansible-configs.git \
  -C production \
  -d /opt/ansible-local \
  --only-if-changed \
  -i localhost, \
  2>&1 | tee /var/log/ansible-pull.log
```

The `--only-if-changed` flag is important. It means Ansible will only run the playbook if the Git repository has new commits. If nothing changed, it exits immediately. This keeps the system quiet when there is nothing to do.

You can set up the cron job itself using a bootstrap playbook.

```yaml
# bootstrap.yml - sets up ansible-pull on a new host
---
- name: Bootstrap ansible-pull
  hosts: all
  become: yes

  vars:
    ansible_pull_repo: "https://github.com/yourorg/ansible-configs.git"
    ansible_pull_branch: production
    ansible_pull_dir: /opt/ansible-local
    ansible_pull_interval: 30

  tasks:
    - name: Install Ansible
      apt:
        name: ansible
        state: present

    - name: Install Git
      apt:
        name: git
        state: present

    - name: Set the node role
      copy:
        content: "{{ node_role | default('base') }}"
        dest: /etc/ansible-role

    - name: Create ansible-pull cron job
      cron:
        name: "ansible-pull"
        minute: "*/{{ ansible_pull_interval }}"
        job: >
          /usr/bin/ansible-pull
          -U {{ ansible_pull_repo }}
          -C {{ ansible_pull_branch }}
          -d {{ ansible_pull_dir }}
          --only-if-changed
          -i localhost,
          >> /var/log/ansible-pull.log 2>&1
        user: root

    - name: Set up log rotation for ansible-pull
      copy:
        content: |
          /var/log/ansible-pull.log {
              weekly
              rotate 4
              compress
              missingok
              notifempty
          }
        dest: /etc/logrotate.d/ansible-pull
```

## Host-Specific Configuration

Even in pull mode, you can have host-specific configuration using `host_vars` based on the hostname.

```yaml
# host_vars/web01.example.com.yml
---
nginx_worker_processes: 4
app_instances: 2
ssl_certificate: /etc/ssl/certs/web01.pem

# host_vars/web02.example.com.yml
---
nginx_worker_processes: 8
app_instances: 4
ssl_certificate: /etc/ssl/certs/web02.pem
```

The `local.yml` playbook accesses these variables through the hostname.

```yaml
# local.yml
---
- name: Configure this host
  hosts: localhost
  connection: local
  become: yes

  vars_files:
    - "host_vars/{{ ansible_fqdn }}.yml"

  tasks:
    - name: Configure nginx workers
      lineinfile:
        path: /etc/nginx/nginx.conf
        regexp: '^worker_processes'
        line: "worker_processes {{ nginx_worker_processes }};"
```

## Using Private Repositories

For private Git repositories, configure SSH key access.

```bash
# ansible-pull with SSH authentication
ansible-pull -U git@github.com:yourorg/private-ansible-configs.git \
  --private-key /root/.ssh/ansible-pull-key \
  -C production
```

Or use a deploy token for HTTPS access.

```bash
# ansible-pull with HTTPS deploy token
ansible-pull -U https://deploy-token:glpat-xxxx@gitlab.example.com/ops/ansible-configs.git
```

## Advantages of Pull Mode

**No central control node required**: Each host manages itself. The control node can be down without affecting configuration management.

**Scales well**: Adding 100 new hosts does not add load to a control node. Each host pulls independently.

**Works behind firewalls**: Hosts only need outbound access to the Git repository. No inbound SSH is required.

**Self-healing**: If a host's configuration drifts, the next cron run corrects it automatically.

## Disadvantages of Pull Mode

**Ansible must be installed on every host**: This increases the footprint on each managed node.

**No real-time orchestration**: You cannot coordinate actions across hosts (like draining a load balancer before deploying). Each host acts independently.

**Debugging is harder**: When something fails, you need to check logs on the individual host rather than seeing results on a central control node.

**Git repository becomes a single point of failure**: If the Git server is down, hosts cannot pull updates (though existing configuration remains).

## When to Use Pull Mode

Pull mode works best for:
- Auto-scaling environments where hosts come and go frequently
- Edge computing or IoT deployments where central access is limited
- Bootstrapping new servers in cloud environments
- Configuration drift remediation on a schedule
- Environments where SSH inbound access is restricted

Stick with push mode when you need coordinated multi-host orchestration, real-time deployment control, or when you want to see all results from a single terminal.

Most organizations use a hybrid approach: push mode for orchestrated deployments and pull mode for baseline configuration management and drift correction.
