# How to Use Plugin Display Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Display, Debugging, Python

Description: Learn how to properly use the Ansible Display class to output messages, warnings, and debug info from your custom plugins.

---

When building Ansible plugins, you need a way to communicate with the user. Printing directly to stdout breaks Ansible's output formatting. Instead, Ansible provides the `Display` class, which handles output at different verbosity levels, supports colors, and integrates with callback plugins. This guide shows you how to use it properly across all plugin types.

## The Display Object

The `Display` class lives in `ansible.utils.display`. Most plugin base classes provide it as `self._display`, but you can also import it directly:

```python
# Two ways to access Display
from ansible.utils.display import Display

# Option 1: Create a module-level display instance
display = Display()

# Option 2: Use self._display from your base class (preferred in plugins)
class MyPlugin(SomeBase):
    def do_something(self):
        self._display.display("Hello from plugin")
```

## Verbosity Levels

Ansible supports multiple verbosity levels controlled by the `-v` flags. The Display class maps to these levels:

```python
from ansible.utils.display import Display
display = Display()

# Always shown (no -v required)
display.display("This always appears")

# Shown with -v
display.v("Verbose: extra detail about what is happening")

# Shown with -vv
display.vv("Very verbose: connection details and parameters")

# Shown with -vvv
display.vvv("Debug: raw data and internal state")

# Shown with -vvvv
display.vvvv("Trace: extremely detailed execution info")

# Shown with -vvvvv
display.vvvvv("Deep trace: rarely needed")
```

A practical example in a lookup plugin:

```python
from ansible.plugins.lookup import LookupBase
from ansible.errors import AnsibleError


class LookupModule(LookupBase):
    def run(self, terms, variables=None, **kwargs):
        self.set_options(var_options=variables, direct=kwargs)

        api_url = self.get_option('api_url')
        self._display.v("API lookup connecting to: %s" % api_url)

        results = []
        for term in terms:
            self._display.vv("Looking up term: %s" % term)

            try:
                data = self._fetch_data(term)
                self._display.vvv("Raw response: %s" % data)
                results.append(data)
            except Exception as e:
                self._display.warning("Failed to look up '%s': %s" % (term, e))
                raise AnsibleError("Lookup failed: %s" % str(e))

        self._display.v("Lookup returned %d results" % len(results))
        return results
```

## Warning and Error Messages

Use dedicated methods for warnings and errors since they get special formatting:

```python
# Warning: yellow text, always shown regardless of verbosity
self._display.warning("Certificate expires in 7 days")

# Deprecation warning: includes version info
self._display.deprecated(
    "The 'old_option' parameter is deprecated",
    version='2.0.0',
    collection_name='myorg.myutils'
)

# Error display (does not stop execution, just shows the message)
self._display.error("Failed to connect to API: connection refused")

# For actual errors that should stop execution, raise AnsibleError instead
from ansible.errors import AnsibleError
raise AnsibleError("Cannot continue: API returned 500")
```

## Colored Output

The `display()` method supports color:

```python
# Available colors: black, dark gray, red, bright red, green, bright green,
# yellow, bright yellow, blue, bright blue, purple, bright purple,
# cyan, bright cyan, white, bright white, normal

self._display.display("Success!", color='green')
self._display.display("Warning!", color='yellow')
self._display.display("Error!", color='red')
self._display.display("Info", color='cyan')
```

Use color sparingly. It is best for highlighting critical status information, not for making everything colorful.

## Display in Callback Plugins

Callback plugins get the display object through their constructor. Here is how to use it for custom output formatting:

```python
from ansible.plugins.callback import CallbackBase
import json


class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'my_output'

    def v2_runner_on_ok(self, result):
        host = result._host.get_name()
        task = result._task.get_name()

        if result.is_changed():
            self._display.display(
                "CHANGED: %s | %s" % (host, task),
                color='yellow'
            )
        else:
            self._display.display(
                "OK: %s | %s" % (host, task),
                color='green'
            )

        # Show detailed results at higher verbosity
        self._display.vv(
            "Result data: %s" % json.dumps(result._result, indent=2)
        )

    def v2_runner_on_failed(self, result, ignore_errors=False):
        host = result._host.get_name()
        task = result._task.get_name()
        msg = result._result.get('msg', 'No error message')

        if ignore_errors:
            self._display.display(
                "FAILED (ignored): %s | %s | %s" % (host, task, msg),
                color='cyan'
            )
        else:
            self._display.display(
                "FAILED: %s | %s | %s" % (host, task, msg),
                color='red'
            )

    def v2_playbook_on_stats(self, stats):
        """Print a summary at the end of the playbook run."""
        self._display.display("\n--- Playbook Summary ---", color='bright blue')

        hosts = sorted(stats.processed.keys())
        for host in hosts:
            summary = stats.summarize(host)
            line = "%s : ok=%d changed=%d unreachable=%d failed=%d" % (
                host,
                summary['ok'],
                summary['changed'],
                summary['unreachable'],
                summary['failures'],
            )

            if summary['failures'] > 0:
                color = 'red'
            elif summary['changed'] > 0:
                color = 'yellow'
            else:
                color = 'green'

            self._display.display(line, color=color)
```

## Banner Messages

For section headers, use the `banner()` method:

```python
# Creates a formatted banner like:
# ============================================
# My Section Title
# ============================================
self._display.banner("My Section Title")

# Banner with a specific color
self._display.banner("Deployment Starting", color='bright green')
```

## Display in Strategy Plugins

Strategy plugins often need to show progress information:

```python
from ansible.plugins.strategy.linear import StrategyModule as LinearStrategy
from ansible.utils.display import Display

display = Display()


class StrategyModule(LinearStrategy):
    def run(self, iterator, play_context):
        hosts = self._inventory.get_hosts(iterator._play.hosts)
        total = len(hosts)

        display.display(
            "Rolling deployment: %d hosts in batches of %d"
            % (total, self._batch_size),
            color='cyan'
        )

        for i, batch in enumerate(self._get_batches(hosts)):
            display.display(
                "Processing batch %d/%d: %s"
                % (i + 1, self._num_batches, ', '.join(h.name for h in batch)),
                color='yellow'
            )
            # Process batch...

        return super(StrategyModule, self).run(iterator, play_context)
```

## Logging to Files

In addition to console output, you can write to the Ansible log file. The display object handles this automatically when `log_path` is set in `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
log_path = /var/log/ansible.log
```

When `log_path` is configured, all `display()`, `v()`, `warning()`, and `error()` calls also write to the log file. You do not need to do anything extra in your plugin code.

## Best Practices

1. Use `display()` for information users always need to see
2. Use `v()` for details that help with troubleshooting
3. Use `vv()` and `vvv()` for developer-level debugging information
4. Use `warning()` for issues that do not stop execution but should be noticed
5. Never use `print()` in plugins; it bypasses the display system and can corrupt output
6. Keep messages concise and actionable
7. Include relevant context (host names, variable values, paths)

## Summary

The Display class is the correct way to output information from Ansible plugins. It handles verbosity levels, color formatting, log file writing, and integration with callback plugins. Use `self._display` from your plugin base class for most cases, and match your output to the appropriate verbosity level so users get the right amount of detail based on their `-v` flags.
