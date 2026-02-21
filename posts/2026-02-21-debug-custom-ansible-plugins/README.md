# How to Debug Custom Ansible Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Debugging, Python, Troubleshooting

Description: Practical techniques for debugging Ansible plugins including logging, pdb, remote debugging, and troubleshooting common issues.

---

Debugging Ansible plugins is tricky because they run inside Ansible's execution engine, not as standalone Python scripts. Print statements break output formatting, breakpoints do not work with forked processes, and errors can be swallowed by exception handlers. This guide covers the techniques that actually work for debugging plugins in development and production.

## Verbosity-Based Debug Output

The simplest and most reliable debugging technique is using the Display object with verbosity levels:

```python
from ansible.utils.display import Display
display = Display()

class LookupModule(LookupBase):
    def run(self, terms, variables=None, **kwargs):
        self.set_options(var_options=variables, direct=kwargs)

        api_url = self.get_option('api_url')
        display.v("LOOKUP DEBUG: api_url = %s" % api_url)
        display.vv("LOOKUP DEBUG: all options = %s" % self._options)

        for term in terms:
            display.vvv("LOOKUP DEBUG: processing term '%s'" % term)
            display.vvvv("LOOKUP DEBUG: variables available: %s" % list(variables.keys()))

            result = self._fetch(term)
            display.vvv("LOOKUP DEBUG: raw result type = %s" % type(result).__name__)
            display.vvvv("LOOKUP DEBUG: raw result = %s" % result)
```

Then run with increasing verbosity:

```bash
# Normal output
ansible-playbook test.yml

# Show -v messages
ansible-playbook test.yml -v

# Show -vv messages (plugin connection details)
ansible-playbook test.yml -vv

# Show -vvv messages (deep debug info)
ansible-playbook test.yml -vvv

# Show everything
ansible-playbook test.yml -vvvv
```

## Logging to a File

For production debugging where you cannot increase verbosity, log to a file:

```python
import logging
import os

# Set up a file logger for the plugin
logger = logging.getLogger('my_plugin')
log_file = os.environ.get('MY_PLUGIN_LOG', '/tmp/ansible_plugin_debug.log')
handler = logging.FileHandler(log_file)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(name)s %(levelname)s %(message)s'
))
logger.addHandler(handler)
logger.setLevel(logging.DEBUG)


class LookupModule(LookupBase):
    def run(self, terms, variables=None, **kwargs):
        logger.info("Lookup started with terms: %s", terms)

        try:
            self.set_options(var_options=variables, direct=kwargs)
            logger.debug("Options loaded: api_url=%s", self.get_option('api_url'))
        except Exception as e:
            logger.error("Failed to load options: %s", str(e), exc_info=True)
            raise

        results = []
        for term in terms:
            logger.debug("Fetching term: %s", term)
            try:
                data = self._fetch(term)
                logger.debug("Got %d results for '%s'", len(data), term)
                results.append(data)
            except Exception as e:
                logger.error("Fetch failed for '%s': %s", term, str(e), exc_info=True)
                raise AnsibleLookupError("Fetch failed: %s" % str(e))

        logger.info("Lookup complete: %d results", len(results))
        return results
```

Enable logging:

```bash
export MY_PLUGIN_LOG=/tmp/ansible_plugin_debug.log
ansible-playbook test.yml
tail -f /tmp/ansible_plugin_debug.log
```

## Using Ansible's Built-in Logging

Configure Ansible's log path for all output:

```ini
# ansible.cfg
[defaults]
log_path = /var/log/ansible.log
```

Everything sent through `display.display()`, `display.v()`, etc., gets written to this log file.

## Interactive Debugging with pdb

For lookup and filter plugins (which run in the main process), you can use pdb:

```python
class FilterModule:
    @staticmethod
    def my_filter(value):
        import pdb; pdb.set_trace()  # Drops into interactive debugger
        result = do_something(value)
        return result
```

Run with a single fork so pdb works:

```bash
# Run with a single fork to allow pdb
ansible-playbook test.yml --forks 1
```

For connection and strategy plugins that run in forked processes, pdb will not work directly. Use remote debugging instead:

```python
# Remote debugging with debugpy (VS Code compatible)
import debugpy
debugpy.listen(('0.0.0.0', 5678))
debugpy.wait_for_client()  # Pauses until VS Code connects
```

## Testing Plugins Outside Ansible

