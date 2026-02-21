# How to Use Ansible with Slack Notifications in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Slack, CI/CD, Notifications

Description: Send Slack notifications from Ansible playbooks during CI/CD deployments to keep your team informed in real time.

---

When a deployment is running in your CI/CD pipeline, the team needs to know what is happening. Did the deploy start? Did it succeed? Did it fail halfway through? Slack notifications from Ansible solve this by posting updates directly to your team's channel. No more checking CI/CD dashboards or waiting for someone to say "deploy is done" in chat.

This post shows you how to integrate Ansible with Slack using both the community Slack module and raw webhook calls, and how to wire it all into your CI/CD pipeline.

## Setting Up a Slack Webhook

Before writing any Ansible code, you need a Slack Incoming Webhook URL. Go to your Slack workspace settings, create a new app, enable Incoming Webhooks, and create a webhook for the channel you want to post to. You will get a URL that looks like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`.

Store this URL securely. In CI/CD, put it in your secrets store (GitHub Secrets, GitLab CI Variables, Vault, etc.).

## Using the community.general.slack Module

The simplest way to send Slack messages from Ansible is with the `community.general.slack` module.

```bash
# Install the community collection that includes the Slack module
ansible-galaxy collection install community.general
```

Here is a playbook that sends Slack notifications at key deployment stages.

```yaml
# playbooks/deploy-with-slack.yml
# Deployment playbook with Slack notifications at each stage
---
- name: Deploy application with Slack notifications
  hosts: webservers
  serial: 2
  become: true
  vars:
    slack_token: "{{ lookup('env', 'SLACK_WEBHOOK_TOKEN') }}"
    app_version: "{{ deploy_version }}"
    slack_channel: "#deployments"
    app_name: "myapp"

  pre_tasks:
    - name: Notify Slack that deployment is starting
      community.general.slack:
        token: "{{ slack_token }}"
        channel: "{{ slack_channel }}"
        msg: "Deployment of {{ app_name }} version {{ app_version }} is starting on {{ ansible_play_hosts | length }} servers."
        color: warning
        username: "Ansible Deploy Bot"
        icon_emoji: ":rocket:"
      delegate_to: localhost
      run_once: true

  tasks:
    - name: Pull application code
      git:
        repo: "https://github.com/myorg/{{ app_name }}.git"
        dest: "/opt/{{ app_name }}"
        version: "{{ app_version }}"
        force: true

    - name: Install dependencies
      command: npm ci
      args:
        chdir: "/opt/{{ app_name }}"

    - name: Restart service
      systemd:
        name: "{{ app_name }}"
        state: restarted

    - name: Verify health
      uri:
        url: "http://{{ ansible_host }}:8080/health"
        status_code: 200
      register: health
      until: health.status == 200
      retries: 10
      delay: 5

  post_tasks:
    - name: Notify Slack of successful deployment
      community.general.slack:
        token: "{{ slack_token }}"
        channel: "{{ slack_channel }}"
        msg: "{{ app_name }} version {{ app_version }} deployed successfully to all servers."
        color: good
        username: "Ansible Deploy Bot"
        icon_emoji: ":white_check_mark:"
      delegate_to: localhost
      run_once: true
```

## Handling Failure Notifications

The `block/rescue` pattern lets you catch failures and send a Slack alert before the playbook exits.

```yaml
# playbooks/deploy-with-failure-alerts.yml
# Deployment with failure detection and Slack alerting
---
- name: Deploy with failure notifications
  hosts: webservers
  serial: 2
  become: true
  vars:
    slack_token: "{{ lookup('env', 'SLACK_WEBHOOK_TOKEN') }}"

  tasks:
    - name: Deploy application
      block:
        - name: Pull code
          git:
            repo: "https://github.com/myorg/myapp.git"
            dest: /opt/myapp
            version: "{{ deploy_version }}"
            force: true

        - name: Restart service
          systemd:
            name: myapp
            state: restarted

        - name: Check health
          uri:
            url: "http://{{ ansible_host }}:8080/health"
            status_code: 200
          retries: 5
          delay: 3

      rescue:
        - name: Notify Slack of failure
          community.general.slack:
            token: "{{ slack_token }}"
            channel: "#deployments"
            msg: "DEPLOYMENT FAILED on {{ inventory_hostname }} for version {{ deploy_version }}. Check logs immediately."
            color: danger
            username: "Ansible Deploy Bot"
            icon_emoji: ":x:"
          delegate_to: localhost

        - name: Fail the play
          fail:
            msg: "Deployment failed on {{ inventory_hostname }}"
