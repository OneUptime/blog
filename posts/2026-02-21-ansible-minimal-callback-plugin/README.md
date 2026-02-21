# How to Use the Ansible minimal Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Output, Minimal

Description: Use the Ansible minimal callback plugin to reduce playbook output to only essential information like failures and changes.

---

The `minimal` callback plugin strips Ansible output down to the bare essentials. Where the default callback shows task names, host statuses, and formatted results, the minimal callback gives you just the host name and the result in a compact format. It is useful when you are running playbooks against large inventories and do not need detailed output for every single host.

## Enabling the Minimal Callback

Set it as your stdout callback in `ansible.cfg`:

```ini
# ansible.cfg - Switch to minimal output
[defaults]
stdout_callback = minimal
```

Or use an environment variable:

```bash
# Enable minimal callback via environment
export ANSIBLE_STDOUT_CALLBACK=minimal
```

You can also set it per-playbook run without changing your config:

```bash
# Use minimal callback for a single run
ANSIBLE_STDOUT_CALLBACK=minimal ansible-playbook site.yml
```

## What the Output Looks Like

With the default callback, a typical playbook run looks like this:

```
PLAY [Configure web servers] *************************************************

TASK [Gathering Facts] *******************************************************
ok: [web-01]
ok: [web-02]
ok: [web-03]

TASK [Install nginx] *********************************************************
ok: [web-01]
changed: [web-02]
changed: [web-03]

TASK [Start nginx service] ***************************************************
ok: [web-01]
ok: [web-02]
ok: [web-03]

PLAY RECAP *******************************************************************
web-01  : ok=3  changed=0  unreachable=0  failed=0
web-02  : ok=3  changed=1  unreachable=0  failed=0
web-03  : ok=3  changed=1  unreachable=0  failed=0
```

The same playbook with the minimal callback:

```
web-01 | SUCCESS => {"changed": false, "ansible_facts": {...}}
web-02 | SUCCESS => {"changed": false, "ansible_facts": {...}}
web-03 | SUCCESS => {"changed": false, "ansible_facts": {...}}
web-01 | SUCCESS => {"changed": false}
web-02 | CHANGED => {"changed": true}
web-03 | CHANGED => {"changed": true}
web-01 | SUCCESS => {"changed": false}
web-02 | SUCCESS => {"changed": false}
web-03 | SUCCESS => {"changed": false}
```

Notice what is missing: task names, play names, the decorative asterisk lines, and the play recap. You get just host, status, and the result dictionary.

## When to Use Minimal

The minimal callback is a good fit for several scenarios.

Running quick ad-hoc commands where the task name is obvious:

```bash
# Ad-hoc command with minimal output
ANSIBLE_STDOUT_CALLBACK=minimal ansible all -m ping
```

Output:

```
web-01 | SUCCESS => {"changed": false, "ping": "pong"}
web-02 | SUCCESS => {"changed": false, "ping": "pong"}
db-01 | SUCCESS => {"changed": false, "ping": "pong"}
```

Running playbooks in scripts where you are going to parse the output:

```bash
# Capture minimal output for processing
ANSIBLE_STDOUT_CALLBACK=minimal ansible-playbook check-disk.yml | grep FAILED
```

When you want to scan through results quickly and only care about failures:

```bash
# Run with minimal output and filter for problems
ANSIBLE_STDOUT_CALLBACK=minimal ansible-playbook deploy.yml 2>&1 | grep -E "FAILED|UNREACHABLE"
```

## Minimal vs Default in Large Inventories

The difference becomes pronounced with large inventories. If you run a playbook with 10 tasks against 200 hosts, the default callback produces thousands of lines. The minimal callback produces the same number of result lines but without the task headers, play headers, and recap section.

Here is a practical comparison. A health check playbook against 5 hosts with the default callback:

