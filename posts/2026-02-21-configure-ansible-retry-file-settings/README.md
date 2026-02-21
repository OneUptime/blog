# How to Configure Ansible Retry File Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration, Troubleshooting, DevOps

Description: Configure Ansible retry files to manage failed host tracking, control file locations, and integrate retry logic into your workflow.

---

When an Ansible playbook fails on one or more hosts, it creates a `.retry` file containing the hostnames that failed. This file lets you re-run the playbook against only the failed hosts instead of all hosts, saving time on large fleet operations. However, these retry files can also clutter your project directory and cause confusion if not managed properly. This guide covers how to configure retry file behavior to fit your workflow.

## What Are Retry Files?

When a playbook fails, Ansible creates a file named `<playbook-name>.retry` in the same directory as the playbook. It contains a simple list of hostnames that failed:

```
web03
db01
worker05
```

You can then re-run the playbook against only these hosts:

```bash
# Re-run the playbook against only the failed hosts
ansible-playbook deploy.yml --limit @deploy.retry
```

The `@` prefix tells Ansible to read the host list from the file.

## Default Behavior

By default, Ansible creates retry files in the same directory as the playbook. If your playbook is at `playbooks/deploy.yml`, the retry file will be `playbooks/deploy.retry`.

## Disabling Retry Files

Many teams disable retry files entirely because they prefer other methods of handling failures. If retry files are cluttering your project, turn them off:

```ini
# ansible.cfg
[defaults]
retry_files_enabled = False
```

Or via environment variable:

```bash
export ANSIBLE_RETRY_FILES_ENABLED=False
ansible-playbook deploy.yml
```

This is the most common configuration. Most projects in version control have retry files disabled to avoid committing them accidentally.

## Changing the Retry File Location

Instead of disabling retry files, you can redirect them to a specific directory. This keeps your project clean while still having retry files available when you need them:

```ini
# ansible.cfg
[defaults]
retry_files_enabled = True
retry_files_save_path = /tmp/ansible-retries
```

Make sure the directory exists:

```bash
# Create the retry file directory
mkdir -p /tmp/ansible-retries
```

With this configuration, all retry files go to `/tmp/ansible-retries/` regardless of where the playbook is located. This keeps your project directories clean and avoids cluttering version control.

You can also set this via environment variable:

```bash
export ANSIBLE_RETRY_FILES_SAVE_PATH=/tmp/ansible-retries
ansible-playbook deploy.yml
```

## Using Retry Files in Practice

### Basic Retry Workflow

Here is a typical workflow when using retry files:

```bash
# Run the playbook (some hosts may fail)
ansible-playbook -i inventory.ini playbooks/deploy.yml
```

If some hosts fail, Ansible prints:

```
PLAY RECAP *********************************************************************
web01  : ok=5    changed=2    unreachable=0    failed=0    skipped=0
web02  : ok=5    changed=2    unreachable=0    failed=0    skipped=0
web03  : ok=3    changed=1    unreachable=0    failed=1    skipped=0
db01   : ok=2    changed=0    unreachable=1    failed=0    skipped=0

Retry file created: /tmp/ansible-retries/deploy.retry
```

Fix the underlying issue on the failed hosts, then re-run:

```bash
# Re-run against only the failed hosts
ansible-playbook -i inventory.ini playbooks/deploy.yml --limit @/tmp/ansible-retries/deploy.retry
```

### Combining Retry with Other Limits

You can combine the retry file with additional limit filters:

```bash
# Retry failed hosts, but only those in the webservers group
ansible-playbook -i inventory.ini playbooks/deploy.yml \
  --limit @/tmp/ansible-retries/deploy.retry:&webservers
```

The `&` operator means "intersection," so this runs against hosts that are both in the retry file and in the webservers group.

## Automated Retry in Scripts

For CI/CD pipelines, you might want automatic retries. Here is a script that retries failed hosts up to a configurable number of times:

