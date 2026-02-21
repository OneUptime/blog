# How to Use Ansible Playbook --list-tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Tags, Playbooks, DevOps

Description: Learn how to use the ansible-playbook --list-tags flag to discover available tags in a playbook and selectively run specific parts of your automation.

---

Tags in Ansible let you label tasks and then selectively run or skip them. The `--list-tags` flag shows you all available tags in a playbook, giving you a map of what you can target. This is essential for large playbooks where you want to run only specific sections, like deploying code without reconfiguring the web server, or updating SSL certificates without touching the application.

## Basic Usage

Run `--list-tags` to see all tags defined in a playbook:

```bash
# List all tags in a playbook
ansible-playbook --list-tags deploy.yml
```

Output:

```
playbook: deploy.yml

  play #1 (webservers): Deploy web application	TAGS: []
      TASK TAGS: [app, config, deploy, nginx, packages, ssl, verify]

  play #2 (dbservers): Configure databases	TAGS: []
      TASK TAGS: [database, migrate, schema]
```

This tells you that you can target tasks by any of those tags.

## How Tags Work in Playbooks

Before diving deeper into `--list-tags`, let me show how tags are defined:

```yaml
# tagged-deploy.yml - Playbook with well-organized tags
---
- name: Deploy web application
  hosts: webservers
  become: yes

  tasks:
    - name: Install system packages
      apt:
        name:
          - nginx
          - python3
          - python3-pip
        state: present
      tags: [packages]

    - name: Deploy nginx configuration
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Reload nginx
      tags: [nginx, config]

    - name: Deploy SSL certificates
      copy:
        src: "{{ item.src }}"
        dest: "{{ item.dest }}"
        mode: "{{ item.mode }}"
      loop:
        - src: files/ssl/cert.pem
          dest: /etc/ssl/certs/myapp.pem
          mode: '0644'
        - src: files/ssl/key.pem
          dest: /etc/ssl/private/myapp.key
          mode: '0600'
      tags: [ssl, config]

    - name: Deploy application code
      unarchive:
        src: "files/myapp-{{ version }}.tar.gz"
        dest: /opt/myapp
      tags: [app, deploy]

    - name: Deploy application configuration
      template:
        src: app-config.yml.j2
        dest: /opt/myapp/config.yml
      tags: [app, config]

    - name: Run database migrations
      command: /opt/myapp/bin/migrate --apply
      run_once: true
      tags: [app, migrate]

    - name: Run smoke tests
      uri:
        url: "http://{{ inventory_hostname }}/health"
        status_code: 200
      tags: [verify]

  handlers:
    - name: Reload nginx
      systemd:
        name: nginx
        state: reloaded
```

Now list the tags:

```bash
ansible-playbook --list-tags tagged-deploy.yml
```

```
playbook: tagged-deploy.yml

  play #1 (webservers): Deploy web application	TAGS: []
      TASK TAGS: [app, config, deploy, migrate, nginx, packages, ssl, verify]
```

## Running Tasks by Tag

Once you know the available tags, use `--tags` to run only specific tasks:

```bash
# Only deploy application code (skip nginx, ssl, packages)
ansible-playbook --tags deploy deploy.yml

# Only update configuration files
ansible-playbook --tags config deploy.yml

# Only run SSL-related tasks
ansible-playbook --tags ssl deploy.yml

# Run multiple tags
ansible-playbook --tags "app,migrate" deploy.yml
```

## Skipping Tasks by Tag

Use `--skip-tags` to exclude specific tags:

```bash
# Run everything except migrations
ansible-playbook --skip-tags migrate deploy.yml

# Run everything except verification
ansible-playbook --skip-tags verify deploy.yml

# Skip both packages and config (just deploy code)
ansible-playbook --skip-tags "packages,config" deploy.yml
```

## Verifying Tag Selection Before Running

Combine `--list-tasks` with `--tags` to see exactly which tasks will run:

