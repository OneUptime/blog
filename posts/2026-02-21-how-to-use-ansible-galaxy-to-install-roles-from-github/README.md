# How to Use Ansible Galaxy to Install Roles from GitHub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, GitHub, Roles

Description: Learn how to install Ansible roles directly from GitHub repositories using ansible-galaxy with version pinning and authentication.

---

Ansible Galaxy is not just a public marketplace for roles. The `ansible-galaxy` command can install roles directly from any Git repository, including private GitHub repos. This is how most teams share roles internally without publishing them publicly. This post covers every way to install roles from GitHub, including version pinning, SSH authentication, token-based access, and bulk installation.

## Installing a Public Role from GitHub

The simplest case is installing a role from a public GitHub repository:

```bash
# Install a role from a public GitHub repository
ansible-galaxy install git+https://github.com/geerlingguy/ansible-role-nginx.git
```

By default, this installs the role into your default roles path (usually `~/.ansible/roles/`). To install into your project's `roles/` directory:

```bash
# Install into the project's roles directory
ansible-galaxy install git+https://github.com/geerlingguy/ansible-role-nginx.git -p roles/
```

## Specifying a Version

You can pin to a specific Git tag, branch, or commit:

```bash
# Install a specific tag
ansible-galaxy install git+https://github.com/geerlingguy/ansible-role-nginx.git,v3.1.0

# Install a specific branch
ansible-galaxy install git+https://github.com/geerlingguy/ansible-role-nginx.git,develop

# Install a specific commit
ansible-galaxy install git+https://github.com/geerlingguy/ansible-role-nginx.git,a1b2c3d4
```

The version is specified after a comma, with no spaces.

## Naming the Installed Role

By default, the role is named after the repository. You can override this:

```bash
# Install with a custom name
ansible-galaxy install git+https://github.com/geerlingguy/ansible-role-nginx.git,v3.1.0 --name nginx
```

Or in `requirements.yml`:

```yaml
# requirements.yml
---
roles:
  - name: nginx
    src: git+https://github.com/geerlingguy/ansible-role-nginx.git
    version: v3.1.0
```

## Installing from Private GitHub Repos via SSH

For private repositories, use SSH URLs:

```bash
# Install from a private repo using SSH authentication
ansible-galaxy install git+ssh://git@github.com/myorg/ansible-role-nginx.git,v1.0.0 -p roles/
```

Or the shorthand Git syntax:

```bash
# Shorthand SSH syntax
ansible-galaxy install git+git@github.com:myorg/ansible-role-nginx.git,v1.0.0 -p roles/
```

This requires that your SSH key is loaded in your agent and has access to the repository.

## Installing from Private Repos via HTTPS Token

If you prefer HTTPS with a personal access token:

```bash
# Install using a GitHub personal access token
ansible-galaxy install git+https://oauth2:YOUR_TOKEN@github.com/myorg/ansible-role-nginx.git,v1.0.0 -p roles/
```

For CI/CD pipelines, use an environment variable:

```bash
# Use an environment variable for the token
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
ansible-galaxy install "git+https://oauth2:${GITHUB_TOKEN}@github.com/myorg/ansible-role-nginx.git,v1.0.0" -p roles/
```

## Bulk Installation with requirements.yml

For projects with multiple role dependencies, use a `requirements.yml` file:

```yaml
# requirements.yml
# All roles needed for this project
---
roles:
  # From public Galaxy
  - name: geerlingguy.docker
    version: "6.1.0"

  # From a public GitHub repo
  - name: nginx
    src: git+https://github.com/geerlingguy/ansible-role-nginx.git
    version: v3.1.0

  # From a private GitHub repo via SSH
  - name: common
    src: git+ssh://git@github.com/myorg/ansible-role-common.git
    version: v2.0.0

  # From a private GitHub repo via HTTPS
  - name: app_deploy
    src: git+https://github.com/myorg/ansible-role-app-deploy.git
    version: v1.5.3

  # From a specific branch (not recommended for production)
  - name: experimental
    src: git+https://github.com/myorg/ansible-role-experimental.git
    version: develop
```

Install all at once:

