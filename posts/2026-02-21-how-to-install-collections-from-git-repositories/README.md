# How to Install Collections from Git Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Collections, Git, Version Control

Description: How to install Ansible collections directly from Git repositories including GitHub, GitLab, private repos, and subdirectory support.

---

While Ansible Galaxy is the standard distribution channel for collections, there are times when you need to install a collection directly from a Git repository. Maybe the collection is under active development and has not been published yet. Maybe it is an internal collection that lives in your organization's GitLab. Or maybe you need a specific commit that has not been released as a tagged version. Ansible Galaxy supports all these cases.

## Basic Installation from Git

Install a collection from a Git repository with the `git+` prefix:

```bash
# Install a collection from a public Git repository
ansible-galaxy collection install git+https://github.com/ansible-collections/community.general.git
```

This clones the repository and installs whatever version is at the default branch (usually `main` or `master`).

## Specifying a Version

Use a comma to separate the URL from the version. The version can be a tag, branch, or commit hash:

```bash
# Install from a specific tag
ansible-galaxy collection install git+https://github.com/ansible-collections/community.general.git,8.1.0

# Install from a specific branch
ansible-galaxy collection install git+https://github.com/ansible-collections/community.general.git,stable-8

# Install from a specific commit
ansible-galaxy collection install git+https://github.com/ansible-collections/community.general.git,a1b2c3d4
```

## Using requirements.yml

For project-based dependency management, reference Git repositories in your requirements file:

```yaml
# requirements.yml - collections from Git repositories
---
collections:
  # From a public GitHub repository
  - name: https://github.com/myorg/ansible-collection-tools.git
    type: git
    version: v1.2.0

  # From a private GitLab repository
  - name: https://gitlab.internal.com/infra/ansible-collection-infra.git
    type: git
    version: main

  # From a specific commit
  - name: https://github.com/myorg/ansible-collection-experimental.git
    type: git
    version: a1b2c3d4e5f6

  # Mix Git sources with Galaxy sources
  - name: community.general
    version: "8.1.0"

  - name: ansible.posix
    version: "1.5.4"
```

Install everything:

```bash
# Install all collections including Git-sourced ones
ansible-galaxy collection install -r requirements.yml -p ./collections/
```

## Private Repositories with SSH

For private repos, SSH is the most common authentication method:

```yaml
# requirements.yml - private repos via SSH
---
collections:
  - name: git@github.com:myorg/ansible-collection-internal.git
    type: git
    version: v1.0.0

  - name: git@gitlab.internal.com:infra/ansible-collection-platform.git
    type: git
    version: v2.3.0
```

Make sure your SSH key is loaded:

```bash
# Start SSH agent and add your key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Verify you can connect
ssh -T git@github.com
ssh -T git@gitlab.internal.com

# Now install collections
ansible-galaxy collection install -r requirements.yml
```

In CI/CD, use deploy keys:

```yaml
# .github/workflows/deploy.yml - SSH key setup for private repos
---
name: Deploy

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up SSH for private repos
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan github.com >> ~/.ssh/known_hosts
          ssh-keyscan gitlab.internal.com >> ~/.ssh/known_hosts

          # Configure SSH to use the deploy key
          cat >> ~/.ssh/config << 'EOF'
          Host github.com
              IdentityFile ~/.ssh/deploy_key
              StrictHostKeyChecking accept-new

          Host gitlab.internal.com
              IdentityFile ~/.ssh/deploy_key
              StrictHostKeyChecking accept-new
          EOF

      - name: Install collections
        run: ansible-galaxy collection install -r requirements.yml -p ./collections/
```

## Private Repositories with HTTPS Tokens

For HTTPS access with a personal access token:

```bash
# Install using a token in the URL
ansible-galaxy collection install \
    "git+https://${GITHUB_TOKEN}@github.com/myorg/ansible-collection-internal.git,v1.0.0"
```

In a requirements file, use a templated approach since Jinja2 is not processed:

