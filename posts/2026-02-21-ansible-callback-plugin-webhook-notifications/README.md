# How to Create a Callback Plugin for Webhook Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Webhooks, Notifications, Callback

Description: Build an Ansible callback plugin that sends real-time webhook notifications to Slack, Teams, or any HTTP endpoint during playbook runs.

---

Callback plugins let you hook into Ansible's execution lifecycle and react to events like task completions, failures, and play summaries. A webhook notification callback is one of the most practical plugins you can build. It lets your team know when deployments start, when tasks fail, and when playbooks finish, all sent to Slack, Microsoft Teams, or any webhook endpoint.

This guide builds a production-ready webhook callback plugin with configurable endpoints, message formatting, and error resilience.

## The Complete Plugin

Create `callback_plugins/webhook_notify.py`:

```python
# webhook_notify.py - Callback plugin for webhook notifications
from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = """
    name: webhook_notify
    type: notification
    short_description: Send webhook notifications during playbook execution
    description:
        - Sends HTTP POST notifications to a webhook URL on key playbook events.
        - Supports Slack, Microsoft Teams, and generic webhook endpoints.
    version_added: "1.0.0"
    requirements:
        - A webhook URL to send notifications to
    options:
      webhook_url:
        description: The URL to send POST requests to.
        type: str
        required: true
        env:
          - name: ANSIBLE_WEBHOOK_URL
        ini:
          - section: webhook_notify
            key: url
      webhook_format:
        description: Message format (generic, slack, teams).
        type: str
        default: generic
        choices:
          - generic
          - slack
          - teams
        env:
          - name: ANSIBLE_WEBHOOK_FORMAT
        ini:
          - section: webhook_notify
            key: format
      notify_on_start:
        description: Send notification when a playbook starts.
        type: bool
        default: true
        env:
          - name: ANSIBLE_WEBHOOK_ON_START
      notify_on_failure:
        description: Send notification when a task fails.
        type: bool
        default: true
        env:
          - name: ANSIBLE_WEBHOOK_ON_FAILURE
      notify_on_complete:
        description: Send notification when a playbook completes.
        type: bool
        default: true
        env:
          - name: ANSIBLE_WEBHOOK_ON_COMPLETE
      environment_name:
        description: Environment label included in notifications (e.g., production, staging).
        type: str
        default: unknown
        env:
          - name: ANSIBLE_WEBHOOK_ENV
        ini:
          - section: webhook_notify
            key: environment
"""

import json
import datetime
import traceback
import os
from ansible.plugins.callback import CallbackBase


class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'webhook_notify'
    CALLBACK_NEEDS_ENABLED = True

    def __init__(self, display=None, options=None):
        super(CallbackModule, self).__init__(display=display, options=options)
        self._webhook_url = None
        self._webhook_format = 'generic'
        self._playbook_name = ''
        self._play_name = ''
        self._failures = []
        self._start_time = None

    def set_options(self, task_keys=None, var_options=None, direct=None):
        super(CallbackModule, self).set_options(
            task_keys=task_keys, var_options=var_options, direct=direct
        )
        self._webhook_url = self.get_option('webhook_url')
        self._webhook_format = self.get_option('webhook_format')

        if not self._webhook_url:
            self._display.warning(
                "webhook_notify: No webhook URL configured. "
                "Set ANSIBLE_WEBHOOK_URL or configure in ansible.cfg"
            )

    def _send_webhook(self, payload):
        """Send a POST request to the webhook URL."""
        if not self._webhook_url:
            return

        try:
            from ansible.module_utils.urls import open_url
            data = json.dumps(payload)
            self._display.vv("webhook_notify: sending to %s" % self._webhook_url)
            self._display.vvv("webhook_notify: payload: %s" % data)

            open_url(
                self._webhook_url,
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST',
                timeout=10,
                validate_certs=True,
            )
        except Exception as e:
            # Never let webhook failures affect the playbook
            self._display.warning(
                "webhook_notify: failed to send notification: %s" % str(e)
            )
            self._display.vvv(
                "webhook_notify: traceback:\n%s" % traceback.format_exc()
            )

    def _format_message(self, event, details):
        """Format the message based on the configured format."""
        env = self.get_option('environment_name')
        timestamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

        if self._webhook_format == 'slack':
            return self._format_slack(event, details, env, timestamp)
        elif self._webhook_format == 'teams':
            return self._format_teams(event, details, env, timestamp)
        else:
            return self._format_generic(event, details, env, timestamp)

    def _format_generic(self, event, details, env, timestamp):
        """Generic JSON payload."""
        return {
            'event': event,
            'environment': env,
            'playbook': self._playbook_name,
            'play': self._play_name,
            'timestamp': timestamp,
            'details': details,
        }

    def _format_slack(self, event, details, env, timestamp):
        """Slack incoming webhook format."""
        color_map = {
            'playbook_start': '#439FE0',
            'task_failed': '#FF0000',
            'playbook_complete': '#36A64F',
            'playbook_failed': '#FF0000',
        }
        color = color_map.get(event, '#808080')

        text = details.get('message', event)
        return {
            'attachments': [{
                'color': color,
                'title': 'Ansible: %s [%s]' % (event.replace('_', ' ').title(), env),
                'text': text,
                'fields': [
                    {'title': 'Playbook', 'value': self._playbook_name, 'short': True},
                    {'title': 'Environment', 'value': env, 'short': True},
                ],
                'footer': 'Ansible Webhook | %s' % timestamp,
            }]
        }

    def _format_teams(self, event, details, env, timestamp):
        """Microsoft Teams incoming webhook format."""
        color_map = {
            'playbook_start': '439FE0',
            'task_failed': 'FF0000',
            'playbook_complete': '36A64F',
            'playbook_failed': 'FF0000',
        }
        color = color_map.get(event, '808080')
        text = details.get('message', event)

        return {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            'themeColor': color,
            'summary': 'Ansible: %s' % event,
            'sections': [{
                'activityTitle': 'Ansible: %s' % event.replace('_', ' ').title(),
                'facts': [
                    {'name': 'Playbook', 'value': self._playbook_name},
                    {'name': 'Environment', 'value': env},
                    {'name': 'Timestamp', 'value': timestamp},
                ],
                'text': text,
            }]
        }

    def v2_playbook_on_start(self, playbook):
        """Called when the playbook starts."""
        self._playbook_name = os.path.basename(playbook._file_name)
        self._start_time = datetime.datetime.utcnow()
        self._failures = []

        if self.get_option('notify_on_start'):
            self._send_webhook(self._format_message('playbook_start', {
                'message': 'Playbook "%s" started' % self._playbook_name,
            }))

    def v2_playbook_on_play_start(self, play):
        """Track the current play name."""
        self._play_name = play.get_name()

    def v2_runner_on_failed(self, result, ignore_errors=False):
        """Called when a task fails."""
        if ignore_errors:
            return

        host = result._host.get_name()
        task = result._task.get_name()
        msg = result._result.get('msg', 'No error message')

        failure = {
            'host': host,
            'task': task,
            'message': msg,
        }
        self._failures.append(failure)

        if self.get_option('notify_on_failure'):
            self._send_webhook(self._format_message('task_failed', {
                'message': 'Task "%s" failed on %s: %s' % (task, host, msg),
                'host': host,
                'task': task,
                'error': msg,
            }))

    def v2_playbook_on_stats(self, stats):
        """Called at the end of the playbook with summary stats."""
        if not self.get_option('notify_on_complete'):
            return

        hosts = sorted(stats.processed.keys())
        summary = {}
        total_failures = 0
        total_changed = 0

        for host in hosts:
            s = stats.summarize(host)
            summary[host] = s
            total_failures += s['failures']
            total_changed += s['changed']

        duration = ''
        if self._start_time:
            elapsed = datetime.datetime.utcnow() - self._start_time
            minutes = int(elapsed.total_seconds() // 60)
            seconds = int(elapsed.total_seconds() % 60)
            duration = '%dm %ds' % (minutes, seconds)

        if total_failures > 0:
            event = 'playbook_failed'
            status = 'FAILED'
        else:
            event = 'playbook_complete'
            status = 'SUCCESS'

        host_summary = ', '.join(
            '%s (ok=%d changed=%d failed=%d)' % (h, s['ok'], s['changed'], s['failures'])
            for h, s in summary.items()
        )

        self._send_webhook(self._format_message(event, {
            'message': 'Playbook "%s" finished: %s (%s). Hosts: %s' % (
                self._playbook_name, status, duration, host_summary
            ),
            'status': status,
            'duration': duration,
            'hosts': summary,
            'failures': self._failures,
        }))
```

