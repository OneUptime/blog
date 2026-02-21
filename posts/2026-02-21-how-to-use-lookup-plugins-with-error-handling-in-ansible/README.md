# How to Use Lookup Plugins with Error Handling in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Error Handling, Playbook Development

Description: Learn how to handle errors gracefully in Ansible lookup plugins using the errors parameter, default values, and try-rescue blocks.

---

Lookup plugins in Ansible can fail for many reasons: a file does not exist, an API is unreachable, a credential store is locked, or a key is missing. By default, any lookup failure stops your entire playbook dead in its tracks. That is rarely the behavior you want in production automation. You need strategies to handle these failures gracefully without sacrificing visibility into what went wrong.

## The Default Behavior: Fatal Errors

When a lookup plugin fails, Ansible raises an `AnsibleError` and halts execution. This is the safest default because it prevents your playbook from proceeding with missing or incorrect data.

```yaml
# Default behavior: lookup failure stops the playbook
- hosts: localhost
  gather_facts: false
  tasks:
    - name: This task will FAIL and stop the playbook
      debug:
        msg: "{{ lookup('file', '/nonexistent/path/config.yml') }}"
      # FATAL: "could not locate file in lookup: /nonexistent/path/config.yml"
```

## The errors Parameter

Ansible lookup plugins accept an `errors` parameter that controls what happens when the lookup fails. There are three valid values:

- `strict` (default): Raise a fatal error and stop execution
- `warn`: Print a warning message and return an empty value
- `ignore`: Silently return an empty value

```yaml
# Using the errors parameter to control failure behavior
- hosts: localhost
  gather_facts: false
  tasks:
    # Strict mode (default): fails the playbook
    - name: Strict error handling
      debug:
        msg: "{{ lookup('file', '/missing/file', errors='strict') }}"
      # Raises fatal error

    # Warn mode: prints warning, continues with empty string
    - name: Warning error handling
      debug:
        msg: "Config: {{ lookup('file', '/missing/file', errors='warn') }}"
      # Prints warning, msg shows "Config: "

    # Ignore mode: silently returns empty, continues
    - name: Ignore error handling
      debug:
        msg: "Config: {{ lookup('file', '/missing/file', errors='ignore') }}"
      # No warning, msg shows "Config: "
```

## Combining errors with Default Values

The `errors` parameter by itself just gives you an empty value. To provide meaningful fallback data, combine it with the Jinja2 `default` filter.

```yaml
# Using errors='ignore' with default filter for fallback values
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Load config with fallback
      set_fact:
        db_host: "{{ lookup('file', 'config/db_host.txt', errors='ignore') | default('localhost', true) }}"
        db_port: "{{ lookup('file', 'config/db_port.txt', errors='ignore') | default('5432', true) }}"
        db_name: "{{ lookup('file', 'config/db_name.txt', errors='ignore') | default('myapp', true) }}"

    - name: Show resolved configuration
      debug:
        msg: "Database: {{ db_host }}:{{ db_port }}/{{ db_name }}"
```

The second argument to `default()` is the `boolean` parameter. Setting it to `true` means the default kicks in for any falsy value (empty string, None, false, 0), not just undefined variables. This is important because a failed lookup with `errors='ignore'` returns an empty string, which is defined but falsy.

## Error Handling with query()

The `query()` function supports the same `errors` parameter. The difference is that `query()` returns an empty list on failure instead of an empty string.

```yaml
# Error handling with query function
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Query with error handling
      set_fact:
        config_files: "{{ query('fileglob', '/nonexistent/path/*.yml', errors='warn') }}"

    - name: Check if any files were found
      debug:
        msg: "Found {{ config_files | length }} config files"
      # Found 0 config files

    - name: Process files only if they exist
      include_tasks: process_config.yml
      loop: "{{ config_files }}"
      when: config_files | length > 0
```

## Using block/rescue for Lookup Error Recovery

For more complex error handling scenarios, wrap your lookup tasks in a `block/rescue` structure. This gives you full control over what happens when a lookup fails.

```yaml
# Using block/rescue for complex error recovery
- hosts: webservers
  tasks:
    - name: Attempt to load secrets from vault
      block:
        - name: Fetch database credentials from vault
          set_fact:
            db_credentials:
              username: "{{ lookup('hashi_vault', 'secret/data/db:username') }}"
              password: "{{ lookup('hashi_vault', 'secret/data/db:password') }}"

        - name: Configure database connection
          template:
            src: db_config.j2
            dest: /etc/app/db.conf
          notify: restart app

      rescue:
        - name: Log the vault failure
          debug:
            msg: "WARNING - Vault lookup failed, falling back to local credentials"

        - name: Load credentials from local encrypted file
          set_fact:
            db_credentials:
              username: "{{ lookup('file', 'credentials/db_user.txt') }}"
              password: "{{ lookup('file', 'credentials/db_pass.txt') }}"

        - name: Configure database with fallback credentials
          template:
            src: db_config.j2
            dest: /etc/app/db.conf
          notify: restart app

      always:
        - name: Verify config file exists
          stat:
            path: /etc/app/db.conf
          register: db_conf_check

        - name: Fail if no config was written
          fail:
            msg: "Database configuration was not created by either primary or fallback method"
          when: not db_conf_check.stat.exists
```

## Validating Lookup Results

