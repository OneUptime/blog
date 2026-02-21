# How to Use Ansible to Manage Package Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Package Management, Cache, Linux, DevOps

Description: Learn how to manage APT and YUM/DNF package caches with Ansible, including updating, cleaning, and optimizing cache behavior for faster and more reliable deployments.

---

Package cache management is one of those mundane tasks that directly affects deployment speed and reliability. A stale cache means you might install an outdated package version. A bloated cache wastes disk space. And forgetting to update the cache before installing a package from a newly added repository is a classic source of "package not found" errors in Ansible playbooks.

Let us look at how to manage package caches properly across both Debian/Ubuntu and RHEL/CentOS systems.

## Understanding Package Caches

Both APT and YUM/DNF maintain local caches:

- **APT** stores package metadata in `/var/lib/apt/lists/` and downloaded `.deb` files in `/var/cache/apt/archives/`.
- **YUM/DNF** stores package metadata and RPMs in `/var/cache/yum/` or `/var/cache/dnf/`.

These caches serve two purposes: they avoid downloading package metadata on every operation, and they keep downloaded packages around in case you need to reinstall them.

## Updating the APT Cache

The most common cache operation is updating it to get the latest package information from repositories.

```yaml
# Update the APT cache (equivalent to apt-get update)
- name: Update APT cache
  ansible.builtin.apt:
    update_cache: true
```

### Conditional Cache Update

Running `apt-get update` every time your playbook runs adds unnecessary latency. You can set a cache validity period so Ansible only updates the cache if it is older than a specified number of seconds.

```yaml
# Only update APT cache if it is older than 1 hour (3600 seconds)
- name: Update APT cache if stale
  ansible.builtin.apt:
    update_cache: true
    cache_valid_time: 3600
```

This is a pattern I use in almost every playbook. It speeds up repeat runs while still keeping the cache reasonably fresh.

### Updating Cache When Installing Packages

You can combine the cache update with a package installation in a single task.

```yaml
# Update cache and install a package in one step
- name: Install nginx with fresh cache
  ansible.builtin.apt:
    name: nginx
    state: present
    update_cache: true
    cache_valid_time: 3600
```

## Cleaning the APT Cache

Over time, the APT cache accumulates downloaded `.deb` files. On servers with limited disk space, this matters.

### Cleaning Downloaded Packages

```yaml
# Remove downloaded .deb files from the cache (apt-get clean)
- name: Clean APT package cache
  ansible.builtin.apt:
    clean: true
```

This removes all cached `.deb` files from `/var/cache/apt/archives/`. It is the equivalent of `apt-get clean`.

### Auto-Cleaning Old Packages

A gentler approach is `autoclean`, which only removes `.deb` files for packages that can no longer be downloaded (because they have been superseded by newer versions).

```yaml
# Remove only obsolete cached packages (apt-get autoclean)
- name: Auto-clean APT cache
  ansible.builtin.apt:
    autoclean: true
```

## Managing YUM/DNF Cache

On RHEL-based systems, cache management works through the `dnf` or `yum` modules.

### Updating the YUM/DNF Cache

```yaml
# Update DNF cache (equivalent to dnf makecache)
- name: Update DNF metadata cache
  ansible.builtin.dnf:
    update_cache: true
```

### Cleaning the YUM/DNF Cache

```yaml
# Clean the DNF cache (equivalent to dnf clean all)
- name: Clean all DNF caches
  ansible.builtin.command:
    cmd: dnf clean all
  changed_when: true

# A more targeted approach: only clean metadata
- name: Clean DNF metadata cache
  ansible.builtin.command:
    cmd: dnf clean metadata
  changed_when: true
```

## A Complete Cache Management Playbook

Here is a playbook that handles cache management across both distribution families, suitable for running as a scheduled maintenance task.

