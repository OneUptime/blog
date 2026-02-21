# How to Use Ansible Playbook --list-tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Playbooks, Task Management, DevOps

Description: Learn how to use the ansible-playbook --list-tasks flag to preview all tasks in a playbook before execution for review and documentation purposes.

---

Before running a playbook against production servers, you want to know exactly what tasks it will execute. The `--list-tasks` flag shows you every task in the playbook, including tasks from imported roles and included files, without actually running anything. This is invaluable for code review, change management, and understanding complex playbooks that span multiple roles.

## Basic Usage

Run `--list-tasks` against any playbook:

```bash
# List all tasks in a playbook
ansible-playbook --list-tasks deploy.yml
```

The output shows each play and its tasks:

```
playbook: deploy.yml

  play #1 (webservers): Configure web servers	TAGS: []
    tasks:
      common : Install base packages	TAGS: [packages]
      common : Configure NTP	TAGS: [ntp]
      common : Configure firewall	TAGS: [security]
      nginx : Install nginx	TAGS: [nginx]
      nginx : Deploy nginx configuration	TAGS: [nginx]
      nginx : Enable site	TAGS: [nginx]
      myapp : Create application user	TAGS: [app]
      myapp : Deploy application	TAGS: [app, deploy]
      myapp : Configure application	TAGS: [app, config]
      myapp : Start application service	TAGS: [app]

  play #2 (dbservers): Configure database servers	TAGS: []
    tasks:
      postgresql : Install PostgreSQL	TAGS: [database]
      postgresql : Configure PostgreSQL	TAGS: [database]
      postgresql : Create application database	TAGS: [database]
```

## Understanding the Output

Each line in the output tells you:

- **Role name** (before the colon): Which role the task belongs to
- **Task name** (after the colon): The `name` field of the task
- **TAGS**: Any tags assigned to the task

```
      nginx : Deploy nginx configuration	TAGS: [nginx, config]
      ^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^      ^^^^^^^^^^^^^
      role    task name                           tags
```

Tasks without a role prefix are defined directly in the playbook.

## Listing Tasks with Tags Filter

Combine `--list-tasks` with `--tags` to see only tasks matching specific tags:

```bash
# Show only tasks tagged with 'nginx'
ansible-playbook --list-tasks --tags nginx deploy.yml

# Show only deployment tasks
ansible-playbook --list-tasks --tags deploy deploy.yml

# Show tasks matching multiple tags
ansible-playbook --list-tasks --tags "nginx,config" deploy.yml
```

The output now shows only matching tasks:

```
playbook: deploy.yml

  play #1 (webservers): Configure web servers	TAGS: []
    tasks:
      nginx : Install nginx	TAGS: [nginx]
      nginx : Deploy nginx configuration	TAGS: [nginx]
      nginx : Enable site	TAGS: [nginx]
```

You can also exclude tags:

```bash
# Show all tasks EXCEPT those tagged 'database'
ansible-playbook --list-tasks --skip-tags database deploy.yml
```

## Practical Use Cases

### Pre-Deployment Review

Before every production deployment, list the tasks to verify nothing unexpected is included:

```bash
# Review what a deployment will do
ansible-playbook --list-tasks -i inventories/production/hosts.ini deploy.yml -e version=2.1.0
```

This is especially important when multiple people contribute to the same playbook.

### Change Management Documentation

Many organizations require a list of changes before applying them. Generate this from the task list:

```bash
# Generate a change document
echo "Change Request: Application Deployment v2.1.0" > change-doc.txt
echo "Date: $(date)" >> change-doc.txt
echo "Tasks to execute:" >> change-doc.txt
echo "" >> change-doc.txt
ansible-playbook --list-tasks deploy.yml >> change-doc.txt
```

### Understanding New Playbooks

When you join a project or review someone's pull request, list tasks to quickly understand what a playbook does:

```bash
# Quickly understand a complex playbook
ansible-playbook --list-tasks site.yml
```

## Working with Complex Playbooks

For playbooks that use roles, imports, and includes, `--list-tasks` resolves the full task chain:

```yaml
# site.yml - Complex playbook with roles and imports
---
- name: Configure all servers
  hosts: all
  roles:
    - common
    - security

- name: Configure web tier
  hosts: webservers
  roles:
    - nginx
    - myapp
  tasks:
    - name: Run smoke tests
      uri:
        url: "http://{{ inventory_hostname }}/health"
      tags: [verify]

- import_playbook: monitoring.yml
```

Running `--list-tasks` resolves everything:

```bash
ansible-playbook --list-tasks site.yml
```

Output:

```
playbook: site.yml

  play #1 (all): Configure all servers	TAGS: []
    tasks:
      common : Update apt cache	TAGS: [common]
      common : Install base packages	TAGS: [common, packages]
      common : Configure timezone	TAGS: [common]
      security : Configure SSH	TAGS: [security]
      security : Setup firewall	TAGS: [security]
      security : Configure fail2ban	TAGS: [security]

  play #2 (webservers): Configure web tier	TAGS: []
    tasks:
      nginx : Install nginx	TAGS: [nginx]
      nginx : Configure nginx	TAGS: [nginx]
      myapp : Deploy application	TAGS: [app]
      myapp : Configure application	TAGS: [app]
      Run smoke tests	TAGS: [verify]

  play #3 (monitoring): Setup monitoring	TAGS: []
    tasks:
      monitoring : Install monitoring agent	TAGS: [monitoring]
      monitoring : Configure monitoring	TAGS: [monitoring]
```

