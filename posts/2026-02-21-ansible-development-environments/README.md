# How to Use Ansible to Set Up Development Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Development, DevOps, Automation, Productivity

Description: Automate consistent development environment setup across your team with Ansible, including tools, SDKs, editor configs, and project dependencies.

---

Every developer who has joined a new team knows the pain: spend the first day or two following an outdated wiki page to install dozens of tools, configure environment variables, set up database connections, and get the project actually running locally. Then you discover the wiki missed three steps that someone figured out six months ago but never documented. Ansible eliminates this by codifying your development environment setup into a playbook that every team member can run.

## Role Defaults

```yaml
# roles/devenv/defaults/main.yml - Development environment configuration
devenv_user: "{{ ansible_user }}"
devenv_home: "/home/{{ devenv_user }}"

# Programming languages and versions
devenv_python_version: "3.11"
devenv_node_version: "20"
devenv_go_version: "1.21.5"
devenv_java_version: "17"

# Tools to install
devenv_tools:
  - git
  - curl
  - wget
  - jq
  - httpie
  - tmux
  - tree
  - htop
  - make
  - build-essential

# Docker
devenv_docker_enabled: true

# Databases for local development
devenv_databases:
  postgres: true
  redis: true
  mongodb: false

# Editor configuration
devenv_vscode_extensions:
  - ms-python.python
  - dbaeumer.vscode-eslint
  - esbenp.prettier-vscode
  - golang.go
  - hashicorp.terraform
  - redhat.ansible

# Git configuration
devenv_git_config:
  core.autocrlf: input
  pull.rebase: true
  init.defaultBranch: main
```

## Main Tasks

```yaml
# roles/devenv/tasks/main.yml - Set up development environment
---
- name: Update package cache
  apt:
    update_cache: yes
  become: yes

- name: Install essential development tools
  apt:
    name: "{{ devenv_tools }}"
    state: present
  become: yes

- name: Configure Git global settings
  git_config:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    scope: global
  loop: "{{ devenv_git_config | dict2items }}"

- name: Install Python {{ devenv_python_version }}
  include_tasks: python.yml

- name: Install Node.js {{ devenv_node_version }}
  include_tasks: nodejs.yml

- name: Install Go {{ devenv_go_version }}
  include_tasks: golang.yml

- name: Set up Docker
  include_tasks: docker.yml
  when: devenv_docker_enabled

- name: Set up databases
  include_tasks: databases.yml

- name: Install VS Code extensions
  include_tasks: vscode.yml
```

## Python Setup

```yaml
# roles/devenv/tasks/python.yml - Python development setup
---
- name: Install Python and pip
  apt:
    name:
      - "python{{ devenv_python_version }}"
      - "python{{ devenv_python_version }}-venv"
      - "python{{ devenv_python_version }}-dev"
      - python3-pip
      - pipx
    state: present
  become: yes

- name: Install common Python tools via pipx
  command: "pipx install {{ item }}"
  loop:
    - poetry
    - black
    - flake8
    - mypy
    - pre-commit
  register: pipx_result
  changed_when: "'installed package' in pipx_result.stdout"
  failed_when: false
```

## Node.js Setup

```yaml
# roles/devenv/tasks/nodejs.yml - Node.js development setup
---
- name: Install NVM (Node Version Manager)
  shell: |
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  args:
    creates: "{{ devenv_home }}/.nvm/nvm.sh"

- name: Install Node.js via NVM
  shell: |
    export NVM_DIR="{{ devenv_home }}/.nvm"
    . "$NVM_DIR/nvm.sh"
    nvm install {{ devenv_node_version }}
    nvm alias default {{ devenv_node_version }}
  args:
    executable: /bin/bash
    creates: "{{ devenv_home }}/.nvm/versions/node"

- name: Install global npm packages
  shell: |
    export NVM_DIR="{{ devenv_home }}/.nvm"
    . "$NVM_DIR/nvm.sh"
    npm install -g {{ item }}
  args:
    executable: /bin/bash
  loop:
    - yarn
    - typescript
    - ts-node
    - nodemon
  changed_when: false
```

## Go Setup

```yaml
# roles/devenv/tasks/golang.yml - Go development setup
---
- name: Download Go
  get_url:
    url: "https://go.dev/dl/go{{ devenv_go_version }}.linux-amd64.tar.gz"
    dest: /tmp/go.tar.gz
  become: yes

- name: Extract Go to /usr/local
  unarchive:
    src: /tmp/go.tar.gz
    dest: /usr/local/
    remote_src: yes
    creates: /usr/local/go/bin/go
  become: yes

- name: Add Go to PATH in .bashrc
  lineinfile:
    path: "{{ devenv_home }}/.bashrc"
    line: 'export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin'
    regexp: 'export PATH.*go/bin'

- name: Install common Go tools
  shell: |
    export PATH=$PATH:/usr/local/go/bin
    go install {{ item }}
  loop:
    - golang.org/x/tools/gopls@latest
    - github.com/golangci/golangci-lint/cmd/golangci-lint@latest
  changed_when: false
```

## Database Setup

```yaml
# roles/devenv/tasks/databases.yml - Local database containers
---
- name: Start PostgreSQL container for development
  community.docker.docker_container:
    name: dev-postgres
    image: postgres:16-alpine
    state: started
    restart_policy: unless-stopped
    ports:
      - "5432:5432"
    env:
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: devdb
    volumes:
      - pgdata:/var/lib/postgresql/data
  when: devenv_databases.postgres

- name: Start Redis container for development
  community.docker.docker_container:
    name: dev-redis
    image: redis:7-alpine
    state: started
    restart_policy: unless-stopped
    ports:
      - "6379:6379"
  when: devenv_databases.redis
```

## Shell Configuration

```yaml
# roles/devenv/tasks/shell.yml - Configure shell environment
---
- name: Create useful shell aliases
  blockinfile:
    path: "{{ devenv_home }}/.bashrc"
    block: |
      # Development aliases
      alias dc='docker compose'
      alias k='kubectl'
      alias g='git'
      alias gs='git status'
      alias gl='git log --oneline -20'
      alias gd='git diff'
      alias ll='ls -alF'
      alias ports='ss -tlnp'
    marker: "# {mark} ANSIBLE MANAGED DEV ALIASES"
```

## Running the Playbook

```bash
# Set up development environment (run as the developer user)
ansible-playbook -i "localhost," -c local playbook.yml

# For setting up remote dev servers
ansible-playbook -i inventory/hosts.ini playbook.yml
```

## Summary

With this playbook, onboarding a new developer goes from a multi-day struggle to a single command. Every team member gets identical tooling, language versions, and database setups. When the team upgrades to a new Node.js version or adds a new tool to the workflow, you update the variables and everyone reruns the playbook. Store it alongside your project code so it evolves with your stack.
