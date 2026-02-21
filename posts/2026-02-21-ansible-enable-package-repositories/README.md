# How to Use Ansible to Enable Package Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Package Management, Repositories, Linux

Description: A practical guide to enabling and managing package repositories across different Linux distributions using Ansible modules like yum_repository and apt_repository.

---

Package repositories are the backbone of software distribution on Linux. Whether you are setting up a fresh server or standardizing a fleet, one of the first tasks is making sure the right repositories are enabled. Doing this manually is fine for one or two machines, but once you are managing tens or hundreds, Ansible is the way to go.

This post covers how to enable package repositories on both Debian-based and Red Hat-based systems using Ansible, with real-world examples you can adapt for your own infrastructure.

## Repository Management on Different Distributions

The approach differs depending on your Linux family:

- **Debian/Ubuntu**: Repositories are managed through `.list` files in `/etc/apt/sources.list.d/` or the main `/etc/apt/sources.list` file. Ansible provides the `apt_repository` module.
- **RHEL/CentOS/Fedora**: Repositories are managed through `.repo` files in `/etc/yum.repos.d/`. Ansible provides the `yum_repository` module.

Let me walk through both.

## Enabling Repositories on RHEL/CentOS with yum_repository

The `yum_repository` module creates or modifies `.repo` files. Here is how to add the NGINX stable repository.

```yaml
# Add the official NGINX repository for CentOS/RHEL
- name: Add NGINX stable repository
  ansible.builtin.yum_repository:
    name: nginx-stable
    description: NGINX Stable Repository
    baseurl: http://nginx.org/packages/centos/$releasever/$basearch/
    gpgcheck: true
    gpgkey: https://nginx.org/keys/nginx_signing.key
    enabled: true
    module_hotfixes: true
```

This creates a file at `/etc/yum.repos.d/nginx-stable.repo` with the correct configuration. The `module_hotfixes` parameter is useful on RHEL 8+ where module streams can interfere with package installation.

### Enabling Built-in Repositories

RHEL and CentOS ship with several repositories that are disabled by default. You can enable them using the `dnf` or `yum` command through the `command` module, but a cleaner approach is to use `community.general.rhsm_repository` for RHEL subscribed systems or edit the repo file directly.

```yaml
# Enable the CodeReady Builder (CRB) repository on RHEL 9
- name: Enable CRB repository
  ansible.builtin.command:
    cmd: dnf config-manager --set-enabled crb
  changed_when: true

# Alternative: Enable PowerTools on CentOS Stream 8
- name: Enable PowerTools repository
  ansible.builtin.yum_repository:
    name: powertools
    description: CentOS Stream 8 - PowerTools
    mirrorlist: http://mirrorlist.centos.org/?release=$stream&arch=$basearch&repo=PowerTools&infra=$infra
    gpgcheck: true
    gpgkey: file:///etc/pki/rpm-gpg/RPM-GPG-KEY-centosofficial
    enabled: true
```

### Adding Multiple Repositories

When you need several repositories, use a loop to keep things clean.

```yaml
# Add multiple repositories from a variable list
- name: Add third-party repositories
  ansible.builtin.yum_repository:
    name: "{{ item.name }}"
    description: "{{ item.description }}"
    baseurl: "{{ item.baseurl }}"
    gpgcheck: "{{ item.gpgcheck | default(true) }}"
    gpgkey: "{{ item.gpgkey | default(omit) }}"
    enabled: "{{ item.enabled | default(true) }}"
  loop: "{{ custom_repositories }}"

# Define the repositories in group_vars or host_vars
# custom_repositories:
#   - name: grafana
#     description: Grafana OSS
#     baseurl: https://rpm.grafana.com
#     gpgkey: https://rpm.grafana.com/gpg.key
#   - name: hashicorp
#     description: HashiCorp Stable
#     baseurl: https://rpm.releases.hashicorp.com/RHEL/$releasever/$basearch/stable
#     gpgkey: https://rpm.releases.hashicorp.com/gpg
```

## Enabling Repositories on Debian/Ubuntu with apt_repository

The `apt_repository` module handles adding and removing APT sources. Modern Debian and Ubuntu systems prefer the DEB822 format, but the traditional one-line format still works everywhere.

```yaml
# Add the Docker CE repository on Ubuntu
- name: Add Docker GPG key
  ansible.builtin.apt_key:
    url: https://download.docker.com/linux/ubuntu/gpg
    state: present

- name: Add Docker CE repository
  ansible.builtin.apt_repository:
    repo: "deb https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
    state: present
    filename: docker-ce
    update_cache: true
```

The `filename` parameter controls the name of the `.list` file created in `/etc/apt/sources.list.d/`. The `update_cache` parameter runs `apt-get update` after adding the repository, so you can immediately install packages.

### Using Signed-By for Modern Ubuntu

Starting with Ubuntu 22.04, the recommended approach is to use signed-by in the repository definition rather than `apt_key`. Here is the modern pattern.

```yaml
# Modern approach using signed-by (Ubuntu 22.04+)
- name: Download Docker GPG key
  ansible.builtin.get_url:
    url: https://download.docker.com/linux/ubuntu/gpg
    dest: /usr/share/keyrings/docker-archive-keyring.asc
    mode: '0644'

- name: Add Docker repository with signed-by
  ansible.builtin.apt_repository:
    repo: "deb [signed-by=/usr/share/keyrings/docker-archive-keyring.asc] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
    state: present
    filename: docker-ce
```

