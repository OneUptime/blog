# How to Integrate AWX with GitHub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, GitHub, GitOps, CI/CD

Description: Integrate AWX with GitHub for source control, webhook-driven deployments, and commit status updates in your automation workflows.

---

GitHub and AWX work together in several ways. GitHub hosts your playbooks and roles, AWX pulls them automatically when they change, webhooks trigger jobs on push events, and AWX can report job status back to GitHub commit checks. This post covers each integration point with working examples.

## Integration Overview

There are four main touchpoints between AWX and GitHub:

1. **Project source control** - AWX pulls playbooks from GitHub repositories
2. **Webhook triggers** - GitHub events launch AWX job templates
3. **Commit status updates** - AWX reports job results back to GitHub
4. **GitHub Actions integration** - Trigger AWX jobs from GitHub Actions workflows

```mermaid
flowchart LR
    subgraph GitHub
        A[Repository]
        B[Webhooks]
        C[Commit Statuses]
        D[Actions]
    end
    subgraph AWX
        E[Projects]
        F[Job Templates]
        G[Webhook Receiver]
    end
    A -->|SCM sync| E
    B -->|POST event| G
    G -->|launch| F
    F -->|update status| C
    D -->|API call| F
```

## Setting Up GitHub Credentials in AWX

AWX needs credentials to clone private repositories and update commit statuses. Create a GitHub Personal Access Token (PAT) with `repo` scope.

```bash
# Create an SCM credential for GitHub
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "GitHub SCM Credential",
    "organization": 1,
    "credential_type": 2,
    "inputs": {
      "username": "your-github-username",
      "password": "ghp_your_personal_access_token"
    }
  }'
```

Credential type ID 2 is "Source Control" in AWX. For SSH-based authentication, use an SSH key instead.

```bash
# Create an SSH credential for GitHub
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "GitHub SSH Key",
    "organization": 1,
    "credential_type": 2,
    "inputs": {
      "ssh_key_data": "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----",
      "ssh_key_unlock": ""
    }
  }'
```

## Creating a Project Linked to GitHub

A project in AWX maps to a Git repository. When the project syncs, AWX clones or pulls the repo.

```bash
# Create a project pointing to a GitHub repo
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/projects/ \
  -d '{
    "name": "Infrastructure Playbooks",
    "organization": 1,
    "scm_type": "git",
    "scm_url": "https://github.com/myorg/infra-playbooks.git",
    "scm_branch": "main",
    "scm_credential": 5,
    "scm_update_on_launch": true,
    "scm_update_cache_timeout": 60,
    "scm_clean": true,
    "scm_delete_on_update": false
  }'
```

Key settings:
- `scm_update_on_launch` - Pull the latest code every time a job template using this project launches. This adds a few seconds but guarantees you are always running the latest playbook.
- `scm_update_cache_timeout` - Seconds to cache the project update. If set to 60, AWX skips the pull if it was done in the last 60 seconds.
- `scm_clean` - Discard any local modifications before pulling.

## Auto-Syncing on GitHub Push

You can configure the project to sync automatically when code is pushed to GitHub using a webhook.

```bash
# Enable webhook-based project updates
curl -s -X PATCH \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/projects/3/ \
  -d '{
    "scm_update_on_launch": false,
    "allow_override": true
  }'
```

Then set up a GitHub webhook pointed at the project update endpoint. But for most teams, `scm_update_on_launch: true` is simpler and works well enough.

## Linking Job Templates to GitHub Webhooks

This is where it gets interesting. A GitHub push can trigger an AWX job directly.

```bash
# Enable GitHub webhooks on a job template
curl -s -X PATCH \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/job_templates/10/ \
  -d '{"webhook_service": "github"}'

# Get the webhook URL
curl -s -H "Authorization: Bearer ${AWX_TOKEN}" \
  https://awx.example.com/api/v2/job_templates/10/ \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Webhook Key: {data[\"webhook_key\"]}')
"
```

Configure the webhook in GitHub:

1. Go to your repo > Settings > Webhooks > Add webhook
2. Set Payload URL to `https://awx.example.com/api/v2/job_templates/10/github/`
3. Set Content type to `application/json`
4. Set Secret to the webhook key from AWX
5. Select events: Push, Pull request, or both

## Commit Status Updates

