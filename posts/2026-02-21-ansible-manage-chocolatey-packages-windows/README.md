# How to Use Ansible to Manage Chocolatey Packages on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Chocolatey, Windows, Package Management, DevOps

Description: A practical guide to managing Chocolatey packages on Windows servers and workstations using Ansible, including installation, configuration, and enterprise repository setup.

---

Chocolatey is the most popular package manager for Windows, and it fills the same role that APT and YUM/DNF fill on Linux. It lets you install, update, and remove software from the command line, which is exactly what you need for automation. When you pair Chocolatey with Ansible, you get a powerful combination for managing Windows infrastructure at scale.

Ansible includes the `chocolatey.chocolatey.win_chocolatey` module (and related modules) that integrate directly with Chocolatey. Let me walk through how to use them effectively.

## Prerequisites

Before managing Chocolatey packages, you need two things: Ansible configured to manage Windows hosts (via WinRM), and Chocolatey installed on those hosts.

### Installing Chocolatey with Ansible

The `win_chocolatey` module will automatically install Chocolatey if it is not already present. However, you can also install it explicitly.

```yaml
# Install Chocolatey on Windows hosts
- name: Install Chocolatey
  ansible.windows.win_shell: |
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
  args:
    creates: C:\ProgramData\chocolatey\choco.exe
```

Or let the module handle it automatically by just using `win_chocolatey` directly. It will bootstrap Chocolatey on first use.

## Installing Packages

The basic usage is straightforward.

```yaml
# Install a single package via Chocolatey
- name: Install Google Chrome
  chocolatey.chocolatey.win_chocolatey:
    name: googlechrome
    state: present

# Install a specific version
- name: Install Python 3.12
  chocolatey.chocolatey.win_chocolatey:
    name: python312
    version: "3.12.1"
    state: present
```

### Installing Multiple Packages

Install several packages at once using a list or loop.

```yaml
# Install multiple packages in a single task
- name: Install development tools
  chocolatey.chocolatey.win_chocolatey:
    name:
      - git
      - vscode
      - nodejs-lts
      - python3
      - 7zip
      - notepadplusplus
    state: present
```

Or use a loop for packages that need different options.

```yaml
# Install packages with specific versions and options
- name: Install packages with custom settings
  chocolatey.chocolatey.win_chocolatey:
    name: "{{ item.name }}"
    version: "{{ item.version | default(omit) }}"
    package_params: "{{ item.params | default(omit) }}"
    state: present
  loop:
    - { name: "git", params: "/GitOnlyOnPath /NoAutoCrlf /NoShellIntegration" }
    - { name: "vscode", params: "/NoDesktopIcon" }
    - { name: "nodejs-lts", version: "20.11.0" }
    - { name: "python3", params: "/InstallDir:C:\\Python312" }
```

## A Complete Developer Workstation Playbook

Here is a realistic playbook for provisioning a Windows developer workstation.

```yaml
---
# playbook: setup-dev-windows.yml
# Provision a Windows developer workstation with Chocolatey
- hosts: dev_workstations
  gather_facts: true

  vars:
    dev_tools:
      - git
      - gh
      - vscode
      - windows-terminal
      - powershell-core

    languages:
      - nodejs-lts
      - python3
      - golang
      - dotnet-sdk

    containers:
      - docker-desktop
      - kubectl
      - helm
      - k9s

    utilities:
      - 7zip
      - notepadplusplus
      - postman
      - everything
      - sysinternals
      - jq
      - curl
      - wget

    browsers:
      - googlechrome
      - firefox

    communication:
      - slack
      - zoom
      - microsoft-teams

  tasks:
    - name: Install development tools
      chocolatey.chocolatey.win_chocolatey:
        name: "{{ dev_tools }}"
        state: present

    - name: Install programming languages
      chocolatey.chocolatey.win_chocolatey:
        name: "{{ languages }}"
        state: present

    - name: Install container tools
      chocolatey.chocolatey.win_chocolatey:
        name: "{{ containers }}"
        state: present

    - name: Install utilities
      chocolatey.chocolatey.win_chocolatey:
        name: "{{ utilities }}"
        state: present

    - name: Install browsers
      chocolatey.chocolatey.win_chocolatey:
        name: "{{ browsers }}"
        state: present

    - name: Install communication tools
      chocolatey.chocolatey.win_chocolatey:
        name: "{{ communication }}"
        state: present
```

## Configuring Chocolatey Sources

By default, Chocolatey uses the community repository at `chocolatey.org`. In enterprise environments, you typically use a private repository.

