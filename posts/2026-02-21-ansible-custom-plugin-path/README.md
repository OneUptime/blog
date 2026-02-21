# How to Set Up Ansible with a Custom Plugin Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Configuration, DevOps

Description: Configure custom plugin paths in Ansible for filter, lookup, callback, action, and other plugin types to extend Ansible's functionality.

---

Ansible's plugin system is what makes it so extensible. Filters, lookups, callbacks, actions, inventory sources, and connection plugins can all be customized or replaced. By default, Ansible looks for plugins in a few standard locations, but for real projects, you need control over where plugins are loaded from. This guide covers how to configure custom paths for every plugin type.

## Plugin Types in Ansible

Ansible supports many plugin types, each with its own configuration setting:

| Plugin Type | ansible.cfg Setting | Directory Name |
|---|---|---|
| Action | action_plugins | action_plugins/ |
| Callback | callback_plugins | callback_plugins/ |
| Connection | connection_plugins | connection_plugins/ |
| Filter | filter_plugins | filter_plugins/ |
| Inventory | inventory_plugins | inventory_plugins/ |
| Lookup | lookup_plugins | lookup_plugins/ |
| Module | library | library/ |
| Strategy | strategy_plugins | strategy_plugins/ |
| Test | test_plugins | test_plugins/ |
| Vars | vars_plugins | vars_plugins/ |

## Default Plugin Search Paths

Ansible searches for plugins in these locations by default:

1. Directories adjacent to the playbook being run (e.g., `./filter_plugins/`)
2. Paths configured in ansible.cfg
3. Paths in the corresponding environment variable
4. `~/.ansible/plugins/<type>/`
5. Built-in plugin paths

## Configuring Plugin Paths in ansible.cfg

Here is a comprehensive ansible.cfg with all plugin paths configured:

```ini
# ansible.cfg
[defaults]
# Module path (custom modules)
library = ./library:/opt/shared/ansible/modules

# Filter plugins (custom Jinja2 filters)
filter_plugins = ./filter_plugins:/opt/shared/ansible/filter_plugins

# Lookup plugins (custom data lookups)
lookup_plugins = ./lookup_plugins:/opt/shared/ansible/lookup_plugins

# Callback plugins (custom output/notification handlers)
callback_plugins = ./callback_plugins:/opt/shared/ansible/callback_plugins

# Action plugins (custom task execution logic)
action_plugins = ./action_plugins

# Connection plugins (custom connection methods)
connection_plugins = ./connection_plugins

# Inventory plugins (custom inventory sources)
inventory_plugins = ./inventory_plugins

# Strategy plugins (custom execution strategies)
strategy_plugins = ./strategy_plugins

# Vars plugins (custom variable sources)
vars_plugins = ./vars_plugins

# Test plugins (custom Jinja2 test functions)
test_plugins = ./test_plugins
```

Paths are colon-separated. Ansible searches them in order, and the first match wins.

## Setting Plugin Paths via Environment Variables

Each plugin type has a corresponding environment variable:

```bash
# Set plugin paths via environment variables
export ANSIBLE_FILTER_PLUGINS=./filter_plugins:/opt/shared/ansible/filter_plugins
export ANSIBLE_LOOKUP_PLUGINS=./lookup_plugins
export ANSIBLE_CALLBACK_PLUGINS=./callback_plugins
export ANSIBLE_ACTION_PLUGINS=./action_plugins
export ANSIBLE_CONNECTION_PLUGINS=./connection_plugins
export ANSIBLE_INVENTORY_PLUGINS=./inventory_plugins
export ANSIBLE_STRATEGY_PLUGINS=./strategy_plugins
export ANSIBLE_VARS_PLUGINS=./vars_plugins
export ANSIBLE_LIBRARY=./library
```

Environment variables override the ansible.cfg settings.

## Project Structure with Custom Plugins

Here is a recommended project layout that organizes custom plugins:

```
my-ansible-project/
  ansible.cfg
  inventory/
    hosts.ini
  playbooks/
    deploy.yml
    configure.yml
  roles/
    webserver/
      tasks/
        main.yml
      templates/
        nginx.conf.j2
  filter_plugins/
    network_utils.py
    string_helpers.py
  lookup_plugins/
    vault_kv.py
  callback_plugins/
    deploy_tracker.py
  action_plugins/
    safe_copy.py
  library/
    custom_api.py
  test_plugins/
    network_tests.py
```

## Example: Custom Filter Plugin

Filter plugins are the most commonly created custom plugins. They add Jinja2 filters that you can use in templates and playbooks.

```python
# filter_plugins/network_utils.py

import ipaddress


class FilterModule:
    """Custom network utility filters."""

    def filters(self):
        return {
            'cidr_to_netmask': self.cidr_to_netmask,
            'ip_in_network': self.ip_in_network,
            'next_ip': self.next_ip,
        }

    def cidr_to_netmask(self, cidr):
        """Convert CIDR notation to netmask.
        Example: '24' -> '255.255.255.0'
        """
        network = ipaddress.IPv4Network("0.0.0.0/{}".format(cidr), strict=False)
        return str(network.netmask)

    def ip_in_network(self, ip, network):
        """Check if an IP address is in a given network.
        Example: '192.168.1.50' | ip_in_network('192.168.1.0/24') -> True
        """
        return ipaddress.IPv4Address(ip) in ipaddress.IPv4Network(network, strict=False)

    def next_ip(self, ip_address, offset=1):
        """Get the next IP address.
        Example: '192.168.1.10' | next_ip -> '192.168.1.11'
        """
        ip = ipaddress.IPv4Address(ip_address)
        return str(ip + offset)
```

