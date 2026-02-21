# How to Publish Ansible Roles to Galaxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Roles, Publishing

Description: A step-by-step guide to publishing your Ansible roles on Ansible Galaxy including metadata, testing, quality standards, and maintenance.

---

Ansible Galaxy is the community hub for sharing Ansible roles. Publishing your roles there makes them installable with a single command by anyone in the Ansible community. This post walks through the entire process: preparing your role, setting up the metadata, connecting to Galaxy, importing your role, and maintaining it over time.

## Prerequisites

Before you publish, you need:

1. A GitHub account (Galaxy imports roles from GitHub)
2. An Ansible Galaxy account (sign in with GitHub at galaxy.ansible.com)
3. A role in a public GitHub repository
4. The role must follow Ansible's standard directory structure

## Step 1: Prepare Your Role

Ensure your role follows the standard structure:

```
ansible-role-nginx/
  defaults/
    main.yml
  handlers/
    main.yml
  meta/
    main.yml
  tasks/
    main.yml
  templates/
  files/
  vars/
    main.yml
  tests/
    inventory
    test.yml
  README.md
  LICENSE
  .gitignore
```

The repository name should follow the convention `ansible-role-<name>`. Galaxy strips the `ansible-role-` prefix when importing, so `ansible-role-nginx` becomes `yournamespace.nginx`.

## Step 2: Configure meta/main.yml

The `meta/main.yml` file is what Galaxy reads to understand your role. Fill it out completely:

```yaml
# meta/main.yml
# Galaxy metadata - this information appears on your role's Galaxy page
---
galaxy_info:
  role_name: nginx
  author: nawazdhandala
  description: Installs and configures Nginx web server with virtual host support
  company: ""

  license: MIT

  min_ansible_version: "2.14"

  platforms:
    - name: Ubuntu
      versions:
        - focal
        - jammy
    - name: Debian
      versions:
        - bullseye
        - bookworm
    - name: EL
      versions:
        - "8"
        - "9"

  galaxy_tags:
    - nginx
    - web
    - webserver
    - proxy
    - reverseproxy

dependencies: []
```

### Key Fields Explained

- **role_name**: The name users will install with (`ansible-galaxy install yourname.nginx`)
- **author**: Your Galaxy username
- **description**: Shows in search results; make it descriptive
- **platforms**: Tells users what OS versions are supported
- **galaxy_tags**: Used for search and categorization; limit to 20 tags
- **min_ansible_version**: The minimum Ansible version your role supports

## Step 3: Write a Good README

Your README is the first thing people see on Galaxy. Include these sections:

```markdown
# Ansible Role: Nginx

Installs and configures Nginx on Debian and RHEL-based systems.

## Requirements

- Ansible 2.14 or higher
- Target OS: Ubuntu 20.04+, Debian 11+, RHEL 8+, Rocky 8+

## Role Variables

Available variables are listed below, along with default values
(see `defaults/main.yml`):

### Required Variables

None. The role works with default values.

### Optional Variables

```yaml
nginx_port: 80                    # Port Nginx listens on
nginx_worker_processes: auto      # Number of worker processes
nginx_worker_connections: 1024    # Max connections per worker
nginx_server_name: localhost      # Default server name
nginx_enable_tls: false           # Enable HTTPS
```

## Dependencies

None.

## Example Playbook

```yaml
- hosts: web_servers
  roles:
    - role: yourname.nginx
      vars:
        nginx_port: 8080
        nginx_server_name: app.example.com
```

## License

MIT

## Author Information

Created by [nawazdhandala](https://github.com/nawazdhandala).
```

## Step 4: Add a LICENSE File

Galaxy expects a license file. Common choices for Ansible roles:

```bash
# Create a standard MIT license
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 nawazdhandala

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

## Step 5: Add Tests

Galaxy users look for tested roles. At minimum, include a test playbook:

```yaml
# tests/test.yml
---
- hosts: localhost
  remote_user: root
  roles:
    - ansible-role-nginx
```

Better yet, add Molecule tests:

```yaml
# molecule/default/molecule.yml
---
dependency:
  name: galaxy
driver:
  name: docker
platforms:
  - name: ubuntu-22
    image: ubuntu:22.04
    pre_build_image: true
provisioner:
  name: ansible
verifier:
  name: ansible
```

## Step 6: Get Your Galaxy API Token

1. Go to https://galaxy.ansible.com
2. Sign in with your GitHub account
3. Click your username in the top right, then "API Token"
4. Copy the token

Store the token for CLI use:

```bash
# Option 1: Set it in your shell environment
export ANSIBLE_GALAXY_TOKEN="your-token-here"

