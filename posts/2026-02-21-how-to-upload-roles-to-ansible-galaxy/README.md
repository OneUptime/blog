# How to Upload Roles to Ansible Galaxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Roles, Publishing, Open Source

Description: Complete walkthrough for publishing Ansible roles to Galaxy including metadata setup, GitHub integration, versioning, and quality standards.

---

Publishing a role to Ansible Galaxy shares your automation with the community and makes it installable with a single command. Unlike collections, roles on Galaxy are imported directly from GitHub repositories. You do not upload a file; instead, you link your GitHub account and point Galaxy at a repository. This post covers the entire publishing workflow, from preparing your role to maintaining it after release.

## Prerequisites

Before you begin, make sure you have:

- An Ansible Galaxy account (sign in with your GitHub account at https://galaxy.ansible.com)
- A GitHub repository containing your role
- The role follows the standard Ansible role directory structure
- The `ansible-galaxy` CLI installed locally

## Step 1: Structure Your Role Correctly

Galaxy expects a specific directory layout. Your repository should look like this:

```
ansible-role-myapp/
    defaults/
        main.yml          # Default variables users can override
    files/                # Static files to deploy
    handlers/
        main.yml          # Handler definitions
    meta/
        main.yml          # Galaxy metadata (required)
    molecule/
        default/          # Molecule test scenarios
            converge.yml
            molecule.yml
    tasks/
        main.yml          # Main task list
    templates/            # Jinja2 templates
    tests/
        test.yml          # Basic test playbook
    vars/
        main.yml          # Role variables (not meant to be overridden)
    .github/
        workflows/
            ci.yml        # CI pipeline
    LICENSE
    README.md
```

## Step 2: Write the meta/main.yml File

This file is the most important piece. Galaxy reads it to display information about your role:

```yaml
# meta/main.yml - Galaxy metadata for your role
---
galaxy_info:
  role_name: myapp
  author: your_github_username
  description: Install, configure, and manage MyApp on Linux servers
  company: Your Company (optional)
  license: MIT

  min_ansible_version: "2.12"

  platforms:
    - name: Ubuntu
      versions:
        - focal
        - jammy
    - name: EL
      versions:
        - "8"
        - "9"
    - name: Debian
      versions:
        - bullseye
        - bookworm

  galaxy_tags:
    - myapp
    - web
    - deployment
    - linux

dependencies: []
```

Key points about this file:

- `role_name` determines how users reference your role in playbooks
- `platforms` tells users which operating systems you support
- `galaxy_tags` help people find your role when searching
- `min_ansible_version` documents the oldest Ansible version you test against
- `dependencies` lists other Galaxy roles that must be installed alongside yours

## Step 3: Write a Good README

Galaxy renders your README.md on the role page. Include these sections:

```markdown
# Ansible Role: MyApp

Installs and configures MyApp on Ubuntu and RHEL-based systems.

## Requirements

- Ansible 2.12 or later
- Target must have Python 3.8+

## Role Variables

Available variables with their default values:

| Variable | Default | Description |
|----------|---------|-------------|
| `myapp_version` | `"2.5.0"` | Version of MyApp to install |
| `myapp_port` | `8080` | Port MyApp listens on |
| `myapp_config_dir` | `"/etc/myapp"` | Configuration directory |

## Example Playbook

    - hosts: app_servers
      roles:
        - role: your_namespace.myapp
          vars:
            myapp_version: "2.5.0"
            myapp_port: 9090

## License

MIT

## Author

Your Name - your_github_username
```

## Step 4: Tag a Release on GitHub

Galaxy uses Git tags to determine versions. Create a tag for your first release:

```bash
# Commit all changes
git add -A
git commit -m "Prepare role for Galaxy release v1.0.0"

# Create an annotated tag
git tag -a v1.0.0 -m "Initial release"

# Push the tag to GitHub
git push origin main --tags
```

Galaxy recognizes tags in these formats: `v1.0.0`, `1.0.0`, `v1.0`, `1.0`. Stick with semantic versioning.

## Step 5: Import the Role on Galaxy

There are two ways to trigger an import:

### Method 1: Galaxy Web Interface

1. Go to https://galaxy.ansible.com
2. Log in with GitHub
3. Go to "My Content" from the menu
4. Click "Add Content" and then "Import Role from GitHub"
5. Select your repository
6. Click Import

### Method 2: Command Line

Get your Galaxy API token from https://galaxy.ansible.com/me/preferences and then:

```bash
# Import (or re-import) your role from the CLI
ansible-galaxy role import your_github_username ansible-role-myapp \
    --token your_galaxy_api_token
```

You can also set the token as an environment variable:

```bash
# Set the token as an environment variable
export ANSIBLE_GALAXY_TOKEN="your_galaxy_api_token"

# Now import without passing the token flag
ansible-galaxy role import your_github_username ansible-role-myapp
```

## Step 6: Verify the Import

After importing, check the Galaxy web page for your role. Verify that:

- The README renders correctly
- Platform information is accurate
- Tags appear in the sidebar
- Version numbers match your Git tags
- Dependencies are listed if any

You can also verify from the CLI:

```bash
# Check your role info on Galaxy
ansible-galaxy info your_namespace.myapp
```

## Automating Imports with GitHub Actions

Set up automatic re-imports whenever you push a new tag:

```yaml
# .github/workflows/galaxy-import.yml - Auto-import on new tags
---
name: Galaxy Import

on:
  push:
    tags:
      - 'v*'

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install Ansible
        run: pip install ansible-core

      - name: Import to Galaxy
        run: |
          ansible-galaxy role import \
            ${{ github.repository_owner }} \
            $(basename ${{ github.repository }}) \
            --token ${{ secrets.GALAXY_API_TOKEN }}
```

Add your Galaxy API token as a repository secret named `GALAXY_API_TOKEN`.

## Setting Up CI Testing

Roles on Galaxy that have CI badges inspire more confidence. Set up testing with Molecule:

```yaml
# .github/workflows/ci.yml - Test your role before publishing
---
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install ansible-lint
      - run: ansible-lint

  molecule:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        distro: [ubuntu2204, rockylinux9]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install molecule molecule-docker ansible-core
      - run: molecule test
        env:
          MOLECULE_DISTRO: ${{ matrix.distro }}
```

## Updating Your Role

When you make changes and want to publish a new version:

```bash
# Make your changes, commit them
git add -A
git commit -m "Add support for MyApp 3.0 configuration"

# Tag the new version
git tag -a v1.1.0 -m "Add MyApp 3.0 support"

# Push everything
git push origin main --tags
```

If you set up the GitHub Actions workflow, the import happens automatically. Otherwise, trigger it manually.

## Quality Checklist Before Publishing

Before each release, run through this checklist:

- All tasks are idempotent (running the role twice produces no changes)
- Variables have sensible defaults in `defaults/main.yml`
- The role works on all platforms listed in `meta/main.yml`
- Molecule tests pass
- ansible-lint reports no errors
- The README documents all variables and includes an example playbook
- You have tested with the minimum Ansible version you claim to support

## Managing Your Role's Namespace

Your Galaxy namespace matches your GitHub username. If you want a cleaner namespace, create a GitHub organization and publish from there. For example, the namespace `myorg` would come from a GitHub organization named `myorg`.

## Summary

Publishing roles to Ansible Galaxy is a GitHub-centric process: you maintain a properly structured role in a GitHub repo, tag releases with semantic versions, and import them through the Galaxy web UI or CLI. Automate the import with GitHub Actions so new tags trigger re-imports automatically. Focus on quality by running Molecule tests and ansible-lint in CI, and write a thorough README so users know how to configure your role. The community benefits from well-documented, well-tested roles, and Galaxy makes distributing them trivial.
