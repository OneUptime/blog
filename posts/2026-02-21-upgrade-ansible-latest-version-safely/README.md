# How to Upgrade Ansible to the Latest Version Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Upgrade, DevOps, Best Practices

Description: A safe step-by-step process for upgrading Ansible to the latest version, including pre-upgrade checks, testing, and rollback strategies.

---

Upgrading Ansible is not something you should do carelessly in production. New versions can introduce breaking changes, deprecate modules, change default behaviors, or require updated Python versions on managed hosts. This guide walks through a methodical upgrade process that minimizes risk and gives you a clear rollback path if something goes wrong.

## Before You Upgrade: Pre-Flight Checks

### Check Your Current Version

Document exactly what you are running before making any changes:

```bash
# Record current Ansible version details
ansible --version

# Record installed collections and their versions
ansible-galaxy collection list > /tmp/collections-before.txt

# Record the Python version Ansible is using
python3 --version
```

### Read the Changelog

Before upgrading, check the release notes for the target version. Look for:

- Breaking changes
- Deprecated modules that you might be using
- New Python version requirements
- Changes to default behavior

```bash
# Check what versions are available
pip index versions ansible

# Or for apt-based installations
apt-cache policy ansible
```

### Run Your Playbooks in Check Mode

Before upgrading, run your playbooks in check mode (dry run) to establish a baseline of what "normal" looks like:

```bash
# Run your main playbooks in check mode and save the output
ansible-playbook --check deploy.yml | tee /tmp/check-before-upgrade.txt
```

## Upgrade Strategy: Virtual Environment (Recommended)

If you installed Ansible with pip in a virtual environment, the upgrade process is clean and reversible.

### Step 1: Freeze Your Current Environment

```bash
# Activate your Ansible environment
source ~/ansible-env/bin/activate

# Save the exact state of all installed packages
pip freeze > ~/ansible-env-backup-$(date +%Y%m%d).txt
```

This freeze file is your insurance policy. You can recreate the exact same environment later if needed.

### Step 2: Create a Test Environment

Rather than upgrading your production environment directly, create a test environment first:

```bash
# Create a separate test environment
python3 -m venv ~/ansible-test-env

# Activate the test environment
source ~/ansible-test-env/bin/activate

# Install the latest Ansible
pip install ansible
```

### Step 3: Test in the New Environment

Run your playbooks from the test environment to check for issues:

```bash
# Make sure the test environment is active
source ~/ansible-test-env/bin/activate

# Verify the new version
ansible --version

# Run syntax checks on all playbooks
find playbooks/ -name "*.yml" -exec ansible-playbook --syntax-check {} \;

# Run playbooks in check mode
ansible-playbook --check deploy.yml

# If you have Molecule tests, run those too
molecule test
```

### Step 4: Upgrade the Production Environment

Once testing passes, upgrade your real environment:

```bash
# Activate the production environment
source ~/ansible-env/bin/activate

# Upgrade Ansible
pip install --upgrade ansible

# Verify the upgrade
ansible --version
```

### Step 5: Rollback If Needed

If things go wrong after upgrading:

```bash
# Restore from the freeze file
source ~/ansible-env/bin/activate
pip install -r ~/ansible-env-backup-20260221.txt
```

## Upgrade Strategy: APT/DNF Package Manager

If you installed Ansible from a package manager, the process is a bit different.

### Ubuntu/Debian with PPA

```bash
# Check current version
ansible --version

# Update the PPA and upgrade
sudo apt update
sudo apt install --only-upgrade ansible

# Verify the new version
ansible --version
```

To rollback, you would need to pin the previous version:

```bash
# Install a specific version (check available versions first)
apt-cache showpkg ansible
sudo apt install ansible=<previous-version>
```

### CentOS/RHEL with EPEL

```bash
# Check current version
ansible --version

# Upgrade via dnf
sudo dnf upgrade ansible

# Verify
ansible --version
```

Rollback:

```bash
# Downgrade to a specific version
sudo dnf downgrade ansible-<previous-version>
```

## Upgrade Strategy: Homebrew (macOS)

```bash
# Check current version
ansible --version

# Update and upgrade
brew update && brew upgrade ansible

# Verify
ansible --version
```

