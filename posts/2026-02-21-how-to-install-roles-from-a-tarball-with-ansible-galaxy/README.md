# How to Install Roles from a Tarball with Ansible Galaxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Roles, Offline Installation

Description: Learn how to install Ansible roles from tarball archives for air-gapped environments, custom distribution, and offline deployments.

---

There are situations where installing Ansible roles from a public server or Git repository is not an option. Air-gapped environments, strict network policies, or custom internal distribution workflows all call for installing roles from tarball files. The `ansible-galaxy` command handles tarballs natively, making it straightforward to package, distribute, and install roles without any network connectivity.

This post covers everything from creating role tarballs to installing them in disconnected environments.

## Why Install from Tarballs?

Several real scenarios make tarball-based installation necessary:

- **Air-gapped production environments** that have zero internet access for security reasons
- **Regulated industries** (healthcare, finance, defense) where all software must be pre-approved and scanned
- **Custom CI/CD pipelines** that build and distribute roles through an artifact repository
- **Bandwidth-constrained environments** where downloading from Galaxy repeatedly is wasteful

## Creating a Role Tarball

First, let us package an existing role into a tarball. If you have a role at `./roles/my_webserver/`, you can create a tarball like this:

```bash
# Package a role directory into a tarball
cd ./roles/
tar czf my_webserver-1.0.0.tar.gz my_webserver/
```

The tarball should contain the role's top-level directory with the standard structure inside:

```
my_webserver/
    defaults/
        main.yml
    handlers/
        main.yml
    meta/
        main.yml
    tasks/
        main.yml
    templates/
    vars/
        main.yml
    README.md
```

The `meta/main.yml` file should contain the role metadata:

```yaml
# meta/main.yml - role metadata
---
galaxy_info:
  role_name: my_webserver
  namespace: myorg
  author: devops_team
  description: Configure and deploy web servers
  license: MIT
  min_ansible_version: "2.12"
  platforms:
    - name: Ubuntu
      versions:
        - jammy
    - name: EL
      versions:
        - "9"

dependencies: []
```

## Installing from a Local Tarball

The simplest installation method uses the file path directly:

```bash
# Install a role from a local tarball
ansible-galaxy install ./my_webserver-1.0.0.tar.gz
```

To control the installation path:

```bash
# Install to a specific directory
ansible-galaxy install ./my_webserver-1.0.0.tar.gz -p ./roles/
```

## Installing from a Tarball URL

If the tarball is hosted on a web server, artifact repository (like Nexus or Artifactory), or cloud storage:

```bash
# Install a role from a URL
ansible-galaxy install https://artifacts.internal.com/ansible/roles/my_webserver-1.0.0.tar.gz
```

This works with any HTTP/HTTPS URL that serves the tarball directly.

## Using requirements.yml with Tarballs

For structured dependency management, list tarball sources in your requirements file:

```yaml
# requirements.yml - roles from various tarball sources
---
roles:
  # From a local file
  - name: my_webserver
    src: file:///opt/ansible-artifacts/my_webserver-1.0.0.tar.gz

  # From an HTTP URL
  - name: my_database
    src: https://artifacts.internal.com/ansible/roles/my_database-2.1.0.tar.gz

  # From an internal artifact server with authentication
  - name: my_loadbalancer
    src: https://artifacts.internal.com/ansible/roles/my_loadbalancer-1.3.0.tar.gz

  # Mix tarballs with Galaxy roles
  - name: geerlingguy.nginx
    version: "3.1.0"
```

Install:

```bash
# Install all roles from the requirements file
ansible-galaxy install -r requirements.yml -p ./roles/
```

## Building a Role Distribution Script

For teams that regularly build and distribute roles, a build script helps standardize the process:

```bash
#!/bin/bash
# build-role-tarball.sh - Build a distributable tarball from a role
set -e

ROLE_DIR="$1"
OUTPUT_DIR="${2:-.}"

if [ -z "$ROLE_DIR" ]; then
    echo "Usage: $0 <role-directory> [output-directory]"
    exit 1
fi

# Extract role name from meta/main.yml
ROLE_NAME=$(python3 -c "
import yaml
with open('${ROLE_DIR}/meta/main.yml') as f:
    meta = yaml.safe_load(f)
    print(meta['galaxy_info']['role_name'])
")

# Get version from a VERSION file or default to 0.0.1
VERSION="0.0.1"
if [ -f "${ROLE_DIR}/VERSION" ]; then
    VERSION=$(cat "${ROLE_DIR}/VERSION")
fi

TARBALL="${OUTPUT_DIR}/${ROLE_NAME}-${VERSION}.tar.gz"

echo "Building ${TARBALL}..."

# Create the tarball, excluding unnecessary files
tar czf "$TARBALL" \
    --exclude='.git' \
    --exclude='.gitignore' \
    --exclude='tests/' \
    --exclude='molecule/' \
    --exclude='*.retry' \
    -C "$(dirname "$ROLE_DIR")" \
    "$(basename "$ROLE_DIR")"

echo "Built: ${TARBALL}"
echo "Size: $(du -h "$TARBALL" | cut -f1)"

# Generate a checksum for verification
sha256sum "$TARBALL" > "${TARBALL}.sha256"
echo "Checksum: ${TARBALL}.sha256"
```

