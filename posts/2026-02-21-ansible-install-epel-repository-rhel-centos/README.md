# How to Use Ansible to Install EPEL Repository on RHEL/CentOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, EPEL, RHEL, CentOS, Linux

Description: A complete guide to installing and configuring the EPEL (Extra Packages for Enterprise Linux) repository on RHEL and CentOS systems using Ansible.

---

EPEL (Extra Packages for Enterprise Linux) is one of those repositories that nearly every RHEL and CentOS administrator needs. It provides thousands of additional packages that are not included in the base RHEL/CentOS distribution but are commonly needed in production environments. Tools like `htop`, `jq`, `certbot`, `fail2ban`, and many others live in EPEL.

Installing EPEL manually is simple enough, but when you are managing a fleet of servers with Ansible, you want a clean, reusable approach that works across RHEL versions and handles the GPG key properly.

## The Quick Way: epel-release Package

On CentOS and CentOS Stream, EPEL can be installed directly from the base repositories.

```yaml
# Install EPEL repository from the base CentOS repos
- name: Install EPEL repository (CentOS)
  ansible.builtin.dnf:
    name: epel-release
    state: present
  when: ansible_distribution == "CentOS"
```

On RHEL (subscription-based), the `epel-release` package is not in the default repos. You need to install it differently.

```yaml
# Install EPEL repository on RHEL (subscription-based)
- name: Install EPEL release package for RHEL
  ansible.builtin.dnf:
    name: "https://dl.fedoraproject.org/pub/epel/epel-release-latest-{{ ansible_distribution_major_version }}.noarch.rpm"
    state: present
    disable_gpg_check: true
  when: ansible_distribution == "RedHat"
```

Note the `disable_gpg_check: true` for the initial installation since the EPEL GPG key is not yet imported. The package itself installs the key, so subsequent operations will verify signatures properly.

## The Thorough Way: GPG Key First

For security-conscious environments, import the GPG key before installing the repository.

```yaml
# Install EPEL with GPG key verification
- name: Import EPEL GPG key
  ansible.builtin.rpm_key:
    key: "https://dl.fedoraproject.org/pub/epel/RPM-GPG-KEY-EPEL-{{ ansible_distribution_major_version }}"
    state: present

- name: Install EPEL repository
  ansible.builtin.dnf:
    name: "https://dl.fedoraproject.org/pub/epel/epel-release-latest-{{ ansible_distribution_major_version }}.noarch.rpm"
    state: present
```

With the GPG key already imported, the package installation will verify the signature without needing to skip the check.

## A Cross-Version Role

Here is a complete Ansible role that works across RHEL 7, 8, and 9, as well as CentOS and CentOS Stream.

```yaml
# roles/epel/tasks/main.yml
# Install EPEL repository across RHEL/CentOS versions
- name: Check if EPEL repo is already configured
  ansible.builtin.stat:
    path: /etc/yum.repos.d/epel.repo
  register: epel_repo

- name: Import EPEL GPG key
  ansible.builtin.rpm_key:
    key: "https://dl.fedoraproject.org/pub/epel/RPM-GPG-KEY-EPEL-{{ ansible_distribution_major_version }}"
    state: present
  when: not epel_repo.stat.exists

- name: Install EPEL release package (CentOS/Rocky/Alma)
  ansible.builtin.dnf:
    name: epel-release
    state: present
  when:
    - not epel_repo.stat.exists
    - ansible_distribution in ['CentOS', 'Rocky', 'AlmaLinux']

- name: Install EPEL release package (RHEL)
  ansible.builtin.dnf:
    name: "https://dl.fedoraproject.org/pub/epel/epel-release-latest-{{ ansible_distribution_major_version }}.noarch.rpm"
    state: present
  when:
    - not epel_repo.stat.exists
    - ansible_distribution == "RedHat"

# On RHEL 8+, also enable CodeReady Builder / CRB (needed for some EPEL packages)
- name: Enable CRB repository (RHEL 9 / CentOS Stream 9)
  ansible.builtin.command:
    cmd: dnf config-manager --set-enabled crb
  when:
    - ansible_distribution_major_version | int >= 9
    - ansible_distribution in ['CentOS', 'Rocky', 'AlmaLinux']
  changed_when: true

- name: Enable CodeReady Builder (RHEL 9)
  ansible.builtin.command:
    cmd: subscription-manager repos --enable codeready-builder-for-rhel-9-x86_64-rpms
  when:
    - ansible_distribution == "RedHat"
    - ansible_distribution_major_version | int >= 9
  changed_when: true
  failed_when: false
```

```yaml
# roles/epel/defaults/main.yml
epel_enabled: true
epel_testing_enabled: false
```

## Enabling EPEL-Testing

EPEL also has a testing repository with packages that are not yet in the stable release. This is useful for testing newer versions.

