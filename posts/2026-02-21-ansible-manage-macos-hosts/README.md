# How to Use Ansible to Manage macOS Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, macOS, Apple, Homebrew, Configuration Management

Description: Manage macOS workstations and build servers with Ansible using Homebrew, defaults commands, and macOS-specific system configuration.

---

macOS is commonly managed with Ansible for developer workstation setup, CI/CD build servers, and fleet management. While macOS shares Unix roots with Linux, it has its own package manager (Homebrew), system preferences (defaults), and service management (launchd). This guide covers Ansible automation for macOS.

## Prerequisites

macOS needs the Xcode command line tools and Homebrew installed:

```yaml
---
- name: Bootstrap macOS
  hosts: macos
  gather_facts: true
  vars:
    homebrew_prefix: "{{ '/opt/homebrew' if ansible_architecture == 'arm64' else '/usr/local' }}"
  tasks:
    - name: Check Xcode command line tools
      ansible.builtin.command: xcode-select -p
      register: xcode_select
      failed_when: false
      changed_when: false

    - name: Install Xcode command line tools
      ansible.builtin.command: xcode-select --install
      when: xcode_select.rc != 0

    - name: Install Homebrew
      ansible.builtin.shell: |
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      environment:
        NONINTERACTIVE: "1"
      args:
        creates: "{{ homebrew_prefix }}/bin/brew"
```

## Inventory

```ini
[macos]
mac-build01 ansible_host=10.0.13.10

[macos:vars]
ansible_user=admin
ansible_python_interpreter=/usr/bin/python3
ansible_become_method=sudo
```

## Configuration Playbook

```yaml
---
- name: Configure macOS workstation
  hosts: macos

  vars:
    homebrew_prefix: "{{ '/opt/homebrew' if ansible_architecture == 'arm64' else '/usr/local' }}"

    homebrew_packages:
      - git
      - vim
      - htop
      - tmux
      - jq
      - curl
      - wget
      - tree
      - watch
      - gnu-sed
      - coreutils
      - python@3.12
      - node
      - go

    homebrew_casks:
      - visual-studio-code
      - iterm2
      - docker
      - firefox

  tasks:
    - name: Verify macOS
      ansible.builtin.assert:
        that:
          - ansible_system == "Darwin"

    - name: Update Homebrew
      community.general.homebrew:
        update_homebrew: true

    - name: Install Homebrew packages
      community.general.homebrew:
        name: "{{ homebrew_packages }}"
        state: present

    - name: Install Homebrew casks
      community.general.homebrew_cask:
        name: "{{ homebrew_casks }}"
        state: present

    - name: Set macOS hostname
      become: true
      ansible.builtin.command: "{{ item }}"
      loop:
        - "scutil --set HostName {{ inventory_hostname }}"
        - "scutil --set LocalHostName {{ inventory_hostname }}"
        - "scutil --set ComputerName {{ inventory_hostname }}"
      changed_when: true
```

## macOS System Preferences

Use the `defaults` command to configure system preferences:

```yaml
    - name: Configure Finder preferences
      community.general.osx_defaults:
        domain: com.apple.finder
        key: "{{ item.key }}"
        type: "{{ item.type }}"
        value: "{{ item.value }}"
      loop:
        - { key: AppleShowAllFiles, type: bool, value: true }
        - { key: ShowPathbar, type: bool, value: true }
        - { key: ShowStatusBar, type: bool, value: true }
        - { key: _FXShowPosixPathInTitle, type: bool, value: true }

    - name: Configure Dock preferences
      community.general.osx_defaults:
        domain: com.apple.dock
        key: "{{ item.key }}"
        type: "{{ item.type }}"
        value: "{{ item.value }}"
      loop:
        - { key: autohide, type: bool, value: true }
        - { key: minimize-to-application, type: bool, value: true }
        - { key: tilesize, type: int, value: 48 }
      notify: restart dock

    - name: Disable auto-correct
      community.general.osx_defaults:
        domain: NSGlobalDomain
        key: NSAutomaticSpellingCorrectionEnabled
        type: bool
        value: false

    - name: Enable firewall
      become: true
      ansible.builtin.command: /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
      changed_when: true

    - name: Enable stealth mode
      become: true
      ansible.builtin.command: /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on
      changed_when: true
```

## SSH Configuration

```yaml
    - name: Enable SSH (Remote Login)
      become: true
      ansible.builtin.command: systemsetup -setremotelogin on
      changed_when: true

    - name: Harden SSH
      become: true
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
      notify: restart sshd
```

## Developer Environment Setup

```yaml
    - name: Install Python development tools
      community.general.homebrew:
        name:
          - pyenv
          - pipx
        state: present

    - name: Configure shell profile
      ansible.builtin.blockinfile:
        path: "{{ ansible_env.HOME }}/.zshrc"
        marker: "# {mark} ANSIBLE MANAGED BLOCK"
        block: |
          # Homebrew
          eval "$({{ homebrew_prefix }}/bin/brew shellenv)"

          # pyenv
          export PYENV_ROOT="$HOME/.pyenv"
          [[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
          eval "$(pyenv init -)"

          # Go
          export GOPATH=$HOME/go
          export PATH=$GOPATH/bin:$PATH
        create: true
        mode: '0644'

    - name: Create common directories
      ansible.builtin.file:
        path: "{{ item }}"
        state: directory
        mode: '0755'
      loop:
        - "{{ ansible_env.HOME }}/Projects"
        - "{{ ansible_env.HOME }}/go"
        - "{{ ansible_env.HOME }}/.ssh"
```

## Handlers

```yaml
  handlers:
    - name: restart dock
      ansible.builtin.command: killall Dock

    - name: restart sshd
      become: true
      community.general.launchd:
        name: com.openssh.sshd
        plist: ssh.plist
        state: restarted
```

## Summary

macOS management with Ansible uses Homebrew (`community.general.homebrew`) for packages and casks, `osx_defaults` for system preferences, and standard Unix commands for system configuration. Key differences from Linux: no systemd (uses launchd), different paths for Python and tools, and system preferences managed through the `defaults` system. This playbook is great for standardizing developer workstations and CI/CD build servers.

## Common Use Cases

Here are several practical scenarios where this guide proves useful in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow for macOS provisioning

- name: Infrastructure provisioning
  hosts: macos
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      community.general.homebrew:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      become: true
      ansible.builtin.command: "systemsetup -settimezone {{ system_timezone | default('UTC') | quote }}"
      changed_when: true

    - name: Configure hostname
      become: true
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"
        use: macos

    - name: Update /etc/hosts
      become: true
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: "^127\\.0\\.0\\.1\\s+{{ inventory_hostname }}$"
        line: "127.0.0.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      become: true
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Enable firewall
      become: true
      ansible.builtin.command: /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
      changed_when: true

  handlers:
    - name: restart sshd
      become: true
      community.general.launchd:
        name: com.openssh.sshd
        plist: ssh.plist
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: macos
  become: true
  tasks:
    - name: Create monitoring configuration directory
      ansible.builtin.file:
        path: /etc/monitoring
        state: directory
        mode: '0755'

    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling in macOS playbooks
- name: Robust task execution
  hosts: macos
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /usr/bin/profiles status -type enrollment
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /usr/bin/sw_vers
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: macos
  become: true
  tasks:
    - name: Create scripts directory
      ansible.builtin.file:
        path: /opt/scripts
        state: directory
        mode: '0755'

    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: "{{ ansible_user }}"
```
