# How to Migrate from Standalone Modules to Collections in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Collections, Migration, Automation

Description: Step-by-step guide to migrating Ansible playbooks from legacy standalone modules to the modern collections format with minimal disruption.

---

If you have been using Ansible for a few years, you probably have playbooks written before the collections system was introduced in Ansible 2.9. Those playbooks use short module names like `docker_container`, `mysql_db`, or `ec2_instance` without any namespace prefix. While Ansible still supports these legacy names through redirect mappings, relying on them is not a long-term strategy. This post walks through the migration process from standalone modules to properly namespaced collections.

## Why the Migration Happened

Before collections, all Ansible modules shipped in a single monolithic package called `ansible`. A single release of Ansible included thousands of modules for everything from AWS to Zabbix. This created several problems:

- The release cycle was tied to the slowest module. If one module had a bug, you had to wait for the next Ansible release to get the fix.
- Module authors could not release independently.
- The package was enormous and kept growing.
- Testing was becoming unmanageable.

Collections solved this by splitting modules into independently versioned, independently releasable packages. The `ansible` package became `ansible-core` (the engine) plus individual collections (the modules).

## Understanding the Naming Change

The most visible change is how you reference modules. Here is the mapping pattern:

```yaml
# Before (standalone module names)
- name: Create a Docker container
  docker_container:
    name: myapp
    image: nginx

# After (fully qualified collection name - FQCN)
- name: Create a Docker container
  community.docker.docker_container:
    name: myapp
    image: nginx
```

The FQCN format is `namespace.collection.module_name`. Here are some common mappings:

| Legacy Name | FQCN |
|---|---|
| `docker_container` | `community.docker.docker_container` |
| `mysql_db` | `community.mysql.mysql_db` |
| `ec2_instance` | `amazon.aws.ec2_instance` |
| `gcp_compute_instance` | `google.cloud.gcp_compute_instance` |
| `k8s` | `kubernetes.core.k8s` |
| `postgresql_db` | `community.postgresql.postgresql_db` |
| `yum` | `ansible.builtin.yum` |
| `apt` | `ansible.builtin.apt` |
| `copy` | `ansible.builtin.copy` |
| `template` | `ansible.builtin.template` |

## Step 1: Audit Your Existing Playbooks

First, figure out which modules you are actually using. Here is a quick way to find them.

```bash
# Find all module references in your playbooks
# Look for task lines that do not use FQCN format
grep -rn '^\s*-\s*name:' playbooks/ roles/ | head -20

# A more targeted search for non-FQCN module usage
# (lines with a module name that does not contain a dot)
grep -rn '^\s\+\w\+:$' playbooks/ roles/ --include="*.yml" --include="*.yaml"
```

Build a list of every unique module name used across your codebase.

```bash
# Extract module names from playbook tasks
ansible-playbook playbooks/site.yml --list-tasks 2>/dev/null | \
  grep -oP '(?<=: )\S+' | sort -u
```

## Step 2: Identify the Required Collections

Once you have your module list, map each one to its collection. The Ansible documentation has a full mapping, but here are the most common ones.

```yaml
# requirements.yml - collections needed based on your module usage
collections:
  # Built-in modules (yum, apt, copy, template, etc.)
  # These are in ansible-core and do not need separate installation

  # Docker modules
  - name: community.docker
    version: ">=3.0.0"

  # MySQL modules
  - name: community.mysql
    version: ">=3.0.0"

  # PostgreSQL modules
  - name: community.postgresql
    version: ">=3.0.0"

  # AWS modules
  - name: amazon.aws
    version: ">=7.0.0"

  # General purpose modules (ldap, redis, etc.)
  - name: community.general
    version: ">=8.0.0"

  # Windows modules
  - name: ansible.windows
    version: ">=2.0.0"

  # Network modules
  - name: ansible.netcommon
    version: ">=5.0.0"

  # Kubernetes modules
  - name: kubernetes.core
    version: ">=3.0.0"
```

## Step 3: Update Module References

Now comes the actual migration. Replace every short module name with its FQCN.

Before:

```yaml
# playbook-before.yml - legacy module names
- hosts: webservers
  become: yes
  tasks:
    - name: Install packages
      apt:
        name:
          - nginx
          - python3
        state: present

    - name: Copy configuration
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: restart nginx

    - name: Start nginx
      service:
        name: nginx
        state: started
        enabled: yes

  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
```

After:

```yaml
# playbook-after.yml - fully qualified collection names
- hosts: webservers
  become: yes
  tasks:
    - name: Install packages
      ansible.builtin.apt:
        name:
          - nginx
          - python3
        state: present

    - name: Copy configuration
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: restart nginx

    - name: Start nginx
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: yes

  handlers:
    - name: restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted
```

A more complex example with community modules:

Before:

