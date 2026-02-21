# How to Install Ansible Collections from Git

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Git, Collections, DevOps, Version Control

Description: How to install Ansible collections directly from Git repositories including GitHub, GitLab, and private repos with branch and tag pinning.

---

Sometimes you need a collection that is not published to Galaxy yet, or you want to use a development branch with a bug fix that has not been released. In these situations, installing Ansible collections directly from Git repositories is the answer. This approach is also common when developing your own collections and testing them in playbooks before publishing.

This guide covers all the ways to install collections from Git, including public and private repositories, branch pinning, and how to set this up in your requirements files.

## Basic Git Installation

The simplest way to install a collection from Git is to pass the repository URL to `ansible-galaxy`:

```bash
# Install a collection from a public GitHub repository
ansible-galaxy collection install git+https://github.com/ansible-collections/community.docker.git
```

The `git+` prefix tells `ansible-galaxy` to treat the URL as a Git repository rather than a Galaxy reference. The tool clones the repo, builds the collection, and installs it to your collections path.

## Pinning to a Branch, Tag, or Commit

You almost always want to pin to a specific version when installing from Git. Use a comma to separate the URL from the version reference:

```bash
# Install from a specific branch
ansible-galaxy collection install git+https://github.com/ansible-collections/community.docker.git,main

# Install from a specific tag
ansible-galaxy collection install git+https://github.com/ansible-collections/community.docker.git,3.8.0

# Install from a specific commit hash
ansible-galaxy collection install git+https://github.com/ansible-collections/community.docker.git,a1b2c3d4e5f6
```

Tags are the safest option for reproducible installations because they point to a fixed commit. Branches can change over time, and commit hashes, while precise, are not human-readable.

## Installing from a Subdirectory

Some repositories contain multiple collections or have the collection in a subdirectory rather than the repository root. Use the `--subdirectory` option or the URL fragment to handle this:

```bash
# Install from a subdirectory within the repository
ansible-galaxy collection install git+https://github.com/org/ansible-collections.git#subdirectory=docker,main
```

The URL fragment `#subdirectory=docker` tells ansible-galaxy to look for the collection structure inside the `docker` directory of the repository.

## Using requirements.yml with Git Sources

For project-level dependency management, define your Git-sourced collections in `requirements.yml`:

```yaml
# requirements.yml - Collections from Git repositories
---
collections:
  # Install from a specific tag
  - name: https://github.com/ansible-collections/community.docker.git
    type: git
    version: 3.8.0

  # Install from a branch
  - name: https://github.com/ansible-collections/community.postgresql.git
    type: git
    version: main

  # Install from a commit
  - name: https://github.com/org/custom-collection.git
    type: git
    version: a1b2c3d4e5f6

  # Mix Git and Galaxy sources
  - name: ansible.posix
    version: "1.5.4"
    # No type field means Galaxy (default)
```

Install everything with the usual command:

```bash
# Install all collections including Git sources
ansible-galaxy collection install -r requirements.yml
```

## Installing from Private Repositories

Private Git repositories require authentication. There are several ways to handle this depending on your Git hosting platform and environment.

**SSH authentication** is the cleanest approach if your SSH keys are set up:

```bash
# Install from a private repo using SSH
ansible-galaxy collection install git+git@github.com:my-org/private-collection.git,v1.2.0
```

In a requirements file:

```yaml
# requirements.yml - Private repository via SSH
---
collections:
  - name: git@github.com:my-org/private-collection.git
    type: git
    version: v1.2.0
```

**HTTPS with token authentication** works well in CI/CD pipelines where SSH keys might not be available:

```bash
# Install using a personal access token in the URL
ansible-galaxy collection install git+https://oauth2:${GITLAB_TOKEN}@gitlab.com/my-org/private-collection.git,v1.2.0

# For GitHub, use the token as the username
ansible-galaxy collection install git+https://${GITHUB_TOKEN}@github.com/my-org/private-collection.git,v1.2.0
```

**Git credential helpers** allow you to avoid putting tokens in URLs:

```bash
# Configure Git to use a credential helper
git config --global credential.helper store

# Or use the GitHub CLI as a credential helper
gh auth setup-git
```

Once configured, `ansible-galaxy` picks up the credentials automatically when cloning.

## Installing from GitLab and Bitbucket

The Git installation method works with any Git hosting platform, not just GitHub:

