# How to Use Ansible Callback Plugins for Custom Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Notifications, Webhooks, Automation

Description: Build custom Ansible notification callback plugins that send alerts to Microsoft Teams, Discord, PagerDuty, OpsGenie, or any webhook-based service.

---

Ansible ships with Slack and email notification callbacks, but your team might use Microsoft Teams, Discord, Google Chat, PagerDuty, OpsGenie, or a custom internal system. Building a notification callback plugin for any webhook-based service takes about 50 lines of Python. This guide walks through the pattern and provides ready-to-use examples for several popular platforms.

## The Notification Callback Pattern

Every notification callback follows the same structure:

1. Collect data during the playbook run (failures, changes, timing)
2. At the end (in `v2_playbook_on_stats`), format a message and send it

Here is the skeleton:

```python
# callback_plugins/notify_base.py - Base pattern for notification callbacks
import os
import time
import json
from ansible.plugins.callback import CallbackBase

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class NotifyCallbackBase(CallbackBase):
    """Base class for notification callbacks."""

    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'

    def __init__(self):
        super().__init__()
        self.start_time = None
        self.playbook_name = ''
        self.failures = []
        self.host_count = 0
        self.change_count = 0

    def v2_playbook_on_start(self, playbook):
        self.start_time = time.time()
        self.playbook_name = os.path.basename(playbook._file_name)

    def v2_runner_on_failed(self, result, ignore_errors=False):
        if not ignore_errors:
            self.failures.append({
                'host': result._host.get_name(),
                'task': result._task.get_name(),
                'msg': result._result.get('msg', 'Unknown error'),
            })

    def v2_runner_on_ok(self, result):
        if result._result.get('changed', False):
            self.change_count += 1

    def _build_summary(self, stats):
        duration = int(time.time() - self.start_time)
        minutes = duration // 60
        seconds = duration % 60

        hosts_summary = {}
        for host in sorted(stats.processed.keys()):
            s = stats.summarize(host)
            hosts_summary[host] = s

        return {
            'playbook': self.playbook_name,
            'duration': f'{minutes}m {seconds}s',
            'status': 'FAILED' if self.failures else 'SUCCESS',
            'hosts': hosts_summary,
            'failures': self.failures,
            'total_changes': self.change_count,
        }
```

## Microsoft Teams Notification

Microsoft Teams uses incoming webhooks with Adaptive Card format:

```python
# callback_plugins/teams_notify.py - Microsoft Teams notification callback
import os
import time
import json
from ansible.plugins.callback import CallbackBase

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'teams_notify'
    CALLBACK_NEEDS_WHITELIST = True

    def __init__(self):
        super().__init__()
        self.webhook_url = os.environ.get('TEAMS_WEBHOOK_URL', '')
        self.start_time = None
        self.playbook_name = ''
        self.failures = []

    def v2_playbook_on_start(self, playbook):
        self.start_time = time.time()
        self.playbook_name = os.path.basename(playbook._file_name)

    def v2_runner_on_failed(self, result, ignore_errors=False):
        if not ignore_errors:
            self.failures.append({
                'host': result._host.get_name(),
                'task': result._task.get_name(),
                'msg': result._result.get('msg', '')[:200],
            })

    def v2_playbook_on_stats(self, stats):
        if not self.webhook_url or not HAS_REQUESTS:
            return

        duration = int(time.time() - self.start_time)
        status = 'Failed' if self.failures else 'Succeeded'
        color = 'attention' if self.failures else 'good'

        # Build Teams Adaptive Card
        card = {
            "type": "message",
            "attachments": [{
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.2",
                    "body": [
                        {
                            "type": "TextBlock",
                            "text": f"Ansible: {self.playbook_name} - {status}",
                            "weight": "bolder",
                            "size": "medium",
                            "color": color,
                        },
                        {
                            "type": "FactSet",
                            "facts": [
                                {"title": "Duration", "value": f"{duration}s"},
                                {"title": "Hosts", "value": str(len(stats.processed))},
                                {"title": "Failures", "value": str(len(self.failures))},
                            ]
                        }
                    ]
                }
            }]
        }

        # Add failure details
        if self.failures:
            for f in self.failures[:5]:
                card["attachments"][0]["content"]["body"].append({
                    "type": "TextBlock",
                    "text": f"Failed: {f['host']} - {f['task']}: {f['msg']}",
                    "color": "attention",
                    "wrap": True,
                })

        try:
            requests.post(self.webhook_url, json=card, timeout=10)
        except requests.RequestException as e:
            self._display.warning(f'Teams notification failed: {e}')
```