```bash
#!/bin/bash
# ansible-with-retry.sh
# Usage: ./ansible-with-retry.sh <playbook> [max_retries]

PLAYBOOK="${1}"
MAX_RETRIES="${2:-3}"
RETRY_DIR="/tmp/ansible-retries"
RETRY_FILE="${RETRY_DIR}/$(basename ${PLAYBOOK} .yml).retry"

mkdir -p "${RETRY_DIR}"

# First run against all hosts
echo "=== Initial run ==="
ANSIBLE_RETRY_FILES_ENABLED=True \
ANSIBLE_RETRY_FILES_SAVE_PATH="${RETRY_DIR}" \
ansible-playbook -i inventory.ini "${PLAYBOOK}"

ATTEMPT=1

# Retry loop for failed hosts
while [ -f "${RETRY_FILE}" ] && [ ${ATTEMPT} -le ${MAX_RETRIES} ]; do
    echo ""
    echo "=== Retry attempt ${ATTEMPT}/${MAX_RETRIES} ==="
    echo "Failed hosts: $(cat ${RETRY_FILE} | tr '\n' ' ')"
    echo ""

    # Wait a bit before retrying (maybe the issue is transient)
    sleep 10

    ANSIBLE_RETRY_FILES_ENABLED=True \
    ANSIBLE_RETRY_FILES_SAVE_PATH="${RETRY_DIR}" \
    ansible-playbook -i inventory.ini "${PLAYBOOK}" --limit "@${RETRY_FILE}"

    ATTEMPT=$((ATTEMPT + 1))
done

if [ -f "${RETRY_FILE}" ]; then
    echo ""
    echo "FAILED: Some hosts still failed after ${MAX_RETRIES} retries:"
    cat "${RETRY_FILE}"
    exit 1
else
    echo ""
    echo "SUCCESS: All hosts completed successfully"
    exit 0
fi
```

Make it executable and use it:

```bash
chmod +x ansible-with-retry.sh

# Run with default 3 retries
./ansible-with-retry.sh playbooks/deploy.yml

# Run with 5 retries
./ansible-with-retry.sh playbooks/deploy.yml 5
```

## Ansible's Built-in Retry Mechanisms

Beyond retry files, Ansible has built-in task-level retry capabilities that you should know about:

### Task-Level Retries

The `retries` keyword on a task automatically retries a failed task:

```yaml
---
- name: Deploy with task-level retries
  hosts: webservers
  become: true

  tasks:
    - name: Wait for apt lock to be released
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true
      register: apt_result
      retries: 5
      delay: 10
      until: apt_result is not failed

    - name: Wait for service to be healthy
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        return_content: true
      register: health_check
      retries: 10
      delay: 5
      until: health_check.status == 200
```

### Block-Level Error Handling

Use `block/rescue` for more sophisticated error handling:

```yaml
---
- name: Deploy with error handling
  hosts: webservers
  become: true

  tasks:
    - name: Attempt deployment
      block:
        - name: Deploy new code
          ansible.builtin.copy:
            src: app/
            dest: /opt/app/

        - name: Restart service
          ansible.builtin.service:
            name: myapp
            state: restarted

        - name: Verify health
          ansible.builtin.uri:
            url: "http://{{ inventory_hostname }}:8080/health"
          register: health
          retries: 5
          delay: 5
          until: health.status == 200

      rescue:
        - name: Rollback to previous version
          ansible.builtin.copy:
            src: app-backup/
            dest: /opt/app/

        - name: Restart with old code
          ansible.builtin.service:
            name: myapp
            state: restarted

        - name: Notify about failure
          ansible.builtin.debug:
            msg: "Deployment failed on {{ inventory_hostname }}, rolled back"
```

## Cleaning Up Retry Files

If you keep retry files enabled, clean them up periodically:

```bash
# Remove all retry files older than 7 days
find /tmp/ansible-retries -name "*.retry" -mtime +7 -delete

# Remove all retry files (useful after all hosts are successfully updated)
rm -f /tmp/ansible-retries/*.retry
```

Add this to your Makefile:

```makefile
.PHONY: clean-retries

clean-retries:
	rm -f /tmp/ansible-retries/*.retry
	@echo "Retry files cleaned"
```

## Adding Retry Files to .gitignore

If retry files are enabled and saved in your project directory, make sure they are not committed:

```gitignore
# .gitignore
*.retry
```

## The Recommended Configuration

For most teams, I recommend this setup:

```ini
# ansible.cfg
[defaults]
# Keep retry files but save them outside the project
retry_files_enabled = True
retry_files_save_path = /tmp/ansible-retries
```

This gives you the benefit of retry files when you need them (especially during large fleet operations) without cluttering your project directory. If your team never uses retry files, just disable them:

```ini
[defaults]
retry_files_enabled = False
```

## Summary

Ansible retry files are a simple but useful mechanism for re-running playbooks against only the hosts that failed. Configure `retry_files_save_path` to keep them out of your project directory, or disable them entirely if your workflow does not need them. For production deployments, consider wrapping the retry logic in a script that automatically retries failed hosts a configurable number of times. And for individual tasks that might fail transiently, use the built-in `retries` and `until` keywords rather than relying on retry files at the playbook level.
