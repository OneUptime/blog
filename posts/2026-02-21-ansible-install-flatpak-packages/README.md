# How to Use Ansible to Install Flatpak Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Flatpak, Linux, Desktop Management

Description: A hands-on guide to managing Flatpak applications with Ansible, from setting up Flathub to installing and configuring Flatpak packages across Linux desktops.

---

Flatpak is a universal packaging format for Linux that runs applications in sandboxed environments. Unlike Snap, Flatpak is not tied to any single distribution and is particularly popular in the desktop Linux world. If you manage a fleet of Linux workstations, whether they are developer machines, kiosk systems, or shared desktops, automating Flatpak installations with Ansible saves a lot of repetitive work.

The `community.general.flatpak` and `community.general.flatpak_remote` modules give you everything you need to manage Flatpak from your playbooks.

## Setting Up Flatpak and Flathub

Before installing Flatpak applications, you need Flatpak itself and at least one remote repository. Flathub is the most popular Flatpak repository.

```yaml
---
# playbook: setup-flatpak.yml
# Install Flatpak and configure the Flathub repository
- hosts: workstations
  become: true

  tasks:
    - name: Install Flatpak
      ansible.builtin.package:
        name: flatpak
        state: present

    # On GNOME desktops, install the GNOME integration plugin
    - name: Install GNOME Flatpak plugin
      ansible.builtin.package:
        name: gnome-software-plugin-flatpak
        state: present
      when: desktop_environment | default('gnome') == 'gnome'

    # Add Flathub as a system-wide remote
    - name: Add Flathub repository
      community.general.flatpak_remote:
        name: flathub
        flatpakrepo_url: https://dl.flathub.org/repo/flathub.flatpakrepo
        method: system
        state: present
```

The `method` parameter controls whether the remote is added system-wide (`system`) or for the current user only (`user`). System-wide is typically what you want for managed workstations.

## Installing Flatpak Applications

Once Flathub is configured, you can install applications using their Flatpak application ID. These IDs follow a reverse-DNS naming convention.

```yaml
# Install a single Flatpak application
- name: Install Firefox via Flatpak
  community.general.flatpak:
    name: org.mozilla.firefox
    state: present
    remote: flathub
```

### Installing Multiple Applications

You can loop over a list of applications to install several at once.

```yaml
# Install a suite of productivity applications via Flatpak
- name: Install office and productivity Flatpaks
  community.general.flatpak:
    name: "{{ item }}"
    state: present
    remote: flathub
  loop:
    - org.libreoffice.LibreOffice
    - org.gimp.GIMP
    - org.inkscape.Inkscape
    - org.videolan.VLC
    - org.keepassxc.KeePassXC
    - com.obsproject.Studio
```

### User-Level Installation

Sometimes you want to install Flatpaks for a specific user rather than system-wide. This is useful for shared machines where different users need different applications.

```yaml
# Install a Flatpak for a specific user
- name: Install Spotify for the developer user
  community.general.flatpak:
    name: com.spotify.Client
    state: present
    method: user
  become: true
  become_user: developer
```

## A Complete Workstation Setup Playbook

Here is a realistic playbook that sets up a developer workstation with Flatpak applications organized by category.

```yaml
---
# playbook: developer-desktop.yml
# Full developer workstation Flatpak setup
- hosts: dev_desktops
  become: true

  vars:
    flatpak_browsers:
      - org.mozilla.firefox
      - com.google.Chrome

    flatpak_dev_tools:
      - com.visualstudio.code
      - io.podman_desktop.PodmanDesktop
      - com.getpostman.Postman
      - rest.insomnia.Insomnia

    flatpak_communication:
      - com.slack.Slack
      - com.discordapp.Discord
      - us.zoom.Zoom

    flatpak_utilities:
      - org.keepassxc.KeePassXC
      - com.github.tchx84.Flatseal
      - org.gnome.Calculator

  tasks:
    - name: Install Flatpak
      ansible.builtin.package:
        name: flatpak
        state: present

    - name: Add Flathub repository
      community.general.flatpak_remote:
        name: flathub
        flatpakrepo_url: https://dl.flathub.org/repo/flathub.flatpakrepo
        method: system
        state: present

    - name: Install browser Flatpaks
      community.general.flatpak:
        name: "{{ item }}"
        state: present
        remote: flathub
      loop: "{{ flatpak_browsers }}"

    - name: Install development tool Flatpaks
      community.general.flatpak:
        name: "{{ item }}"
        state: present
        remote: flathub
      loop: "{{ flatpak_dev_tools }}"

    - name: Install communication Flatpaks
      community.general.flatpak:
        name: "{{ item }}"
        state: present
        remote: flathub
      loop: "{{ flatpak_communication }}"

    - name: Install utility Flatpaks
      community.general.flatpak:
        name: "{{ item }}"
        state: present
        remote: flathub
      loop: "{{ flatpak_utilities }}"
```

