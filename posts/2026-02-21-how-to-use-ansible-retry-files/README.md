# How to Use Ansible Retry Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, Retry, Automation

Description: Learn how Ansible retry files work, how to configure them, and how to use them effectively for recovering from partial playbook failures.

---

When an Ansible playbook runs against multiple hosts and some of them fail, Ansible generates a retry file. This file contains the names of the hosts that failed, so you can rerun the playbook targeting only those hosts. It is a simple but powerful mechanism for recovering from partial failures without wasting time re-running tasks on hosts that already succeeded.

## How Retry Files Work

When a playbook finishes and at least one host has failed, Ansible writes a `.retry` file in the same directory as the playbook (by default). The file is named after the playbook with a `.retry` extension.

For example, running `deploy.yml` against 10 hosts where 2 fail produces:

```bash
# After running: ansible-playbook deploy.yml
# Ansible outputs something like:
# PLAY RECAP *********************************************************************
# web1.example.com : ok=5    changed=3    unreachable=0    failed=0
# web2.example.com : ok=5    changed=3    unreachable=0    failed=0
# web3.example.com : ok=3    changed=1    unreachable=0    failed=1
# ...
# web8.example.com : ok=0    changed=0    unreachable=1    failed=0
# ...
#
# Retry limit reached: deploy.retry

# The retry file contains just the failed/unreachable hosts:
cat deploy.retry
# web3.example.com
# web8.example.com
```

## Configuring Retry File Behavior

You control retry files through `ansible.cfg`:

```ini
# ansible.cfg - Retry file configuration options
[defaults]
# Enable or disable retry file creation (default: True in older versions, False in newer)
retry_files_enabled = True

# Directory where retry files are saved
# Default: same directory as the playbook
# Useful to keep your project directory clean
retry_files_save_path = /tmp/ansible-retries
```

You can also set these via environment variables:

```bash
# Environment variable overrides
export ANSIBLE_RETRY_FILES_ENABLED=True
export ANSIBLE_RETRY_FILES_SAVE_PATH=/tmp/ansible-retries
```

## Using Retry Files with --limit

The `--limit` flag with the `@` prefix reads hostnames from a file. This is how you use the retry file:

```bash
# First run: some hosts fail
ansible-playbook deploy.yml -i inventory/production

# Second run: target only failed hosts
ansible-playbook deploy.yml -i inventory/production --limit @deploy.retry
```

You can also combine the retry file limit with other limits:

```bash
# Target failed hosts that are also in the "webservers" group
ansible-playbook deploy.yml --limit "@deploy.retry:&webservers"

# Target failed hosts, but exclude a specific host for investigation
ansible-playbook deploy.yml --limit "@deploy.retry:!web3.example.com"
```

## A Complete Retry Workflow

Here is a realistic workflow for a production deployment that uses retry files:

```yaml
# deploy.yml - Production deployment playbook
---
- name: Deploy application to web fleet
  hosts: webservers
  serial: 5              # Deploy 5 hosts at a time
  max_fail_percentage: 20
  become: true
  tasks:
    - name: Pull latest container image
      community.docker.docker_image:
        name: "myregistry.example.com/myapp:{{ version }}"
        source: pull

    - name: Stop current application
      ansible.builtin.systemd:
        name: myapp
        state: stopped

    - name: Update application symlink
      ansible.builtin.file:
        src: "/opt/releases/{{ version }}"
        dest: /opt/myapp/current
        state: link

    - name: Start new version
      ansible.builtin.systemd:
        name: myapp
        state: started

    - name: Verify health check
      ansible.builtin.uri:
        url: http://localhost:8080/health
        status_code: 200
      register: health
      retries: 12
      delay: 5
      until: health.status == 200
```

The deployment workflow:

```bash
# Step 1: Run the deployment
ansible-playbook deploy.yml -e version=2.1.0

# Step 2: If some hosts failed, investigate
# Check which hosts failed
cat deploy.retry

# Step 3: Check the state of failed hosts
ansible -i inventory/production -m shell \
  -a "systemctl status myapp" \
  --limit @deploy.retry

# Step 4: Fix the underlying issue if needed, then retry
ansible-playbook deploy.yml -e version=2.1.0 --limit @deploy.retry

# Step 5: Verify all hosts are healthy
ansible webservers -m uri -a "url=http://localhost:8080/health"
```

## Managing Retry Files in CI/CD

In CI/CD pipelines, retry files need special handling. You want to save them as artifacts for debugging but also use them for automatic retries.

Here is a GitLab CI example:

```yaml
# .gitlab-ci.yml - CI/CD pipeline with retry file handling
deploy:
  stage: deploy
  script:
    # Create retry directory
    - mkdir -p /tmp/ansible-retries

    # First attempt
    - |
      ansible-playbook deploy.yml \
        -e version=$CI_COMMIT_TAG \
        -e ANSIBLE_RETRY_FILES_SAVE_PATH=/tmp/ansible-retries || true

    # Check if retry file exists (meaning some hosts failed)
    - |
      RETRY_FILE=/tmp/ansible-retries/deploy.retry
      if [ -f "$RETRY_FILE" ]; then
        echo "Some hosts failed. Retrying..."
        cat "$RETRY_FILE"
        sleep 30

        # Second attempt on failed hosts only
        ansible-playbook deploy.yml \
          -e version=$CI_COMMIT_TAG \
          --limit "@$RETRY_FILE"
      fi
  artifacts:
    when: on_failure
    paths:
      - /tmp/ansible-retries/
    expire_in: 7 days
```

A Jenkins pipeline equivalent:

```groovy
// Jenkinsfile - Pipeline with Ansible retry handling
pipeline {
    agent any
    environment {
        ANSIBLE_RETRY_FILES_SAVE_PATH = "${WORKSPACE}/retry-files"
    }
    stages {
        stage('Deploy') {
            steps {
                sh 'mkdir -p ${ANSIBLE_RETRY_FILES_SAVE_PATH}'

                // First attempt
                script {
                    def result = sh(
                        script: "ansible-playbook deploy.yml -e version=${params.VERSION}",
                        returnStatus: true
                    )

                    if (result != 0) {
                        echo "First attempt had failures, retrying failed hosts..."
                        sh "sleep 30"
                        sh "ansible-playbook deploy.yml -e version=${params.VERSION} --limit @${ANSIBLE_RETRY_FILES_SAVE_PATH}/deploy.retry"
                    }
                }
            }
            post {
                failure {
                    archiveArtifacts artifacts: 'retry-files/*.retry', allowEmptyArchive: true
                }
            }
        }
    }
}
```

## Custom Retry File Management

Sometimes you need more control over which hosts get retried. Here is a Python script that processes retry files:

```python
#!/usr/bin/env python3
# manage-retries.py - Custom retry file management
import sys
import json
import subprocess
from pathlib import Path

def load_retry_file(retry_path):
    """Read hosts from a retry file."""
    path = Path(retry_path)
    if not path.exists():
        print(f"No retry file found at {retry_path}")
        return []
    return [line.strip() for line in path.read_text().splitlines() if line.strip()]

def check_host_connectivity(hosts):
    """Check which hosts are actually reachable before retrying."""
    reachable = []
    unreachable = []

    for host in hosts:
        result = subprocess.run(
            ["ansible", host, "-m", "ping", "--one-line"],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            reachable.append(host)
        else:
            unreachable.append(host)

    return reachable, unreachable

def main():
    retry_file = sys.argv[1] if len(sys.argv) > 1 else "deploy.retry"
    hosts = load_retry_file(retry_file)

    if not hosts:
        print("No failed hosts to retry.")
        sys.exit(0)

    print(f"Found {len(hosts)} failed hosts: {', '.join(hosts)}")

    reachable, unreachable = check_host_connectivity(hosts)

    print(f"Reachable: {len(reachable)}, Unreachable: {len(unreachable)}")

    if unreachable:
        print(f"Still unreachable: {', '.join(unreachable)}")
        print("These hosts need manual investigation.")

    if reachable:
        # Write a filtered retry file with only reachable hosts
        filtered_file = retry_file.replace('.retry', '.filtered.retry')
        Path(filtered_file).write_text('\n'.join(reachable) + '\n')
        print(f"Filtered retry file written to {filtered_file}")
        print(f"Run: ansible-playbook deploy.yml --limit @{filtered_file}")

if __name__ == "__main__":
    main()
```

## Retry File Gotchas

There are a few things to watch out for when using retry files.

Retry files are overwritten on each playbook run. If you run the playbook again (even without `--limit`), the previous retry file is replaced. Save a copy if you need it.

```bash
# Save a copy before rerunning
cp deploy.retry deploy.retry.backup.$(date +%s)

# Now rerun
ansible-playbook deploy.yml -e version=2.1.0
```

Retry files only contain hostnames, not the task where the failure occurred. The entire playbook runs from the beginning for the failed hosts. If you need to skip tasks that already succeeded, combine with `--start-at-task`.

```bash
# Resume from a specific task on failed hosts only
ansible-playbook deploy.yml \
  --limit @deploy.retry \
  --start-at-task="Start new version"
```

## Summary

Retry files are Ansible's built-in mechanism for dealing with partial failures across your fleet. Enable them in `ansible.cfg`, use `--limit @filename.retry` to target failed hosts, and combine with `--start-at-task` when you need to skip completed tasks. For CI/CD pipelines, build retry logic into your pipeline scripts and archive retry files as artifacts for post-mortem analysis. The workflow is simple: run, check, fix, retry.