## Setting Up an Offline Role Repository

For air-gapped environments, you need a process to download all roles in a connected environment and transfer them offline:

```bash
#!/bin/bash
# prepare-offline-roles.sh - Download roles for offline use
set -e

STAGING_DIR="./offline-roles"
mkdir -p "$STAGING_DIR"

# Step 1: Install roles from Galaxy in the connected environment
ansible-galaxy install -r requirements.yml -p "$STAGING_DIR/installed/"

# Step 2: Package each installed role as a tarball
for role_dir in "$STAGING_DIR/installed"/*/; do
    role_name=$(basename "$role_dir")
    echo "Packaging ${role_name}..."
    tar czf "$STAGING_DIR/${role_name}.tar.gz" -C "$STAGING_DIR/installed" "$role_name"
done

# Step 3: Generate a requirements file that references the tarballs
echo "---" > "$STAGING_DIR/requirements-offline.yml"
echo "roles:" >> "$STAGING_DIR/requirements-offline.yml"
for tarball in "$STAGING_DIR"/*.tar.gz; do
    role_name=$(basename "$tarball" .tar.gz)
    echo "  - name: ${role_name}" >> "$STAGING_DIR/requirements-offline.yml"
    echo "    src: file://$(realpath "$tarball")" >> "$STAGING_DIR/requirements-offline.yml"
done

echo "Offline package ready in ${STAGING_DIR}/"
echo "Transfer this directory to the air-gapped environment and run:"
echo "  ansible-galaxy install -r ${STAGING_DIR}/requirements-offline.yml -p ./roles/"
```

## Verifying Tarball Integrity

When transferring tarballs between environments, verify them with checksums:

```bash
# Generate checksums for all role tarballs
sha256sum *.tar.gz > checksums.sha256

# Verify checksums after transfer
sha256sum -c checksums.sha256
```

You can automate verification in your installation script:

```bash
#!/bin/bash
# install-verified-roles.sh - Install roles after verifying checksums
set -e

TARBALL_DIR="./offline-roles"
ROLES_DIR="./roles"

# Verify all tarballs
echo "Verifying tarball integrity..."
cd "$TARBALL_DIR"
sha256sum -c checksums.sha256
cd -

# Install each tarball
for tarball in "$TARBALL_DIR"/*.tar.gz; do
    echo "Installing $(basename "$tarball")..."
    ansible-galaxy install "$tarball" -p "$ROLES_DIR"
done

echo "All roles installed and verified."
```

## Hosting Tarballs on an Artifact Server

If your organization uses Nexus, Artifactory, or a similar artifact repository, you can upload role tarballs there and reference them in your requirements file:

```yaml
# requirements.yml - roles from an artifact server
---
roles:
  - name: my_webserver
    src: https://nexus.internal.com/repository/ansible-roles/my_webserver-1.0.0.tar.gz

  - name: my_database
    src: https://nexus.internal.com/repository/ansible-roles/my_database-2.1.0.tar.gz
```

If the artifact server requires authentication, configure it in your `ansible.cfg`:

```ini
# ansible.cfg - configure HTTP authentication for tarball downloads
[galaxy]
token = your_api_token
```

Or use environment variables in your CI pipeline:

```bash
# Upload a role tarball to Nexus
curl -u "${NEXUS_USER}:${NEXUS_PASS}" \
    --upload-file my_webserver-1.0.0.tar.gz \
    "https://nexus.internal.com/repository/ansible-roles/my_webserver-1.0.0.tar.gz"
```

## Troubleshooting Tarball Installation

**"Unable to determine role name" error.** This happens when the tarball structure is wrong. The tarball must contain a single top-level directory with the role contents inside it. A flat tarball with files at the root will not work.

**Missing meta/main.yml.** Galaxy expects this file to identify the role. Add one with at minimum the `galaxy_info` section.

**Permission denied.** Check file permissions on the tarball and the target roles directory.

**Corrupt archive.** Verify with `tar tzf myfile.tar.gz` that the contents list properly. If not, re-download or re-transfer the file.

## Summary

Installing Ansible roles from tarballs is essential for air-gapped environments and custom distribution workflows. You can create tarballs from existing roles, host them on artifact servers, and reference them in `requirements.yml` just like Galaxy-hosted roles. Combine this with checksum verification and you have a secure, reproducible way to manage Ansible dependencies without any internet connectivity. The key is to build a repeatable process around packaging, distributing, and verifying tarballs so that your offline environments stay in sync with your development environment.
