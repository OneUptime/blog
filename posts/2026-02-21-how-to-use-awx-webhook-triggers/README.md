# How to Use AWX Webhook Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, Webhook, CI/CD, GitOps

Description: Configure AWX webhook triggers to automatically launch job templates in response to events from GitHub, GitLab, and other systems.

---

AWX webhook triggers let supported source control systems launch job templates by sending HTTP POST requests to a webhook URL. When a developer pushes code to GitHub or when a GitLab merge request changes, a webhook can kick off the corresponding AWX automation. This removes the human from the loop and makes your automation event-driven.

## How AWX Webhooks Work

AWX can receive webhooks from GitHub and GitLab natively. Recent AWX versions also expose a Bitbucket Data Center webhook receiver, but this guide focuses on GitHub and GitLab. When you enable a webhook on a job template, AWX generates a unique webhook URL and a webhook key. You configure your Git provider to send events to that URL. When an event arrives, AWX verifies the request using the webhook key, extracts relevant data from the payload, and launches the job template.

The webhook payload data is available to your playbook as the `awx_webhook_payload` extra variable.

## Enabling Webhooks on a Job Template

You can enable webhooks through the API or the UI. Here is the API approach.

```bash
# Enable GitHub webhook on job template ID 10

curl -s -X PATCH \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/job_templates/10/ \
  -d '{
    "webhook_service": "github",
    "webhook_credential": null
  }'
```

After enabling the webhook, retrieve the generated webhook URL and key. The job template response includes the receiver URL under `related.webhook_receiver`; the key is returned from the related `webhook_key` endpoint.

```bash
# Get the webhook receiver URL
WEBHOOK_RECEIVER=$(curl -s -H "Authorization: Bearer ${AWX_TOKEN}" \
  https://awx.example.com/api/v2/job_templates/10/ \
  | python3 -c '
import sys, json
data = json.load(sys.stdin)
print(data.get("related", {}).get("webhook_receiver", ""))
')

WEBHOOK_KEY=$(curl -s -H "Authorization: Bearer ${AWX_TOKEN}" \
  https://awx.example.com/api/v2/job_templates/10/webhook_key/ \
  | python3 -c '
import sys, json
data = json.load(sys.stdin)
print(data.get("webhook_key", ""))
')

echo "Webhook URL: https://awx.example.com${WEBHOOK_RECEIVER}"
echo "Webhook Key: ${WEBHOOK_KEY}"
```

The webhook URL will look like: `https://awx.example.com/api/v2/job_templates/10/github/`

## Rotating the Webhook Key

AWX auto-generates a webhook key. If you need a new one, rotate it through the related `webhook_key` endpoint and then update the secret in GitHub or GitLab.

```bash
# Rotate the webhook key
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/job_templates/10/webhook_key/
```

For GitHub, this key is used as the webhook secret for signing the payload. For GitLab, it is configured as the Secret token and AWX compares it with the `X-Gitlab-Token` header.

## Setting Up the GitHub Webhook

In your GitHub repository, go to Settings > Webhooks > Add webhook.

- **Payload URL**: `https://awx.example.com/api/v2/job_templates/10/github/`
- **Content type**: `application/json`
- **Secret**: The webhook key from AWX
- **Events**: Select the events you want to trigger on (typically "Just the push event" or "Pull requests")

You can also configure it using the GitHub API.

```bash
# Create a webhook in a GitHub repository
curl -s -X POST \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/myorg/myrepo/hooks \
  -d '{
    "name": "web",
    "active": true,
    "events": ["push", "pull_request"],
    "config": {
      "url": "https://awx.example.com/api/v2/job_templates/10/github/",
      "content_type": "json",
      "secret": "'"${WEBHOOK_KEY}"'",
      "insecure_ssl": "0"
    }
  }'
```

## Setting Up a GitLab Webhook

For GitLab, the process is similar but the webhook service must be set to `gitlab`.

```bash
# Enable GitLab webhook on job template ID 12
curl -s -X PATCH \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/job_templates/12/ \
  -d '{"webhook_service": "gitlab"}'
```

In GitLab, go to your project > Settings > Webhooks and add:

- **URL**: `https://awx.example.com/api/v2/job_templates/12/gitlab/`
- **Secret token**: The webhook key from AWX
- **Trigger**: Push events, Merge request events, etc.

## Webhook Event Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as GitHub/GitLab
    participant AWX as AWX Server
    participant Target as Target Servers

    Dev->>Git: Push code
    Git->>AWX: POST webhook payload
    AWX->>AWX: Verify signature
    AWX->>AWX: Extract payload data
    AWX->>AWX: Launch job template
    AWX->>Target: Run playbook
    Target-->>AWX: Return results
    AWX-->>Git: Update commit status (optional)
