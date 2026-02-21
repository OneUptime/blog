# How to Use Ansible Ad Hoc Commands to Manage Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Package Management, System Administration

Description: Learn how to install, update, and remove packages across your servers using Ansible ad hoc commands with apt, yum, dnf, and other package modules.

---

Package management is one of those tasks that seems simple until you need to do it across 50 servers at once. Logging into each server, running apt or yum, and hoping you did not miss one is tedious and error-prone. Ansible ad hoc commands let you manage packages across your entire fleet with a single command from your terminal.

## Choosing the Right Module

Ansible has separate modules for different package managers. The module you use depends on the OS running on your target hosts:

- `apt` for Debian and Ubuntu
- `yum` for RHEL, CentOS 7, and older Fedora
- `dnf` for RHEL 8+, CentOS Stream, Fedora
- `package` for a generic, OS-agnostic approach
- `pip` for Python packages
- `snap` for snap packages

The `package` module auto-detects the package manager, but it only supports basic install/remove operations. For advanced options like repository management, use the OS-specific module.

## Installing Packages

```bash
# Install a single package on Ubuntu/Debian hosts
ansible webservers -m apt -a "name=nginx state=present" --become

# Install a package on RHEL/CentOS hosts
ansible webservers -m yum -a "name=nginx state=present" --become

# Install on any OS using the generic package module
ansible webservers -m package -a "name=nginx state=present" --become

# Install a specific version
ansible webservers -m apt -a "name=nginx=1.24.0-1ubuntu1 state=present" --become

# Install multiple packages at once
ansible all -m apt -a "name=htop,vim,curl,wget state=present" --become
```

The `state=present` parameter means "install if not already installed." If the package is already there, Ansible skips it and reports `changed: false`.

## Updating Packages

```bash
# Update a specific package to the latest version
ansible webservers -m apt -a "name=nginx state=latest" --become

# Update all packages on the system (equivalent to apt upgrade)
ansible all -m apt -a "upgrade=yes" --become

# Do a full distribution upgrade (equivalent to apt full-upgrade)
ansible all -m apt -a "upgrade=full" --become

# Update the package cache before installing (equivalent to apt update)
ansible all -m apt -a "update_cache=yes cache_valid_time=3600" --become

# Install a package and update the cache in one command
ansible webservers -m apt -a "name=nginx state=latest update_cache=yes" --become
```

The `cache_valid_time` parameter tells Ansible to skip the cache update if it was refreshed within the specified number of seconds. This saves time on repeated runs.

## Removing Packages

```bash
# Remove a package but keep its configuration files
ansible all -m apt -a "name=apache2 state=absent" --become

# Remove a package and purge its configuration files
ansible all -m apt -a "name=apache2 state=absent purge=yes" --become

# Remove a package with yum
ansible all -m yum -a "name=httpd state=absent" --become

# Remove unused dependencies (autoremove)
ansible all -m apt -a "autoremove=yes" --become
```

## Package Queries and Information

Before installing or removing, check what is currently installed:

```bash
# Check if a package is installed (use shell module for queries)
ansible webservers -m shell -a "dpkg -l | grep nginx"

# Check the installed version of a package
ansible webservers -m shell -a "apt-cache policy nginx"

# List all installed packages (yum/dnf)
ansible databases -m shell -a "rpm -qa | sort"

# Check available updates
ansible all -m shell -a "apt list --upgradable 2>/dev/null" --become
```

## Working with Package Repositories

Before installing packages from third-party repositories, you need to add the repo:

```bash
# Add an APT repository on Ubuntu
ansible webservers -m apt_repository -a "repo='ppa:nginx/stable' state=present" --become

# Add a custom APT repository
ansible webservers -m apt_repository -a "repo='deb https://packages.grafana.com/oss/deb stable main' state=present filename=grafana" --become

# Add a GPG key for the repository
ansible webservers -m apt_key -a "url=https://packages.grafana.com/gpg.key state=present" --become

# Add a YUM repository
ansible databases -m yum_repository -a "name=pgdg15 description='PostgreSQL 15' baseurl='https://download.postgresql.org/pub/repos/yum/15/redhat/rhel-9-x86_64' gpgcheck=yes gpgkey='https://download.postgresql.org/pub/repos/yum/keys/PGDG-RPM-GPG-KEY-RHEL'" --become
```

## Practical Scenarios

### Emergency Security Patch

When a critical vulnerability drops and you need to patch everything immediately:

```bash
# Update the cache and install security updates only (Ubuntu)
ansible all -m apt -a "update_cache=yes upgrade=yes" --become -f 20

# Or target a specific vulnerable package
ansible all -m apt -a "name=openssl state=latest update_cache=yes" --become -f 20

# Verify the update was applied
ansible all -m shell -a "dpkg -l openssl | tail -1"
```

### Setting Up a New Application Server

```bash
# Install all dependencies for a Node.js application
ansible appservers -m apt -a "name=nodejs,npm,build-essential,git state=present update_cache=yes" --become

# Verify installations
ansible appservers -m shell -a "node --version && npm --version"
```

### Cleaning Up Disk Space

```bash
# Remove packages that were installed as dependencies and are no longer needed
ansible all -m apt -a "autoremove=yes" --become

# Clean the package cache
ansible all -m apt -a "autoclean=yes" --become

# Check how much space the package cache is using
ansible all -m shell -a "du -sh /var/cache/apt/archives/"
```

## Python Package Management with pip

For Python packages, use the `pip` module:

```bash
# Install a Python package system-wide
ansible all -m pip -a "name=requests state=present" --become

# Install a specific version
ansible all -m pip -a "name=flask==2.3.0 state=present" --become

# Install from a requirements file
ansible appservers -m pip -a "requirements=/opt/app/requirements.txt" --become

# Install in a virtual environment
ansible appservers -m pip -a "name=gunicorn virtualenv=/opt/app/venv"

# Upgrade a package
ansible all -m pip -a "name=pip state=latest" --become
```

## Check Mode for Safety

Always use check mode before making changes to production systems:

```bash
# Dry run: see what would be installed without actually installing
ansible all -m apt -a "name=nginx state=present" --become --check

# Dry run with diff output
ansible all -m apt -a "name=nginx state=latest update_cache=yes" --become --check --diff
```

The output will show `changed: true` for hosts where changes would be made, without actually making those changes.

## Handling Mixed OS Environments

If your inventory includes both Debian-based and RHEL-based hosts, use the `package` module or target groups specifically:

```bash
# The generic package module works across distributions
ansible all -m package -a "name=git state=present" --become

# Or target each group with the appropriate module
ansible ubuntu_hosts -m apt -a "name=nginx state=present" --become
ansible rhel_hosts -m dnf -a "name=nginx state=present" --become
```

For anything beyond basic install/remove, you will need to use the distribution-specific module.

## Error Handling

Package installations can fail for various reasons. Here is how to deal with common issues:

```bash
# Force update the cache if package not found
ansible webservers -m apt -a "name=nginx state=present update_cache=yes" --become

# Install with ignoring errors (not recommended for production)
ansible all -m apt -a "name=somepackage state=present" --become --ignore-errors

# Check connectivity first, then install
ansible all -m ping && ansible all -m apt -a "name=nginx state=present" --become
```

## Summary

Ansible ad hoc commands make package management across your fleet straightforward and consistent. Use the `apt`, `yum`, or `dnf` modules for distribution-specific features, or the generic `package` module for simple operations across mixed environments. Always use `--become` for package operations, test with `--check` before production changes, and leverage `update_cache` to avoid stale package lists. With these commands in your toolkit, keeping your servers patched and properly configured takes seconds instead of hours.