The fastest debugging cycle is testing your plugin logic outside Ansible entirely:

```python
# test_my_lookup.py - Test lookup plugin without Ansible
import sys
import json

# For filter plugins, test directly
sys.path.insert(0, './filter_plugins')
from my_filters import FilterModule

fm = FilterModule()

# Test each filter
result = fm.my_filter("test_input")
print("Filter result:", result)

# For lookup plugins, mock the Ansible parts
sys.path.insert(0, './lookup_plugins')

# Create a minimal mock for LookupBase
class MockDisplay:
    def v(self, msg): print("[v]", msg)
    def vv(self, msg): print("[vv]", msg)
    def vvv(self, msg): print("[vvv]", msg)
    def warning(self, msg): print("[WARN]", msg)

# Test the core logic
from my_lookup import LookupModule
lookup = LookupModule()
lookup._display = MockDisplay()

# Mock set_options
lookup._options = {
    'api_url': 'https://httpbin.org',
    'api_token': 'test',
}
lookup.get_option = lambda key: lookup._options.get(key)

# Test
try:
    results = lookup.run(['test_term'], variables={})
    print("Results:", json.dumps(results, indent=2))
except Exception as e:
    print("Error:", e)
    import traceback
    traceback.print_exc()
```

## Common Plugin Bugs and Fixes

### Bug: Plugin not found

```
ERROR! The lookup plugin 'my_lookup' was not found
```

Fix: Check the plugin path configuration:

```bash
# Show where Ansible looks for plugins
ansible-config dump | grep -i plugin

# Verify your plugin directory
ls -la ./lookup_plugins/my_lookup.py

# Check ansible.cfg
grep plugin ansible.cfg
```

### Bug: Options not loading

```python
# This fails because set_options was not called
class LookupModule(LookupBase):
    def run(self, terms, variables=None, **kwargs):
        url = self.get_option('api_url')  # KeyError or None
```

Fix: Always call `set_options` first:

```python
def run(self, terms, variables=None, **kwargs):
    self.set_options(var_options=variables, direct=kwargs)
    url = self.get_option('api_url')  # Now it works
```

### Bug: Import errors hidden

Ansible sometimes swallows import errors when loading plugins. Add explicit checks:

```python
try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

class LookupModule(LookupBase):
    def run(self, terms, variables=None, **kwargs):
        if not HAS_PSYCOPG2:
            raise AnsibleError(
                "psycopg2 is required: pip install psycopg2-binary"
            )
```

### Bug: Serialization failures

Plugin return values must be JSON-serializable. Non-serializable objects cause cryptic errors:

```python
# BAD: returning a datetime object
return {'timestamp': datetime.now()}

# GOOD: convert to string first
return {'timestamp': datetime.now().isoformat()}
```

## Environment Variable Debugging

Ansible has several environment variables that help with debugging:

```bash
# Show full Python tracebacks on errors
export ANSIBLE_DEBUG=1

# Enable verbose mode programmatically
export ANSIBLE_VERBOSITY=3

# Show what plugins are being loaded
export ANSIBLE_DEBUG=1

# Keep remote temporary files for inspection
export ANSIBLE_KEEP_REMOTE_FILES=1

# Show the module arguments sent to remote hosts
export ANSIBLE_DEBUG=1
ansible-playbook test.yml -vvvv
```

## Profiling Plugin Performance

If your plugin is slow, profile it:

```python
import time

class LookupModule(LookupBase):
    def run(self, terms, variables=None, **kwargs):
        start = time.time()
        self.set_options(var_options=variables, direct=kwargs)
        display.vv("Options loaded in %.3fs" % (time.time() - start))

        results = []
        for term in terms:
            term_start = time.time()
            data = self._fetch(term)
            elapsed = time.time() - term_start
            display.vv("Fetched '%s' in %.3fs" % (term, elapsed))
            results.append(data)

        total = time.time() - start
        display.v("Lookup total time: %.3fs for %d terms" % (total, len(terms)))
        return results
```

## Summary

Debugging Ansible plugins requires a combination of techniques. Use Display verbosity levels for quick iteration, file logging for production issues, pdb for interactive debugging of in-process plugins, and standalone test scripts for the fastest feedback loop. The most common issues are missing `set_options()` calls, plugin path configuration errors, hidden import failures, and serialization problems. Build good logging into your plugins from the start, and debugging becomes straightforward.