```

## Using Webhook Payload in Playbooks

The webhook payload is available as `awx_webhook_payload`. For a GitHub push event, this contains the commit info, branch, repository URL, and more.

```yaml
# deploy-on-push.yml
---
- name: Deploy on webhook trigger
  hosts: webservers
  become: true

  vars:
    # Extract branch name from the webhook payload
    branch: "{{ awx_webhook_payload.ref | regex_replace('^refs/heads/', '') }}"
    repo_url: "{{ awx_webhook_payload.repository.clone_url }}"
    commit_sha: "{{ awx_webhook_payload.after }}"
    commit_message: "{{ awx_webhook_payload.head_commit.message }}"

  tasks:
    - name: Print deployment info
      ansible.builtin.debug:
        msg: |
          Deploying branch: {{ branch }}
          Commit: {{ commit_sha[:8] }}
          Message: {{ commit_message }}

    - name: Only deploy from main branch
      ansible.builtin.meta: end_play
      when: branch != "main"

    - name: Pull latest code
      ansible.builtin.git:
        repo: "{{ repo_url }}"
        dest: /opt/app
        version: "{{ commit_sha }}"
        force: true

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted
```

## Filtering by Branch or Event Type

Since the webhook fires for all events you selected, you might want the playbook to only act on specific branches or event types. For GitHub, AWX sets `awx_webhook_event_type` to values such as `push` or `pull_request`.

```yaml
# Conditional execution based on webhook event
- name: Handle webhook events
  hosts: localhost
  connection: local

  tasks:
    - name: Set event facts
      ansible.builtin.set_fact:
        git_branch: "{{ awx_webhook_payload.ref | default('') | regex_replace('^refs/heads/', '') }}"
        event_type: "{{ awx_webhook_event_type | default('push') }}"

    - name: Skip non-main branches
      ansible.builtin.meta: end_play
      when: git_branch != "main" and event_type == "push"

    - name: Handle pull request events
      ansible.builtin.debug:
        msg: "PR #{{ awx_webhook_payload.pull_request.number }} - {{ awx_webhook_payload.action }}"
      when: event_type == "pull_request"

    - name: Handle push events
      ansible.builtin.debug:
        msg: "Push to {{ git_branch }} by {{ awx_webhook_payload.pusher.name }}"
      when: event_type == "push"
```

## Using Webhook Credentials

If you want AWX to send commit status updates back to GitHub or GitLab, you can create a webhook credential. This credential is a personal access token for the Git service; it is not used to authenticate incoming webhook requests.

```bash
# Find the GitHub personal access token credential type
GITHUB_CREDENTIAL_TYPE=$(curl -s -H "Authorization: Bearer ${AWX_TOKEN}" \
  "https://awx.example.com/api/v2/credential_types/?namespace=github_token" \
  | python3 -c '
import sys, json
data = json.load(sys.stdin)
print(data["results"][0]["id"])
')

# Create a GitHub personal access token credential
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "GitHub Webhook Token",
    "organization": 1,
    "credential_type": '"${GITHUB_CREDENTIAL_TYPE}"',
    "inputs": {
      "token": "ghp_your_github_token_here"
    }
  }'
```

Then reference this credential on the job template.

```bash
# Set the webhook credential on the template
curl -s -X PATCH \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/job_templates/10/ \
  -d '{"webhook_credential": 8}'
```

With a webhook credential configured, AWX can update the commit status in GitHub for pull request events and in GitLab for merge request events.

## Testing Webhooks

You can test webhooks without pushing actual code by using curl to simulate a GitHub event.

```bash
# Simulate a GitHub push event
PAYLOAD='{"ref":"refs/heads/main","after":"abc123","repository":{"clone_url":"https://github.com/myorg/myrepo.git"},"head_commit":{"message":"test commit"},"pusher":{"name":"testuser"}}'

# Calculate the HMAC signature AWX expects for GitHub webhooks
SIGNATURE=$(echo -n "${PAYLOAD}" | openssl dgst -sha1 -hmac "${WEBHOOK_KEY}" | awk '{print "sha1="$2}')

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-GitHub-Delivery: test-delivery-001" \
  -H "X-Hub-Signature: ${SIGNATURE}" \
  https://awx.example.com/api/v2/job_templates/10/github/ \
  -d "${PAYLOAD}"
```

## Troubleshooting

**Webhook returns 403** - The signature verification failed. Double-check that the webhook key in AWX matches the secret configured in GitHub/GitLab.

**Webhook returns 404** - The URL is wrong or webhooks are not enabled on the template. Verify the template ID in the URL and that `webhook_service` is set.

**Job launches but fails** - The playbook is running but the payload variables might not be what you expect. Add a debug task that prints `awx_webhook_payload` to inspect the full payload.

**Webhook accepted but no job launches** - Check the AWX service logs and activity stream for any error messages. AWX also ignores duplicate webhook deliveries that use the same event GUID.

## Wrapping Up

Webhooks turn AWX from a tool you log into and click buttons on into an event-driven automation platform. Push to main and the deployment happens automatically. Open a pull request and a test environment spins up. The setup takes about 10 minutes per template, and the payoff is eliminating manual deployment steps entirely.