```bash
# Install from GitLab
ansible-galaxy collection install git+https://gitlab.com/namespace/my-collection.git,v1.0.0

# Install from Bitbucket
ansible-galaxy collection install git+https://bitbucket.org/namespace/my-collection.git,v1.0.0

# Install from a self-hosted Git server
ansible-galaxy collection install git+https://git.internal.company.com/ansible/my-collection.git,v1.0.0
```

The requirements file syntax is the same regardless of the hosting platform:

```yaml
# requirements.yml - Multiple Git platforms
---
collections:
  - name: https://gitlab.com/namespace/collection-a.git
    type: git
    version: v2.1.0

  - name: https://bitbucket.org/namespace/collection-b.git
    type: git
    version: main

  - name: https://git.internal.company.com/ansible/collection-c.git
    type: git
    version: v1.5.0
```

## Repository Structure Requirements

For `ansible-galaxy` to install a collection from Git, the repository must contain certain files. At minimum, you need a `galaxy.yml` file at the root (or at the subdirectory root if using `#subdirectory`).

Here is the minimum structure that ansible-galaxy expects:

```
my-collection/
  galaxy.yml          # Required: Collection metadata
  plugins/            # Optional: Modules and plugins
    modules/
  roles/              # Optional: Roles
  README.md           # Optional but recommended
```

The `galaxy.yml` file must contain the namespace and collection name:

```yaml
# galaxy.yml - Minimum required metadata
---
namespace: my_org
name: my_collection
version: 1.0.0
description: My custom collection
authors:
  - Your Name <your.email@example.com>
```

If the repository is missing `galaxy.yml`, the install will fail with an error about not being able to determine the collection metadata.

## Development Workflow: Using Git Collections Locally

When you are developing a collection and want to test it in a playbook without publishing, you have two options.

**Option 1: Install from local Git repository**

```bash
# Install from a local Git repo on your filesystem
ansible-galaxy collection install git+file:///home/user/projects/my-collection,dev-branch
```

**Option 2: Symlink for rapid iteration**

For faster development cycles, symlink the collection into your collections path:

```bash
# Create the namespace directory
mkdir -p ~/.ansible/collections/ansible_collections/my_org

# Symlink the collection
ln -s /home/user/projects/my-collection ~/.ansible/collections/ansible_collections/my_org/my_collection
```

The symlink approach means changes are reflected immediately without reinstalling. This is the fastest option during active development.

## CI/CD Pipeline Example

Here is a practical example of installing Git-sourced collections in a CI pipeline:

```yaml
# .github/workflows/deploy.yml - GitHub Actions example
---
name: Deploy with Ansible
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
          python-version: "3.11"

      - name: Install Ansible
        run: pip install ansible-core==2.16.3

      - name: Configure SSH for private repos
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan github.com >> ~/.ssh/known_hosts

      - name: Install collections
        run: ansible-galaxy collection install -r requirements.yml -p ./collections

      - name: Run playbook
        run: |
          export ANSIBLE_COLLECTIONS_PATH=./collections
          ansible-playbook -i inventory/production playbooks/deploy.yml
```

## Troubleshooting Git Installations

```mermaid
flowchart TD
    A[Install from Git fails] --> B{What error?}
    B --> C[Clone failed] --> D[Check URL, auth, network]
    B --> E[No galaxy.yml] --> F[Check repo structure]
    B --> G[Build failed] --> H[Check galaxy.yml content]
    B --> I[Version not found] --> J[Check branch/tag name]
    D --> K[Try cloning manually with git clone]
    F --> L[Ensure galaxy.yml is at repo root or use subdirectory]
    H --> M[Validate namespace and name fields]
    J --> N[List tags with git ls-remote]
```

A few common problems:

**"Failed to clone" errors**: Try cloning the repository manually with `git clone` to see if the issue is with Git itself (authentication, network) or with ansible-galaxy.

**"Unable to find metadata" errors**: The repository is missing `galaxy.yml` or it is in a subdirectory. Use `#subdirectory=path` in the URL to point to the right location.

**Version not found**: Make sure the tag or branch name is correct. List remote tags with `git ls-remote --tags <repo-url>`.

```bash
# List available tags in a remote repository
git ls-remote --tags https://github.com/ansible-collections/community.docker.git
```

## Conclusion

Installing Ansible collections from Git gives you flexibility that Galaxy alone cannot provide. Whether you need unreleased fixes, want to test development branches, or distribute internal collections through private repositories, Git-based installation handles it. Pin to tags for production use, use SSH for authentication when possible, and keep your requirements.yml as the single source of truth for all your collection dependencies regardless of where they come from.
