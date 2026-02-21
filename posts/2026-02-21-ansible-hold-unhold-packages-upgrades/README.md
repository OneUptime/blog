# How to Use Ansible to Hold/Unhold Packages from Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Package Management, Linux, Version Pinning

Description: Learn how to hold and unhold packages from automatic upgrades on Debian and RHEL-based systems using Ansible to maintain version stability in production environments.

---

In production environments, you sometimes need to freeze a package at a specific version. Maybe you have validated your application against a particular version of a library. Maybe a newer version introduced a regression. Or maybe you just want to control exactly when critical packages like the kernel, database server, or container runtime get upgraded.

Holding a package tells the package manager to skip it during upgrades. The package stays at its current version regardless of what newer versions are available. Ansible gives you several ways to manage this across both Debian and RHEL distributions.

## Holding Packages on Debian/Ubuntu

Debian-based systems use `dpkg` selections to hold packages. Ansible provides the `dpkg_selections` module for this.

### Holding a Package

```yaml
# Hold nginx at its current version (prevent upgrades)
- name: Hold nginx package
  ansible.builtin.dpkg_selections:
    name: nginx
    selection: hold
```

After this, running `apt upgrade` or `apt-get dist-upgrade` will skip nginx entirely. You can verify this by running `dpkg --get-selections | grep hold`.

### Unholding a Package

When you are ready to allow upgrades again, set the selection to `install`.

```yaml
# Unhold nginx to allow upgrades again
- name: Unhold nginx package
  ansible.builtin.dpkg_selections:
    name: nginx
    selection: install
```

### Holding Multiple Packages

Use a loop to hold several packages at once.

```yaml
# Hold critical packages to prevent unexpected upgrades
- name: Hold production-critical packages
  ansible.builtin.dpkg_selections:
    name: "{{ item }}"
    selection: hold
  loop:
    - docker-ce
    - docker-ce-cli
    - containerd.io
    - kubelet
    - kubeadm
    - kubectl
    - postgresql-15
```

## Holding Packages on RHEL/CentOS

On RHEL-based systems, the `dnf versionlock` plugin handles package holds.

### Installing the Versionlock Plugin

```yaml
# Install the versionlock plugin for DNF
- name: Install dnf-plugin-versionlock
  ansible.builtin.dnf:
    name: python3-dnf-plugin-versionlock
    state: present
```

### Locking a Package Version

```yaml
# Lock a package at its currently installed version
- name: Lock Docker CE version
  ansible.builtin.command:
    cmd: dnf versionlock add docker-ce
  register: versionlock_result
  changed_when: "'Added' in versionlock_result.stdout"
```

### Unlocking a Package

```yaml
# Unlock a package to allow upgrades
- name: Unlock Docker CE version
  ansible.builtin.command:
    cmd: dnf versionlock delete docker-ce
  register: versionlock_delete
  changed_when: "'Deleted' in versionlock_delete.stdout"
```

### Listing Locked Packages

```yaml
# List all version-locked packages
- name: Show locked packages
  ansible.builtin.command:
    cmd: dnf versionlock list
  register: locked_packages
  changed_when: false

- name: Display locked packages
  ansible.builtin.debug:
    var: locked_packages.stdout_lines
```

## A Complete Version Management Playbook

Here is a practical playbook that manages package holds for a Kubernetes cluster.

```yaml
---
# playbook: manage-package-holds.yml
# Hold Kubernetes and Docker packages at validated versions
- hosts: k8s_nodes
  become: true

  vars:
    held_packages_debian:
      - kubelet
      - kubeadm
      - kubectl
      - docker-ce
      - docker-ce-cli
      - containerd.io

    held_packages_rhel:
      - kubelet
      - kubeadm
      - kubectl
      - docker-ce
      - docker-ce-cli
      - containerd.io

  tasks:
    # Debian/Ubuntu holds
    - name: Hold Kubernetes and Docker packages (Debian)
      ansible.builtin.dpkg_selections:
        name: "{{ item }}"
        selection: hold
      loop: "{{ held_packages_debian }}"
      when: ansible_os_family == "Debian"

    # RHEL/CentOS locks
    - name: Install versionlock plugin (RHEL)
      ansible.builtin.dnf:
        name: python3-dnf-plugin-versionlock
        state: present
      when: ansible_os_family == "RedHat"

    - name: Lock packages (RHEL)
      ansible.builtin.command:
        cmd: "dnf versionlock add {{ item }}"
      loop: "{{ held_packages_rhel }}"
      register: lock_result
      changed_when: "'Added' in lock_result.stdout"
      failed_when: false
      when: ansible_os_family == "RedHat"

    # Verification
    - name: Verify holds are in place (Debian)
      ansible.builtin.command:
        cmd: dpkg --get-selections
      register: dpkg_selections
      changed_when: false
      when: ansible_os_family == "Debian"

    - name: Show held packages (Debian)
      ansible.builtin.debug:
        msg: "{{ dpkg_selections.stdout_lines | select('search', 'hold') | list }}"
      when: ansible_os_family == "Debian"
```

