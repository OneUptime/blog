# How to Use the Ansible say Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Text-to-Speech, Notification

Description: Configure the Ansible say callback plugin for audible text-to-speech notifications when playbook tasks succeed, fail, or complete.

---

The `say` callback plugin is one of the more entertaining Ansible callbacks. It uses your system's text-to-speech engine to announce playbook events out loud. When a task fails, your computer literally says "failure on host web-03." It is a novelty for most people, but it has a genuine use case: when you are running a long playbook and doing something else on your machine, you hear when things go wrong without watching the terminal.

## How It Works

The say callback uses the `say` command on macOS or `espeak` on Linux to convert playbook events to speech. When playbook events occur, the callback passes status messages to the text-to-speech engine on the controller node.

## Enabling the Say Callback

The callback is in the `community.general` collection. If you use `ansible-core` instead of the full `ansible` package, install it first:

```bash
ansible-galaxy collection install community.general
```

```ini
# ansible.cfg - Enable the say callback

[defaults]
callbacks_enabled = community.general.say
```

Or for a single run:

```bash
# Enable say callback for this run
ANSIBLE_CALLBACKS_ENABLED=community.general.say ansible-playbook deploy.yml
```

## Platform Requirements

On macOS, the `say` command is built in. No additional software needed:

```bash
# Test that say works on macOS
say "Ansible is ready"
```

On Linux, install a text-to-speech engine:

```bash
# Ubuntu/Debian - Install espeak
sudo apt-get install espeak

# Fedora/RHEL
sudo dnf install espeak
```

Test that it works:

```bash
# Test espeak on Linux
espeak "Ansible is ready"
```

## What Gets Announced

The say callback announces several events:

- Playbook start: "Running Playbook"
- Play start: "Starting play: deploy"
- Task start: "Starting task: Install packages"
- Task success, skipped tasks, and handler notifications: a short "pew" sound
- Task failure or unreachable host: "Failure on host web-03"
- Play recap: "Play complete"

During a typical playbook run, you hear something like:

```text
"Running Playbook"
"Starting play: web servers"
"Starting task: Install packages"
"pew"
"Starting task: Restart service"
"Failure on host web-03"
"Play complete"
```

## Controlling Verbosity

With many hosts, the constant speech announcements become overwhelming. The built-in say callback does not expose filtering options of its own, so use a custom callback if you need finer control over what gets announced.

You can still reduce terminal noise from the default stdout callback:

```ini
# ansible.cfg - Say callback with reduced noise
[defaults]
callbacks_enabled = community.general.say
display_ok_hosts = False
display_skipped_hosts = False
```

This affects the normal terminal output, but the built-in say callback still receives playbook events.

## Creating a Custom Say Callback

The built-in say callback can be noisy. Here is a custom version that only speaks on failures:

```python
# callback_plugins/say_failures.py - Only announce failures
from ansible.plugins.callback import CallbackBase
import subprocess
import platform

class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'say_failures'
    CALLBACK_NEEDS_ENABLED = True

    def _say(self, message):
        """Use the system TTS engine to speak a message."""
        system = platform.system()
        try:
            if system == 'Darwin':
                subprocess.Popen(['say', message])
            elif system == 'Linux':
                subprocess.Popen(['espeak', message])
        except FileNotFoundError:
            pass  # TTS not available, silently skip

    def v2_runner_on_failed(self, result, ignore_errors=False):
        if not ignore_errors:
            host = result._host.get_name()
            task = result._task.get_name()
            self._say(f"Failure on {host} during {task}")

    def v2_runner_on_unreachable(self, result):
        host = result._host.get_name()
        self._say(f"Host {host} is unreachable")

    def v2_playbook_on_stats(self, stats):
        hosts = sorted(stats.processed.keys())
        failures = []
        for h in hosts:
            s = stats.summarize(h)
            if s['failures'] > 0 or s['unreachable'] > 0:
                failures.append(h)

        if failures:
            self._say(f"Playbook finished with failures on {len(failures)} hosts")
        else:
            self._say("Playbook completed successfully on all hosts")
```

Enable it:

```ini
# ansible.cfg
[defaults]
callbacks_enabled = say_failures
callback_plugins = ./callback_plugins
```

## Practical Use Case: Long-Running Deployments

The say callback is most useful during long deployments where you want to step away from the terminal:

```bash
#!/bin/bash
# deploy-with-voice.sh - Deploy with voice notifications
export ANSIBLE_CALLBACKS_ENABLED=community.general.say

echo "Starting deployment - you will hear voice notifications"
ansible-playbook -i inventory/production deploy.yml

# Final announcement
if [ $? -eq 0 ]; then
    if command -v say >/dev/null 2>&1; then
        say "Deployment completed successfully"
    else
        espeak "Deployment completed successfully"
    fi
else
    if command -v say >/dev/null 2>&1; then
        say "Warning. Deployment failed. Check the terminal."
    else
        espeak "Warning. Deployment failed. Check the terminal."
    fi
fi
```

## macOS Voice Selection

On macOS, you can choose different voices:

```bash
# List available voices
say -v '?'

# Use a specific voice
say -v "Alex" "Deployment starting"
say -v "Samantha" "Task failed on web server three"
say -v "Daniel" "All tasks completed"
```

To use a specific voice with the say callback, you would need to create a custom callback that passes the `-v` flag.

## Say Callback in Pair Programming

The say callback has a niche use case in pair programming or team environments. When two people are working on infrastructure, one person runs the playbook while the other works on something else. Voice announcements keep both people informed without requiring visual attention.

## Say Callback for Accessibility

For engineers with visual impairments, the say callback provides an audio interface to Ansible's progress. Combined with a screen reader, it gives a more complete picture of what is happening during a playbook run.

## Combining Say with Other Callbacks

Use say alongside visual callbacks:

The timer and profile callbacks in this example come from the `ansible.posix` collection.

```ini
# ansible.cfg - Say with visual output
[defaults]
stdout_callback = ansible.builtin.default
callback_result_format = yaml
callbacks_enabled = community.general.say, ansible.posix.timer, ansible.posix.profile_tasks
```

You get full visual output on the terminal plus audio notifications. The say callback does not interfere with other output.

## Limitations

The say callback has obvious limitations:

- Useless on remote servers or CI/CD (no speakers)
- Annoying in open-plan offices
- Too noisy with large inventories
- Pronunciation of hostnames can be comical

For real notification needs, use the slack or mail callbacks. The say callback is best for local development, demos, or when you genuinely need audio notifications while multitasking. It is a fun feature that occasionally turns out to be genuinely useful.
