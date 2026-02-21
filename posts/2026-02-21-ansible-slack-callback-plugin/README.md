# How to Use the Ansible slack Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Slack, Notifications

Description: Configure the Ansible slack callback plugin to send real-time playbook notifications and results to Slack channels for team visibility.

---

The `slack` callback plugin posts Ansible playbook results directly to a Slack channel. Your team gets notified when deployments start, complete, or fail without anyone needing to watch the terminal. This is one of the most popular Ansible callbacks because Slack is where most DevOps teams already live.

## Prerequisites

You need a Slack webhook URL. Create one through the Slack API:

1. Go to https://api.slack.com/apps
2. Create a new app (or use an existing one)
3. Enable "Incoming Webhooks" under Features
4. Add a new webhook to the channel you want

You will get a URL like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`

## Enabling the Slack Callback

Install the community.general collection if you do not have it:

```bash
# Install the collection containing the slack callback
ansible-galaxy collection install community.general
```

Configure in `ansible.cfg`:

```ini
# ansible.cfg - Enable Slack notifications
[defaults]
callback_whitelist = community.general.slack

[callback_slack]
webhook_url = https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
channel = #deployments
username = Ansible Bot
```

## Configuration Options

The slack callback has several useful settings:

```ini
# ansible.cfg - Full Slack callback configuration
[defaults]
callback_whitelist = community.general.slack

[callback_slack]
# Required: Slack webhook URL
webhook_url = https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Channel to post to (overrides webhook default)
channel = #ansible-notifications

# Bot username shown in Slack
username = Ansible

# Validate SSL certificate for webhook
validate_certs = true
```

Environment variable configuration:

```bash
# Configure via environment
export ANSIBLE_CALLBACK_WHITELIST=community.general.slack
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
export SLACK_CHANNEL=#deployments
```

## What Slack Messages Look Like

When a playbook runs, the slack callback posts messages at key points:

**Playbook start:**
```
Ansible: deploy.yml started on inventory/production
Hosts: web-01, web-02, web-03
```

**Playbook success:**
```
Ansible: deploy.yml completed successfully
Duration: 3m 47s
Results:
  web-01: ok=5, changed=2
  web-02: ok=5, changed=2
  web-03: ok=5, changed=2
```

**Playbook failure:**
```
Ansible: deploy.yml FAILED
Host: web-03
Task: Deploy application
Error: msg: Could not find /opt/app/release.tar.gz

Results:
  web-01: ok=5, changed=2
  web-02: ok=5, changed=2
  web-03: ok=3, changed=0, failed=1
```

## Securing the Webhook URL

Never commit the webhook URL to version control. Use Ansible Vault or environment variables:

```bash
# Store webhook URL in Ansible Vault
ansible-vault encrypt_string 'https://hooks.slack.com/services/T00/B00/XXX' \
  --name 'slack_webhook_url' > vault/slack.yml
```

Or use an environment variable in your ansible.cfg:

```ini
# ansible.cfg - Reference environment variable
[callback_slack]
webhook_url = {{ lookup('env', 'SLACK_WEBHOOK_URL') }}
```

In CI/CD, set the webhook URL as a secret:

```yaml
# .gitlab-ci.yml
deploy:
  variables:
    ANSIBLE_CALLBACK_WHITELIST: "community.general.slack"
  script:
    - ansible-playbook deploy.yml
  # SLACK_WEBHOOK_URL is set as a CI/CD variable (masked)
```

## Different Channels for Different Environments

Route notifications to different channels based on the environment:

```bash
#!/bin/bash
# deploy.sh - Route Slack notifications by environment
ENV=$1

case $ENV in
    production)
        export SLACK_CHANNEL="#prod-deployments"
        ;;
    staging)
        export SLACK_CHANNEL="#staging-deployments"
        ;;
    development)
        export SLACK_CHANNEL="#dev-deployments"
        ;;
esac

export ANSIBLE_CALLBACK_WHITELIST=community.general.slack
ansible-playbook -i "inventory/$ENV" deploy.yml
```

## Combining Slack with Other Callbacks

Slack works alongside any stdout callback and other notification callbacks:

```ini
# ansible.cfg - Slack with profiling and JUnit
[defaults]
stdout_callback = yaml
callback_whitelist = community.general.slack, timer, profile_tasks, junit

[callback_slack]
webhook_url = {{ lookup('env', 'SLACK_WEBHOOK_URL') }}
channel = #deployments

[callback_junit]
output_dir = ./junit-results
```

Your terminal shows YAML-formatted output with timing, Slack gets notified, and JUnit XML gets written for CI.

## Slack Notifications for Scheduled Jobs

For cron-scheduled Ansible runs, Slack notifications are especially valuable since nobody is watching the terminal:

```bash
# /etc/cron.d/ansible-nightly
# Run nightly compliance checks with Slack notification
0 2 * * * ansible ANSIBLE_CALLBACK_WHITELIST=community.general.slack \
  SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  ansible-playbook /opt/ansible/compliance-check.yml \
  >> /var/log/ansible/nightly.log 2>&1
```

Every morning, the team sees whether the nightly compliance check passed or found issues.

## Custom Slack Messages with Tasks

If you want more control over Slack messages, combine the callback with the `community.general.slack` module for specific milestone notifications:

```yaml
# deploy.yml - Custom Slack messages at key points
---
- name: Deploy application
  hosts: webservers
  become: true

  tasks:
    - name: Notify Slack - deployment starting
      community.general.slack:
        token: "{{ slack_token }}"
        channel: "#deployments"
        msg: "Starting deployment of v{{ app_version }} to {{ ansible_play_hosts | length }} servers"
      run_once: true
      delegate_to: localhost

    - name: Pull new Docker image
      docker_image:
        name: "myapp:{{ app_version }}"
        source: pull

    - name: Restart application
      docker_container:
        name: myapp
        image: "myapp:{{ app_version }}"
        state: started
        restart: true

    - name: Notify Slack - deployment complete
      community.general.slack:
        token: "{{ slack_token }}"
        channel: "#deployments"
        msg: "Deployment of v{{ app_version }} completed successfully on all {{ ansible_play_hosts | length }} servers"
      run_once: true
      delegate_to: localhost
```

The callback handles start/end/failure notifications automatically. The inline tasks add custom messages for specific milestones.

## Troubleshooting Slack Notifications

If messages are not appearing:

```bash
# Test the webhook directly
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test from Ansible server"}' \
  https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

If that works but the callback does not, check:
- The collection is installed: `ansible-galaxy collection list | grep community.general`
- The callback name is correct in the whitelist
- The webhook URL does not have extra whitespace
- Your Ansible control node can reach hooks.slack.com (check firewalls)

The Slack callback is low-effort, high-value. Five minutes of setup gives your entire team real-time visibility into Ansible operations. For teams that are already using Slack, there is no reason not to enable it.
