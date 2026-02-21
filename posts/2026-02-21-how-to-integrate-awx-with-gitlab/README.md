# How to Integrate AWX with GitLab

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, GitLab, CI/CD, DevOps

Description: Integrate AWX with GitLab for playbook source control, merge request triggers, pipeline coordination, and automated deployments.

---

GitLab and AWX integrate at multiple levels: GitLab hosts your Ansible playbooks, AWX syncs them automatically, GitLab webhooks trigger AWX jobs, and AWX can report results back to GitLab pipelines. If your organization uses GitLab for source control and CI/CD, connecting it to AWX creates a seamless path from code commit to infrastructure deployment.

## Integration Points

```mermaid
flowchart LR
    subgraph GitLab
        A[Repository]
        B[Webhooks]
        C[CI/CD Pipeline]
        D[Merge Requests]
    end
    subgraph AWX
        E[Project - SCM Sync]
        F[Job Templates]
        G[Webhook Receiver]
    end
    A -->|git pull| E
    E -->|playbooks| F
    B -->|POST event| G
    G -->|trigger| F
    C -->|API call| F
    F -.->|status| D
```

## Creating GitLab Credentials in AWX

AWX needs credentials to clone repositories from GitLab. You have two options: HTTPS with a personal access token or SSH with a deploy key.

### Option 1: HTTPS with Personal Access Token

Generate a GitLab PAT with `read_repository` scope (add `api` scope if you also want status updates).

```bash
# Create an SCM credential using GitLab PAT
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "GitLab SCM - HTTPS",
    "organization": 1,
    "credential_type": 2,
    "inputs": {
      "username": "gitlab-token-user",
      "password": "glpat-your-personal-access-token"
    }
  }'
```

### Option 2: SSH with Deploy Key

Generate an SSH key pair and add the public key as a deploy key in GitLab (Project > Settings > Repository > Deploy Keys).

```bash
# Generate a dedicated SSH key for AWX
ssh-keygen -t ed25519 -f awx-gitlab-key -N "" -C "awx@example.com"

# Create the SSH credential in AWX
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "GitLab SCM - SSH",
    "organization": 1,
    "credential_type": 2,
    "inputs": {
      "ssh_key_data": "'"$(cat awx-gitlab-key)"'"
    }
  }'
```

For self-hosted GitLab instances, you might also need to add the GitLab server's SSH host key to AWX settings or disable host key checking.

## Creating an AWX Project from GitLab

Link your GitLab repository as an AWX project.

```bash
# Create a project from a GitLab repository
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/projects/ \
  -d '{
    "name": "Platform Automation",
    "organization": 1,
    "scm_type": "git",
    "scm_url": "https://gitlab.example.com/devops/platform-automation.git",
    "scm_branch": "main",
    "scm_credential": 3,
    "scm_update_on_launch": true,
    "scm_update_cache_timeout": 120
  }'
```

For SSH URLs, use the SSH format:

```bash
"scm_url": "git@gitlab.example.com:devops/platform-automation.git"
```

## Setting Up GitLab Webhooks

Configure GitLab to notify AWX when code is pushed or a merge request is updated.

First, enable GitLab webhooks on the AWX job template.

```bash
# Enable GitLab webhook service on the job template
curl -s -X PATCH \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/job_templates/10/ \
  -d '{"webhook_service": "gitlab"}'

# Retrieve the webhook key
curl -s -H "Authorization: Bearer ${AWX_TOKEN}" \
  https://awx.example.com/api/v2/job_templates/10/ \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['webhook_key'])"
```

Now add the webhook in GitLab. Go to your project > Settings > Webhooks.

- **URL**: `https://awx.example.com/api/v2/job_templates/10/gitlab/`
- **Secret token**: The webhook key from AWX
- **Trigger**: Push events, Merge request events
- **SSL verification**: Enable (unless using self-signed certs)

You can also create it via the GitLab API.

```bash
# Create a webhook in GitLab via API
curl -s -X POST \
  -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://gitlab.example.com/api/v4/projects/42/hooks" \
  -d '{
    "url": "https://awx.example.com/api/v2/job_templates/10/gitlab/",
    "token": "awx-webhook-key-here",
    "push_events": true,
    "merge_requests_events": true,
    "enable_ssl_verification": true
  }'
```

## Using GitLab Webhook Payload in Playbooks

GitLab webhook payloads differ from GitHub payloads. Here is how to extract useful information.

```yaml
# gitlab-deploy.yml
---
- name: Deploy from GitLab webhook
  hosts: localhost
  connection: local

  vars:
    # GitLab push event payload fields
    branch: "{{ awx_webhook_payload.ref | regex_replace('^refs/heads/', '') }}"
    project_name: "{{ awx_webhook_payload.project.name }}"
    repo_url: "{{ awx_webhook_payload.project.git_http_url }}"
    commit_sha: "{{ awx_webhook_payload.checkout_sha }}"
    user_name: "{{ awx_webhook_payload.user_name }}"
    commits: "{{ awx_webhook_payload.commits }}"

  tasks:
    - name: Show deployment info
      ansible.builtin.debug:
        msg: |
          Project: {{ project_name }}
          Branch: {{ branch }}
          Commit: {{ commit_sha[:8] }}
          Pushed by: {{ user_name }}
          Commits in push: {{ commits | length }}

    - name: Only deploy from main
      ansible.builtin.meta: end_play
      when: branch != "main"

    - name: Run deployment
      ansible.builtin.include_role:
        name: deploy
      vars:
        deploy_version: "{{ commit_sha }}"
```