```bash
#!/bin/bash
# install-collections.sh - Install with token injection
set -e

# Replace placeholder in requirements template
sed "s|__GITHUB_TOKEN__|${GITHUB_TOKEN}|g" requirements.yml.tmpl > requirements.yml

# Install
ansible-galaxy collection install -r requirements.yml -p ./collections/

# Clean up the file with the token
rm requirements.yml
```

The template:

```yaml
# requirements.yml.tmpl
---
collections:
  - name: https://__GITHUB_TOKEN__@github.com/myorg/ansible-collection-internal.git
    type: git
    version: v1.0.0
```

## Collections in Subdirectories

Sometimes a Git repository contains a collection in a subdirectory rather than at the root. Use the `#` fragment to specify the path:

```bash
# Install from a subdirectory within the repo
ansible-galaxy collection install \
    "git+https://github.com/myorg/mono-repo.git#/collections/myorg/tools,v1.0.0"
```

In requirements.yml:

```yaml
# requirements.yml - collection in a subdirectory
---
collections:
  - name: https://github.com/myorg/mono-repo.git#/collections/myorg/tools
    type: git
    version: v1.0.0
```

The subdirectory must contain a valid `galaxy.yml` file.

## Monorepo with Multiple Collections

If a single repository contains multiple collections:

```yaml
# requirements.yml - multiple collections from one repo
---
collections:
  - name: https://github.com/myorg/ansible-collections.git#/myorg/networking
    type: git
    version: v1.0.0

  - name: https://github.com/myorg/ansible-collections.git#/myorg/security
    type: git
    version: v1.0.0

  - name: https://github.com/myorg/ansible-collections.git#/myorg/monitoring
    type: git
    version: v1.0.0
```

## Repository Requirements

For Galaxy to install from a Git repo, the repo must contain a `galaxy.yml` file (at the root or in the specified subdirectory):

```yaml
# galaxy.yml - required at the root of the collection
---
namespace: myorg
name: tools
version: 1.0.0
readme: README.md
authors:
  - Platform Team
description: Internal tools collection
license:
  - MIT
dependencies: {}
```

Without this file, installation fails with an error about missing metadata.

## Caching and Performance

Git-based installations are slower than Galaxy installs because they require cloning the full repository. To speed things up:

```bash
# Use shallow clones by setting GIT_DEPTH (if supported)
export GIT_CLONE_DEPTH=1

# Or use a local mirror for frequently used repos
git clone --mirror https://github.com/myorg/ansible-collection-tools.git /opt/git-mirrors/collection-tools.git

# Then reference the local mirror
ansible-galaxy collection install "git+file:///opt/git-mirrors/collection-tools.git,v1.0.0"
```

## Verifying Git-Sourced Collections

After installation, verify the collection is correct:

```bash
# List installed collections to verify
ansible-galaxy collection list -p ./collections/

# Check the installed version
cat ./collections/ansible_collections/myorg/tools/MANIFEST.json | python3 -m json.tool | head -20
```

## Mixing Git and Galaxy Sources

A real-world requirements file typically mixes sources:

```yaml
# requirements.yml - production dependencies from mixed sources
---
collections:
  # Certified collections from Galaxy
  - name: community.general
    version: "8.1.0"

  - name: ansible.posix
    version: "1.5.4"

  # Internal collections from Git
  - name: git@github.com:myorg/ansible-collection-platform.git
    type: git
    version: v2.0.0

  - name: git@github.com:myorg/ansible-collection-security.git
    type: git
    version: v1.5.0

  # Development collection from a branch (dev only)
  # - name: git@github.com:myorg/ansible-collection-experimental.git
  #   type: git
  #   version: feature/new-modules
```

## Summary

Installing Ansible collections from Git repositories gives you flexibility to use unreleased code, internal collections, and specific commits. The `git+` prefix works with both HTTPS and SSH URLs, and you can specify tags, branches, or commit hashes as versions. For private repos, configure SSH keys or HTTPS tokens. Subdirectory support with the `#` fragment handles monorepos. Always pin to a tag or commit hash for production use, and mix Git sources with Galaxy sources in a single requirements file to manage all your dependencies in one place.
