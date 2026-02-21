# How to Use Ansible to Manage Homebrew Packages on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Homebrew, macOS, Package Management, DevOps

Description: Learn how to automate Homebrew package management on macOS using Ansible, covering formulae, casks, taps, and complete developer workstation provisioning.

---

Homebrew is the de facto package manager for macOS. If you manage a team of developers or a fleet of Mac workstations, automating Homebrew with Ansible is a huge time saver. Instead of sending everyone a wiki page with "install these tools," you can run a playbook that gets every machine to the same state in minutes.

Ansible provides the `community.general.homebrew` and `community.general.homebrew_cask` modules for managing Homebrew packages. Let me walk through the common patterns.

## Prerequisites

Ansible connects to macOS machines over SSH, just like Linux hosts. The target Mac needs:

- SSH enabled (System Settings > General > Sharing > Remote Login)
- Homebrew installed
- The user running Ansible tasks should be the Homebrew owner (typically the main user, not root)

### Installing Homebrew with Ansible

If Homebrew is not yet installed on the target machine, you can install it.

```yaml
# Install Homebrew on a fresh macOS system
- name: Check if Homebrew is installed
  ansible.builtin.stat:
    path: /opt/homebrew/bin/brew
  register: homebrew_check

- name: Install Homebrew
  ansible.builtin.shell:
    cmd: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  environment:
    NONINTERACTIVE: "1"
  when: not homebrew_check.stat.exists
```

Note: On Apple Silicon Macs, Homebrew installs to `/opt/homebrew`. On Intel Macs, it is `/usr/local`.

## Installing Homebrew Formulae

Formulae are command-line tools and libraries. Use the `community.general.homebrew` module.

```yaml
# Install common CLI tools via Homebrew
- name: Install development tools
  community.general.homebrew:
    name: "{{ item }}"
    state: present
  loop:
    - git
    - jq
    - yq
    - tree
    - wget
    - curl
    - tmux
    - htop
    - ripgrep
    - fd
    - bat
    - fzf
```

### Installing a Specific Version

```yaml
# Install a specific version of a formula
- name: Install Node.js 20
  community.general.homebrew:
    name: node@20
    state: present
```

### Upgrading Packages

```yaml
# Upgrade a specific package to the latest version
- name: Upgrade Git to latest
  community.general.homebrew:
    name: git
    state: latest

# Upgrade all packages
- name: Upgrade all Homebrew packages
  community.general.homebrew:
    update_homebrew: true
    upgrade_all: true
```

## Installing Homebrew Casks

Casks are GUI applications distributed through Homebrew. Use the `community.general.homebrew_cask` module.

```yaml
# Install GUI applications via Homebrew Cask
- name: Install productivity applications
  community.general.homebrew_cask:
    name: "{{ item }}"
    state: present
  loop:
    - visual-studio-code
    - iterm2
    - firefox
    - google-chrome
    - slack
    - docker
    - rectangle
    - 1password
```

### Handling Cask Installation Prompts

Some casks require a password or trigger security dialogs. The `sudo_password` parameter handles this.

```yaml
# Install casks that need administrator access
- name: Install system-level applications
  community.general.homebrew_cask:
    name: "{{ item }}"
    state: present
    sudo_password: "{{ ansible_become_password }}"
  loop:
    - wireshark
    - virtualbox
```

## Managing Homebrew Taps

Taps are third-party repositories for Homebrew. Use the `community.general.homebrew_tap` module to manage them.

```yaml
# Add third-party Homebrew taps
- name: Add required taps
  community.general.homebrew_tap:
    name: "{{ item }}"
    state: present
  loop:
    - hashicorp/tap
    - homebrew/cask-fonts
    - aws/tap

# Install packages from tapped repositories
- name: Install Terraform from HashiCorp tap
  community.general.homebrew:
    name: hashicorp/tap/terraform
    state: present

- name: Install AWS SAM CLI
  community.general.homebrew:
    name: aws/tap/aws-sam-cli
    state: present
```

## A Complete Developer Workstation Playbook

Here is a realistic playbook for setting up a new developer Mac from scratch.

