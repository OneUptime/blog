# How to Install Roles from GitHub with Ansible Galaxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, GitHub, Roles, Git

Description: How to install Ansible roles directly from GitHub repositories using ansible-galaxy, including private repos, branches, tags, and SSH access.

---

Not every Ansible role lives on Galaxy. Many teams maintain internal roles in private GitHub repositories, and some open-source roles on GitHub have not been published to Galaxy at all. The `ansible-galaxy` command supports installing roles directly from Git repositories, which means you can pull roles from GitHub (or any Git host) just as easily as from the public Galaxy server.

This post walks through every variation of installing GitHub-hosted roles, from public repos to private ones with SSH keys.

## Installing from a Public GitHub Repository

The simplest case is a public repo. Use the `src` field in your requirements file with the `git+` prefix:

```yaml
# requirements.yml - install a role from a public GitHub repo
---
roles:
  - name: my_nginx_role
    src: git+https://github.com/geerlingguy/ansible-role-nginx.git
    version: "3.1.0"
```

Install it:

```bash
# Install roles from the requirements file
ansible-galaxy install -r requirements.yml
```

You can also install directly from the command line without a requirements file:

```bash
# Install a role directly from a GitHub URL
ansible-galaxy install git+https://github.com/geerlingguy/ansible-role-nginx.git,3.1.0
```

The comma separates the URL from the version (tag, branch, or commit hash).

## Controlling the Installed Role Name

By default, when you install from Git, the role gets named after the repository. You can override this with the `name` field:

```yaml
# requirements.yml - set a custom name for the installed role
---
roles:
  - name: nginx
    src: git+https://github.com/geerlingguy/ansible-role-nginx.git
    version: "3.1.0"
```

Now the role is available as `nginx` in your playbooks rather than `ansible-role-nginx`. This is important because your playbook references need to match the installed name:

```yaml
# playbook.yml - reference the role by the name you gave it
---
- hosts: webservers
  become: true
  roles:
    - role: nginx
      vars:
        nginx_worker_processes: auto
```

## Installing from a Specific Branch

Sometimes you need to test a feature branch or track a development branch:

```yaml
# requirements.yml - install from a specific branch
---
roles:
  - name: nginx_dev
    src: git+https://github.com/geerlingguy/ansible-role-nginx.git
    version: develop
```

While this works for development, avoid using branch names in production requirements files. Branches are moving targets, and what works today might break tomorrow.

## Installing from a Specific Commit

For maximum precision, use a commit hash:

```yaml
# requirements.yml - pin to an exact commit
---
roles:
  - name: nginx
    src: git+https://github.com/geerlingguy/ansible-role-nginx.git
    version: a7f3e2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9
```

This guarantees you get the exact code you tested, regardless of what happens to tags or branches later.

## Installing from Private GitHub Repositories via SSH

For private repos, HTTPS with tokens works, but SSH is often easier if you have SSH keys configured:

```yaml
# requirements.yml - install from a private repo via SSH
---
roles:
  - name: internal_webserver
    src: git+ssh://git@github.com/myorg/ansible-role-webserver.git
    version: v2.0.0
    scm: git

  - name: internal_database
    src: git+ssh://git@github.com/myorg/ansible-role-database.git
    version: v1.5.0
    scm: git
```

Your SSH key must have read access to the repository. In CI/CD, you typically configure a deploy key:

```bash
# Set up SSH agent with a deploy key in CI
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/deploy_key

# Now ansible-galaxy can access private repos
ansible-galaxy install -r requirements.yml -p ./roles/
```

## Installing from Private GitHub Repositories via HTTPS Token

If you prefer HTTPS, use a personal access token or fine-grained token:

```yaml
# requirements.yml - install from private repo via HTTPS token
---
roles:
  - name: internal_webserver
    src: git+https://{{ lookup('env', 'GITHUB_TOKEN') }}@github.com/myorg/ansible-role-webserver.git
    version: v2.0.0
```

Wait, that lookup will not work in a requirements file because it is not processed by Jinja2. Instead, embed the token in the URL using environment variable substitution in your CI script:

```bash
# Use envsubst to inject the token into requirements
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"

# Create a temporary requirements file with the token injected
envsubst < requirements.yml.tmpl > requirements.yml

# Install roles
ansible-galaxy install -r requirements.yml -p ./roles/

# Clean up
rm requirements.yml
```

The template file:

```yaml
# requirements.yml.tmpl - template with token placeholder
---
roles:
  - name: internal_webserver
    src: git+https://${GITHUB_TOKEN}@github.com/myorg/ansible-role-webserver.git
    version: v2.0.0
```

## Installing from GitHub Releases (Tarballs)

GitHub automatically creates tarballs for tagged releases. You can install these directly:

```yaml
# requirements.yml - install from a GitHub release tarball
---
roles:
  - name: nginx
    src: https://github.com/geerlingguy/ansible-role-nginx/archive/refs/tags/3.1.0.tar.gz
```

This approach does not require Git on the target system since it downloads a plain tarball. However, version management is manual since you need to update the URL for each version.

## Setting Up a Role Repository Structure

If you are creating your own roles to host on GitHub, follow this directory structure so `ansible-galaxy` recognizes them properly:

```
ansible-role-myapp/
    defaults/
        main.yml
    handlers/
        main.yml
    meta/
        main.yml        # Required - must have galaxy_info section
    tasks/
        main.yml
    templates/
    vars/
        main.yml
    README.md
    .gitignore
```

The `meta/main.yml` file is critical:

```yaml
# meta/main.yml - role metadata for Galaxy compatibility
---
galaxy_info:
  role_name: myapp
  author: your_name
  description: Install and configure MyApp
  license: MIT
  min_ansible_version: "2.12"
  platforms:
    - name: Ubuntu
      versions:
        - jammy
        - focal
    - name: EL
      versions:
        - "8"
        - "9"
  galaxy_tags:
    - myapp
    - web
    - deployment

dependencies: []
```

## Handling Submodules

If your role repo uses Git submodules, `ansible-galaxy` will not check them out by default. You would need a wrapper script:

```bash
#!/bin/bash
# install-roles.sh - install roles and handle submodules
set -e

ROLES_DIR="./roles"

# Install roles normally
ansible-galaxy install -r requirements.yml -p "$ROLES_DIR"

# Initialize submodules in any role that has them
for role_dir in "$ROLES_DIR"/*/; do
    if [ -f "$role_dir/.gitmodules" ]; then
        echo "Initializing submodules in $role_dir"
        cd "$role_dir"
        git submodule update --init --recursive
        cd - > /dev/null
    fi
done
```

## Debugging Installation Issues

When a GitHub install fails, verbose output is your friend:

```bash
# Maximum verbosity for debugging
ansible-galaxy install -r requirements.yml -vvvv
```

Common issues:

- **Authentication failures**: Verify your SSH key or token has the right permissions
- **Tag not found**: Double-check the version string matches an actual Git tag
- **Timeout**: GitHub might rate-limit anonymous HTTPS requests; use authentication
- **Missing meta/main.yml**: Galaxy needs this file to recognize the repo as a role

## Summary

Installing Ansible roles from GitHub gives you access to private internal roles and public roles that are not published on Galaxy. The `git+https://` and `git+ssh://` URL schemes handle public and private repos respectively. Always pin to a tag or commit hash for production use, override the role name with the `name` field for cleaner playbook references, and use SSH keys or tokens for private repository access. This approach lets you manage all your Ansible content, whether public or private, through a single `requirements.yml` file.