## Upgrade Workflow: Unhold, Upgrade, Re-Hold

When you are ready to upgrade held packages, the workflow is: unhold, upgrade to the target version, then hold again.

```yaml
---
# playbook: upgrade-kubernetes.yml
# Controlled upgrade of Kubernetes packages
- hosts: k8s_nodes
  become: true
  serial: 1

  vars:
    k8s_target_version: "1.29.3-1.1"
    k8s_packages:
      - kubelet
      - kubeadm
      - kubectl

  tasks:
    - name: Unhold Kubernetes packages
      ansible.builtin.dpkg_selections:
        name: "{{ item }}"
        selection: install
      loop: "{{ k8s_packages }}"

    - name: Update APT cache
      ansible.builtin.apt:
        update_cache: true

    - name: Upgrade Kubernetes packages to target version
      ansible.builtin.apt:
        name: "{{ item }}={{ k8s_target_version }}"
        state: present
      loop: "{{ k8s_packages }}"

    - name: Hold Kubernetes packages at new version
      ansible.builtin.dpkg_selections:
        name: "{{ item }}"
        selection: hold
      loop: "{{ k8s_packages }}"

    - name: Restart kubelet
      ansible.builtin.systemd:
        name: kubelet
        state: restarted
        daemon_reload: true

    - name: Wait for node to be ready
      ansible.builtin.command:
        cmd: kubectl get node {{ inventory_hostname }} -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
      register: node_status
      until: node_status.stdout == "True"
      retries: 30
      delay: 10
      delegate_to: "{{ groups['k8s_masters'][0] }}"
      changed_when: false
```

The `serial: 1` ensures nodes are upgraded one at a time, maintaining cluster availability.

## Using APT Preferences for Version Pinning

An alternative to holding packages is APT pinning, which lets you specify which version of a package should be preferred. This is more fine-grained than a hold.

```yaml
# Pin PostgreSQL to a specific version using APT preferences
- name: Create APT pin for PostgreSQL
  ansible.builtin.copy:
    dest: /etc/apt/preferences.d/postgresql
    content: |
      Package: postgresql-15
      Pin: version 15.4-1.pgdg22.04+1
      Pin-Priority: 1001

      Package: postgresql-client-15
      Pin: version 15.4-1.pgdg22.04+1
      Pin-Priority: 1001
    mode: '0644'
```

A pin priority of 1001 or higher forces that specific version and prevents upgrades, similar to a hold but with version specificity.

## Auditing Held Packages

For compliance purposes, you might need to report on which packages are held across your fleet.

```yaml
# Audit held packages across all servers
- hosts: all
  become: true
  tasks:
    - name: Get held packages (Debian)
      ansible.builtin.command:
        cmd: dpkg --get-selections
      register: all_selections
      changed_when: false
      when: ansible_os_family == "Debian"

    - name: Extract held packages
      ansible.builtin.set_fact:
        held_packages: "{{ all_selections.stdout_lines | select('search', 'hold') | map('split') | map('first') | list }}"
      when: ansible_os_family == "Debian"

    - name: Report held packages
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: {{ held_packages | default([]) | join(', ') }}"
```

## Handling Holds During OS Upgrades

Before performing a distribution upgrade, you should release all holds temporarily.

```yaml
# Release all holds for distribution upgrade
- name: Get all held packages
  ansible.builtin.command:
    cmd: dpkg --get-selections
  register: all_selections
  changed_when: false

- name: Parse held package names
  ansible.builtin.set_fact:
    currently_held: "{{ all_selections.stdout_lines | select('search', 'hold') | map('split') | map('first') | list }}"

- name: Temporarily release all holds
  ansible.builtin.dpkg_selections:
    name: "{{ item }}"
    selection: install
  loop: "{{ currently_held }}"

# After the upgrade, re-apply holds
- name: Re-apply holds after upgrade
  ansible.builtin.dpkg_selections:
    name: "{{ item }}"
    selection: hold
  loop: "{{ currently_held }}"
```

## Wrapping Up

Package holds are a simple but important tool for maintaining version stability in production. On Debian systems, use `dpkg_selections` for straightforward hold/unhold operations. On RHEL systems, use the `dnf versionlock` plugin. The critical workflow to remember is: hold packages after deploying a validated version, unhold before a planned upgrade, upgrade to the specific target version, then hold again. This gives you full control over when packages change, while still allowing planned upgrades through your normal change management process.
