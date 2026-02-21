# How to Handle Ansible Errors in CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, CI/CD, Error Handling, DevOps

Description: Learn strategies for handling Ansible errors in CI/CD pipelines including exit codes, artifacts, notifications, and automatic rollbacks.

---

Running Ansible in CI/CD pipelines introduces challenges you do not face when running playbooks manually. You cannot interactively debug failures, the environment is ephemeral, and a stuck playbook can block your entire deployment pipeline. Proper error handling ensures failures are caught, reported, and acted upon automatically.

## Understanding Ansible Exit Codes

Ansible uses specific exit codes to indicate different outcomes. Your CI/CD pipeline should act on these codes.

```bash
# Exit code reference:
# 0 - Success, no changes or changes applied successfully
# 1 - Error during execution
# 2 - One or more hosts had failures
# 4 - One or more hosts were unreachable
# 99 - User interrupted execution (Ctrl+C)
# 250 - Unexpected error
```

Here is how to handle these in a shell script:

```bash
#!/bin/bash
# ci-ansible-runner.sh - Handles Ansible exit codes properly
set -o pipefail

PLAYBOOK=$1
EXTRA_VARS=$2

ansible-playbook "$PLAYBOOK" -e "$EXTRA_VARS" 2>&1 | tee /tmp/ansible-output.log
EXIT_CODE=${PIPESTATUS[0]}

case $EXIT_CODE in
    0)
        echo "SUCCESS: Playbook completed without errors"
        ;;
    1)
        echo "ERROR: Ansible encountered an execution error"
        echo "Check the playbook syntax and module availability"
        ;;
    2)
        echo "FAILURE: One or more hosts had task failures"
        echo "Failed hosts:"
        grep "fatal:" /tmp/ansible-output.log | head -20
        ;;
    4)
        echo "UNREACHABLE: One or more hosts could not be contacted"
        echo "Check network connectivity and SSH configuration"
        ;;
    *)
        echo "UNEXPECTED: Exit code $EXIT_CODE"
        ;;
esac

exit $EXIT_CODE
```

## GitLab CI Pipeline with Error Handling

Here is a complete GitLab CI pipeline that handles Ansible errors properly:

```yaml
# .gitlab-ci.yml - Full deployment pipeline with Ansible error handling
stages:
  - validate
  - deploy-staging
  - test-staging
  - deploy-production

variables:
  ANSIBLE_FORCE_COLOR: "true"
  ANSIBLE_RETRY_FILES_SAVE_PATH: "${CI_PROJECT_DIR}/retry-files"
  ANSIBLE_LOG_PATH: "${CI_PROJECT_DIR}/ansible.log"

# Validate playbook syntax before running
validate-playbook:
  stage: validate
  script:
    - ansible-playbook deploy.yml --syntax-check
    - ansible-lint deploy.yml || true  # Lint warnings should not block
  artifacts:
    when: always
    paths:
      - ansible.log

deploy-staging:
  stage: deploy-staging
  script:
    - mkdir -p retry-files
    # First attempt
    - |
      ansible-playbook deploy.yml \
        -i inventory/staging \
        -e "version=${CI_COMMIT_TAG}" \
        -e "environment=staging"
      DEPLOY_EXIT=$?

    # If failed, try once more on failed hosts
    - |
      if [ $DEPLOY_EXIT -ne 0 ] && [ -f retry-files/deploy.retry ]; then
        echo "First attempt had failures. Retrying failed hosts in 30s..."
        sleep 30
        ansible-playbook deploy.yml \
          -i inventory/staging \
          -e "version=${CI_COMMIT_TAG}" \
          -e "environment=staging" \
          --limit @retry-files/deploy.retry
      fi
  artifacts:
    when: always
    paths:
      - retry-files/
      - ansible.log
    expire_in: 7 days
  environment:
    name: staging

test-staging:
  stage: test-staging
  script:
    # Run smoke tests against staging
    - |
      ansible-playbook smoke-tests.yml \
        -i inventory/staging \
        -e "expected_version=${CI_COMMIT_TAG}"
  allow_failure: false

deploy-production:
  stage: deploy-production
  script:
    - mkdir -p retry-files
    - |
      ansible-playbook deploy.yml \
        -i inventory/production \
        -e "version=${CI_COMMIT_TAG}" \
        -e "environment=production" \
        -e "change_ticket=${CHANGE_TICKET}"
  artifacts:
    when: always
    paths:
      - retry-files/
      - ansible.log
    expire_in: 30 days
  environment:
    name: production
  when: manual  # Require manual trigger for production
  only:
    - tags
```

## GitHub Actions with Ansible Error Handling