## Discord Notification

Discord webhooks accept a simple JSON format:

```python
# callback_plugins/discord_notify.py - Discord notification callback
import os
import time
from ansible.plugins.callback import CallbackBase

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'discord_notify'
    CALLBACK_NEEDS_WHITELIST = True

    def __init__(self):
        super().__init__()
        self.webhook_url = os.environ.get('DISCORD_WEBHOOK_URL', '')
        self.start_time = None
        self.playbook_name = ''
        self.failures = []

    def v2_playbook_on_start(self, playbook):
        self.start_time = time.time()
        self.playbook_name = os.path.basename(playbook._file_name)

    def v2_runner_on_failed(self, result, ignore_errors=False):
        if not ignore_errors:
            self.failures.append({
                'host': result._host.get_name(),
                'task': result._task.get_name(),
                'msg': result._result.get('msg', '')[:100],
            })

    def v2_playbook_on_stats(self, stats):
        if not self.webhook_url or not HAS_REQUESTS:
            return

        duration = int(time.time() - self.start_time)
        host_count = len(stats.processed)
        status_emoji = ':x:' if self.failures else ':white_check_mark:'

        # Build Discord embed
        embed = {
            "embeds": [{
                "title": f"{status_emoji} Ansible: {self.playbook_name}",
                "color": 0xFF0000 if self.failures else 0x00FF00,
                "fields": [
                    {"name": "Duration", "value": f"{duration}s", "inline": True},
                    {"name": "Hosts", "value": str(host_count), "inline": True},
                    {"name": "Failures", "value": str(len(self.failures)), "inline": True},
                ],
            }]
        }

        if self.failures:
            failure_text = '\n'.join(
                f"- {f['host']}: {f['msg']}" for f in self.failures[:5]
            )
            embed["embeds"][0]["fields"].append({
                "name": "Failed Tasks",
                "value": failure_text[:1024],
            })

        try:
            requests.post(self.webhook_url, json=embed, timeout=10)
        except requests.RequestException as e:
            self._display.warning(f'Discord notification failed: {e}')
```

## Google Chat Notification

```python
# callback_plugins/gchat_notify.py - Google Chat notification callback
import os
import time
from ansible.plugins.callback import CallbackBase

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'gchat_notify'
    CALLBACK_NEEDS_WHITELIST = True

    def __init__(self):
        super().__init__()
        self.webhook_url = os.environ.get('GCHAT_WEBHOOK_URL', '')
        self.start_time = None
        self.playbook_name = ''
        self.failures = []

    def v2_playbook_on_start(self, playbook):
        self.start_time = time.time()
        self.playbook_name = os.path.basename(playbook._file_name)

    def v2_runner_on_failed(self, result, ignore_errors=False):
        if not ignore_errors:
            self.failures.append({
                'host': result._host.get_name(),
                'task': result._task.get_name(),
            })

    def v2_playbook_on_stats(self, stats):
        if not self.webhook_url or not HAS_REQUESTS:
            return

        duration = int(time.time() - self.start_time)
        status = 'FAILED' if self.failures else 'SUCCESS'

        text = f"*Ansible: {self.playbook_name}* - {status}\n"
        text += f"Duration: {duration}s | Hosts: {len(stats.processed)}\n"

        if self.failures:
            text += "\nFailures:\n"
            for f in self.failures[:5]:
                text += f"- {f['host']}: {f['task']}\n"

        payload = {"text": text}
        try:
            requests.post(self.webhook_url, json=payload, timeout=10)
        except requests.RequestException as e:
            self._display.warning(f'Google Chat notification failed: {e}')
```

## Using Custom Notification Callbacks

All these callbacks follow the same usage pattern:

```ini
# ansible.cfg - Enable custom notification callbacks
[defaults]
callback_whitelist = teams_notify
callback_plugins = ./callback_plugins
```

```bash
# Set the webhook URL and run
export TEAMS_WEBHOOK_URL=https://outlook.webhook.office.com/...
# or
export DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
# or
export GCHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...

ansible-playbook deploy.yml
```

## Conditional Notifications

Send to different channels based on the result:

```python
# In your callback's v2_playbook_on_stats method:
def v2_playbook_on_stats(self, stats):
    if self.failures:
        # Send to urgent channel
        self._send_notification(self.urgent_webhook, "FAILED")
    else:
        # Send to general channel
        self._send_notification(self.general_webhook, "SUCCESS")
```

The pattern is always the same: collect events during the run, build a message at the end, and POST to a webhook. Adapt it to any service your team uses. The entire implementation is typically under 80 lines of Python.
