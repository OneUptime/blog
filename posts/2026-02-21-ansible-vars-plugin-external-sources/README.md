# How to Create a Vars Plugin for External Variable Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Variables, Configuration Management, Python

Description: Build a custom Ansible vars plugin that loads variables from external sources like Consul, etcd, or any key-value store automatically.

---

Vars plugins inject variables into your Ansible runs from external sources. Unlike lookup plugins (which you call explicitly), vars plugins run automatically during inventory loading and variable resolution. This makes them perfect for pulling configuration from systems like Consul, etcd, AWS SSM Parameter Store, or any key-value store without changing your playbooks.

## How Vars Plugins Work

Ansible calls vars plugins at two points:

1. **get_host_vars(host)** - Called for each host in the inventory to load host-specific variables
2. **get_group_vars(group)** - Called for each group to load group-specific variables

The plugin returns a dictionary that gets merged into the host or group variables.

## Building a Consul Vars Plugin

This plugin pulls variables from Consul's KV store based on the host name and group membership.

Create `plugins/vars/consul_vars.py`:

```python
# consul_vars.py - Vars plugin that loads variables from Consul KV
from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = """
    name: consul_vars
    short_description: Load variables from Consul KV store
    description:
        - Automatically loads host and group variables from Consul KV.
        - Looks up keys under ansible/hostvars/<hostname>/ and ansible/groupvars/<group>/.
    options:
      consul_url:
        description: Consul HTTP API URL.
        type: str
        default: http://localhost:8500
        env:
          - name: CONSUL_HTTP_ADDR
        ini:
          - section: consul_vars
            key: url
      consul_token:
        description: Consul ACL token.
        type: str
        env:
          - name: CONSUL_HTTP_TOKEN
        ini:
          - section: consul_vars
            key: token
      kv_prefix:
        description: Prefix for Ansible variables in Consul KV.
        type: str
        default: ansible
        env:
          - name: CONSUL_ANSIBLE_PREFIX
        ini:
          - section: consul_vars
            key: prefix
      stage:
        description: Stage for vars plugin execution (inventory or task).
        type: str
        default: inventory
        choices:
          - inventory
          - task
        ini:
          - section: consul_vars
            key: stage
"""

import json
from ansible.plugins.vars import BaseVarsPlugin
from ansible.utils.display import Display
from ansible.inventory.host import Host
from ansible.inventory.group import Group

display = Display()


class VarsModule(BaseVarsPlugin):
    """Load variables from Consul KV store."""

    REQUIRES_ENABLED = True

    def get_vars(self, loader, path, entities, cache=True):
        """Load variables for the given entities (hosts or groups)."""
        super(VarsModule, self).get_vars(loader, path, entities)

        data = {}
        for entity in entities:
            if isinstance(entity, Host):
                # Load host-specific variables
                host_vars = self._fetch_vars('hostvars', entity.name)
                data.update(host_vars)
            elif isinstance(entity, Group):
                # Load group-specific variables
                group_vars = self._fetch_vars('groupvars', entity.name)
                data.update(group_vars)

        return data

    def _fetch_vars(self, var_type, name):
        """Fetch variables from Consul for a host or group."""
        consul_url = self.get_option('consul_url')
        consul_token = self.get_option('consul_token')
        prefix = self.get_option('kv_prefix')

        # Build the Consul KV path
        # e.g., ansible/hostvars/webserver01/ or ansible/groupvars/webservers/
        kv_path = '%s/%s/%s' % (prefix, var_type, name)

        display.vvv("consul_vars: fetching %s from %s" % (kv_path, consul_url))

        url = '%s/v1/kv/%s?recurse=true' % (consul_url.rstrip('/'), kv_path)

        headers = {'Accept': 'application/json'}
        if consul_token:
            headers['X-Consul-Token'] = consul_token

        try:
            from ansible.module_utils.urls import open_url
            response = open_url(
                url,
                headers=headers,
                timeout=5,
                method='GET',
            )
            entries = json.loads(response.read())
        except Exception as e:
            # Return empty dict if the path does not exist or Consul is unreachable
            error_msg = str(e)
            if '404' in error_msg:
                display.vvv("consul_vars: no data at %s" % kv_path)
            else:
                display.warning(
                    "consul_vars: failed to fetch %s: %s" % (kv_path, error_msg)
                )
            return {}

        if not entries:
            return {}

        # Parse the KV entries into a dictionary
        variables = {}
        import base64
        for entry in entries:
            key = entry['Key']
            value = entry.get('Value')

            if value is None:
                continue

            # Decode the base64-encoded value
            decoded = base64.b64decode(value).decode('utf-8')

            # Extract the variable name from the key path
            # e.g., ansible/hostvars/web01/db_host -> db_host
            var_name = key.replace(kv_path + '/', '', 1)

            # Skip directory markers
            if not var_name:
                continue

            # Replace slashes with underscores for nested keys
            var_name = var_name.replace('/', '_')

            # Try to parse as JSON, fall back to string
            try:
                variables[var_name] = json.loads(decoded)
            except (json.JSONDecodeError, ValueError):
                variables[var_name] = decoded

        display.vv(
            "consul_vars: loaded %d variables for %s '%s'"
            % (len(variables), var_type, name)
        )
        return variables
```