## Configuration

Enable the plugin in `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
callback_plugins = ./callback_plugins
callbacks_enabled = webhook_notify

[webhook_notify]
url = https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
format = slack
environment = production
```

Or use environment variables:

```bash
export ANSIBLE_WEBHOOK_URL="https://hooks.slack.com/services/T00/B00/XXX"
export ANSIBLE_WEBHOOK_FORMAT="slack"
export ANSIBLE_WEBHOOK_ENV="production"
export ANSIBLE_CALLBACKS_ENABLED="webhook_notify"

ansible-playbook deploy.yml
```

## Testing Locally

Test with a local webhook receiver before connecting to Slack or Teams:

```python
# test_webhook_server.py - Simple server to test webhook payloads
from http.server import HTTPServer, BaseHTTPRequestHandler
import json


class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        payload = json.loads(body)
        print(json.dumps(payload, indent=2))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'OK')


print("Listening on http://localhost:9999")
HTTPServer(('', 9999), WebhookHandler).serve_forever()
```

Run the test server, then point your callback at it:

```bash
export ANSIBLE_WEBHOOK_URL="http://localhost:9999"
export ANSIBLE_WEBHOOK_FORMAT="generic"
ansible-playbook test.yml
```

## Summary

A webhook callback plugin keeps your team informed about Ansible runs in real time. The key design principles: use `CALLBACK_TYPE = 'notification'` so it does not interfere with stdout output, never let webhook failures affect the playbook run, support multiple message formats (Slack, Teams, generic), and make everything configurable through environment variables and `ansible.cfg`. This pattern gives you deployment visibility without adding complexity to your playbooks.
