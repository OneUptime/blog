# How to Use the Ansible mail Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Email, Notification

Description: Configure the Ansible mail callback plugin to send email notifications when playbooks complete, fail, or encounter errors during execution.

---

The `community.general.mail` callback plugin sends email notifications when Ansible tasks fail, async tasks fail, or hosts become unreachable. This is useful for operations teams who need to be notified about deployment failures without watching the terminal.

## Enabling the Mail Callback

The mail callback is a notification callback that works alongside your normal output:

```ini
# ansible.cfg - Enable the mail callback

[defaults]
callbacks_enabled = community.general.mail

[callback_mail]
# SMTP server settings
smtphost = smtp.example.com
smtpport = 587
# Sender and recipient
sender = ansible@example.com
to = ops-team@example.com
# Optional: CC recipients
cc = devops-lead@example.com
```

## SMTP Configuration

The mail callback needs an SMTP server to send through. Here are configurations for common setups.

Using a local MTA or relay (postfix, sendmail):

```ini
# ansible.cfg - Use local mail server
[callback_mail]
smtphost = localhost
smtpport = 25
to = ops@example.com
sender = ansible@example.com
```

Using an internal SMTP relay:

```ini
# ansible.cfg - Internal SMTP relay
[callback_mail]
smtphost = smtp-relay.example.com
smtpport = 587
to = ops@example.com
sender = ansible-bot@example.com
```

Using Amazon SES requires an unauthenticated relay in front of SES, because the callback itself does not expose SMTP username, password, or TLS options:

```ini
# ansible.cfg - Relay to Amazon SES
[callback_mail]
smtphost = ses-relay.internal.example.com
smtpport = 587
to = ops@example.com
sender = ansible@example.com
```

## Environment Variable Configuration

You can configure the SMTP host through the `SMTPHOST` environment variable. Other callback options are configured in `ansible.cfg`.

```bash
# Set mail callback via environment
export ANSIBLE_CALLBACKS_ENABLED=community.general.mail
export SMTPHOST=smtp.example.com
```

## Email Content

The mail callback sends an email for failed or unreachable results. The email body includes:

- The playbook name
- The task and module that failed
- The host where the failure occurred
- Error messages for failed tasks
- A JSON dump of the failed result

A failure notification looks something like:

```text
Subject: Ansible: deploy.yml failed on web-03

Playbook: deploy.yml

Task: Deploy application
Module: command
Host: web-03

Status: FAILED
Message: msg: Could not find /opt/app/release-2.5.1.tar.gz
```

## Configuring When to Send

The callback sends email for task failures, unreachable hosts, and async failures. It does not have a `send_on` setting and does not send success notifications.

```ini
# Send failure notifications
[callback_mail]
to = ops@example.com
sender = ansible@example.com
```

For production deployments, failure-only behavior keeps noise down:

```ini
# ansible.cfg - Production mail settings
[callback_mail]
smtphost = smtp.example.com
smtpport = 587
to = oncall@example.com, ops-team@example.com
sender = ansible-prod@example.com
```

## Multiple Recipients

Send to multiple people by separating addresses with commas:

```ini
[callback_mail]
to = ops@example.com, devops-lead@example.com, team-channel@example.com
cc = manager@example.com
```

## Practical Example: Deployment Notifications

Here is a complete setup for a deployment workflow:

```ini
# ansible.cfg - Deployment email notifications
[defaults]
callbacks_enabled = community.general.mail, timer

[callback_mail]
smtphost = smtp.company.com
smtpport = 587
sender = deployments@company.com
to = deploy-notifications@company.com
```

The timer callback complements mail by including timing in the normal Ansible output. The mail callback still sends the failure details for the failed task.

## Testing the Mail Callback

Before relying on it in production, test that emails are sent:

```yaml
# test-mail-callback.yml - A playbook that intentionally fails
---
- name: Test mail callback
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Successful task
      debug:
        msg: "This works fine"

    - name: Task that will fail
      command: /nonexistent/command
```

```bash
# Run the test - should trigger a failure email
ANSIBLE_CALLBACKS_ENABLED=community.general.mail ansible-playbook test-mail-callback.yml
```

Check your inbox for the failure notification.

## Handling SMTP Authentication Issues

If emails are not being sent, troubleshoot the SMTP connection to the configured relay:

```bash
# Test SMTP connectivity
python3 -c "
import smtplib
server = smtplib.SMTP('smtp.example.com', 25)
server.sendmail('from@example.com', 'to@example.com', 'Subject: Test\n\nTest message')
server.quit()
print('Email sent successfully')
"
```

Common issues:

- Firewall blocking outbound port 25 or the relay port you configured
- The SMTP server requires authentication or TLS that the callback does not configure
- The callback is not enabled with `callbacks_enabled`
- SPF/DKIM not configured for the from address

## Mail Callback with Ansible Vault

The mail callback does not have SMTP username or password options, so there are no SMTP credentials to store directly in Ansible Vault for this callback. If your SMTP provider requires authentication, configure a local or internal SMTP relay that handles those credentials.

```bash
# Store relay credentials for your MTA configuration, not for the callback itself
ansible-vault encrypt_string 'my-smtp-password' --name 'smtp_relay_password'
```

Then use that value in the configuration management for your relay or MTA.

## Alternatives to the Mail Callback

The mail callback works but has limitations. For more advanced notification needs, consider:

- The `slack` callback for team channel notifications
- A custom callback that integrates with PagerDuty or OpsGenie
- Using the `community.general.mail` module in a task for more control over the email content and authenticated SMTP settings

The advantage of the callback approach is that it works even when the playbook fails partway through. A mail task at the end of the playbook would not run if an earlier task fails (unless you use `rescue` blocks).

The mail callback is a reliable, low-tech notification mechanism. It does not require any external services beyond an SMTP server, works with any email system, and reliably notifies your team when things go wrong. For teams that live in email, it is the simplest way to get Ansible notifications working.