```
PLAY [Health Check] **********************************************************

TASK [Gathering Facts] *******************************************************
ok: [host-01]
ok: [host-02]
ok: [host-03]
ok: [host-04]
ok: [host-05]

TASK [Check disk space] ******************************************************
ok: [host-01]
ok: [host-02]
ok: [host-03]
ok: [host-04]
ok: [host-05]

TASK [Check memory usage] ****************************************************
ok: [host-01]
ok: [host-02]
ok: [host-03]
ok: [host-04]
ok: [host-05]

PLAY RECAP *******************************************************************
host-01 : ok=3  changed=0  unreachable=0  failed=0
host-02 : ok=3  changed=0  unreachable=0  failed=0
host-03 : ok=3  changed=0  unreachable=0  failed=0
host-04 : ok=3  changed=0  unreachable=0  failed=0
host-05 : ok=3  changed=0  unreachable=0  failed=0
```

With minimal, you lose the context of which task produced which result. Each line is a host result, but you cannot tell at a glance which task it came from without counting lines.

## Combining Minimal with Verbosity

Even with the minimal callback, verbosity flags still work:

```bash
# Minimal callback with verbose output
ANSIBLE_STDOUT_CALLBACK=minimal ansible-playbook site.yml -v
```

At `-v`, the minimal callback includes the full result dictionary. At `-vv`, you get module arguments. The output is still compact compared to the default callback at the same verbosity level, but it gains useful detail.

## Using Minimal in CI Pipelines

The minimal callback can reduce CI log size significantly:

```yaml
# .gitlab-ci.yml - Use minimal callback to keep logs manageable
deploy:
  stage: deploy
  script:
    - export ANSIBLE_STDOUT_CALLBACK=minimal
    - ansible-playbook -i inventory/production deploy.yml
  only:
    - main
```

For CI pipelines, you often want compact output during normal runs but detailed output when something fails. You can combine the minimal callback with the `--verbose` flag that only triggers on failure:

```bash
#!/bin/bash
# deploy.sh - Run with minimal output, retry with verbose on failure
export ANSIBLE_STDOUT_CALLBACK=minimal
if ! ansible-playbook deploy.yml; then
    echo "Deployment failed, rerunning with verbose output..."
    export ANSIBLE_STDOUT_CALLBACK=default
    ansible-playbook deploy.yml -vv
fi
```

## Customizing the Minimal Callback

If you want something between minimal and default, you can create a modified version:

```python
# callback_plugins/my_minimal.py - Enhanced minimal callback
from ansible.plugins.callback.minimal import CallbackModule as MinimalCallback

class CallbackModule(MinimalCallback):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'stdout'
    CALLBACK_NAME = 'my_minimal'

    def v2_playbook_on_play_start(self, play):
        # Add play names back (minimal normally skips these)
        name = play.get_name().strip()
        if name:
            self._display.banner(f"PLAY [{name}]")

    def v2_playbook_on_task_start(self, task, is_conditional):
        # Add task names back but keep results minimal
        name = task.get_name().strip()
        if name:
            self._display.display(f"  TASK: {name}", color='cyan')

    def v2_playbook_on_stats(self, stats):
        # Add the play recap back
        self._display.banner("PLAY RECAP")
        hosts = sorted(stats.processed.keys())
        for h in hosts:
            s = stats.summarize(h)
            msg = (
                f"{h} : ok={s['ok']} changed={s['changed']} "
                f"unreachable={s['unreachable']} failed={s['failures']}"
            )
            self._display.display(msg)
```

Place this in your project's `callback_plugins/` directory and enable it:

```ini
# ansible.cfg
[defaults]
stdout_callback = my_minimal
callback_plugins = ./callback_plugins
```

## Minimal vs Other Compact Callbacks

Ansible includes several compact output callbacks:

- `minimal` - just host and result, no structure
- `oneline` - similar to minimal but everything on one line
- `dense` - compact but includes task context

If you find `minimal` too stripped down but `default` too verbose, try `dense` or `oneline` before writing a custom callback. The minimal callback is best when you genuinely just want to see raw results with no formatting overhead.

The minimal callback is a tool, not a lifestyle. Keep it in your back pocket for large-scale runs, ad-hoc commands, and scripted pipelines. For everyday development and debugging, the default callback or one with task profiling gives you more useful information.
