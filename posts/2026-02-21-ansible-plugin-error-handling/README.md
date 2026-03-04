# How to Handle Plugin Errors Gracefully

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Error Handling, Python, Best Practices

Description: Write robust Ansible plugins with proper error handling using AnsibleError, try/except patterns, and graceful degradation strategies.

---

Error handling in Ansible plugins is different from regular Python applications. A plugin that crashes with an unhandled exception produces confusing tracebacks that make debugging nearly impossible for users. Proper error handling means catching exceptions, wrapping them in Ansible-specific error types, and providing clear messages that help users fix the problem. This guide covers the patterns you need.

## Ansible Error Types

Ansible provides several error classes in `ansible.errors`:

```python
from ansible.errors import (
    AnsibleError,           # General plugin error
    AnsibleParserError,     # Error parsing data (inventory, playbooks)
    AnsibleConnectionFailure,  # Connection-related errors
    AnsibleFilterError,     # Filter plugin errors
    AnsibleLookupError,     # Lookup plugin errors
    AnsibleUndefinedVariable,  # Undefined variable reference
    AnsibleFileNotFound,    # File not found
    AnsibleOptionsError,    # Invalid option/configuration
    AnsibleAuthenticationFailure,  # Auth failures
)
```

Each error type produces different output formatting. Use the most specific one that fits your situation.

## Error Handling in Lookup Plugins

Lookup plugins are the most common type where errors need careful handling:

```python
from ansible.plugins.lookup import LookupBase
from ansible.errors import AnsibleError, AnsibleLookupError
import json


class LookupModule(LookupBase):
    def run(self, terms, variables=None, **kwargs):
        # Validate input early
        if not terms:
            raise AnsibleLookupError("At least one lookup term is required")

        # Load options with error handling
        try:
            self.set_options(var_options=variables, direct=kwargs)
        except Exception as e:
            raise AnsibleOptionsError(
                "Failed to load plugin options: %s" % str(e)
            )

        api_url = self.get_option('api_url')
        if not api_url:
            raise AnsibleLookupError(
                "api_url is required. Set it via the MY_API_URL "
                "environment variable or in ansible.cfg under [my_lookup]"
            )

        results = []
        for term in terms:
            try:
                data = self._fetch(api_url, term)
                results.append(data)
            except ConnectionError as e:
                raise AnsibleLookupError(
                    "Cannot connect to API at %s: %s. "
                    "Check that the API server is running and the URL is correct."
                    % (api_url, str(e))
                )
            except json.JSONDecodeError as e:
                raise AnsibleLookupError(
                    "API returned invalid JSON for term '%s': %s"
                    % (term, str(e))
                )
            except PermissionError:
                raise AnsibleLookupError(
                    "Access denied when looking up '%s'. "
                    "Verify your API token has the required permissions."
                    % term
                )

        return results

    def _fetch(self, api_url, term):
        """Fetch data from the API."""
        from ansible.module_utils.urls import open_url
        url = "%s/api/v1/%s" % (api_url.rstrip('/'), term)
        self._display.vv("Fetching: %s" % url)
        response = open_url(url, headers=self._get_headers())
        return json.loads(response.read())
```

## Error Handling in Filter Plugins

Filter plugins should raise `AnsibleFilterError`:

```python
from ansible.errors import AnsibleFilterError
import ipaddress


class FilterModule:
    def filters(self):
        return {
            'to_netmask': self.to_netmask,
            'parse_config': self.parse_config,
        }

    @staticmethod
    def to_netmask(prefix_length):
        """Convert CIDR prefix to netmask."""
        # Validate input type
        if not isinstance(prefix_length, int):
            raise AnsibleFilterError(
                "to_netmask expects an integer, got %s (%s)"
                % (type(prefix_length).__name__, prefix_length)
            )

        # Validate range
        if prefix_length < 0 or prefix_length > 32:
            raise AnsibleFilterError(
                "CIDR prefix must be between 0 and 32, got %d"
                % prefix_length
            )

        try:
            network = ipaddress.IPv4Network("0.0.0.0/%d" % prefix_length)
            return str(network.netmask)
        except Exception as e:
            raise AnsibleFilterError(
                "Failed to convert prefix %d to netmask: %s"
                % (prefix_length, str(e))
            )

    @staticmethod
    def parse_config(config_text):
        """Parse a configuration file into a dict."""
        if not isinstance(config_text, str):
            raise AnsibleFilterError(
                "parse_config expects a string, got %s"
                % type(config_text).__name__
            )

        if not config_text.strip():
            raise AnsibleFilterError(
                "parse_config received an empty string"
            )

        try:
            result = {}
            for line in config_text.splitlines():
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' not in line:
                    continue
                key, value = line.split('=', 1)
                result[key.strip()] = value.strip()
            return result
        except Exception as e:
            raise AnsibleFilterError(
                "Failed to parse config: %s" % str(e)
            )
```

