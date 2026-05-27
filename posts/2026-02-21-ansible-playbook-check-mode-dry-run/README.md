# How to Run an Ansible Playbook in Check Mode (Dry Run)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Playbook, Check Mode, DevOps, Testing

Description: Learn how to use Ansible check mode to preview changes before applying them, ensuring safe playbook execution in production.

---

Running a playbook directly in production without knowing what it will change is a gamble nobody should take. Ansible's check mode (also called dry run) lets you preview what supported modules would change without actually modifying anything on your target hosts. This is an essential tool for validating playbooks before deploying to live environments.

## What Check Mode Does

When you run a playbook in check mode, Ansible goes through the tasks and reports what supported modules would change. It connects to the remote hosts, gathers facts, evaluates conditions, and checks the current state of resources. But modules that support check mode stop short of making actual modifications.

Think of it as a "what if" scenario. The output looks similar to a normal run, but supported tasks that would make a change show up as "changed" without actually changing anything.

## Running Check Mode from the Command Line

The simplest way to use check mode is with the `--check` flag.

```bash
# Preview what the playbook would do without making changes

ansible-playbook -i inventory.ini site.yml --check
```

You can also combine it with `--diff` to see the actual content differences.

```bash
# Preview changes and show file diffs
ansible-playbook -i inventory.ini site.yml --check --diff
```

The output will look something like this:

```text
TASK [Deploy nginx config] ****************************************************
--- before: /etc/nginx/nginx.conf
+++ after: /home/deploy/.ansible/tmp/nginx.conf
@@ -1,4 +1,4 @@
-worker_processes  1;
+worker_processes  4;

changed: [web01]
```

This tells you the playbook would change `worker_processes` from 1 to 4 in the nginx config, without actually doing it.

## Enabling Check Mode on Individual Tasks

You do not have to run the entire playbook in check mode. You can mark individual tasks to always run in check mode, or to never run in check mode, using the `check_mode` directive.

```yaml
# deploy.yml - demonstrates per-task check mode control
---
- name: Deploy application
  hosts: webservers
  become: yes

  tasks:
    # This task always runs in check mode, even during a real run
    - name: Verify supported operating system before deployment
      assert:
        that:
          - ansible_facts['os_family'] in ['Debian', 'RedHat']
        fail_msg: "Unsupported operating system"
      check_mode: yes

    # This task never runs in check mode (it always executes)
    - name: Log deployment attempt to audit system
      uri:
        url: "https://audit.example.com/api/deployments"
        method: POST
        body_format: json
        body:
          playbook: deploy
          timestamp: "{{ ansible_date_time.iso8601 }}"
      check_mode: no

    - name: Deploy application files
      synchronize:
        src: /opt/releases/current/
        dest: /var/www/app/
```

Setting `check_mode: yes` on a task means it will always operate in check mode, which is useful for validation tasks that use modules with check mode support. Setting `check_mode: no` means the task will always execute, even when the playbook is run with `--check`, which makes sense for audit logging or read-only operations.

## Handling Modules That Do Not Support Check Mode

Not every Ansible module supports check mode. The `raw` module does not support check mode, and the `shell` and `command` modules only have partial support. Because Ansible has no way to predict what an arbitrary command will do without running it, `shell` and `command` can only predict changed status in check mode when you use options such as `creates` or `removes`.

When check mode hits an unsupported task, or a `shell` or `command` task without enough information to predict the result, it skips the task. This can cause issues if later tasks depend on the output of a skipped task.

```yaml
# workaround.yml - handles check mode for shell commands
---
- name: Database migration with check mode support
  hosts: dbservers
  become: yes

  tasks:
    # A plain shell task would be skipped in check mode, so force this read-only check to run
    - name: Check current database schema version
      shell: psql -t -c "SELECT version FROM schema_info LIMIT 1;"
      register: schema_version
      changed_when: false
      check_mode: no

    - name: Run database migration
      shell: /opt/app/migrate.sh --to-version {{ target_version }}
      when: schema_version.stdout | trim | int < target_version | int
```

By setting `check_mode: no` on the first task, it will always execute (it is read-only anyway), so the registered variable will be available for the conditional on the second task.

## Check Mode Decision Flow

Here is how Ansible decides what to do with each task during check mode.

```mermaid
flowchart TD
    A[Task Encountered] --> B{Check Mode Active?}
    B -->|No| C[Execute Task Normally]
    B -->|Yes| D{Task has check_mode: no?}
    D -->|Yes| C
    D -->|No| E{Module Supports Check Mode?}
    E -->|Yes| F[Simulate Task / Report Would-Change]
    E -->|No| G[Skip Task]
    F --> H[Continue to Next Task]
    G --> H
    C --> H
```

## Practical Use Cases

### Pre-deployment Validation

Before deploying to production, run check mode against your staging and production inventories to compare what would happen.

```bash
# Check what would change in staging
ansible-playbook -i staging.ini deploy.yml --check --diff > staging-changes.txt

# Check what would change in production
ansible-playbook -i production.ini deploy.yml --check --diff > production-changes.txt

# Compare the two
diff staging-changes.txt production-changes.txt
```

### Configuration Drift Detection

Use check mode on a schedule to detect when hosts have drifted from their expected state.

```yaml
# drift-check.yml - detects configuration drift across the fleet
---
- name: Check for configuration drift
  hosts: all
  become: yes

  tasks:
    - name: Verify sshd_config matches expected state
      copy:
        src: files/sshd_config
        dest: /etc/ssh/sshd_config
        owner: root
        group: root
        mode: '0600'
      register: sshd_result

    - name: Verify resolv.conf matches expected state
      copy:
        src: files/resolv.conf
        dest: /etc/resolv.conf
        owner: root
        group: root
        mode: '0644'
      register: resolv_result

    - name: Report drift detected
      debug:
        msg: "DRIFT DETECTED on {{ inventory_hostname }}: sshd={{ sshd_result.changed }}, resolv={{ resolv_result.changed }}"
      when: sshd_result.changed or resolv_result.changed
```

Run this with check mode on a cron job:

```bash
# Run drift detection every hour via cron
0 * * * * ansible-playbook -i production.ini drift-check.yml --check 2>&1 | grep "DRIFT DETECTED" >> /var/log/ansible-drift.log
```

### CI/CD Pipeline Integration

Add check mode as a validation step in your CI/CD pipeline before allowing deployments.

```bash
# In your CI pipeline script
# Step 1: Syntax check
ansible-playbook deploy.yml --syntax-check

# Step 2: Dry run to verify no unexpected changes
ansible-playbook -i production.ini deploy.yml --check --diff

# Step 3: If check mode passes review, do the real deployment
ansible-playbook -i production.ini deploy.yml
```

## Limitations to Keep in Mind

Check mode is not perfect. Here are the situations where it falls short:

**Dependent tasks chain**: If task B depends on output from task A, and task A gets skipped in check mode, task B might fail or report incorrect results.

**Idempotency assumptions**: Check mode assumes modules are idempotent, but arbitrary `shell` and `command` tasks cannot be fully checked because Ansible does not know what the command will do. Without hints such as `creates` or `removes`, they are skipped in check mode.

**External state changes**: If your playbook interacts with external APIs or services, check mode cannot predict how those services will respond to actual requests.

**File content from templates**: While check mode can detect that a template would change, the diff output depends on the current state of the remote file. If the remote file does not exist yet, the diff is less useful.

Despite these limitations, check mode is one of the most valuable safety nets in the Ansible toolbox. Make it a habit to run `--check --diff` before every production deployment, and you will catch problems before they become outages.