Homebrew does not have a built-in downgrade mechanism, but you can install a specific version by tapping the formula history. The easier approach is to use pip in a virtual environment for rollback capability on macOS.

## Handling Collection Upgrades

Ansible collections are versioned independently from ansible-core. After upgrading Ansible, you should also update your collections:

```bash
# Upgrade all installed collections
ansible-galaxy collection install --upgrade community.general
ansible-galaxy collection install --upgrade amazon.aws
ansible-galaxy collection install --upgrade azure.azcollection

# Or upgrade everything from a requirements file
ansible-galaxy collection install --upgrade -r collections/requirements.yml
```

Example collections requirements file:

```yaml
# collections/requirements.yml
---
collections:
  - name: community.general
    version: ">=8.0.0"
  - name: amazon.aws
    version: ">=7.0.0"
  - name: ansible.posix
    version: ">=1.5.0"
```

## Common Issues After Upgrading

### Deprecated Module Warnings

If you see deprecation warnings, the module still works but will be removed in a future version. Update your playbooks to use the replacement module:

```yaml
# Old (deprecated in newer versions)
- name: Copy file
  copy:
    src: myfile.conf
    dest: /etc/myfile.conf

# New (fully qualified collection name)
- name: Copy file
  ansible.builtin.copy:
    src: myfile.conf
    dest: /etc/myfile.conf
```

### Python Interpreter Changes

Newer Ansible versions might auto-detect the Python interpreter differently. If you see Python-related errors after upgrading, set the interpreter explicitly:

```ini
# inventory.ini
[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

### Changed Default Behaviors

Some defaults change between major versions. For example, the default `gathering` setting or `hash_behaviour` might differ. If your playbooks rely on specific defaults, pin them in ansible.cfg:

```ini
# ansible.cfg - pin settings that your playbooks depend on
[defaults]
gathering = implicit
hash_behaviour = replace
```

### Module Parameter Changes

Some module parameters get renamed or their behavior changes. Run your playbooks in check mode first and review any warnings or errors:

```bash
# Check for issues without making changes
ansible-playbook --check --diff deploy.yml 2>&1 | tee upgrade-test.log

# Search the log for warnings and errors
grep -E "WARNING|ERROR|DEPRECATION" upgrade-test.log
```

## Upgrade Testing Checklist

Use this checklist when upgrading Ansible:

```yaml
# upgrade-checklist.yml (not a playbook, just a reference)
# Run through these steps for every Ansible upgrade

pre_upgrade:
  - Record current ansible --version output
  - Freeze pip environment (pip freeze)
  - Run playbooks in check mode and save output
  - Back up ansible.cfg and inventory files

upgrade:
  - Create test virtual environment
  - Install new version in test environment
  - Run syntax check on all playbooks
  - Run check mode in test environment
  - Run molecule/integration tests
  - Compare check mode output with baseline
  - Upgrade production environment

post_upgrade:
  - Verify ansible --version
  - Update collections
  - Run playbooks in check mode on production env
  - Run a canary deployment on one host
  - Full deployment once canary succeeds

rollback_plan:
  - pip install -r freeze-file.txt
  - Or: apt install ansible=previous-version
  - Or: dnf downgrade ansible
```

## Automating Version Checks

Create a simple script that checks your Ansible version against a minimum requirement:

```bash
#!/bin/bash
# check-ansible-version.sh

REQUIRED_VERSION="2.16.0"
CURRENT_VERSION=$(ansible --version | head -1 | awk '{print $3}' | tr -d ']')

# Compare versions using sort -V
if printf '%s\n' "$REQUIRED_VERSION" "$CURRENT_VERSION" | sort -V | head -1 | grep -q "$REQUIRED_VERSION"; then
    echo "Ansible version $CURRENT_VERSION meets minimum requirement $REQUIRED_VERSION"
    exit 0
else
    echo "ERROR: Ansible version $CURRENT_VERSION is below required $REQUIRED_VERSION"
    exit 1
fi
```

Run this at the start of your CI/CD pipeline to ensure the right version is installed.

## Summary

Upgrading Ansible safely comes down to preparation and testing. Freeze your environment before upgrading, test in an isolated environment, check for deprecation warnings, and always have a rollback plan. The pip virtual environment approach gives you the most control, but even with package managers, you can downgrade if needed. Never upgrade Ansible in production without testing your playbooks against the new version first.