```yaml
---
# playbook: setup-dev-mac.yml
# Provision a developer workstation with all required tools
- hosts: dev_macs
  gather_facts: true

  vars:
    homebrew_formulae:
      # Version control
      - git
      - gh
      - git-lfs
      # Languages and runtimes
      - node@20
      - python@3.12
      - go
      - rust
      # Container tools
      - docker-compose
      - kubectl
      - helm
      - k9s
      # Database clients
      - postgresql@16
      - mysql-client
      - redis
      # Utilities
      - jq
      - yq
      - ripgrep
      - fd
      - bat
      - fzf
      - tmux
      - htop
      - watch
      - tree
      - wget
      - curl
      - gnupg

    homebrew_casks:
      # Development
      - visual-studio-code
      - iterm2
      - docker
      - postman
      - dbeaver-community
      # Browsers
      - firefox
      - google-chrome
      # Communication
      - slack
      - zoom
      # Utilities
      - rectangle
      - alfred
      - the-unarchiver
      - stats

    homebrew_taps:
      - hashicorp/tap
      - aws/tap

  tasks:
    - name: Update Homebrew
      community.general.homebrew:
        update_homebrew: true

    - name: Add required taps
      community.general.homebrew_tap:
        name: "{{ item }}"
        state: present
      loop: "{{ homebrew_taps }}"

    - name: Install Homebrew formulae
      community.general.homebrew:
        name: "{{ item }}"
        state: present
      loop: "{{ homebrew_formulae }}"

    - name: Install Homebrew casks
      community.general.homebrew_cask:
        name: "{{ item }}"
        state: present
      loop: "{{ homebrew_casks }}"

    - name: Install Terraform from HashiCorp tap
      community.general.homebrew:
        name: hashicorp/tap/terraform
        state: present

    - name: Install AWS CLI
      community.general.homebrew:
        name: awscli
        state: present
```

## Removing Packages

Remove packages by setting state to absent.

```yaml
# Remove unwanted packages
- name: Remove unused formulae
  community.general.homebrew:
    name: "{{ item }}"
    state: absent
  loop:
    - wget
    - tree

- name: Remove unused casks
  community.general.homebrew_cask:
    name: "{{ item }}"
    state: absent
  loop:
    - virtualbox
```

## Cleaning Up

Homebrew caches old versions of packages. Clean up periodically to free disk space.

```yaml
# Clean up old Homebrew downloads and cache
- name: Clean up Homebrew cache
  ansible.builtin.command:
    cmd: brew cleanup --prune=7
  register: brew_cleanup
  changed_when: brew_cleanup.stdout | length > 0

- name: Remove Homebrew cache directory
  ansible.builtin.command:
    cmd: brew cleanup -s
  changed_when: true
```

## Handling Homebrew Services

Some Homebrew packages install services (like PostgreSQL, Redis, MySQL). You can manage them with the `command` module.

```yaml
# Start Homebrew services
- name: Start PostgreSQL service
  ansible.builtin.command:
    cmd: brew services start postgresql@16
  register: pg_service
  changed_when: "'Successfully started' in pg_service.stdout"

- name: Start Redis service
  ansible.builtin.command:
    cmd: brew services start redis
  register: redis_service
  changed_when: "'Successfully started' in redis_service.stdout"

# List running Homebrew services
- name: Check Homebrew services status
  ansible.builtin.command:
    cmd: brew services list
  register: brew_services
  changed_when: false

- name: Display running services
  ansible.builtin.debug:
    var: brew_services.stdout_lines
```

## Dealing with Apple Silicon vs Intel

If you manage both Apple Silicon and Intel Macs, the Homebrew paths differ. Here is how to handle it.

```yaml
# Set Homebrew path based on architecture
- name: Set Homebrew prefix
  ansible.builtin.set_fact:
    homebrew_prefix: "{{ '/opt/homebrew' if ansible_architecture == 'arm64' else '/usr/local' }}"

- name: Ensure Homebrew is in PATH
  ansible.builtin.lineinfile:
    path: "{{ ansible_env.HOME }}/.zprofile"
    line: 'eval "$({{ homebrew_prefix }}/bin/brew shellenv)"'
    create: true
    mode: '0644'
```

## Auditing Installed Packages

Generate a report of what is installed on each Mac.

```yaml
# Audit installed Homebrew packages
- name: List installed formulae
  ansible.builtin.command:
    cmd: brew list --formulae
  register: installed_formulae
  changed_when: false

- name: List installed casks
  ansible.builtin.command:
    cmd: brew list --casks
  register: installed_casks
  changed_when: false

- name: Report installed packages
  ansible.builtin.debug:
    msg: |
      Formulae ({{ installed_formulae.stdout_lines | length }}): {{ installed_formulae.stdout_lines | join(', ') }}
      Casks ({{ installed_casks.stdout_lines | length }}): {{ installed_casks.stdout_lines | join(', ') }}
```

## Wrapping Up

Managing Homebrew with Ansible transforms the often chaotic process of setting up developer workstations into something repeatable and consistent. New team members get a fully provisioned machine in the time it takes to run a playbook. The separation between formulae (CLI tools), casks (GUI apps), and taps (custom repos) maps cleanly to Ansible's module structure. For teams that standardize on macOS for development, this is one of the highest-value automation investments you can make.