## Error Handling in Callback Plugins

Callback plugins should never crash Ansible. Wrap everything in try/except:

```python
from ansible.plugins.callback import CallbackBase
import json
import traceback


class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'safe_webhook'

    def __init__(self, display=None, options=None):
        super(CallbackModule, self).__init__(display=display, options=options)
        self._webhook_url = None

    def set_options(self, task_keys=None, var_options=None, direct=None):
        super(CallbackModule, self).set_options(
            task_keys=task_keys, var_options=var_options, direct=direct
        )
        try:
            self._webhook_url = self.get_option('webhook_url')
        except Exception as e:
            self._display.warning(
                "Webhook callback: failed to load options: %s. "
                "Notifications will be disabled." % str(e)
            )

    def v2_playbook_on_stats(self, stats):
        """Send summary to webhook, but never crash."""
        if not self._webhook_url:
            self._display.vv("Webhook URL not configured, skipping notification")
            return

        try:
            payload = self._build_payload(stats)
            self._send_webhook(payload)
        except Exception as e:
            # Log the error but do not let it affect the playbook result
            self._display.warning(
                "Webhook notification failed: %s" % str(e)
            )
            self._display.vvv(
                "Webhook error traceback:\n%s" % traceback.format_exc()
            )

    def _build_payload(self, stats):
        """Build the webhook payload from stats."""
        hosts = sorted(stats.processed.keys())
        summary = {}
        for host in hosts:
            summary[host] = stats.summarize(host)
        return {'playbook_stats': summary}

    def _send_webhook(self, payload):
        """Send data to the webhook URL."""
        from ansible.module_utils.urls import open_url
        open_url(
            self._webhook_url,
            data=json.dumps(payload),
            headers={'Content-Type': 'application/json'},
            method='POST',
            timeout=10,
        )
```

## Retry Logic

For plugins that interact with external services, implement retry logic:

```python
import time
from ansible.errors import AnsibleError


def _fetch_with_retry(self, url, max_retries=3, backoff_factor=2):
    """Fetch URL with exponential backoff retry."""
    from ansible.module_utils.urls import open_url

    last_error = None
    for attempt in range(max_retries):
        try:
            self._display.vv(
                "Attempt %d/%d: fetching %s" % (attempt + 1, max_retries, url)
            )
            response = open_url(url, timeout=30)
            return response.read()
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                wait_time = backoff_factor ** attempt
                self._display.v(
                    "Request failed (%s), retrying in %ds..."
                    % (str(e), wait_time)
                )
                time.sleep(wait_time)

    raise AnsibleError(
        "Failed after %d attempts to fetch %s: %s"
        % (max_retries, url, str(last_error))
    )
```

## Writing Helpful Error Messages

The most important aspect of error handling is the message. Bad error messages waste hours of debugging time. Follow these rules:

```python
# BAD: Vague error message
raise AnsibleError("API error")

# GOOD: Specific error with context and suggested fix
raise AnsibleError(
    "API returned status 403 when fetching secret 'db/password' "
    "from Vault at https://vault.example.com. "
    "Verify that the token in VAULT_TOKEN has read access to the 'db/' path."
)

# BAD: Raw exception passthrough
except Exception as e:
    raise AnsibleError(str(e))

# GOOD: Add context to the original error
except Exception as e:
    raise AnsibleError(
        "Failed to parse inventory from CMDB API (%s): %s. "
        "Check that the API response format matches the expected schema."
        % (api_url, str(e))
    )
```

## Error Handling Pattern Summary

```python
# Standard error handling pattern for any plugin type
class MyPlugin(SomeBase):
    def run(self, *args, **kwargs):
        # 1. Validate configuration
        try:
            self.set_options(...)
        except Exception as e:
            raise AnsibleError("Configuration error: %s" % str(e))

        # 2. Validate required options
        required = self.get_option('required_option')
        if not required:
            raise AnsibleError(
                "required_option is not set. Set it via ..."
            )

        # 3. Do the work with specific exception handling
        try:
            result = self._do_work()
        except ConnectionError as e:
            raise AnsibleError("Connection failed: %s" % str(e))
        except ValueError as e:
            raise AnsibleError("Invalid data: %s" % str(e))
        except Exception as e:
            raise AnsibleError(
                "Unexpected error in my_plugin: %s (%s)"
                % (str(e), type(e).__name__)
            )

        # 4. Validate output
        if not result:
            raise AnsibleError("Plugin returned empty result")

        return result
```

## Summary

Good error handling in Ansible plugins means using the right error types (`AnsibleError`, `AnsibleFilterError`, `AnsibleLookupError`), catching specific exceptions rather than bare `except`, writing error messages that include context and suggest fixes, and never letting callback plugins crash the playbook run. The extra effort you put into error handling directly reduces the time your users spend debugging when things go wrong.
