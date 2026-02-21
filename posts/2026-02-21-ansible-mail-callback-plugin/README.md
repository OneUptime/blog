# How to Use the Ansible mail Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Email, Notifications

Description: Configure the Ansible mail callback plugin to send email notifications when playbooks complete, fail, or encounter errors during execution.

---

The `mail` callback plugin sends email notifications when Ansible playbooks finish running. You can configure it to send emails on failure only, on any completion, or on specific events. This is useful for operations teams who need to be notified about deployment results without watching the terminal.

## Enabling the Mail Callback

The mail callback is a notification callback that works alongside your normal output:

```ini
# ansible.cfg - Enable the mail callback
[defaults]
callback_whitelist = mail

[callback_mail]
# SMTP server settings
smtphost = smtp.example.com
smtpport = 587
# Sender and recipient
from = ansible@example.com
to = ops-team@example.com
# Optional: CC recipients
cc = devops-lead@example.com
# Send on these events (default: failure only)
# Options: failure, ok, unreachable
send_on = failure
```

## SMTP Configuration

The mail callback needs an SMTP server to send through. Here are configurations for common setups.

Using a local MTA (postfix, sendmail):

```ini
# ansible.cfg - Use local mail server
[callback_mail]
smtphost = localhost
smtpport = 25
to = ops@example.com
from = ansible@{{ ansible_hostname }}
```

Using Gmail SMTP (with app password):

```ini
# ansible.cfg - Gmail SMTP
[callback_mail]
smtphost = smtp.gmail.com
smtpport = 587
smtpuser = ansible-bot@gmail.com
smtppass = your-app-password
to = ops@example.com
from = ansible-bot@gmail.com
```

Using Amazon SES:

```ini
# ansible.cfg - Amazon SES
[callback_mail]
smtphost = email-smtp.us-east-1.amazonaws.com
smtpport = 587
smtpuser = AKIAIOSFODNN7EXAMPLE
smtppass = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
to = ops@example.com
from = ansible@example.com
```

## Environment Variable Configuration

You can also configure the mail callback through environment variables:

```bash
# Set mail callback via environment
export ANSIBLE_CALLBACK_WHITELIST=mail
export ANSIBLE_CALLBACK_MAIL_TO=ops@example.com
export ANSIBLE_CALLBACK_MAIL_FROM=ansible@example.com
export ANSIBLE_CALLBACK_MAIL_SMTPHOST=smtp.example.com
export ANSIBLE_CALLBACK_MAIL_SMTPPORT=587
```

## Email Content

The mail callback sends an email with the playbook results. The email body includes:

- The playbook name
- The inventory used
- Per-host results (ok, changed, failures, unreachable)
- Error messages for failed tasks
- The play recap

A failure notification looks something like:

```
Subject: Ansible: deploy.yml failed on web-03

Playbook: deploy.yml
Host: web-03

Task: Deploy application
Status: FAILED
Message: msg: Could not find /opt/app/release-2.5.1.tar.gz

Play Recap:
web-01  : ok=5  changed=2  unreachable=0  failed=0
web-02  : ok=5  changed=2  unreachable=0  failed=0
web-03  : ok=3  changed=0  unreachable=0  failed=1
```

## Configuring When to Send

The `send_on` setting controls which events trigger emails:

```ini
# Send only on failures (default)
[callback_mail]
send_on = failure

# Send on failure and unreachable
[callback_mail]
send_on = failure, unreachable

# Send on every completion (including success)
[callback_mail]
send_on = failure, ok, unreachable
```

For production deployments, sending on failure only keeps noise down:

```ini
# ansible.cfg - Production mail settings
[callback_mail]
smtphost = smtp.example.com
smtpport = 587
to = oncall@example.com, ops-team@example.com
from = ansible-prod@example.com
send_on = failure, unreachable
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
callback_whitelist = mail, timer

[callback_mail]
smtphost = smtp.company.com
smtpport = 587
smtpuser = ansible-bot
smtppass = {{ lookup('env', 'SMTP_PASSWORD') }}
from = deployments@company.com
to = deploy-notifications@company.com
send_on = failure, unreachable
```

The timer callback complements mail by including timing in the output. The email shows how long the playbook ran before it failed, which helps with troubleshooting.

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
ANSIBLE_CALLBACK_WHITELIST=mail ansible-playbook test-mail-callback.yml
```

Check your inbox for the failure notification.

## Handling SMTP Authentication Issues

If emails are not being sent, troubleshoot the SMTP connection:

```bash
# Test SMTP connectivity
python3 -c "
import smtplib
server = smtplib.SMTP('smtp.example.com', 587)
server.starttls()
server.login('ansible-bot', 'password')
server.sendmail('from@example.com', 'to@example.com', 'Subject: Test\n\nTest message')
server.quit()
print('Email sent successfully')
"
```

Common issues:

- Firewall blocking outbound port 587 or 25
- TLS required but not configured
- App-specific passwords needed (Gmail, Microsoft 365)
- SPF/DKIM not configured for the from address

## Mail Callback with Ansible Vault

Store SMTP credentials securely:

```bash
# Encrypt the SMTP password
ansible-vault encrypt_string 'my-smtp-password' --name 'smtp_password'
```

Then reference it in a variables file that the callback reads, or use environment variables sourced from a vault-encrypted file.

## Alternatives to the Mail Callback

The mail callback works but has limitations. For more advanced notification needs, consider:

- The `slack` callback for team channel notifications
- A custom callback that integrates with PagerDuty or OpsGenie
- Using a `mail` task at the end of your playbook for more control over the email content

The advantage of the callback approach is that it works even when the playbook fails partway through. A mail task at the end of the playbook would not run if an earlier task fails (unless you use `rescue` blocks).

The mail callback is a reliable, low-tech notification mechanism. It does not require any external services beyond an SMTP server, works with any email system, and reliably notifies your team when things go wrong. For teams that live in email, it is the simplest way to get Ansible notifications working.