## import vs include Behavior

There is an important distinction between `import_tasks` and `include_tasks` when it comes to `--list-tasks`:

- **import_tasks**: Tasks ARE shown in `--list-tasks` because imports are processed at playbook parse time
- **include_tasks**: Tasks are NOT shown because includes are processed at runtime

```yaml
# main.yml - Showing import vs include behavior
---
- name: Task listing demo
  hosts: all

  tasks:
    # These tasks WILL appear in --list-tasks
    - import_tasks: setup.yml

    # These tasks will NOT appear in --list-tasks
    - include_tasks: dynamic-tasks.yml
      when: some_condition

    # Direct tasks always appear
    - name: Direct task
      debug:
        msg: "Hello"
```

```bash
ansible-playbook --list-tasks main.yml
```

```
playbook: main.yml

  play #1 (all): Task listing demo	TAGS: []
    tasks:
      Task from setup.yml	TAGS: []
      Another task from setup.yml	TAGS: []
      include_tasks : dynamic-tasks.yml	TAGS: []    # Shows include, not its contents
      Direct task	TAGS: []
```

## Combining with Other Flags

### List tasks for a specific limit of hosts

```bash
# List tasks that would run on a specific host
ansible-playbook --list-tasks --limit web1.example.com deploy.yml
```

### List tasks with check mode

```bash
# See what would be checked in dry run
ansible-playbook --list-tasks --check deploy.yml
```

## Scripting with --list-tasks

Parse the output for automation:

```bash
#!/bin/bash
# count-tasks.sh - Count tasks per role in a playbook

echo "Task count by role:"
ansible-playbook --list-tasks site.yml 2>/dev/null | \
    grep "TAGS:" | \
    sed 's/^[[:space:]]*//' | \
    awk -F' : ' '{print $1}' | \
    sort | uniq -c | sort -rn
```

Sample output:

```
      8 common
      5 nginx
      4 myapp
      3 security
      2 monitoring
```

## Comparing Playbook Versions

Use `--list-tasks` to compare what changed between versions of a playbook:

```bash
#!/bin/bash
# compare-playbook-tasks.sh - Compare tasks between two git commits

OLD_COMMIT="${1:-HEAD~1}"
NEW_COMMIT="${2:-HEAD}"

echo "Tasks in $OLD_COMMIT:"
git show "$OLD_COMMIT:deploy.yml" > /tmp/old-deploy.yml
ansible-playbook --list-tasks /tmp/old-deploy.yml 2>/dev/null > /tmp/old-tasks.txt

echo "Tasks in $NEW_COMMIT:"
git show "$NEW_COMMIT:deploy.yml" > /tmp/new-deploy.yml
ansible-playbook --list-tasks /tmp/new-deploy.yml 2>/dev/null > /tmp/new-tasks.txt

echo ""
echo "Differences:"
diff /tmp/old-tasks.txt /tmp/new-tasks.txt || true

rm -f /tmp/old-deploy.yml /tmp/new-deploy.yml /tmp/old-tasks.txt /tmp/new-tasks.txt
```

## Integration with Code Review

Add task listing to your PR template or review process:

```bash
# Generate task list as a PR comment
TASK_LIST=$(ansible-playbook --list-tasks deploy.yml 2>/dev/null)

gh pr comment --body "$(cat <<EOF
## Tasks in this deployment

\`\`\`
$TASK_LIST
\`\`\`

Please review the task list above before approving.
EOF
)"
```

## Creating a Playbook Summary Report

Build a comprehensive report of your project:

```bash
#!/bin/bash
# playbook-report.sh - Generate a summary of all playbooks

echo "# Ansible Project Task Report"
echo "Generated: $(date)"
echo ""

for playbook in *.yml; do
    # Skip non-playbook YAML files
    if ! ansible-playbook --syntax-check "$playbook" > /dev/null 2>&1; then
        continue
    fi

    TASK_COUNT=$(ansible-playbook --list-tasks "$playbook" 2>/dev/null | grep "TAGS:" | wc -l)
    echo "## $playbook ($TASK_COUNT tasks)"
    echo ""
    ansible-playbook --list-tasks "$playbook" 2>/dev/null
    echo ""
done
```

## Summary

The `--list-tasks` flag gives you a complete preview of every task a playbook will execute. Use it before production deployments for safety, during code reviews for clarity, and for documentation. Remember that `import_tasks` shows up in the listing but `include_tasks` does not. Combine it with `--tags` and `--skip-tags` to filter the view, and integrate it into your CI/CD pipeline and code review workflow. A few seconds of previewing tasks can save you from unexpected changes hitting production.