```yaml
# Enable the EPEL Testing repository
- name: Enable EPEL Testing repository
  ansible.builtin.yum_repository:
    name: epel-testing
    description: Extra Packages for Enterprise Linux - Testing
    metalink: "https://mirrors.fedoraproject.org/metalink?repo=testing-epel{{ ansible_distribution_major_version }}&arch=$basearch"
    gpgcheck: true
    gpgkey: "file:///etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-{{ ansible_distribution_major_version }}"
    enabled: "{{ epel_testing_enabled | default(false) }}"
```

## Installing Packages from EPEL

Once EPEL is enabled, you can install packages from it like any other repository.

```yaml
# Install commonly needed packages from EPEL
- name: Install EPEL packages
  ansible.builtin.dnf:
    name:
      - htop
      - jq
      - fail2ban
      - certbot
      - python3-certbot-nginx
      - moreutils
      - the_silver_searcher
      - ShellCheck
    state: present
```

### Installing from EPEL Only

If you want to ensure a package comes specifically from EPEL (in case it exists in multiple repos), use the `enablerepo` parameter.

```yaml
# Install a package explicitly from the EPEL repository
- name: Install fail2ban from EPEL
  ansible.builtin.dnf:
    name: fail2ban
    enablerepo: epel
    state: present
```

## Configuring EPEL Repository Options

You can customize the EPEL repository configuration after installation.

```yaml
# Customize EPEL repository settings
- name: Configure EPEL with specific settings
  ansible.builtin.yum_repository:
    name: epel
    description: Extra Packages for Enterprise Linux {{ ansible_distribution_major_version }}
    metalink: "https://mirrors.fedoraproject.org/metalink?repo=epel-{{ ansible_distribution_major_version }}&arch=$basearch&infra=$infra&content=$contentdir"
    gpgcheck: true
    gpgkey: "file:///etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-{{ ansible_distribution_major_version }}"
    enabled: true
    priority: 50
    exclude: "php* mysql*"
```

The `exclude` parameter prevents specific packages from being installed from EPEL. This is useful when you have a preferred source for certain packages (like PHP from Remi or MySQL from the official Oracle repository).

### Setting Repository Priority

If you use EPEL alongside other third-party repositories, priorities help avoid package conflicts.

```yaml
# Set EPEL to a lower priority than your internal repos
- name: Install priorities plugin
  ansible.builtin.dnf:
    name: yum-plugin-priorities
    state: present

- name: Set EPEL priority to 50
  ansible.builtin.lineinfile:
    path: /etc/yum.repos.d/epel.repo
    regexp: '^priority='
    line: 'priority=50'
    insertafter: '^\[epel\]'
```

## Verifying EPEL Installation

After deploying EPEL, verify it is working correctly.

```yaml
# Verify EPEL is installed and functional
- name: List enabled repositories
  ansible.builtin.command:
    cmd: dnf repolist enabled
  register: repo_list
  changed_when: false

- name: Verify EPEL is in the repository list
  ansible.builtin.assert:
    that:
      - "'epel' in repo_list.stdout"
    fail_msg: "EPEL repository is not enabled"
    success_msg: "EPEL repository is enabled and working"

- name: Count available packages from EPEL
  ansible.builtin.command:
    cmd: "dnf repo-pkgs epel list available --quiet"
  register: epel_packages
  changed_when: false

- name: Report EPEL package count
  ansible.builtin.debug:
    msg: "EPEL provides {{ epel_packages.stdout_lines | length }} packages"
```

## Using EPEL in a Complete Server Setup

Here is how EPEL fits into a typical server provisioning workflow.

```yaml
---
# playbook: provision-server.yml
# Provision a new RHEL/CentOS server with EPEL and common tools
- hosts: new_servers
  become: true

  roles:
    - role: epel

  tasks:
    - name: Install essential tools from EPEL
      ansible.builtin.dnf:
        name:
          - htop
          - iotop
          - jq
          - tree
          - ncdu
          - tmux
          - mtr
          - nmap-ncat
          - bash-completion
        state: present

    - name: Install security tools from EPEL
      ansible.builtin.dnf:
        name:
          - fail2ban
          - clamav
          - clamav-update
        state: present

    - name: Enable and start fail2ban
      ansible.builtin.systemd:
        name: fail2ban
        state: started
        enabled: true
```

## Removing EPEL

If you need to remove EPEL from a system (rare, but it happens).

```yaml
# Remove EPEL repository
- name: Remove EPEL release package
  ansible.builtin.dnf:
    name: epel-release
    state: absent

- name: Clean up EPEL repo file if still present
  ansible.builtin.file:
    path: /etc/yum.repos.d/epel.repo
    state: absent

- name: Clean DNF cache after removing EPEL
  ansible.builtin.command:
    cmd: dnf clean all
  changed_when: true
```

## Wrapping Up

EPEL is practically a requirement for any RHEL-based server that needs common utilities and tools. With the role and playbook patterns shown here, you can deploy EPEL consistently across your fleet, handle the differences between RHEL and CentOS, manage GPG keys properly, and customize the repository settings to fit your environment. The key takeaway is to always import the GPG key first, enable CRB/CodeReady Builder for EPEL dependencies on RHEL 9, and use repository priorities and exclusions to prevent package conflicts with other third-party repos.
