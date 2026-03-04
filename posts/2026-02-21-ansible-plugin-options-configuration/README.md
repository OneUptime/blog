# How to Handle Plugin Options and Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Configuration, Python, Development

Description: Master the Ansible plugin configuration system to define options that load from environment variables, ini files, and Ansible variables.

---

Ansible plugins have a flexible configuration system that lets users set options through environment variables, `ansible.cfg` INI settings, playbook variables, and keyword arguments. Getting this right means your plugin works smoothly in any environment without hardcoded values. This guide explains how the option system works and how to use it effectively.

## How Options Flow Into Plugins

When Ansible initializes a plugin, it resolves options from multiple sources in a specific priority order (highest to lowest):

1. Direct keyword arguments in playbook usage
2. Ansible variables (`vars`)
3. Environment variables (`env`)
4. INI configuration settings from `ansible.cfg` (`ini`)
5. Default values defined in `DOCUMENTATION`

This means a variable set in a playbook overrides an environment variable, which overrides an INI setting, which overrides the default.

## Defining Options in DOCUMENTATION

Options are defined in the `DOCUMENTATION` string. Here is a thorough example:

```python
DOCUMENTATION = """
    name: my_plugin
    short_description: Example plugin with various option types
    description:
        - Demonstrates all the option configuration patterns.
    options:
      api_url:
        description:
          - The base URL of the API to connect to.
          - Must include the protocol (https://).
        type: str
        required: true
        env:
          - name: MY_PLUGIN_API_URL
        ini:
          - section: my_plugin
            key: api_url
        vars:
          - name: my_plugin_api_url

      api_token:
        description: Authentication token for the API.
        type: str
        required: true
        env:
          - name: MY_PLUGIN_API_TOKEN
        ini:
          - section: my_plugin
            key: api_token
        vars:
          - name: my_plugin_api_token
        no_log: true

      timeout:
        description: Request timeout in seconds.
        type: int
        default: 30
        env:
          - name: MY_PLUGIN_TIMEOUT
        ini:
          - section: my_plugin
            key: timeout
        vars:
          - name: my_plugin_timeout

      verify_ssl:
        description: Whether to verify SSL certificates.
        type: bool
        default: true
        env:
          - name: MY_PLUGIN_VERIFY_SSL
        ini:
          - section: my_plugin
            key: verify_ssl

      tags:
        description: List of tags to filter results.
        type: list
        elements: str
        default: []
        vars:
          - name: my_plugin_tags

      headers:
        description: Additional HTTP headers as key-value pairs.
        type: dict
        default: {}
        vars:
          - name: my_plugin_headers

      log_level:
        description: Logging verbosity.
        type: str
        default: info
        choices:
          - debug
          - info
          - warning
          - error
        env:
          - name: MY_PLUGIN_LOG_LEVEL

      cache_dir:
        description: Directory for caching responses.
        type: path
        default: /tmp/my_plugin_cache
        env:
          - name: MY_PLUGIN_CACHE_DIR
"""
```

## Option Type Reference

Here are all the supported option types:

| Type | Python Type | Notes |
|------|-------------|-------|
| `str` | `str` | Basic string |
| `int` | `int` | Integer, auto-converted from string |
| `float` | `float` | Float, auto-converted from string |
| `bool` | `bool` | Accepts true/false, yes/no, 1/0 |
| `list` | `list` | Use `elements` to specify item type |
| `dict` | `dict` | Key-value mapping |
| `path` | `str` | Path with `~` expansion |
| `raw` | varies | No type conversion |

## Loading Options in Your Plugin

Call `set_options()` to load all options, then use `get_option()` to retrieve them:

```python
# For lookup plugins
class LookupModule(LookupBase):
    def run(self, terms, variables=None, **kwargs):
        # Load options from all sources
        self.set_options(var_options=variables, direct=kwargs)

        # Retrieve individual options
        api_url = self.get_option('api_url')
        api_token = self.get_option('api_token')
        timeout = self.get_option('timeout')
        verify_ssl = self.get_option('verify_ssl')
        tags = self.get_option('tags')

        # Use the options
        self._display.vv("Connecting to %s with timeout %d" % (api_url, timeout))
        # ...
```

For callback plugins, options are loaded differently since they do not receive variables:

```python
# For callback plugins
class CallbackModule(CallbackBase):
    def __init__(self, display=None, options=None):
        super(CallbackModule, self).__init__(display=display, options=options)

    def set_options(self, task_keys=None, var_options=None, direct=None):
        super(CallbackModule, self).set_options(
            task_keys=task_keys, var_options=var_options, direct=direct
        )
        # Now options are loaded, access them
        self.webhook_url = self.get_option('webhook_url')
```

For inventory plugins:

```python
# For inventory plugins
class InventoryModule(BaseInventoryPlugin):
    def parse(self, inventory, loader, path, cache=True):
        super(InventoryModule, self).parse(inventory, loader, path, cache)

        # This reads the YAML inventory source file and loads options
        self._read_config_data(path)

        # Now get_option works
        api_url = self.get_option('api_url')
```

## Validating Options

Add validation after loading options:

```python
def _validate_options(self):
    """Validate plugin options after loading."""
    api_url = self.get_option('api_url')
    if not api_url:
        raise AnsibleError("api_url is required but not set")

    if not api_url.startswith('https://'):
        raise AnsibleError(
            "api_url must use HTTPS, got: %s" % api_url
        )

    timeout = self.get_option('timeout')
    if timeout < 1 or timeout > 300:
        raise AnsibleError(
            "timeout must be between 1 and 300, got: %d" % timeout
        )

    log_level = self.get_option('log_level')
    valid_levels = ('debug', 'info', 'warning', 'error')
    if log_level not in valid_levels:
        raise AnsibleError(
            "log_level must be one of %s, got: %s" % (valid_levels, log_level)
        )
```

## Sensitive Options

Use `no_log: true` for options that contain secrets:

```python
DOCUMENTATION = """
    options:
      api_token:
        description: Authentication token
        type: str
        no_log: true
        env:
          - name: MY_PLUGIN_TOKEN
"""
```

This prevents the value from appearing in logs and debug output.

## Configuration via ansible.cfg

Users configure your plugin through `ansible.cfg` using the `ini` entries you defined:

```ini
# ansible.cfg
[my_plugin]
api_url = https://api.example.com
api_token = secret-token-value
timeout = 60
verify_ssl = true
```

## Configuration via Environment Variables

Environment variables work for all option types:

```bash
# Set options via environment
export MY_PLUGIN_API_URL="https://api.example.com"
export MY_PLUGIN_API_TOKEN="secret-token-value"
export MY_PLUGIN_TIMEOUT="60"
export MY_PLUGIN_VERIFY_SSL="true"

# Run the playbook
ansible-playbook site.yml
```

## Configuration via Playbook Variables

When you define `vars` entries, users can set options as Ansible variables:

```yaml
---
- name: Use plugin with variable configuration
  hosts: all
  vars:
    my_plugin_api_url: "https://api.example.com"
    my_plugin_api_token: "{{ vault_api_token }}"
    my_plugin_timeout: 60
    my_plugin_tags:
      - production
      - web

  tasks:
    - name: Look up data
      ansible.builtin.debug:
        msg: "{{ lookup('myorg.myutils.my_plugin', 'servers') }}"
```

## Dynamic Default Values

Sometimes a default value needs to be computed. Handle this in your plugin code:

```python
def run(self, terms, variables=None, **kwargs):
    self.set_options(var_options=variables, direct=kwargs)

    cache_dir = self.get_option('cache_dir')

    # If no custom cache dir, use a sensible default based on the OS
    if not cache_dir:
        import tempfile
        cache_dir = os.path.join(tempfile.gettempdir(), 'my_plugin_cache')

    # Ensure the directory exists
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)
```

## Deprecated Options

When you need to rename or remove an option, mark it as deprecated:

```yaml
options:
  api_endpoint:
    description: The API URL (deprecated, use api_url instead)
    type: str
    deprecated:
      why: Renamed for consistency
      date: '2025-06-01'
      collection_name: myorg.myutils
      alternatives: Use O(api_url) instead
```

## Summary

The Ansible plugin option system is powerful and flexible. Define options in `DOCUMENTATION` with multiple source types (env, ini, vars), use proper type annotations, mark sensitive fields with `no_log`, and validate after loading. This gives users the freedom to configure your plugin however suits their workflow, whether through environment variables in CI/CD, INI settings for permanent configuration, or playbook variables for per-run customization.