```yaml
---
# playbook: manage-cache.yml
# Clean and refresh package caches across all servers
- hosts: all
  become: true

  tasks:
    # Debian/Ubuntu cache management
    - name: Clean APT package cache
      ansible.builtin.apt:
        autoclean: true
      when: ansible_os_family == "Debian"

    - name: Update APT cache
      ansible.builtin.apt:
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Remove obsolete packages
      ansible.builtin.apt:
        autoremove: true
      when: ansible_os_family == "Debian"

    # RHEL/CentOS cache management
    - name: Clean DNF cache
      ansible.builtin.command:
        cmd: dnf clean all
      when: ansible_os_family == "RedHat"
      changed_when: true

    - name: Rebuild DNF cache
      ansible.builtin.command:
        cmd: dnf makecache
      when: ansible_os_family == "RedHat"
      changed_when: true

    - name: Remove orphaned packages on RHEL
      ansible.builtin.dnf:
        autoremove: true
      when: ansible_os_family == "RedHat"

    # Report disk usage of cache directories
    - name: Check cache disk usage (Debian)
      ansible.builtin.command:
        cmd: du -sh /var/cache/apt/archives/
      register: apt_cache_size
      changed_when: false
      when: ansible_os_family == "Debian"

    - name: Check cache disk usage (RHEL)
      ansible.builtin.command:
        cmd: du -sh /var/cache/dnf/
      register: dnf_cache_size
      changed_when: false
      when: ansible_os_family == "RedHat"

    - name: Report cache size
      ansible.builtin.debug:
        msg: "Cache size on {{ inventory_hostname }}: {{ (apt_cache_size.stdout | default(dnf_cache_size.stdout | default('unknown'))) }}"
```

## Configuring Cache Behavior

You can control how the package manager uses its cache through configuration files.

### APT Cache Configuration

```yaml
# Configure APT cache behavior
- name: Configure APT cache settings
  ansible.builtin.copy:
    dest: /etc/apt/apt.conf.d/99cache-settings
    content: |
      // Keep downloaded packages for 7 days, then auto-clean
      APT::Periodic::Download-Upgradeable-Packages "1";
      APT::Periodic::AutocleanInterval "7";

      // Limit cache size (packages only, not metadata)
      APT::Cache-Limit "100000000";
    mode: '0644'
```

### DNF Cache Configuration

```yaml
# Configure DNF cache behavior in dnf.conf
- name: Set DNF cache expiry to 24 hours
  ansible.builtin.lineinfile:
    path: /etc/dnf/dnf.conf
    regexp: '^metadata_expire='
    line: 'metadata_expire=86400'
    insertafter: '^\[main\]'

- name: Enable DNF keepcache
  ansible.builtin.lineinfile:
    path: /etc/dnf/dnf.conf
    regexp: '^keepcache='
    line: 'keepcache=1'
    insertafter: '^\[main\]'
```

Setting `keepcache=1` tells DNF to keep downloaded RPM files in the cache. This is useful if you frequently reinstall the same packages or want to speed up rollbacks.

## Pre-Warming the Cache

In CI/CD environments or when provisioning new machines, you might want to pre-warm the cache with packages you know you will need.

```yaml
# Pre-warm the APT cache by downloading packages without installing
- name: Download packages for later installation
  ansible.builtin.apt:
    name:
      - nginx
      - postgresql-15
      - redis-server
    state: present
    download_only: true
    update_cache: true
```

```yaml
# Pre-warm DNF cache
- name: Download packages without installing (RHEL)
  ansible.builtin.dnf:
    name:
      - nginx
      - postgresql-server
      - redis
    download_only: true
    state: present
```

## Monitoring Cache Health

For long-running servers, cache issues can accumulate. Here is a task that checks for common problems.

```yaml
# Check for cache health issues
- name: Verify APT cache integrity
  ansible.builtin.command:
    cmd: apt-get check
  register: apt_check
  changed_when: false
  failed_when: false

- name: Report cache issues
  ansible.builtin.debug:
    msg: "APT cache issue detected: {{ apt_check.stderr }}"
  when: apt_check.rc != 0

- name: Fix broken cache if needed
  ansible.builtin.command:
    cmd: apt-get install -f -y
  when: apt_check.rc != 0
  changed_when: true
```

## Cache Management in Docker Builds

When building Docker images with Ansible, cache management is important for keeping image sizes small.

```yaml
# Pattern for Ansible tasks inside Docker builds - clean cache after install
- name: Install packages
  ansible.builtin.apt:
    name:
      - python3
      - python3-pip
    state: present
    update_cache: true

- name: Clean up APT cache to reduce image size
  ansible.builtin.apt:
    clean: true

- name: Remove APT lists to further reduce image size
  ansible.builtin.file:
    path: /var/lib/apt/lists/
    state: absent
```

## Wrapping Up

Package cache management is not glamorous, but getting it right improves the speed and reliability of your deployments. The key patterns are: use `cache_valid_time` to avoid unnecessary cache updates on repeat runs, clean caches periodically to recover disk space, and always update the cache after adding new repositories. These simple practices eliminate the most common package-related failures in Ansible playbooks and keep your servers lean and up-to-date.
