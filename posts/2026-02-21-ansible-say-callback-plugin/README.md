# How to Use the Ansible say Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Text-to-Speech, Notifications

Description: Configure the Ansible say callback plugin for audible text-to-speech notifications when playbook tasks succeed, fail, or complete.

---

The `say` callback plugin is one of the more entertaining Ansible callbacks. It uses your system's text-to-speech engine to announce playbook events out loud. When a task fails, your computer literally says "failure on host web-03." It is a novelty for most people, but it has a genuine use case: when you are running a long playbook and doing something else on your machine, you hear when things go wrong without watching the terminal.

## How It Works

The say callback uses the `say` command on macOS or `espeak`/`spd-say` on Linux to convert playbook events to speech. When tasks complete, the callback passes status messages to the text-to-speech engine.

## Enabling the Say Callback

```ini
# ansible.cfg - Enable the say callback
[defaults]
callback_whitelist = community.general.say
```

Or for a single run:

```bash
# Enable say callback for this run
ANSIBLE_CALLBACK_WHITELIST=community.general.say ansible-playbook deploy.yml
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

# Or install speech-dispatcher
sudo apt-get install speech-dispatcher

# Fedora/RHEL
sudo dnf install espeak
```

Test that it works:

```bash
# Test espeak on Linux
espeak "Ansible is ready"

# Or with speech-dispatcher
spd-say "Ansible is ready"
```

## What Gets Announced

The say callback announces several events:

- Playbook start: "Starting playbook deploy dot yml"
- Task completion on success: "ok on web-01"
- Task changed: "changed on web-02"
- Task failure: "failure on web-03"
- Host unreachable: "unreachable host web-04"
- Play recap: announces the summary

During a typical playbook run, you hear something like:

```
"Starting playbook site dot yml"
"ok on web-01"
"ok on web-02"
"changed on web-01"
"changed on web-02"
"ok on web-01"
"failure on web-03"
"Play complete. Two hosts ok, one host failed."
```

## Controlling Verbosity

With many hosts, the constant speech announcements become overwhelming. The say callback respects the standard Ansible verbosity settings, but you can also control what gets announced.

For a quieter experience, use the callback alongside configuration that suppresses ok hosts:

```ini
# ansible.cfg - Say callback with reduced noise
[defaults]
callback_whitelist = community.general.say
display_ok_hosts = False
display_skipped_hosts = False
```

This way, the callback only speaks up for changes and failures.

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
    CALLBACK_NEEDS_WHITELIST = True

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
callback_whitelist = say_failures
callback_plugins = ./callback_plugins
```

## Practical Use Case: Long-Running Deployments

The say callback is most useful during long deployments where you want to step away from the terminal:

```bash
#!/bin/bash
# deploy-with-voice.sh - Deploy with voice notifications
export ANSIBLE_CALLBACK_WHITELIST=community.general.say

# On macOS, set the voice
export SAY_VOICE="Samantha"

echo "Starting deployment - you will hear voice notifications"
ansible-playbook -i inventory/production deploy.yml

# Final announcement
if [ $? -eq 0 ]; then
    say "Deployment completed successfully"
else
    say "Warning. Deployment failed. Check the terminal."
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

```ini
# ansible.cfg - Say with visual output
[defaults]
stdout_callback = yaml
callback_whitelist = community.general.say, timer, profile_tasks
```

You get full visual output on the terminal plus audio notifications. The say callback does not interfere with other output.

## Limitations

The say callback has obvious limitations:

- Useless on remote servers or CI/CD (no speakers)
- Annoying in open-plan offices
- Too noisy with large inventories
- Pronunciation of hostnames can be comical

For real notification needs, use the slack or mail callbacks. The say callback is best for local development, demos, or when you genuinely need audio notifications while multitasking. It is a fun feature that occasionally turns out to be genuinely useful.