## A Cross-Platform Playbook

In many environments, you manage a mix of distributions. Here is how to handle repository setup across both families.

```yaml
---
# playbook: setup-repositories.yml
# Enable required repositories on both Debian and RHEL family systems
- hosts: all
  become: true

  tasks:
    # RHEL/CentOS specific repository setup
    - name: Import GPG key for EPEL
      ansible.builtin.rpm_key:
        key: https://dl.fedoraproject.org/pub/epel/RPM-GPG-KEY-EPEL-{{ ansible_distribution_major_version }}
        state: present
      when: ansible_os_family == "RedHat"

    - name: Enable EPEL repository
      ansible.builtin.yum_repository:
        name: epel
        description: Extra Packages for Enterprise Linux
        metalink: "https://mirrors.fedoraproject.org/metalink?repo=epel-{{ ansible_distribution_major_version }}&arch=$basearch"
        gpgcheck: true
        gpgkey: "file:///etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-{{ ansible_distribution_major_version }}"
        enabled: true
      when: ansible_os_family == "RedHat"

    # Debian/Ubuntu specific repository setup
    - name: Add universe repository on Ubuntu
      ansible.builtin.apt_repository:
        repo: "deb http://archive.ubuntu.com/ubuntu {{ ansible_distribution_release }} universe"
        state: present
      when: ansible_distribution == "Ubuntu"

    # Install packages that are now available
    - name: Install common tools
      ansible.builtin.package:
        name:
          - htop
          - jq
          - tmux
        state: present
```

## Disabling Repositories

Sometimes you need to disable a repository rather than remove it entirely. On RHEL systems, set `enabled: false`.

```yaml
# Disable a repository without removing its configuration
- name: Disable the testing repository
  ansible.builtin.yum_repository:
    name: myapp-testing
    description: MyApp Testing Repository
    baseurl: https://repo.myapp.com/testing/el/$releasever/$basearch/
    enabled: false

# On Debian, remove the repository entry
- name: Remove old PPA repository
  ansible.builtin.apt_repository:
    repo: "ppa:oldpackage/ppa"
    state: absent
```

## Repository Priority Management

On RHEL systems, you can set repository priorities to control which repository gets preference when the same package exists in multiple repos. Lower numbers mean higher priority.

```yaml
# Set repository priority (requires yum-plugin-priorities)
- name: Ensure priorities plugin is installed
  ansible.builtin.dnf:
    name: yum-plugin-priorities
    state: present

- name: Add high-priority internal repository
  ansible.builtin.yum_repository:
    name: internal-packages
    description: Internal Package Repository
    baseurl: https://repo.internal.company.com/stable/el$releasever/
    gpgcheck: true
    gpgkey: https://repo.internal.company.com/gpg-key
    enabled: true
    priority: 10
```

## Using Variables for Flexibility

A pattern I have found useful is defining all repositories as data structures in variables, then applying them with a single task. This makes it trivial to add new repositories without touching the playbook.

```yaml
# group_vars/all.yml
yum_repositories:
  - name: grafana
    description: Grafana OSS Repository
    baseurl: https://rpm.grafana.com
    gpgkey: https://rpm.grafana.com/gpg.key
    gpgcheck: true

  - name: hashicorp
    description: HashiCorp Stable Repository
    baseurl: https://rpm.releases.hashicorp.com/RHEL/$releasever/$basearch/stable
    gpgkey: https://rpm.releases.hashicorp.com/gpg
    gpgcheck: true

apt_repositories:
  - repo: "deb https://apt.grafana.com stable main"
    filename: grafana
    key_url: https://apt.grafana.com/gpg.key

  - repo: "deb https://apt.releases.hashicorp.com {{ ansible_distribution_release }} main"
    filename: hashicorp
    key_url: https://apt.releases.hashicorp.com/gpg
```

```yaml
# tasks/repositories.yml
# Apply all YUM repositories from the variable list
- name: Add YUM repositories
  ansible.builtin.yum_repository:
    name: "{{ item.name }}"
    description: "{{ item.description }}"
    baseurl: "{{ item.baseurl }}"
    gpgcheck: "{{ item.gpgcheck }}"
    gpgkey: "{{ item.gpgkey }}"
    enabled: true
  loop: "{{ yum_repositories }}"
  when: ansible_os_family == "RedHat"

- name: Add APT repository keys
  ansible.builtin.apt_key:
    url: "{{ item.key_url }}"
    state: present
  loop: "{{ apt_repositories }}"
  when: ansible_os_family == "Debian"

- name: Add APT repositories
  ansible.builtin.apt_repository:
    repo: "{{ item.repo }}"
    filename: "{{ item.filename }}"
    state: present
  loop: "{{ apt_repositories }}"
  when: ansible_os_family == "Debian"
```

## Wrapping Up

Managing package repositories with Ansible keeps your infrastructure consistent and auditable. The key points to remember: always import GPG keys before adding repositories, use the appropriate module for your distribution family, and consider using variables to define repositories as data. This approach scales well from a handful of servers to thousands, and makes it easy to add or remove repositories across your entire fleet with a single playbook run.
