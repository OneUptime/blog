# How to Install Collections from Ansible Galaxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Collections, Automation

Description: Step-by-step guide to installing Ansible collections from Galaxy including version pinning, offline installs, and namespace management.

---

Collections are the modern packaging format in Ansible. Since Ansible 2.10, most modules and plugins ship as collections rather than being bundled with ansible-core. If you need the AWS modules, you install the `amazon.aws` collection. If you need VMware support, you grab `community.vmware`. This post covers all the ways to install collections from Ansible Galaxy.

## What Is a Collection?

A collection is a distribution format that bundles modules, plugins, roles, and playbooks into a single installable package. Unlike standalone roles, collections have proper namespacing and can contain multiple roles, modules, and even custom module utilities.

The naming convention is `namespace.collection_name`, for example:
- `community.general` - a grab-bag of community modules
- `ansible.posix` - POSIX-related modules
- `amazon.aws` - AWS modules

## Basic Collection Installation

Install a collection with the `ansible-galaxy collection install` command:

```bash
# Install the community.general collection
ansible-galaxy collection install community.general
```

By default, this installs to `~/.ansible/collections/ansible_collections/`. You can verify:

```bash
# List all installed collections
ansible-galaxy collection list
```

## Installing a Specific Version

Just like roles, you should pin collection versions for production use:

```bash
# Install a specific version of a collection
ansible-galaxy collection install community.general:8.1.0
```

The version delimiter for collections is a colon, not a comma like roles. You can also use version constraints:

```bash
# Install with a version constraint
ansible-galaxy collection install 'community.general:>=8.0.0,<9.0.0'
```

## Installing to a Custom Path

To keep collections alongside your project:

```bash
# Install collections into a project-local directory
ansible-galaxy collection install community.general -p ./collections/
```

Update your `ansible.cfg` to include this path:

```ini
# ansible.cfg - configure collection search paths
[defaults]
collections_path = ./collections:~/.ansible/collections
```

The colon-separated list means Ansible will look in your project directory first, then fall back to the user-level directory.

## Using a requirements.yml File

For projects with multiple collection dependencies, use a `requirements.yml`:

```yaml
# requirements.yml - declare collection dependencies
---
collections:
  - name: community.general
    version: "8.1.0"

  - name: amazon.aws
    version: "7.2.0"

  - name: ansible.posix
    version: "1.5.4"

  - name: community.docker
    version: "3.7.0"

  - name: community.postgresql
    version: "3.3.0"
```

Install everything:

```bash
# Install all collections from requirements file
ansible-galaxy collection install -r requirements.yml
```

Force upgrade all collections:

```bash
# Force reinstall all collections
ansible-galaxy collection install -r requirements.yml --force
```

## Installing from a Tarball

Collections can be distributed as tarball files. This is useful for air-gapped environments or when you build collections locally:

```bash
# Install a collection from a local tarball
ansible-galaxy collection install ./my_namespace-my_collection-1.0.0.tar.gz
```

You can also point to a URL:

```bash
# Install a collection from a URL
ansible-galaxy collection install https://example.com/releases/my_namespace-my_collection-1.0.0.tar.gz
```

## Installing from Git

Collections can be installed directly from Git repositories:

```yaml
# requirements.yml - install collection from Git
---
collections:
  - name: https://github.com/myorg/my_collection.git
    type: git
    version: v1.2.0
```

Or from the command line:

```bash
# Install collection directly from a Git repo
ansible-galaxy collection install git+https://github.com/myorg/my_collection.git,v1.2.0
```

The repository must contain a `galaxy.yml` file at the root (or in a subdirectory that you specify).

## Downloading Collections for Offline Use

If you need to install collections in an environment without internet access, download them first:

```bash
# Download collections without installing them
ansible-galaxy collection download community.general -p ./collection-tarballs/

# Download everything from requirements
ansible-galaxy collection download -r requirements.yml -p ./collection-tarballs/
```

Then transfer the tarballs to the target machine and install:

```bash
# Install from the downloaded tarballs
ansible-galaxy collection install -r requirements.yml -p ./collections/ --offline
```

## Understanding the Collection Directory Structure

After installation, a collection has this layout:

```
~/.ansible/collections/ansible_collections/community/general/
    docs/                    # Documentation
    meta/                    # Collection metadata
        runtime.yml          # Module routing and deprecation info
    plugins/
        modules/             # All modules in the collection
        module_utils/        # Shared Python utilities
        inventory/           # Inventory plugins
        callback/            # Callback plugins
        connection/          # Connection plugins
        filter/              # Filter plugins
        lookup/              # Lookup plugins
    roles/                   # Roles bundled in the collection
    playbooks/               # Playbooks bundled in the collection
    MANIFEST.json            # Package manifest
    FILES.json               # File listing with checksums
```

## Using Installed Collections in Playbooks

Reference collection modules with their fully qualified collection name (FQCN):

```yaml
# playbook.yml - using collection modules with FQCN
---
- hosts: databases
  become: true
  tasks:
    - name: Create a PostgreSQL database
      community.postgresql.postgresql_db:
        name: myapp_production
        state: present

    - name: Create a PostgreSQL user
      community.postgresql.postgresql_user:
        name: myapp
        password: "{{ db_password }}"
        db: myapp_production
        priv: "ALL"
        state: present
```

You can also use the `collections` keyword to set a default namespace:

```yaml
# playbook.yml - using the collections keyword
---
- hosts: databases
  become: true
  collections:
    - community.postgresql
  tasks:
    - name: Create a PostgreSQL database
      postgresql_db:
        name: myapp_production
        state: present
```

However, using FQCNs is the recommended practice because it makes your playbooks explicit about which module comes from where.

## Handling Collection Dependencies

Collections can depend on other collections. These dependencies are declared in `galaxy.yml` and Galaxy handles resolution automatically. You can see a collection's dependencies with:

```bash
# Check collection metadata including dependencies
ansible-galaxy collection verify community.general 2>&1 | head -20

# Or look at the installed manifest
cat ~/.ansible/collections/ansible_collections/community/general/MANIFEST.json | python3 -m json.tool | grep -A 20 dependencies
```

## Upgrading Collections

To upgrade a single collection:

```bash
# Upgrade a collection to the latest version
ansible-galaxy collection install community.general --upgrade
```

To upgrade all collections from your requirements file:

```bash
# Upgrade all collections
ansible-galaxy collection install -r requirements.yml --upgrade
```

The `--upgrade` flag (or `-U`) tells Galaxy to check for newer versions even if the collection is already installed.

## Troubleshooting Installation Issues

**Namespace conflicts.** If you see errors about conflicting namespaces, it usually means you have a collection installed in multiple paths. Check all paths with `ansible-galaxy collection list` and remove duplicates.

**Version resolution failures.** When collections have incompatible dependency requirements, Galaxy will report an error. The fix is usually to update your version constraints to find a compatible set.

**Checksum mismatches.** If a downloaded tarball is corrupted, you will see checksum errors. Re-download the collection and try again.

```bash
# Verbose output helps debug installation issues
ansible-galaxy collection install community.general -vvv
```

## Summary

Installing collections from Ansible Galaxy is straightforward with `ansible-galaxy collection install`. For production use, always pin versions in a `requirements.yml` file, install to a project-local path, and use FQCNs in your playbooks. Collections can come from Galaxy, Git repositories, URLs, or local tarballs, giving you flexibility for both connected and air-gapped environments. The `--upgrade` flag handles updates, and `--force` handles reinstallation when needed.