```yaml
# Configure Chocolatey to use an internal repository
- name: Add internal Chocolatey source
  chocolatey.chocolatey.win_chocolatey_source:
    name: internal
    source: https://chocolatey.internal.company.com/nuget/Packages
    priority: 1
    state: present

# Optionally disable the community repository
- name: Disable community Chocolatey source
  chocolatey.chocolatey.win_chocolatey_source:
    name: chocolatey
    state: disabled

# Add a source with authentication
- name: Add authenticated Chocolatey source
  chocolatey.chocolatey.win_chocolatey_source:
    name: private-feed
    source: https://chocolatey.company.com/api/v2/
    source_username: "{{ choco_user }}"
    source_password: "{{ choco_pass }}"
    priority: 1
    state: present
```

## Configuring Chocolatey Features

Chocolatey has various features you can enable or disable.

```yaml
# Configure Chocolatey features for enterprise use
- name: Enable Chocolatey features
  chocolatey.chocolatey.win_chocolatey_feature:
    name: "{{ item }}"
    state: enabled
  loop:
    - useRememberedArgumentsForUpgrades
    - exitOnRebootDetected

- name: Disable Chocolatey features
  chocolatey.chocolatey.win_chocolatey_feature:
    name: "{{ item }}"
    state: disabled
  loop:
    - showNonElevatedWarnings
    - showDownloadProgress
```

## Updating Packages

Update packages to the latest version.

```yaml
# Update a specific package to latest
- name: Update Git to latest version
  chocolatey.chocolatey.win_chocolatey:
    name: git
    state: latest

# Update all installed packages
- name: Update all Chocolatey packages
  ansible.windows.win_shell: choco upgrade all -y
  register: choco_upgrade
  changed_when: "'upgraded 0' not in choco_upgrade.stdout"
```

## Pinning Packages

Prevent specific packages from being upgraded automatically.

```yaml
# Pin a package to prevent automatic upgrades
- name: Pin Docker Desktop version
  ansible.windows.win_shell: choco pin add --name=docker-desktop
  register: pin_result
  changed_when: "'already pinned' not in pin_result.stdout"

# Unpin a package
- name: Unpin Docker Desktop for upgrade
  ansible.windows.win_shell: choco pin remove --name=docker-desktop
  changed_when: true
```

## Removing Packages

```yaml
# Remove a Chocolatey package
- name: Remove unwanted packages
  chocolatey.chocolatey.win_chocolatey:
    name:
      - vlc
      - skype
    state: absent
```

## Gathering Package Information

List installed packages for auditing purposes.

```yaml
# List all installed Chocolatey packages
- name: Get installed packages
  ansible.windows.win_shell: choco list --local-only --id-only
  register: installed_packages
  changed_when: false

- name: Display installed packages
  ansible.builtin.debug:
    var: installed_packages.stdout_lines
```

## Using the win_chocolatey_config Module

Configure Chocolatey's global settings.

```yaml
# Set Chocolatey configuration values
- name: Set cache location
  chocolatey.chocolatey.win_chocolatey_config:
    name: cacheLocation
    value: C:\Temp\choco-cache
    state: present

- name: Set download timeout
  chocolatey.chocolatey.win_chocolatey_config:
    name: commandExecutionTimeoutSeconds
    value: "3600"
    state: present

- name: Set proxy
  chocolatey.chocolatey.win_chocolatey_config:
    name: proxy
    value: "http://proxy.company.com:3128"
    state: present
```

## Handling Reboots

Some Chocolatey installations require a reboot. Here is how to handle that gracefully.

```yaml
# Install a package that may require a reboot
- name: Install .NET SDK
  chocolatey.chocolatey.win_chocolatey:
    name: dotnet-sdk
    state: present
  register: dotnet_install

- name: Reboot if required
  ansible.windows.win_reboot:
    reboot_timeout: 600
    msg: "Rebooting after .NET SDK installation"
  when: dotnet_install.rc == 3010
```

Return code 3010 from Chocolatey means "success, reboot required."

## Wrapping Up

Chocolatey with Ansible brings Linux-style package management to Windows infrastructure. The `win_chocolatey` module family handles the full lifecycle: installing, updating, removing, and configuring packages. For enterprise use, set up a private Chocolatey repository, disable the public feed, and configure features and settings to match your organization's policies. Combined with Ansible's ability to manage Windows hosts over WinRM, you get a consistent automation experience across both your Linux and Windows infrastructure.