## Managing Flatpak Remotes

Beyond Flathub, you can add other remotes. Some organizations host their own Flatpak repositories for internal applications.

```yaml
# Add a custom internal Flatpak remote
- name: Add internal Flatpak repository
  community.general.flatpak_remote:
    name: company-apps
    flatpakrepo_url: https://flatpak.internal.company.com/repo/company.flatpakrepo
    method: system
    state: present

# Install an application from the custom remote
- name: Install internal application
  community.general.flatpak:
    name: com.company.InternalTool
    state: present
    remote: company-apps
```

### Removing a Remote

If you need to remove a remote and all applications installed from it, set the state to absent.

```yaml
# Remove a Flatpak remote
- name: Remove deprecated repository
  community.general.flatpak_remote:
    name: old-repo
    state: absent
```

## Removing Flatpak Applications

Removing applications is the reverse of installing them.

```yaml
# Remove a Flatpak application
- name: Remove unused Flatpak applications
  community.general.flatpak:
    name: "{{ item }}"
    state: absent
  loop:
    - org.gnome.Contacts
    - org.gnome.Maps
    - org.gnome.Weather
```

## Managing Flatpak Permissions with Flatseal Overrides

Flatpak applications run in sandboxes with specific permissions. You can override these permissions using Flatpak override files. While there is no dedicated Ansible module for this, you can manage the override files directly.

```yaml
# Grant filesystem access to a Flatpak application
- name: Create Flatpak overrides directory
  ansible.builtin.file:
    path: /var/lib/flatpak/overrides
    state: directory
    mode: '0755'

# Allow VS Code Flatpak to access the home directory and host filesystem
- name: Configure VS Code Flatpak permissions
  ansible.builtin.copy:
    dest: /var/lib/flatpak/overrides/com.visualstudio.code
    content: |
      [Context]
      filesystems=host;/tmp;
    mode: '0644'
```

## Keeping Flatpaks Updated

Flatpak applications can be updated with the `flatpak update` command. Here is how to trigger an update from Ansible.

```yaml
# Update all installed Flatpak applications
- name: Update all Flatpak applications
  ansible.builtin.command:
    cmd: flatpak update -y --noninteractive
  register: flatpak_update
  changed_when: "'Nothing to do' not in flatpak_update.stdout"
```

## Setting Up Automatic Updates

For workstations that should always have the latest versions, you can set up a systemd timer for automatic Flatpak updates.

```yaml
# Create a systemd service and timer for automatic Flatpak updates
- name: Create Flatpak update service
  ansible.builtin.copy:
    dest: /etc/systemd/system/flatpak-update.service
    content: |
      [Unit]
      Description=Update Flatpak applications
      After=network-online.target

      [Service]
      Type=oneshot
      ExecStart=/usr/bin/flatpak update -y --noninteractive
    mode: '0644'

- name: Create Flatpak update timer
  ansible.builtin.copy:
    dest: /etc/systemd/system/flatpak-update.timer
    content: |
      [Unit]
      Description=Run Flatpak update daily

      [Timer]
      OnCalendar=daily
      Persistent=true
      RandomizedDelaySec=3600

      [Install]
      WantedBy=timers.target
    mode: '0644'

- name: Enable Flatpak update timer
  ansible.builtin.systemd:
    name: flatpak-update.timer
    state: started
    enabled: true
    daemon_reload: true
```

## Checking Installed Flatpaks

For auditing purposes, you can gather information about installed Flatpak applications.

```yaml
# List all installed Flatpak applications
- name: Gather installed Flatpak information
  ansible.builtin.command:
    cmd: flatpak list --app --columns=application,version,origin
  register: installed_flatpaks
  changed_when: false

- name: Show installed Flatpaks
  ansible.builtin.debug:
    msg: "{{ installed_flatpaks.stdout_lines }}"
```

## Wrapping Up

Flatpak management with Ansible is straightforward once you understand the module structure. The `flatpak_remote` module handles repository configuration, and the `flatpak` module handles application installation and removal. For a fleet of Linux desktops, this approach gives you consistent application deployments, easy auditing, and the ability to roll out new tools or remove deprecated ones across all machines with a single playbook run. The combination of Ansible's automation with Flatpak's sandboxing provides both convenience and security for desktop Linux management.