Use the custom filters in a playbook:

```yaml
# playbooks/network-config.yml
---
- name: Configure network
  hosts: all
  gather_facts: true

  vars:
    subnet_cidr: 24
    network_range: "10.0.1.0/24"
    base_ip: "10.0.1.100"

  tasks:
    - name: Display netmask from CIDR
      ansible.builtin.debug:
        msg: "Netmask for /{{ subnet_cidr }} is {{ subnet_cidr | cidr_to_netmask }}"

    - name: Check if host IP is in our network
      ansible.builtin.debug:
        msg: "{{ ansible_default_ipv4.address }} is in {{ network_range }}: {{ ansible_default_ipv4.address | ip_in_network(network_range) }}"

    - name: Calculate next IP
      ansible.builtin.debug:
        msg: "Next IP after {{ base_ip }} is {{ base_ip | next_ip }}"
```

## Example: Custom Lookup Plugin

Lookup plugins fetch data from external sources.

```python
# lookup_plugins/config_store.py

from ansible.errors import AnsibleError
from ansible.plugins.lookup import LookupBase
import json
import os


class LookupModule(LookupBase):
    """Read values from a JSON config store file."""

    def run(self, terms, variables=None, **kwargs):
        results = []

        config_path = kwargs.get('config_file', '/etc/ansible/config_store.json')

        if not os.path.exists(config_path):
            raise AnsibleError("Config store not found: {}".format(config_path))

        with open(config_path, 'r') as f:
            config = json.load(f)

        for term in terms:
            if term in config:
                results.append(config[term])
            else:
                raise AnsibleError("Key '{}' not found in config store".format(term))

        return results
```

Use it in a playbook:

```yaml
---
- name: Use custom lookup
  hosts: localhost
  connection: local

  tasks:
    - name: Get value from config store
      ansible.builtin.debug:
        msg: "Database host: {{ lookup('config_store', 'database_host', config_file='/opt/config/store.json') }}"
```

## Example: Custom Test Plugin

Test plugins add Jinja2 tests (used with `is` keyword in conditionals).

```python
# test_plugins/network_tests.py

import ipaddress
import re


class TestModule:
    """Custom network test functions."""

    def tests(self):
        return {
            'valid_ipv4': self.is_valid_ipv4,
            'private_ip': self.is_private_ip,
            'valid_hostname': self.is_valid_hostname,
        }

    def is_valid_ipv4(self, value):
        """Test if a string is a valid IPv4 address."""
        try:
            ipaddress.IPv4Address(value)
            return True
        except (ipaddress.AddressValueError, ValueError):
            return False

    def is_private_ip(self, value):
        """Test if an IP address is in a private range."""
        try:
            return ipaddress.IPv4Address(value).is_private
        except (ipaddress.AddressValueError, ValueError):
            return False

    def is_valid_hostname(self, value):
        """Test if a string is a valid hostname."""
        pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
        return bool(re.match(pattern, value)) and len(value) <= 253
```

Use it in a playbook:

```yaml
---
- name: Validate network configuration
  hosts: all
  gather_facts: true

  tasks:
    - name: Verify IP addresses are valid
      ansible.builtin.assert:
        that:
          - ansible_default_ipv4.address is valid_ipv4
          - ansible_default_ipv4.address is private_ip
        fail_msg: "Invalid or public IP detected: {{ ansible_default_ipv4.address }}"
        success_msg: "IP {{ ansible_default_ipv4.address }} is valid and private"
```

## Roles with Custom Plugins

Roles can include their own plugin directories. Ansible automatically looks for them:

```
roles/
  myapp/
    filter_plugins/
      myapp_filters.py
    lookup_plugins/
      myapp_lookup.py
    library/
      myapp_module.py
    tasks/
      main.yml
```

Plugins in a role's directories are only available to that role's tasks, not to the entire playbook.

## Sharing Plugins Across Projects

For organizations with multiple Ansible projects, create a shared plugin repository:

```bash
# Clone the shared plugins repo
git clone git@github.com:company/ansible-shared-plugins.git /opt/shared/ansible-plugins
```

Reference it in each project's ansible.cfg:

```ini
[defaults]
filter_plugins = ./filter_plugins:/opt/shared/ansible-plugins/filter_plugins
lookup_plugins = ./lookup_plugins:/opt/shared/ansible-plugins/lookup_plugins
callback_plugins = ./callback_plugins:/opt/shared/ansible-plugins/callback_plugins
```

For better distribution, package your plugins as an Ansible collection and install them with `ansible-galaxy`.

## Debugging Plugin Loading

If a plugin is not being found, use verbose mode:

```bash
# See where Ansible is searching for plugins
ansible-playbook -vvvv deploy.yml 2>&1 | grep -i "plugin"

# Check the configured plugin paths
ansible-config dump | grep -i plugin
```

## Summary

Custom plugin paths let you extend Ansible with project-specific or shared plugins without modifying the Ansible installation. Configure paths in ansible.cfg using the appropriate setting for each plugin type, or use environment variables for CI/CD flexibility. Filter and test plugins are the most commonly created custom plugins, but lookup, callback, and action plugins are equally straightforward to implement. For cross-project sharing, use a shared directory or package plugins as Ansible collections.
