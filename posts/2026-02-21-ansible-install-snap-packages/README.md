# How to Use Ansible to Install Snap Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Snap, Ubuntu, Package Management

Description: Learn how to install, configure, and manage Snap packages on Ubuntu and other Linux distributions using Ansible's community.general.snap module.

---

Snap packages have become a standard part of the Ubuntu ecosystem, and they are available on many other Linux distributions too. Snaps bundle an application with all its dependencies into a single package that auto-updates and runs in a sandboxed environment. While some people have strong opinions about snaps versus traditional packages, the reality is that many applications (like VS Code, Slack, and certain server tools) are now distributed primarily as snaps.

If you are managing Ubuntu servers or desktops with Ansible, knowing how to handle Snap packages is essential. Let us walk through the `community.general.snap` module and see how to put it to practical use.

## Prerequisites: Installing snapd

Before you can install Snap packages, the `snapd` daemon needs to be running on the target host. On Ubuntu 16.04 and later, `snapd` is installed by default. On other distributions, you need to install it first.

```yaml
# Ensure snapd is installed and running
- name: Install snapd (for non-Ubuntu systems)
  ansible.builtin.package:
    name: snapd
    state: present

- name: Enable and start snapd socket
  ansible.builtin.systemd:
    name: snapd.socket
    state: started
    enabled: true

# On some distros, you need the classic snap symlink
- name: Create symlink for classic snap support
  ansible.builtin.file:
    src: /var/lib/snapd/snap
    dest: /snap
    state: link
  when: ansible_os_family != "Debian"
```

## Installing a Snap Package

The `community.general.snap` module provides a clean interface for managing Snap packages. Here is the basic usage.

```yaml
# Install a snap package with default settings (stable channel, strict confinement)
- name: Install htop via snap
  community.general.snap:
    name: htop
    state: present
```

This installs the package from the stable channel with strict confinement, which is the default behavior.

### Installing from a Specific Channel

Snap packages can be published to different channels: stable, candidate, beta, and edge. You can specify which channel to install from.

```yaml
# Install a snap from a specific channel
- name: Install Go from the latest/stable channel
  community.general.snap:
    name: go
    channel: latest/stable
    state: present

# Install the beta version of a snap
- name: Install kubectl from beta channel
  community.general.snap:
    name: kubectl
    channel: beta
    state: present
```

### Classic Confinement

Some snaps require "classic" confinement, which gives them broader access to the system (similar to a traditional package). VS Code, for example, requires classic confinement. You must explicitly enable this.

```yaml
# Install a snap with classic confinement
- name: Install Visual Studio Code
  community.general.snap:
    name: code
    classic: true
    state: present

- name: Install Terraform via snap with classic confinement
  community.general.snap:
    name: terraform
    classic: true
    state: present
```

If you try to install a classic snap without setting `classic: true`, the installation will fail with an error about needing classic confinement.

## Installing Multiple Snaps

You can install multiple snaps in a single task by passing a list to the `name` parameter.

```yaml
# Install multiple snaps at once
- name: Install development tools via snap
  community.general.snap:
    name:
      - htop
      - jq
      - yq
    state: present
```

However, there is a catch. If some of these snaps need classic confinement and others do not, you cannot mix them in a single task. Split them into separate tasks.

```yaml
# Separate tasks for strict and classic snaps
- name: Install strictly confined snaps
  community.general.snap:
    name:
      - htop
      - jq
    state: present

- name: Install classic snaps
  community.general.snap:
    name:
      - code
      - terraform
    classic: true
    state: present
```

## Removing Snap Packages

Removing a snap is straightforward.

```yaml
# Remove a snap package
- name: Remove unused snap
  community.general.snap:
    name: lxd
    state: absent
```

## A Practical Playbook: Developer Workstation Setup

Here is a complete playbook that sets up a developer workstation with commonly used Snap packages.