# Option 2: Store it in a file
echo "your-token-here" > ~/.ansible/galaxy_token
```

## Step 7: Import Your Role

Galaxy imports roles directly from GitHub. You can trigger an import via the web UI or CLI.

### Via CLI

```bash
# Import a role from GitHub
ansible-galaxy role import your-github-username ansible-role-nginx
```

If your Galaxy username differs from your GitHub username:

```bash
# Specify the Galaxy namespace explicitly
ansible-galaxy role import --role-name nginx your-github-username ansible-role-nginx
```

### Via Web UI

1. Go to https://galaxy.ansible.com
2. Click "My Content" in the left sidebar
3. Click "Add Content" and select your GitHub repository
4. Galaxy imports the role automatically

## Step 8: Verify the Import

After importing, check that your role appears correctly:

```bash
# Search for your role
ansible-galaxy search nginx --author your-username

# Get info about your role
ansible-galaxy info your-username.nginx
```

Visit your role's page on Galaxy to verify:
- Description is correct
- Platform information is displayed
- Tags are listed
- README renders properly

## Step 9: Test Installation

Verify that others can install your role:

```bash
# Install your published role
ansible-galaxy install your-username.nginx

# Check it was installed correctly
ansible-galaxy list | grep nginx
```

## Automating Imports with GitHub Actions

Set up automatic Galaxy imports whenever you push a new tag:

```yaml
# .github/workflows/galaxy-import.yml
name: Import to Galaxy

on:
  push:
    tags:
      - 'v*'

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Galaxy import
        uses: robertdebock/galaxy-action@1.2.1
        with:
          galaxy_api_key: ${{ secrets.GALAXY_API_KEY }}
```

Store your Galaxy API token as a GitHub Actions secret named `GALAXY_API_KEY`.

## Adding a Quality Badge

Galaxy provides a quality score for roles. Display it in your README:

```markdown
[![Ansible Galaxy](https://img.shields.io/badge/galaxy-your--username.nginx-blue.svg)](https://galaxy.ansible.com/your-username/nginx)
```

Also add CI badges to show your tests pass:

```markdown
[![CI](https://github.com/your-username/ansible-role-nginx/workflows/CI/badge.svg)](https://github.com/your-username/ansible-role-nginx/actions)
```

## Maintaining Your Published Role

### Updating the Role

When you push changes to GitHub, reimport:

```bash
# Reimport after pushing changes
ansible-galaxy role import your-github-username ansible-role-nginx
```

Or set up automatic imports with the GitHub Action above.

### Versioning

Galaxy uses your Git tags as version numbers. When you create a new release:

```bash
# Tag a new version
git tag -a v1.1.0 -m "Add TLS support"
git push origin v1.1.0
```

Users can install specific versions:

```bash
# Install a specific version
ansible-galaxy install your-username.nginx,v1.1.0
```

### Deprecating a Role

If you want to discontinue a role:

1. Update the README to indicate deprecation
2. Add a note in the description
3. Optionally, redirect users to a replacement

```yaml
# meta/main.yml
galaxy_info:
  description: "[DEPRECATED] Use myorg.infrastructure.nginx collection instead"
```

## Quality Checklist Before Publishing

Before publishing, verify:

```bash
# Syntax check
ansible-playbook tests/test.yml --syntax-check

# Lint your role
ansible-lint

# Run Molecule tests
molecule test

# Verify meta/main.yml is complete
ansible-galaxy role info . 2>&1 | head -20
```

### Common Quality Issues

1. **Missing platforms in meta/main.yml**: Galaxy shows "No platforms" which discourages users
2. **Empty description**: Makes your role hard to find in search
3. **No README**: Galaxy shows a blank page
4. **No license**: Some organizations cannot use unlicensed code
5. **Failing tests**: Users check the CI badge before installing

## Galaxy vs Collections

Ansible Galaxy supports both standalone roles and collections. The community is moving toward collections for new content. Consider publishing as a collection if:

- You have multiple related roles
- You also have custom modules or plugins
- You want namespace-level organization

Standalone roles are still appropriate for:

- Single-purpose automation
- Quick sharing without the collection overhead
- Roles that are used independently

## Wrapping Up

Publishing to Ansible Galaxy makes your role available to the entire Ansible community with a simple `ansible-galaxy install` command. The process is straightforward: prepare your metadata in `meta/main.yml`, write a clear README, add tests, connect your GitHub account to Galaxy, and import. Automate the import with GitHub Actions so new releases appear on Galaxy automatically. The initial setup takes about 30 minutes, and the maintenance is minimal, mostly just reimporting when you push new versions. If you have built a role that solves a real problem, publishing it to Galaxy is the best way to share it.