```bash
# Show which tasks will run with the 'config' tag
ansible-playbook --list-tasks --tags config deploy.yml
```

```
playbook: deploy.yml

  play #1 (webservers): Deploy web application	TAGS: []
    tasks:
      Deploy nginx configuration	TAGS: [nginx, config]
      Deploy SSL certificates	TAGS: [ssl, config]
      Deploy application configuration	TAGS: [app, config]
```

This three-step workflow is the safest approach:

```bash
# Step 1: See available tags
ansible-playbook --list-tags deploy.yml

# Step 2: Preview which tasks the tag selects
ansible-playbook --list-tasks --tags app deploy.yml

# Step 3: Preview which hosts are affected
ansible-playbook --list-hosts --tags app deploy.yml

# Step 4: Run with confidence
ansible-playbook --tags app deploy.yml
```

## Tag Inheritance in Roles

When you tag a role in a playbook, all tasks in that role inherit the tag:

```yaml
# site.yml - Tags on roles
---
- name: Configure servers
  hosts: all
  become: yes

  roles:
    - role: common
      tags: [common, base]

    - role: nginx
      tags: [nginx, web]

    - role: myapp
      tags: [app, deploy]

    - role: monitoring
      tags: [monitoring]
```

```bash
ansible-playbook --list-tags site.yml
```

```
playbook: site.yml

  play #1 (all): Configure servers	TAGS: []
      TASK TAGS: [app, base, common, deploy, monitoring, nginx, web]
```

Every task in the `common` role now has the `common` and `base` tags, even if the tasks themselves did not define any tags.

## Play-Level Tags

You can tag entire plays:

```yaml
# multi-play-tags.yml - Tags on plays
---
- name: Setup infrastructure
  hosts: all
  become: yes
  tags: [infrastructure]

  tasks:
    - name: Install base packages
      apt:
        name: [htop, vim, curl]
        state: present
      tags: [packages]

- name: Deploy application
  hosts: webservers
  become: yes
  tags: [application]

  tasks:
    - name: Deploy app
      copy:
        src: files/app.jar
        dest: /opt/myapp/
      tags: [deploy]

- name: Run tests
  hosts: webservers
  tags: [testing]

  tasks:
    - name: Health check
      uri:
        url: http://localhost:8080/health
```

```bash
ansible-playbook --list-tags multi-play-tags.yml
```

```
playbook: multi-play-tags.yml

  play #1 (all): Setup infrastructure	TAGS: [infrastructure]
      TASK TAGS: [infrastructure, packages]

  play #2 (webservers): Deploy application	TAGS: [application]
      TASK TAGS: [application, deploy]

  play #3 (webservers): Run tests	TAGS: [testing]
      TASK TAGS: [testing]
```

With play-level tags, `--tags infrastructure` runs only the first play, `--tags application` runs only the second, etc.

## Special Tags

Ansible has two special tags:

- `always`: Tasks with this tag always run, regardless of which tags you specify
- `never`: Tasks with this tag never run, unless you explicitly include the tag

```yaml
# special-tags.yml - Using always and never tags
---
- name: Deployment with special tags
  hosts: webservers
  become: yes

  tasks:
    - name: Record deployment start time
      set_fact:
        deploy_start: "{{ ansible_date_time.iso8601 }}"
      tags: [always]  # Runs regardless of tag selection

    - name: Dangerous data cleanup
      command: /opt/scripts/cleanup-old-data.sh
      tags: [never, cleanup]  # Only runs if you explicitly use --tags cleanup

    - name: Deploy application
      copy:
        src: files/app.jar
        dest: /opt/myapp/
      tags: [deploy]

    - name: Log deployment completion
      debug:
        msg: "Deployment started at {{ deploy_start }}, completed at {{ ansible_date_time.iso8601 }}"
      tags: [always]
```

```bash
# List tags shows 'always' and 'never' tags
ansible-playbook --list-tags special-tags.yml
```