```bash
# Install all roles from requirements.yml
ansible-galaxy install -r requirements.yml -p roles/
```

## Force Reinstall

If a role is already installed and you want to update it:

```bash
# Force reinstall to update to a newer version
ansible-galaxy install -r requirements.yml -p roles/ --force
```

Without `--force`, `ansible-galaxy` skips roles that are already present.

## Listing Installed Roles

Check what is currently installed:

```bash
# List all installed roles
ansible-galaxy list

# List roles in a specific path
ansible-galaxy list -p roles/
```

Output:

```
- nginx, v3.1.0
- common, v2.0.0
- postgresql, v1.2.0
- app_deploy, v1.5.3
```

## Removing Roles

```bash
# Remove a specific role
ansible-galaxy remove nginx -p roles/

# Remove all roles and reinstall from requirements.yml
rm -rf roles/*
ansible-galaxy install -r requirements.yml -p roles/
```

## GitHub Releases vs Tags

When you specify a version in `requirements.yml`, `ansible-galaxy` checks out that Git ref (tag, branch, or commit SHA). GitHub releases are just Git tags with extra metadata, so you can use them directly:

```yaml
# Using a GitHub release tag
- name: nginx
  src: git+https://github.com/myorg/ansible-role-nginx.git
  version: v1.0.0    # This is a Git tag, which can also be a GitHub release
```

## Installing Roles Inside a Subdirectory of a Repo

Sometimes a role is not at the root of the repository. If the role lives in a subdirectory, you need to handle it differently. The standard `ansible-galaxy` command does not support subdirectory installation directly. You have two options:

Option 1: Clone the repo and symlink:

```bash
# Clone and symlink the role from a subdirectory
git clone https://github.com/myorg/ansible-roles-collection.git /tmp/roles-collection
ln -s /tmp/roles-collection/roles/nginx roles/nginx
```

Option 2: Use collections, which do support multiple roles in one package.

## Configuring ansible.cfg for GitHub

You can set default behaviors in `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
# Where to install roles by default
roles_path = roles

[galaxy]
# Timeout for Git operations
role_skeleton_ignore = .git,.github,__pycache__
```

## CI/CD Pipeline Integration

Here is a practical GitHub Actions workflow that installs roles and runs a playbook:

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Ansible
        run: pip install ansible

      - name: Configure SSH for private repos
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan github.com >> ~/.ssh/known_hosts

      - name: Install roles from requirements.yml
        run: ansible-galaxy install -r requirements.yml -p roles/

      - name: Run playbook
        run: ansible-playbook site.yml -i inventory/production
        env:
          ANSIBLE_HOST_KEY_CHECKING: "false"
```

## Caching Roles in CI/CD

Role installation can be slow if you have many dependencies. Cache them:

```yaml
# GitHub Actions caching example
- name: Cache Ansible roles
  uses: actions/cache@v4
  with:
    path: roles/
    key: ansible-roles-${{ hashFiles('requirements.yml') }}
    restore-keys: |
      ansible-roles-

- name: Install roles (skips if cached)
  run: ansible-galaxy install -r requirements.yml -p roles/
```

The cache key is based on the hash of `requirements.yml`, so it invalidates when you update role versions.

## Troubleshooting Common Issues

### SSH key not found

```bash
# Ensure your SSH agent has the key loaded
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

# Test GitHub SSH connectivity
ssh -T git@github.com
```

### Role not found after installation

```bash
# Check where the role was installed
ansible-galaxy list -p roles/

# Verify ansible.cfg points to the right roles_path
ansible-config dump | grep ROLES_PATH
```

### Version conflicts

```bash
# Force reinstall to resolve version conflicts
ansible-galaxy install -r requirements.yml -p roles/ --force
```

## Wrapping Up

Installing Ansible roles from GitHub is the backbone of role sharing for most teams. The `ansible-galaxy` command handles public repos, private repos via SSH or HTTPS tokens, version pinning via Git tags, and bulk installation via `requirements.yml`. Pin your role versions in `requirements.yml`, automate installation in your CI/CD pipeline, and use `--force` when you need to update. This gives you reproducible role management across every project and environment.