For merge request events, the payload structure is different.

```yaml
# handle-merge-request.yml
---
- name: Handle GitLab merge request
  hosts: localhost
  connection: local

  vars:
    mr_action: "{{ awx_webhook_payload.object_attributes.action }}"
    mr_state: "{{ awx_webhook_payload.object_attributes.state }}"
    mr_title: "{{ awx_webhook_payload.object_attributes.title }}"
    source_branch: "{{ awx_webhook_payload.object_attributes.source_branch }}"
    target_branch: "{{ awx_webhook_payload.object_attributes.target_branch }}"

  tasks:
    - name: Show MR details
      ansible.builtin.debug:
        msg: "MR '{{ mr_title }}': {{ mr_action }} ({{ source_branch }} -> {{ target_branch }})"

    - name: Deploy preview environment on MR open
      ansible.builtin.include_tasks: create-preview-env.yml
      when: mr_action == "open" or mr_action == "reopen"

    - name: Destroy preview environment on MR merge/close
      ansible.builtin.include_tasks: destroy-preview-env.yml
      when: mr_action == "merge" or mr_action == "close"
```

## Triggering AWX from GitLab CI/CD Pipeline

Use GitLab CI/CD jobs to call the AWX API during your pipeline.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

deploy-staging:
  stage: deploy
  image: curlimages/curl:latest
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  script:
    - |
      # Launch AWX deployment job
      RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer ${AWX_TOKEN}" \
        -H "Content-Type: application/json" \
        "${AWX_URL}/api/v2/job_templates/${AWX_DEPLOY_TEMPLATE}/launch/" \
        -d "{
          \"extra_vars\": {
            \"version\": \"${CI_COMMIT_SHORT_SHA}\",
            \"environment\": \"staging\",
            \"pipeline_id\": \"${CI_PIPELINE_ID}\"
          }
        }")

      JOB_ID=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
      echo "AWX Job ID: $JOB_ID"

      # Poll for completion
      while true; do
        STATUS=$(curl -s \
          -H "Authorization: Bearer ${AWX_TOKEN}" \
          "${AWX_URL}/api/v2/jobs/${JOB_ID}/" \
          | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")

        echo "Status: $STATUS"
        case $STATUS in
          successful) exit 0 ;;
          failed|error|canceled) exit 1 ;;
          *) sleep 10 ;;
        esac
      done
```

## Self-Hosted GitLab Configuration

When using a self-hosted GitLab instance, you may need extra configuration.

```bash
# If GitLab uses a self-signed certificate, tell AWX to trust it
# Add the CA certificate to AWX settings
kubectl create configmap awx-custom-ca \
  --from-file=gitlab-ca.crt=/path/to/gitlab-ca.crt \
  -n awx
```

Update the AWX custom resource to mount the CA certificate.

```yaml
# In the AWX CR
spec:
  extra_volumes: |
    - name: custom-ca
      configMap:
        name: awx-custom-ca
  web_extra_volume_mounts: |
    - name: custom-ca
      mountPath: /etc/pki/ca-trust/source/anchors/gitlab-ca.crt
      subPath: gitlab-ca.crt
  task_extra_volume_mounts: |
    - name: custom-ca
      mountPath: /etc/pki/ca-trust/source/anchors/gitlab-ca.crt
      subPath: gitlab-ca.crt
```

## GitLab Group-Level Integration

If you have multiple repositories that should trigger AWX jobs, set up a group-level webhook in GitLab instead of individual project webhooks.

In GitLab, go to your group > Settings > Webhooks and add the AWX webhook URL. This webhook fires for push and merge request events across all projects in the group. Your playbook can then use the `awx_webhook_payload.project.name` or `awx_webhook_payload.project.path_with_namespace` to determine which project triggered the event and route accordingly.

```yaml
# multi-project-router.yml
---
- name: Route GitLab events to correct deployment
  hosts: localhost
  connection: local

  vars:
    project_path: "{{ awx_webhook_payload.project.path_with_namespace }}"

  tasks:
    - name: Route to correct handler
      ansible.builtin.include_tasks: "handlers/{{ project_path | replace('/', '-') }}.yml"
      when: project_path is defined
```

## Wrapping Up

GitLab and AWX together give you a complete GitOps pipeline for infrastructure automation. GitLab stores and versions your playbooks, AWX pulls and executes them, and webhooks tie the two together so pushes and merge requests automatically trigger the right automation. Whether you use GitLab.com or a self-hosted instance, the integration pattern is the same: credentials, projects, webhooks, and optionally pipeline-level API calls for finer control.
