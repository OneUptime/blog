# How to Fix ansible-lint FQCN (Fully Qualified Collection Name) Warnings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-lint, FQCN, Collections

Description: Learn how to fix FQCN warnings in ansible-lint by converting short module names to fully qualified collection names with practical examples.

---

If you have run ansible-lint recently, you have probably seen warnings like `fqcn[action-core]` or `fqcn[action]`. These warnings tell you to use Fully Qualified Collection Names (FQCNs) for your module calls instead of short names. This change was introduced as Ansible transitioned from a monolithic package to a collection-based architecture, and ansible-lint now enforces it.

In this post, we will cover what FQCN is, why it matters, and how to fix every type of FQCN warning efficiently.

## What Is FQCN?

FQCN stands for Fully Qualified Collection Name. It is the complete namespace path to a module, including the collection it belongs to.

```yaml
# Short name (old style)
- name: Install a package
  apt:
    name: nginx
    state: present

# FQCN (new style)
- name: Install a package
  ansible.builtin.apt:
    name: nginx
    state: present
```

The FQCN format is `namespace.collection.module_name`. For built-in modules, the namespace is `ansible` and the collection is `builtin`.

## Why FQCN Matters

Without FQCN, Ansible resolves module names by searching through all installed collections. This can lead to ambiguity if two collections provide a module with the same name. For example, if you have both `community.general` and a custom collection that both define a `slack` module, using the short name `slack` is ambiguous.

FQCN eliminates this ambiguity and makes your playbooks explicit about which module they use.

## Types of FQCN Warnings

ansible-lint has several FQCN-related rules:

- **fqcn[action-core]**: A builtin module is used without FQCN
- **fqcn[action]**: A non-builtin module is used without FQCN
- **fqcn[canonical]**: A module is using an alias instead of the canonical name

## Fixing fqcn[action-core]: Builtin Modules

These are the most common. Here is a mapping of the short names to their FQCNs for the most frequently used builtin modules:

```yaml
# Before: short names
---
- name: Deploy application
  hosts: webservers
  become: true
  tasks:
    - name: Install packages
      apt:
        name: "{{ item }}"
        state: present
      loop:
        - nginx
        - curl

    - name: Copy configuration
      copy:
        src: app.conf
        dest: /etc/app/app.conf
        mode: "0644"

    - name: Create directory
      file:
        path: /opt/myapp
        state: directory
        mode: "0755"

    - name: Start service
      service:
        name: nginx
        state: started
        enabled: true

    - name: Run migration
      command: /opt/myapp/migrate.sh

    - name: Add cron job
      cron:
        name: "Cleanup temp files"
        minute: "0"
        hour: "3"
        job: "/opt/myapp/cleanup.sh"
```

```yaml
# After: fully qualified names
---
- name: Deploy application
  hosts: webservers
  become: true
  tasks:
    - name: Install packages
      ansible.builtin.apt:
        name: "{{ item }}"
        state: present
      loop:
        - nginx
        - curl

    - name: Copy configuration
      ansible.builtin.copy:
        src: app.conf
        dest: /etc/app/app.conf
        mode: "0644"

    - name: Create directory
      ansible.builtin.file:
        path: /opt/myapp
        state: directory
        mode: "0755"

    - name: Start service
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true

    - name: Run migration
      ansible.builtin.command: /opt/myapp/migrate.sh

    - name: Add cron job
      ansible.builtin.cron:
        name: "Cleanup temp files"
        minute: "0"
        hour: "3"
        job: "/opt/myapp/cleanup.sh"
```

## Common Builtin Module FQCN Reference

Here is a quick reference for the most commonly used builtin modules:

```yaml
# Package management
apt          -> ansible.builtin.apt
yum          -> ansible.builtin.yum
dnf          -> ansible.builtin.dnf
pip          -> ansible.builtin.pip
package      -> ansible.builtin.package

# Files and directories
copy         -> ansible.builtin.copy
file         -> ansible.builtin.file
template     -> ansible.builtin.template
lineinfile   -> ansible.builtin.lineinfile
blockinfile  -> ansible.builtin.blockinfile
fetch        -> ansible.builtin.fetch
stat         -> ansible.builtin.stat
unarchive    -> ansible.builtin.unarchive

# Commands
command      -> ansible.builtin.command
shell        -> ansible.builtin.shell
raw          -> ansible.builtin.raw
script       -> ansible.builtin.script
expect       -> ansible.builtin.expect

# Services and system
service      -> ansible.builtin.service
systemd      -> ansible.builtin.systemd
cron         -> ansible.builtin.cron
hostname     -> ansible.builtin.hostname
user         -> ansible.builtin.user
group        -> ansible.builtin.group

# Variables and flow
debug        -> ansible.builtin.debug
set_fact     -> ansible.builtin.set_fact
assert       -> ansible.builtin.assert
fail         -> ansible.builtin.fail
pause        -> ansible.builtin.pause
wait_for     -> ansible.builtin.wait_for
include_tasks -> ansible.builtin.include_tasks
import_tasks -> ansible.builtin.import_tasks
include_role -> ansible.builtin.include_role
import_role  -> ansible.builtin.import_role

# Networking
uri          -> ansible.builtin.uri
get_url      -> ansible.builtin.get_url

# Facts and info
setup        -> ansible.builtin.setup
gather_facts -> ansible.builtin.gather_facts

# Other
git          -> ansible.builtin.git
slurp        -> ansible.builtin.slurp
add_host     -> ansible.builtin.add_host
meta         -> ansible.builtin.meta
```