```

## Rich Slack Messages with Attachments

Plain text messages work, but rich messages with fields give your team more context at a glance.

```yaml
# Send a rich Slack message with deployment details as structured fields
- name: Send detailed deployment notification
  community.general.slack:
    token: "{{ slack_token }}"
    channel: "#deployments"
    attachments:
      - title: "Deployment Complete"
        color: good
        fields:
          - title: "Application"
            value: "{{ app_name }}"
            short: true
          - title: "Version"
            value: "{{ deploy_version }}"
            short: true
          - title: "Environment"
            value: "{{ env_name | default('production') }}"
            short: true
          - title: "Servers"
            value: "{{ ansible_play_hosts | join(', ') }}"
            short: false
          - title: "Duration"
            value: "{{ ansible_date_time.iso8601 }}"
            short: true
  delegate_to: localhost
  run_once: true
```

## Using Raw Webhook Calls

If you do not want to install the community collection, you can use the `uri` module to post directly to the Slack webhook.

```yaml
# Send Slack notification using raw webhook POST request
- name: Post to Slack via webhook
  uri:
    url: "{{ lookup('env', 'SLACK_WEBHOOK_URL') }}"
    method: POST
    body_format: json
    body:
      channel: "#deployments"
      username: "Ansible Bot"
      icon_emoji: ":ansible:"
      text: "Deployment update"
      attachments:
        - color: "#36a64f"
          title: "{{ app_name }} deployed"
          text: "Version {{ deploy_version }} is live on {{ ansible_play_hosts | length }} servers"
          footer: "Ansible Deployment"
          ts: "{{ ansible_date_time.epoch }}"
    status_code: 200
  delegate_to: localhost
  run_once: true
```

## Creating a Reusable Slack Notification Role

Rather than repeating the Slack notification code in every playbook, create a role that you can include anywhere.

```yaml
# roles/slack_notify/tasks/main.yml
# Reusable role for sending Slack notifications
---
- name: Send Slack notification
  community.general.slack:
    token: "{{ slack_notify_token }}"
    channel: "{{ slack_notify_channel | default('#deployments') }}"
    msg: "{{ slack_notify_message }}"
    color: "{{ slack_notify_color | default('good') }}"
    username: "{{ slack_notify_username | default('Ansible Bot') }}"
    icon_emoji: "{{ slack_notify_icon | default(':robot_face:') }}"
    attachments: "{{ slack_notify_attachments | default(omit) }}"
  delegate_to: localhost
  run_once: "{{ slack_notify_once | default(true) }}"
```

```yaml
# roles/slack_notify/defaults/main.yml
# Default values for the Slack notification role
---
slack_notify_token: "{{ lookup('env', 'SLACK_WEBHOOK_TOKEN') }}"
slack_notify_channel: "#deployments"
slack_notify_color: "good"
slack_notify_username: "Ansible Bot"
slack_notify_icon: ":robot_face:"
slack_notify_once: true
```

Now use it in any playbook.

```yaml
# Using the Slack notification role in a deployment playbook
- name: Notify deployment start
  include_role:
    name: slack_notify
  vars:
    slack_notify_message: "Starting deployment of {{ app_name }} v{{ app_version }}"
    slack_notify_color: "warning"
```

## GitHub Actions Integration

Here is how to set up the full CI/CD pipeline with Slack notifications.

```yaml
# .github/workflows/deploy.yml
# CI/CD pipeline with Ansible deployment and Slack notifications
name: Deploy with Slack Notifications

on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Ansible and collections
        run: |
          pip install ansible
          ansible-galaxy collection install community.general

      - name: Run deployment
        env:
          SLACK_WEBHOOK_TOKEN: ${{ secrets.SLACK_WEBHOOK_TOKEN }}
          ANSIBLE_HOST_KEY_CHECKING: "false"
        run: |
          ansible-playbook playbooks/deploy-with-slack.yml \
            -i inventory/production.yml \
            -e "deploy_version=${{ github.ref_name }}" \
            --private-key <(echo "${{ secrets.SSH_KEY }}")
```

## Notification Flow

Here is how notifications flow through a typical deployment.

```mermaid
flowchart TD
    A[Deployment Starts] --> B[Slack: Deployment Starting]
    B --> C[Deploy to Batch 1]
    C --> D{Health Check}
    D -->|Pass| E[Deploy to Batch 2]
    D -->|Fail| F[Slack: Deployment Failed]
    E --> G{Health Check}
    G -->|Pass| H[Slack: Deployment Complete]
    G -->|Fail| F
    F --> I[Slack: Rollback Initiated]
```

## Conclusion

Slack notifications from Ansible keep everyone in the loop during deployments. The combination of the `community.general.slack` module for structured messages and `block/rescue` for failure detection gives you a robust notification system. Wrap it in a reusable role, wire it into your CI/CD pipeline, and your team will always know the current state of every deployment without having to check a dashboard.