```
playbook: special-tags.yml

  play #1 (webservers): Deployment with special tags	TAGS: []
      TASK TAGS: [always, cleanup, deploy, never]
```

```bash
# Running with --tags deploy:
# 1. Record deployment start time (always)
# 2. Deploy application (deploy)
# 3. Log deployment completion (always)
# The cleanup task is skipped because it has 'never' tag

# To explicitly run cleanup:
ansible-playbook --tags cleanup special-tags.yml
```

## Tag Naming Conventions

Good tag names make playbooks self-documenting. Here are conventions I use:

```yaml
# well-tagged-playbook.yml - Consistent tag naming
---
- name: Full application lifecycle
  hosts: webservers
  become: yes

  tasks:
    # Phase-based tags
    - name: Install dependencies
      apt:
        name: [nginx, python3]
        state: present
      tags: [setup, packages]

    - name: Configure services
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      tags: [configure, nginx]

    - name: Deploy application
      copy:
        src: files/app.tar.gz
        dest: /opt/myapp/
      tags: [deploy, app]

    - name: Validate deployment
      uri:
        url: http://localhost/health
      tags: [validate, healthcheck]

    # Component-based tags
    - name: Update SSL
      copy:
        src: files/cert.pem
        dest: /etc/ssl/
      tags: [ssl, security]

    # Operation-based tags
    - name: Run backup
      command: /opt/scripts/backup.sh
      tags: [never, maintenance, backup]

    - name: Clear cache
      command: /opt/scripts/clear-cache.sh
      tags: [never, maintenance, cache]
```

This gives you clean tag groups:

```bash
# Run by phase
ansible-playbook --tags setup deploy.yml
ansible-playbook --tags configure deploy.yml
ansible-playbook --tags deploy deploy.yml
ansible-playbook --tags validate deploy.yml

# Run by component
ansible-playbook --tags nginx deploy.yml
ansible-playbook --tags ssl deploy.yml

# Run maintenance tasks explicitly
ansible-playbook --tags backup deploy.yml
ansible-playbook --tags cache deploy.yml
```

## Generating Tag Documentation

Automate tag documentation for your team:

```bash
#!/bin/bash
# document-tags.sh - Generate tag documentation for all playbooks

echo "# Ansible Playbook Tag Reference"
echo ""
echo "Generated: $(date)"
echo ""

for playbook in *.yml; do
    if ! ansible-playbook --syntax-check "$playbook" > /dev/null 2>&1; then
        continue
    fi

    TAGS=$(ansible-playbook --list-tags "$playbook" 2>/dev/null | grep "TASK TAGS:" | \
           sed 's/.*TASK TAGS: \[//' | sed 's/\]//' | tr ',' '\n' | sort -u | tr '\n' ', ')

    if [ -n "$TAGS" ]; then
        echo "## $playbook"
        echo ""
        echo "Available tags: $TAGS"
        echo ""
    fi
done
```

## Practical Workflow

Here is my typical workflow when using tags:

```bash
# 1. Discover available tags
ansible-playbook --list-tags site.yml

# 2. Check which tasks a tag targets
ansible-playbook --list-tasks --tags nginx site.yml

# 3. Dry run with the selected tag
ansible-playbook --check --diff --tags nginx site.yml

# 4. Run only the nginx tasks
ansible-playbook --tags nginx site.yml

# 5. Run everything except nginx
ansible-playbook --skip-tags nginx site.yml
```

## Summary

The `--list-tags` flag gives you a complete inventory of all tags in a playbook. Use it to discover what selective execution options are available, then combine with `--tags` and `--skip-tags` to run exactly the tasks you need. Tag your playbooks by phase (setup, deploy, verify), by component (nginx, app, database), and use `always` and `never` for tasks that should always or conditionally run. Good tagging makes a 200-task playbook as targeted as a 5-task one.