```yaml
# .github/workflows/deploy.yml - GitHub Actions with Ansible error handling
name: Deploy Application

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Ansible
        run: pip install ansible

      - name: Configure SSH key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H staging.example.com >> ~/.ssh/known_hosts

      - name: Run deployment
        id: deploy
        run: |
          set +e
          ansible-playbook deploy.yml \
            -i inventory/staging \
            -e "version=${{ github.ref_name }}" \
            2>&1 | tee ansible-output.log
          echo "exit_code=${PIPESTATUS[0]}" >> $GITHUB_OUTPUT
        env:
          ANSIBLE_FORCE_COLOR: "true"

      - name: Upload logs on failure
        if: steps.deploy.outputs.exit_code != '0'
        uses: actions/upload-artifact@v4
        with:
          name: ansible-logs
          path: |
            ansible-output.log
            *.retry

      - name: Notify on failure
        if: steps.deploy.outputs.exit_code != '0'
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"Staging deployment failed for ${{ github.ref_name }}. Check logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"}"

      - name: Fail the job if deployment failed
        if: steps.deploy.outputs.exit_code != '0'
        run: exit 1
```

## Automatic Rollback on Failure

A critical CI/CD pattern is automatic rollback when a deployment fails. Here is a playbook structure that supports this:

```yaml
# deploy-with-rollback.yml - Deployment with automatic rollback
---
- name: Deploy with automatic rollback
  hosts: webservers
  serial: "25%"
  vars:
    deploy_version: "{{ version }}"
    rollback_version: "{{ previous_version | default('unknown') }}"
  tasks:
    - name: Record current version before deployment
      ansible.builtin.shell: |
        cat /opt/myapp/current/VERSION 2>/dev/null || echo "unknown"
      register: current_version_result
      changed_when: false

    - name: Store current version for potential rollback
      ansible.builtin.set_fact:
        rollback_version: "{{ current_version_result.stdout }}"

    - name: Attempt deployment
      block:
        - name: Download new release
          ansible.builtin.get_url:
            url: "https://releases.example.com/myapp-{{ deploy_version }}.tar.gz"
            dest: "/opt/releases/myapp-{{ deploy_version }}.tar.gz"
            timeout: 60

        - name: Extract release
          ansible.builtin.unarchive:
            src: "/opt/releases/myapp-{{ deploy_version }}.tar.gz"
            dest: "/opt/myapp/releases/"
            remote_src: true

        - name: Switch symlink to new version
          ansible.builtin.file:
            src: "/opt/myapp/releases/{{ deploy_version }}"
            dest: /opt/myapp/current
            state: link

        - name: Restart application
          ansible.builtin.systemd:
            name: myapp
            state: restarted
          become: true

        - name: Wait for health check
          ansible.builtin.uri:
            url: http://localhost:8080/health
          register: health
          retries: 20
          delay: 5
          until: health.status == 200

      rescue:
        - name: Rollback - switch symlink to previous version
          ansible.builtin.file:
            src: "/opt/myapp/releases/{{ rollback_version }}"
            dest: /opt/myapp/current
            state: link
          when: rollback_version != 'unknown'

        - name: Rollback - restart application with previous version
          ansible.builtin.systemd:
            name: myapp
            state: restarted
          become: true
          when: rollback_version != 'unknown'

        - name: Report rollback
          ansible.builtin.debug:
            msg: >
              ROLLBACK: {{ inventory_hostname }} rolled back from
              {{ deploy_version }} to {{ rollback_version }}

        - name: Fail after rollback to signal CI/CD
          ansible.builtin.fail:
            msg: "Deployment of {{ deploy_version }} failed on {{ inventory_hostname }}. Rolled back to {{ rollback_version }}."
```

## Structured Output for CI/CD Parsing

Use the JSON callback plugin for machine-readable output that your CI/CD system can parse:

```bash
# Run with JSON output for CI/CD parsing
ANSIBLE_STDOUT_CALLBACK=json ansible-playbook deploy.yml \
  -e version=2.0.1 > ansible-result.json 2>ansible-stderr.log

# Parse the result in your CI script
python3 << 'PYEOF'
import json
import sys

with open('ansible-result.json') as f:
    result = json.load(f)

stats = result.get('stats', {})
failed_hosts = []
for host, data in stats.items():
    if data.get('failures', 0) > 0 or data.get('unreachable', 0) > 0:
        failed_hosts.append(host)

if failed_hosts:
    print(f"FAILED HOSTS: {', '.join(failed_hosts)}")
    sys.exit(1)
else:
    print("All hosts succeeded")
    sys.exit(0)
PYEOF
```

## Pipeline Timeout Configuration

Always set timeouts on your CI/CD pipeline stages to prevent hung Ansible runs from blocking everything:

```yaml
# .gitlab-ci.yml - Stage-level timeout
deploy-production:
  stage: deploy
  timeout: 30 minutes    # Kill the job if it runs longer than 30 minutes
  script:
    - ansible-playbook deploy.yml -i inventory/production
```

```yaml
# .github/workflows/deploy.yml - Job-level timeout
jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Deploy
        run: ansible-playbook deploy.yml
        timeout-minutes: 25  # Step-level timeout
```

## Summary

Handling Ansible errors in CI/CD pipelines requires attention to exit codes, artifact preservation, notification channels, and rollback mechanisms. Always capture logs as artifacts, use retry files for automatic recovery from transient failures, implement automatic rollbacks for production deployments, and set pipeline-level timeouts to prevent hangs. The combination of `block`/`rescue` in your playbooks and proper error handling in your pipeline scripts gives you a robust deployment system that fails safely and provides actionable information for debugging.