AWX can update GitHub commit statuses so you can see whether a triggered job passed or failed directly in the GitHub UI, next to the commit or on the pull request.

For this to work, create a GitHub Personal Access Token credential in AWX.

```bash
# Create a GitHub PAT credential for status updates
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "GitHub Status Token",
    "organization": 1,
    "credential_type": 13,
    "inputs": {
      "token": "ghp_your_token_with_repo_status_scope"
    }
  }'
```

Credential type 13 is "GitHub Personal Access Token." Then attach it to the job template as a webhook credential.

```bash
# Attach the GitHub token credential to the template
curl -s -X PATCH \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/job_templates/10/ \
  -d '{"webhook_credential": 10}'
```

Now when a webhook triggers a job, AWX updates the commit status in GitHub: pending when the job starts, success when it passes, and failure or error when it does not.

## GitHub Actions Integration

You can also trigger AWX jobs from GitHub Actions workflows. This is useful when AWX handles deployment but GitHub Actions handles testing and building.

```yaml
# .github/workflows/deploy.yml
name: Deploy via AWX

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Launch AWX job
        run: |
          # Launch the deployment job template
          RESPONSE=$(curl -s -X POST \
            -H "Authorization: Bearer ${{ secrets.AWX_TOKEN }}" \
            -H "Content-Type: application/json" \
            https://awx.example.com/api/v2/job_templates/10/launch/ \
            -d '{
              "extra_vars": {
                "version": "${{ github.sha }}",
                "environment": "production"
              }
            }')

          JOB_ID=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
          echo "Launched AWX job: $JOB_ID"
          echo "JOB_ID=$JOB_ID" >> $GITHUB_ENV

      - name: Wait for AWX job
        run: |
          while true; do
            STATUS=$(curl -s \
              -H "Authorization: Bearer ${{ secrets.AWX_TOKEN }}" \
              https://awx.example.com/api/v2/jobs/${{ env.JOB_ID }}/ \
              | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")

            echo "Job status: $STATUS"

            case $STATUS in
              successful) echo "Deployment succeeded"; exit 0 ;;
              failed|error|canceled) echo "Deployment failed"; exit 1 ;;
              *) sleep 15 ;;
            esac
          done
        timeout-minutes: 30
```

## Branch-Based Deployment Strategy

A common pattern is to deploy different environments based on the branch that was pushed.

```yaml
# deploy.yml - Playbook that uses webhook payload for branch routing
---
- name: Deploy based on branch
  hosts: localhost
  connection: local

  vars:
    branch: "{{ awx_webhook_payload.ref | default('refs/heads/unknown') | regex_replace('^refs/heads/', '') }}"

  tasks:
    - name: Set target environment
      ansible.builtin.set_fact:
        target_env: >-
          {%- if branch == 'main' -%}production
          {%- elif branch == 'staging' -%}staging
          {%- elif branch == 'develop' -%}development
          {%- else -%}skip
          {%- endif -%}

    - name: Skip unrecognized branches
      ansible.builtin.meta: end_play
      when: target_env == "skip"

    - name: Deploy to target environment
      ansible.builtin.debug:
        msg: "Deploying branch {{ branch }} to {{ target_env }}"

- name: Run deployment on target hosts
  hosts: "{{ hostvars['localhost']['target_env'] }}_servers"
  become: true
  tasks:
    - name: Pull and restart
      ansible.builtin.git:
        repo: "{{ awx_webhook_payload.repository.clone_url }}"
        dest: /opt/app
        version: "{{ awx_webhook_payload.after }}"
```

## Repository Structure for AWX

Organize your GitHub repository so AWX can find everything it needs.

```text
infra-playbooks/
  playbooks/
    deploy.yml
    provision.yml
    backup.yml
  roles/
    webserver/
    database/
    monitoring/
  inventories/
    production/
    staging/
  collections/
    requirements.yml
  README.md
```

In the AWX project settings, the root of the repo is the base path. Playbook paths in job templates are relative to this root, so a template would reference `playbooks/deploy.yml`.

## Wrapping Up

GitHub and AWX form a natural pair for GitOps-style automation. Code your playbooks in GitHub, let AWX pull them automatically, trigger deployments on push events, and see job results as commit statuses. The setup involves creating credentials, linking a project, and configuring webhooks. Once it is wired up, your deployment process becomes: push to main, AWX handles the rest.