```yaml
# playbook-complex-before.yml - mixed legacy module names
- hosts: appservers
  tasks:
    - name: Create MySQL database
      mysql_db:
        name: myapp
        state: present

    - name: Create MySQL user
      mysql_user:
        name: appuser
        password: "{{ db_password }}"
        priv: "myapp.*:ALL"

    - name: Pull Docker image
      docker_image:
        name: myapp
        source: pull

    - name: Run container
      docker_container:
        name: myapp
        image: myapp:latest
        ports:
          - "8080:8080"
```

After:

```yaml
# playbook-complex-after.yml - FQCN module names
- hosts: appservers
  tasks:
    - name: Create MySQL database
      community.mysql.mysql_db:
        name: myapp
        state: present

    - name: Create MySQL user
      community.mysql.mysql_user:
        name: appuser
        password: "{{ db_password }}"
        priv: "myapp.*:ALL"

    - name: Pull Docker image
      community.docker.docker_image:
        name: myapp
        source: pull

    - name: Run container
      community.docker.docker_container:
        name: myapp
        image: myapp:latest
        ports:
          - "8080:8080"
```

## Step 4: Update Lookup and Filter Plugins

Do not forget about lookup plugins, filter plugins, and callback plugins. These also moved to collections.

```yaml
# Before
- name: Read a vault secret
  debug:
    msg: "{{ lookup('hashi_vault', 'secret/data/myapp') }}"

# After
- name: Read a vault secret
  ansible.builtin.debug:
    msg: "{{ lookup('community.hashi_vault.hashi_vault', 'secret/data/myapp') }}"
```

```yaml
# Before (filter plugin)
- name: Parse IP addresses
  debug:
    msg: "{{ my_list | ipaddr('address') }}"

# After
- name: Parse IP addresses
  ansible.builtin.debug:
    msg: "{{ my_list | ansible.utils.ipaddr('address') }}"
```

## Step 5: Update Role Dependencies

If your roles depend on collections, declare those dependencies in the role's `meta/main.yml`.

```yaml
# roles/webserver/meta/main.yml - declare collection dependencies
dependencies: []

collections:
  - community.general
  - ansible.posix
```

Better yet, add them to a `requirements.yml` at the collection or project level so they get installed before the playbook runs.

## Step 6: Handle Deprecated Modules

Some modules were renamed or replaced during the migration. Check for deprecation warnings.

```bash
# Run your playbook with verbose output to catch deprecation warnings
ansible-playbook playbooks/site.yml --check -vv 2>&1 | grep -i deprecat
```

Common renames:

| Old Module | New Module |
|---|---|
| `include` | `ansible.builtin.include_tasks` |
| `include_role` (static) | `ansible.builtin.import_role` |
| `ec2` | `amazon.aws.ec2_instance` |
| `s3` | `amazon.aws.s3_object` |

## Step 7: Test the Migration

Run your playbooks in check mode first to verify everything resolves correctly.

```bash
# Verify module resolution in check mode
ansible-playbook playbooks/site.yml --check --diff

# Run the full test suite if you have one
molecule test
```

## Scripting the Migration

For large codebases, a script can help with the bulk of the renaming.

```bash
#!/bin/bash
# migrate-fqcn.sh - bulk rename common modules to FQCN
# Run this in your playbooks/roles directory

# Built-in modules
for module in apt yum dnf copy template file service systemd command shell \
    raw script lineinfile blockinfile replace stat find fetch synchronize \
    uri get_url unarchive debug fail assert set_fact pause wait_for \
    group user cron mount sysctl authorized_key known_hosts pip \
    git subversion; do
  find . -name "*.yml" -o -name "*.yaml" | while read f; do
    # Only match module usage at proper indentation level
    sed -i "s/^\(\s\+\)${module}:/\1ansible.builtin.${module}:/g" "$f"
  done
done

echo "Migration complete. Review changes with git diff."
```

Note: this script is a starting point. Always review the changes manually before committing, as regex-based replacement can have false positives.

## Practical Tips

1. **Migrate incrementally.** You do not need to update every playbook at once. Start with the most actively developed ones and work outward.

2. **Legacy names still work.** Ansible has redirect mappings that resolve short names to FQCNs. Your playbooks will not break immediately, but the redirects may be removed in future releases.

3. **Use `ansible-lint` to catch missed modules.** The linter has rules that flag non-FQCN module usage. It is a good safety net.

4. **Update your team's templates.** Make sure any cookiecutter templates, snippets, or IDE configurations use FQCN for new playbooks.

5. **Document the mapping.** Keep a reference of which collections your project uses and what they replaced. This helps when onboarding new team members.

The migration from standalone modules to collections is a one-time effort that pays dividends in stability, version control, and access to timely module updates. Do it once, do it properly, and you will be set for the long term.