```yaml
---
# playbook: setup-dev-workstation.yml
# Install common development tools via Snap on Ubuntu workstations
- hosts: dev_workstations
  become: true

  vars:
    strict_snaps:
      - name: postman
      - name: slack
      - name: discord
      - name: spotify

    classic_snaps:
      - name: code
        channel: latest/stable
      - name: go
        channel: latest/stable
      - name: intellij-idea-community
        channel: latest/stable
      - name: node
        channel: "20/stable"

  tasks:
    - name: Ensure snapd is running
      ansible.builtin.systemd:
        name: snapd
        state: started
        enabled: true

    - name: Wait for snapd to be ready
      ansible.builtin.command:
        cmd: snap wait system seed.loaded
      changed_when: false

    - name: Install strictly confined snaps
      community.general.snap:
        name: "{{ item.name }}"
        channel: "{{ item.channel | default('latest/stable') }}"
        state: present
      loop: "{{ strict_snaps }}"

    - name: Install classic confined snaps
      community.general.snap:
        name: "{{ item.name }}"
        channel: "{{ item.channel | default('latest/stable') }}"
        classic: true
        state: present
      loop: "{{ classic_snaps }}"
```

The `snap wait system seed.loaded` command is important. On freshly provisioned systems, snapd might not be fully initialized yet. This command blocks until snapd is ready.

## Managing Snap Options

Some snaps have configuration options you can set. While the `snap` module does not directly support `snap set`, you can use the `command` module for this.

```yaml
# Configure snap options after installation
- name: Install nextcloud snap
  community.general.snap:
    name: nextcloud
    state: present

- name: Configure nextcloud snap port
  ansible.builtin.command:
    cmd: snap set nextcloud ports.http=8080
  changed_when: true
```

## Controlling Snap Refreshes

One of the features (or annoyances, depending on your perspective) of snaps is automatic updates. On servers, you might want to control when refreshes happen.

```yaml
# Set snap refresh schedule to only update during maintenance windows
- name: Configure snap refresh schedule
  ansible.builtin.command:
    cmd: snap set system refresh.timer=sat,04:00-06:00
  changed_when: true

# Hold a specific snap from refreshing (useful for production servers)
- name: Hold snap version
  ansible.builtin.command:
    cmd: snap refresh --hold=forever kubectl
  changed_when: true
```

## Connecting Snap Interfaces

Snaps use interfaces to get access to system resources. Sometimes you need to manually connect an interface.

```yaml
# Connect a snap interface for additional permissions
- name: Install a snap that needs USB access
  community.general.snap:
    name: my-usb-tool
    state: present

- name: Connect raw-usb interface
  ansible.builtin.command:
    cmd: snap connect my-usb-tool:raw-usb
  register: snap_connect
  changed_when: "'already connected' not in snap_connect.stderr"
  failed_when:
    - snap_connect.rc != 0
    - "'already connected' not in snap_connect.stderr"
```

## Checking Installed Snap Information

You might need to verify which snaps are installed or gather information about them.

```yaml
# Gather information about installed snaps
- name: Get list of installed snaps
  ansible.builtin.command:
    cmd: snap list
  register: snap_list
  changed_when: false

- name: Display installed snaps
  ansible.builtin.debug:
    var: snap_list.stdout_lines
```

## Dealing with Snap on Servers Without Internet

In air-gapped or restricted environments, you can download snaps on a connected machine and then install them offline.

```yaml
# Install a snap from a local file (for offline/air-gapped environments)
- name: Copy snap file to target host
  ansible.builtin.copy:
    src: files/my-app_1.0_amd64.snap
    dest: /tmp/my-app_1.0_amd64.snap
    mode: '0644'

- name: Install snap from local file (dangerous flag required for unsigned)
  ansible.builtin.command:
    cmd: snap install /tmp/my-app_1.0_amd64.snap --dangerous
  register: snap_install
  changed_when: "'installed' in snap_install.stdout"
```

The `--dangerous` flag is needed because the snap is not coming from the store and therefore is not signed.

## Wrapping Up

Snap packages are a reality of modern Linux system management, especially on Ubuntu. The `community.general.snap` module gives you a declarative way to manage them through Ansible, keeping things idempotent and repeatable. Remember to handle the snapd prerequisite, account for classic confinement where needed, and consider snap refresh policies for production servers. With these patterns in place, snaps become just another manageable component of your infrastructure.