Sometimes a lookup succeeds but returns unexpected data. You should validate the results before using them.

```yaml
# Validating lookup results before use
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Read configuration file
      set_fact:
        raw_config: "{{ lookup('file', 'app_config.json', errors='warn') }}"

    - name: Validate JSON format
      block:
        - name: Parse JSON
          set_fact:
            app_config: "{{ raw_config | from_json }}"
      rescue:
        - name: Handle invalid JSON
          set_fact:
            app_config:
              port: 8080
              workers: 4
              debug: false
          when: raw_config | length > 0

        - name: Handle missing file
          set_fact:
            app_config:
              port: 8080
              workers: 4
              debug: false
          when: raw_config | length == 0

    - name: Validate required keys exist
      assert:
        that:
          - "'port' in app_config"
          - "'workers' in app_config"
          - "app_config.port | int > 0"
          - "app_config.workers | int > 0"
        fail_msg: "Configuration is missing required keys or has invalid values"
```

## Pattern: Cascading Lookups with Fallbacks

A useful pattern is trying multiple lookup sources in order of priority, falling through to the next source if one fails.

```yaml
# Cascading lookups: try multiple sources in priority order
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Resolve API endpoint from multiple sources
      set_fact:
        api_endpoint: >-
          {{
            lookup('env', 'API_ENDPOINT', errors='ignore') |
            default(
              lookup('file', '/etc/app/api_endpoint', errors='ignore'),
              true
            ) |
            default(
              lookup('file', 'defaults/api_endpoint', errors='ignore'),
              true
            ) |
            default('http://localhost:8080', true)
          }}

    - name: Show resolved endpoint
      debug:
        msg: "Using API endpoint: {{ api_endpoint }}"
```

This tries, in order:
1. The `API_ENDPOINT` environment variable
2. A system-level config file at `/etc/app/api_endpoint`
3. A project-level default file at `defaults/api_endpoint`
4. A hardcoded default value

## Handling Timeouts in Network Lookups

Some lookups reach out to network services that may be slow or unreachable. While Ansible does not have a built-in timeout parameter for all lookups, you can use the `pipe` lookup with `timeout` for command-based lookups.

```yaml
# Handling network lookup timeouts
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Fetch config from HTTP endpoint with timeout
      set_fact:
        remote_config: "{{ lookup('url', 'https://config.internal/api/v1/settings', errors='warn', timeout=5) }}"
      register: config_result
      ignore_errors: true

    - name: Use fallback if remote config unavailable
      set_fact:
        remote_config: "{{ lookup('file', 'fallback_config.json') }}"
      when: remote_config | default('', true) | length == 0
```

## Logging Lookup Failures

In production, you want to know when fallbacks are being used. Here is a pattern for logging lookup failures.

```yaml
# Logging lookup failures for observability
- hosts: localhost
  gather_facts: false
  vars:
    lookup_warnings: []

  tasks:
    - name: Attempt vault lookup
      set_fact:
        secret_value: "{{ lookup('env', 'APP_SECRET', errors='ignore') }}"

    - name: Track if vault lookup failed
      set_fact:
        lookup_warnings: "{{ lookup_warnings + ['APP_SECRET not found in environment, using default'] }}"
      when: secret_value | default('', true) | length == 0

    - name: Set default if needed
      set_fact:
        secret_value: "change-me-in-production"
      when: secret_value | default('', true) | length == 0

    - name: Report all lookup warnings at the end
      debug:
        msg: "{{ item }}"
      loop: "{{ lookup_warnings }}"
      when: lookup_warnings | length > 0
```

## Writing Error-Tolerant Custom Lookup Plugins

If you are building custom lookup plugins, handle errors properly inside the plugin itself:

```python
# lookup_plugins/safe_api_lookup.py
# A custom lookup plugin with built-in error handling and retry logic

from ansible.errors import AnsibleError
from ansible.plugins.lookup import LookupBase
from ansible.utils.display import Display
import json
import time

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

display = Display()

class LookupModule(LookupBase):

    def run(self, terms, variables=None, **kwargs):
        if not HAS_REQUESTS:
            raise AnsibleError("The 'requests' library is required for this lookup plugin")

        max_retries = kwargs.get('retries', 3)
        timeout = kwargs.get('timeout', 10)
        results = []

        for term in terms:
            value = self._fetch_with_retry(term, max_retries, timeout)
            results.append(value)

        return results

    def _fetch_with_retry(self, url, max_retries, timeout):
        last_error = None
        for attempt in range(max_retries):
            try:
                display.vvv("Attempt {} to fetch {}".format(attempt + 1, url))
                response = requests.get(url, timeout=timeout)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    display.warning(
                        "Lookup failed (attempt {}), retrying in {}s: {}".format(
                            attempt + 1, wait_time, str(e)
                        )
                    )
                    time.sleep(wait_time)

        raise AnsibleError("All {} retries failed for {}: {}".format(
            max_retries, url, str(last_error)
        ))
```

## Summary

Error handling in Ansible lookup plugins is about building resilient automation that does not crumble when external dependencies are unavailable. Use the `errors` parameter for simple cases, the `default` filter for fallback values, `block/rescue` for complex recovery workflows, and cascading lookups for multi-source configuration resolution. Always validate lookup results before using them, and log fallback usage so you know when your primary data sources are failing. These patterns will make your playbooks production-ready and reliable under real-world conditions.
