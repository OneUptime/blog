# How to Install Roles from Ansible Galaxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Roles, Configuration Management

Description: A practical guide to installing Ansible Galaxy roles including version pinning, custom paths, and bulk installs from requirements files.

---

Installing roles from Ansible Galaxy is one of the first things you learn when working with Ansible, and for good reason. Instead of writing a 200-line role to install and configure Nginx, you pull a community-maintained one with a single command and customize it with variables. This post covers every way to install roles from Galaxy, from simple one-liners to production-grade workflows with version pinning.

## Basic Role Installation

The simplest install uses the `ansible-galaxy install` command with the role name in `namespace.role_name` format:

```bash
# Install a role from Ansible Galaxy
ansible-galaxy install geerlingguy.nginx
```

This downloads the role to your default roles path, which is typically `~/.ansible/roles/`. You can verify with:

```bash
# Check where the role was installed
ansible-galaxy list
```

## Specifying a Version

Without a version, you get the latest release. That is risky for production because the role author might push a breaking change. Always pin versions:

```bash
# Install a specific version of a role
ansible-galaxy install geerlingguy.nginx,3.1.0
```

The comma syntax is the version delimiter. You can also use version ranges, but pinning to an exact version is safer for reproducibility.

## Installing to a Custom Path

If you want roles installed inside your project directory rather than your home directory, use the `-p` flag:

```bash
# Install a role into a project-local directory
ansible-galaxy install geerlingguy.nginx -p ./roles/
```

This is a common pattern for keeping roles alongside your playbooks in version control. Your `ansible.cfg` should reflect this path:

```ini
# ansible.cfg - tell Ansible where to find roles
[defaults]
roles_path = ./roles
```

## Force Reinstalling a Role

If a role is already installed and you want to overwrite it (for example, to upgrade), use the `--force` flag:

```bash
# Force reinstall to get the latest version
ansible-galaxy install geerlingguy.nginx --force
```

Without `--force`, Galaxy will skip roles that are already present and print a message saying so.

## Bulk Installation with requirements.yml

For real projects, you will have multiple roles. Listing them in a `requirements.yml` file is the standard approach:

```yaml
# requirements.yml - declare all role dependencies
---
roles:
  - name: geerlingguy.nginx
    version: "3.1.0"

  - name: geerlingguy.postgresql
    version: "3.4.0"

  - name: geerlingguy.redis
    version: "1.8.0"

  - name: geerlingguy.certbot
    version: "5.1.0"
```

Install everything at once:

```bash
# Install all roles from the requirements file
ansible-galaxy install -r requirements.yml
```

To force update all roles:

```bash
# Force reinstall all roles from requirements
ansible-galaxy install -r requirements.yml --force
```

## Installing Roles from Private Git Repositories

Galaxy roles do not have to come from the public Galaxy server. You can install directly from Git:

```yaml
# requirements.yml - install from a private Git repo
---
roles:
  - name: my_custom_role
    src: git+ssh://git@github.com/myorg/ansible-role-custom.git
    version: v2.0.0

  - name: another_role
    src: git+https://github.com/myorg/ansible-role-another.git
    version: main
```

This works with any Git host: GitHub, GitLab, Bitbucket, or a self-hosted Git server. The `version` field accepts tags, branches, or commit hashes.

## Installing from a Local Archive

If you have a role packaged as a tarball, you can install from the local filesystem:

```bash
# Install a role from a local tar.gz file
ansible-galaxy install -r requirements.yml
```

With the requirements file pointing to the archive:

```yaml
# requirements.yml - install from a local file
---
roles:
  - name: my_offline_role
    src: file:///path/to/my_offline_role.tar.gz
```

## Understanding the Role Directory Structure

When Galaxy installs a role, it creates a standard directory structure:

```
~/.ansible/roles/geerlingguy.nginx/
    defaults/
        main.yml          # Default variables (override these)
    handlers/
        main.yml          # Handler definitions
    meta/
        main.yml          # Role metadata and dependencies
    tasks/
        main.yml          # Main task file
    templates/
        nginx.conf.j2     # Jinja2 templates
    vars/
        main.yml          # Role variables (don't override these)
    README.md
```

The key file to look at first is `defaults/main.yml` because that shows you all the knobs you can turn. For the Nginx role, you would see variables like `nginx_vhosts`, `nginx_upstreams`, and `nginx_worker_processes`.

## Using Installed Roles in a Playbook

Once installed, reference the role in your playbook:

```yaml
# playbook.yml - use the installed role
---
- hosts: webservers
  become: true
  roles:
    - role: geerlingguy.nginx
      vars:
        nginx_worker_processes: "auto"
        nginx_vhosts:
          - listen: "80"
            server_name: "example.com"
            root: "/var/www/html"
```

You can also include roles dynamically with `include_role`:

```yaml
# playbook.yml - dynamically include a role
---
- hosts: webservers
  become: true
  tasks:
    - name: Include nginx role conditionally
      include_role:
        name: geerlingguy.nginx
      when: install_nginx | default(true)
```

## Handling Role Dependencies

Roles can declare dependencies on other roles in their `meta/main.yml`. When you install a role, Galaxy will automatically resolve and install its dependencies:

```yaml
# meta/main.yml inside a role - declaring dependencies
---
dependencies:
  - role: geerlingguy.repo-epel
    when: ansible_os_family == 'RedHat'
  - role: geerlingguy.nginx
```

If you want to skip dependency resolution, you can pass `--no-deps`:

```bash
# Install without pulling dependencies
ansible-galaxy install geerlingguy.php --no-deps
```

## Troubleshooting Common Issues

**Role conflicts.** If two versions of the same role are needed by different dependencies, Galaxy will not handle this gracefully. The solution is to use `--force` to overwrite, or restructure your playbooks to use a single version.

**Timeout errors.** Galaxy downloads can fail on slow connections. Increase the timeout:

```bash
# Set a longer timeout for slow connections
ansible-galaxy install geerlingguy.nginx --timeout 120
```

**Permission errors.** If you get permission denied when installing to the default path, either use `sudo` or (better) install to a local directory with `-p ./roles/`.

**SSL certificate errors.** Behind corporate proxies, you might see SSL verification failures. As a temporary workaround:

```bash
# Skip SSL verification (not recommended for production)
ansible-galaxy install geerlingguy.nginx --ignore-certs
```

## A Production Installation Workflow

Here is the workflow I use for every project:

1. Create a `requirements.yml` with pinned versions
2. Add `roles/` to `.gitignore` so downloaded roles are not committed
3. Run `ansible-galaxy install -r requirements.yml -p ./roles/` in CI/CD before each deployment
4. Periodically check for updates with `ansible-galaxy search` and test upgrades in a staging environment

This keeps your repository lean, your dependencies explicit, and your deployments reproducible.

## Summary

Installing roles from Ansible Galaxy ranges from a simple one-liner to a structured workflow with version pinning and requirements files. For anything beyond a one-off experiment, use a `requirements.yml` with pinned versions and install to a local roles directory. This gives you reproducibility, makes your dependencies transparent, and keeps your project self-contained. The `ansible-galaxy install` command handles Galaxy roles, Git repositories, and local archives, so it covers every source you might need.