## Setting Up Consul KV Data

Store your Ansible variables in Consul:

```bash
# Store host-specific variables
consul kv put ansible/hostvars/web01/db_host "db.internal.myorg.com"
consul kv put ansible/hostvars/web01/db_port "5432"
consul kv put ansible/hostvars/web01/app_workers "8"

# Store group variables
consul kv put ansible/groupvars/webservers/http_port "80"
consul kv put ansible/groupvars/webservers/https_port "443"

# Store structured data as JSON
consul kv put ansible/groupvars/webservers/nginx_config '{"worker_processes": 4, "worker_connections": 1024}'
```

## Enabling the Plugin

Configure `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
vars_plugins_enabled = host_group_vars,consul_vars

[consul_vars]
url = http://consul.internal.myorg.com:8500
prefix = ansible
stage = inventory
```

## Using the Variables in Playbooks

The variables from Consul are available automatically, just like regular host_vars and group_vars:

```yaml
---
# deploy.yml - Variables are loaded automatically from Consul
- name: Deploy web application
  hosts: webservers
  become: true

  tasks:
    - name: Show loaded variables
      ansible.builtin.debug:
        msg: >
          DB Host: {{ db_host }},
          HTTP Port: {{ http_port }},
          Workers: {{ app_workers | default(4) }}

    - name: Configure application
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
      notify: restart app

    - name: Configure nginx
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      vars:
        worker_procs: "{{ nginx_config.worker_processes }}"
```

## AWS SSM Parameter Store Variant

Here is the same pattern for AWS Systems Manager Parameter Store:

```python
# ssm_vars.py - Vars plugin for AWS SSM Parameter Store
import json
import boto3
from ansible.plugins.vars import BaseVarsPlugin
from ansible.utils.display import Display

display = Display()


class VarsModule(BaseVarsPlugin):
    """Load variables from AWS SSM Parameter Store."""

    REQUIRES_ENABLED = True

    def get_vars(self, loader, path, entities, cache=True):
        super(VarsModule, self).get_vars(loader, path, entities)

        data = {}
        ssm = boto3.client('ssm')

        for entity in entities:
            if isinstance(entity, Host):
                prefix = '/ansible/hosts/%s/' % entity.name
            elif isinstance(entity, Group):
                prefix = '/ansible/groups/%s/' % entity.name
            else:
                continue

            try:
                paginator = ssm.get_paginator('get_parameters_by_path')
                for page in paginator.paginate(
                    Path=prefix,
                    Recursive=True,
                    WithDecryption=True,
                ):
                    for param in page['Parameters']:
                        var_name = param['Name'].replace(prefix, '').replace('/', '_')
                        value = param['Value']
                        try:
                            data[var_name] = json.loads(value)
                        except (json.JSONDecodeError, ValueError):
                            data[var_name] = value
            except Exception as e:
                display.warning("ssm_vars: %s" % str(e))

        return data
```

## Caching Considerations

Vars plugins run for every host in your inventory. For large inventories, this means many API calls. Implement caching to reduce the load:

```python
_cache = {}

def _fetch_vars(self, var_type, name):
    cache_key = '%s/%s' % (var_type, name)
    if cache_key in self._cache:
        return self._cache[cache_key]

    result = self._do_fetch(var_type, name)
    self._cache[cache_key] = result
    return result
```

## Summary

Vars plugins automatically inject variables from external sources without any changes to your playbooks. They run during inventory processing and feed data into the normal variable resolution system. This makes them ideal for pulling configuration from key-value stores like Consul, etcd, or AWS SSM Parameter Store. The plugin pattern is simple: implement `get_vars()`, distinguish between hosts and groups, and return a dictionary. Add caching for production use with large inventories.