## Fixing fqcn[action]: Non-Builtin Collection Modules

For modules from other collections, you need to know which collection they belong to:

```yaml
# Before: short names for collection modules
- name: Manage Docker container
  docker_container:
    name: myapp
    image: myapp:latest

- name: Create AWS EC2 instance
  ec2_instance:
    name: webserver
    instance_type: t3.micro

- name: Send Slack notification
  slack:
    token: "{{ slack_token }}"
    msg: "Deployment complete"
```

```yaml
# After: FQCN for collection modules
- name: Manage Docker container
  community.docker.docker_container:
    name: myapp
    image: myapp:latest

- name: Create AWS EC2 instance
  amazon.aws.ec2_instance:
    name: webserver
    instance_type: t3.micro

- name: Send Slack notification
  community.general.slack:
    token: "{{ slack_token }}"
    msg: "Deployment complete"
```

## Fixing fqcn[canonical]: Using Canonical Names

Some modules have aliases or old names. ansible-lint wants you to use the canonical (official) name.

```yaml
# Before: non-canonical names
- name: Manage systemd service
  ansible.builtin.systemd:    # This is fine
    name: nginx
    state: restarted

- name: Manage SELinux
  ansible.posix.seboolean:     # Old name
    name: httpd_can_network_connect
    state: true

# After: canonical names
- name: Manage SELinux
  ansible.posix.seboolean:
    name: httpd_can_network_connect
    state: true
    persistent: true
```

## Automated FQCN Conversion

For large codebases, manually converting every module name is tedious. There is a tool called `ansible-fqcn-converter` that can help:

```bash
# Install the converter (if available from your package manager)
pip install ansible-fqcn-converter

# Or use a sed-based approach for common modules
# Create a conversion script
cat > convert_fqcn.sh << 'SCRIPT'
#!/bin/bash
# Convert common short names to FQCN in all YAML files
find . -name "*.yml" -o -name "*.yaml" | while read -r file; do
  sed -i \
    -e 's/^\(\s*\)apt:/\1ansible.builtin.apt:/g' \
    -e 's/^\(\s*\)copy:/\1ansible.builtin.copy:/g' \
    -e 's/^\(\s*\)file:/\1ansible.builtin.file:/g' \
    -e 's/^\(\s*\)template:/\1ansible.builtin.template:/g' \
    -e 's/^\(\s*\)service:/\1ansible.builtin.service:/g' \
    -e 's/^\(\s*\)systemd:/\1ansible.builtin.systemd:/g' \
    -e 's/^\(\s*\)command:/\1ansible.builtin.command:/g' \
    -e 's/^\(\s*\)shell:/\1ansible.builtin.shell:/g' \
    -e 's/^\(\s*\)debug:/\1ansible.builtin.debug:/g' \
    -e 's/^\(\s*\)set_fact:/\1ansible.builtin.set_fact:/g' \
    -e 's/^\(\s*\)lineinfile:/\1ansible.builtin.lineinfile:/g' \
    -e 's/^\(\s*\)user:/\1ansible.builtin.user:/g' \
    -e 's/^\(\s*\)group:/\1ansible.builtin.group:/g' \
    -e 's/^\(\s*\)cron:/\1ansible.builtin.cron:/g' \
    -e 's/^\(\s*\)uri:/\1ansible.builtin.uri:/g' \
    -e 's/^\(\s*\)get_url:/\1ansible.builtin.get_url:/g' \
    -e 's/^\(\s*\)stat:/\1ansible.builtin.stat:/g' \
    -e 's/^\(\s*\)git:/\1ansible.builtin.git:/g' \
    -e 's/^\(\s*\)pip:/\1ansible.builtin.pip:/g' \
    -e 's/^\(\s*\)yum:/\1ansible.builtin.yum:/g' \
    -e 's/^\(\s*\)dnf:/\1ansible.builtin.dnf:/g' \
    "$file"
done
SCRIPT
chmod +x convert_fqcn.sh
```

Be careful with automated conversion. Some module short names might appear in comments, strings, or variable names. Always review the changes before committing.

## Handling the Transition Period

If your codebase has thousands of short-name module calls, you do not have to fix them all at once. Use a phased approach:

```yaml
# .ansible-lint - Phase 1: warn only, do not fail
---
profile: moderate

warn_list:
  - fqcn[action-core]
  - fqcn[action]
  - fqcn[canonical]
```

```yaml
# .ansible-lint - Phase 2: enforce for builtins, warn for collections
---
profile: moderate

warn_list:
  - fqcn[action]
  - fqcn[canonical]
```

```yaml
# .ansible-lint - Phase 3: enforce everything
---
profile: moderate
# No fqcn rules in skip or warn list
```

FQCN is the future of Ansible module referencing. The sooner you adopt it, the fewer ambiguity issues you will face as the collection ecosystem grows. Start with the most frequently used modules, automate what you can, and gradually convert the rest.
