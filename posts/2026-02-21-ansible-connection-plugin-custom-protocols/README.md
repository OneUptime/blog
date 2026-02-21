# How to Create a Connection Plugin for Custom Protocols

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Connection, Networking, Python

Description: Write a custom Ansible connection plugin to manage devices that use proprietary protocols or non-standard communication methods.

---

Connection plugins tell Ansible how to communicate with remote hosts. The built-in options cover SSH, WinRM, Docker, and local execution. But if you manage devices that speak a proprietary protocol, communicate over a REST API, or need a custom transport layer, you need a custom connection plugin.

This guide builds a connection plugin that communicates with devices through a REST API. This is a common pattern for network devices, IoT gateways, and appliances that do not support SSH.

## Connection Plugin Interface

Every connection plugin must implement four methods:

1. `_connect()` - Establish the connection
2. `exec_command(cmd)` - Execute a command remotely
3. `put_file(in_path, out_path)` - Upload a file
4. `fetch_file(in_path, out_path)` - Download a file
5. `close()` - Clean up the connection

## The Plugin

Create `plugins/connection/rest_api.py`:

```python
# rest_api.py - Connection plugin for REST API-managed devices
from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = """
    name: rest_api
    short_description: Connect to devices via REST API
    description:
        - Executes commands on remote devices through a REST API endpoint.
        - Suitable for network appliances and IoT devices with HTTP management interfaces.
    author: Your Name
    options:
      host:
        description: Target host address.
        vars:
          - name: ansible_host
      port:
        description: API port number.
        type: int
        default: 443
        vars:
          - name: ansible_port
        ini:
          - section: rest_api_connection
            key: port
      api_path:
        description: Base path for the API (e.g., /api/v1).
        type: str
        default: /api/v1
        vars:
          - name: ansible_rest_api_path
      api_token:
        description: Authentication token.
        type: str
        vars:
          - name: ansible_rest_api_token
        env:
          - name: ANSIBLE_REST_API_TOKEN
      use_ssl:
        description: Use HTTPS for the connection.
        type: bool
        default: true
        vars:
          - name: ansible_rest_use_ssl
      verify_ssl:
        description: Verify SSL certificates.
        type: bool
        default: true
        vars:
          - name: ansible_rest_verify_ssl
"""

import json
import os
import base64
import tempfile

from ansible.errors import AnsibleConnectionFailure, AnsibleError
from ansible.plugins.connection import ConnectionBase
from ansible.module_utils.urls import open_url
from ansible.utils.display import Display

display = Display()


class Connection(ConnectionBase):
    """REST API connection plugin."""

    transport = 'rest_api'
    has_pipelining = False

    def __init__(self, play_context, new_stdin, *args, **kwargs):
        super(Connection, self).__init__(play_context, new_stdin, *args, **kwargs)
        self._connected = False
        self._base_url = None
        self._headers = {}

    def _build_base_url(self):
        """Construct the API base URL from options."""
        host = self.get_option('host')
        port = self.get_option('port')
        api_path = self.get_option('api_path')
        use_ssl = self.get_option('use_ssl')

        protocol = 'https' if use_ssl else 'http'
        return '%s://%s:%d%s' % (protocol, host, port, api_path)

    def _connect(self):
        """Establish the connection (verify API is reachable)."""
        if self._connected:
            return self

        self._base_url = self._build_base_url()
        api_token = self.get_option('api_token')

        self._headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        if api_token:
            self._headers['Authorization'] = 'Bearer %s' % api_token

        display.vv("REST API: connecting to %s" % self._base_url)

        # Verify the API is reachable
        try:
            verify_ssl = self.get_option('verify_ssl')
            response = open_url(
                '%s/status' % self._base_url,
                headers=self._headers,
                validate_certs=verify_ssl,
                timeout=10,
                method='GET',
            )
            status = json.loads(response.read())
            display.vv(
                "REST API: connected, device status: %s"
                % status.get('status', 'unknown')
            )
        except Exception as e:
            raise AnsibleConnectionFailure(
                "Cannot connect to REST API at %s: %s. "
                "Check that the device is reachable and the API is enabled."
                % (self._base_url, str(e))
            )

        self._connected = True
        return self

    def exec_command(self, cmd, in_data=None, sudoable=True):
        """Execute a command on the remote device via the API.

        Returns:
            Tuple of (return_code, stdout, stderr)
        """
        super(Connection, self).exec_command(cmd, in_data=in_data, sudoable=sudoable)

        display.vvv("REST API: executing command: %s" % cmd)

        url = '%s/exec' % self._base_url
        payload = {
            'command': cmd,
        }
        if in_data:
            payload['stdin'] = in_data.decode('utf-8', errors='replace')

        try:
            verify_ssl = self.get_option('verify_ssl')
            response = open_url(
                url,
                data=json.dumps(payload),
                headers=self._headers,
                validate_certs=verify_ssl,
                timeout=60,
                method='POST',
            )
            result = json.loads(response.read())

            rc = result.get('return_code', 0)
            stdout = result.get('stdout', '')
            stderr = result.get('stderr', '')

            display.vvv("REST API: command returned rc=%d" % rc)
            return (rc, stdout.encode('utf-8'), stderr.encode('utf-8'))

        except Exception as e:
            raise AnsibleConnectionFailure(
                "Command execution failed via REST API: %s" % str(e)
            )

    def put_file(self, in_path, out_path):
        """Upload a file to the remote device via the API."""
        super(Connection, self).put_file(in_path, out_path)

        display.vvv("REST API: uploading %s to %s" % (in_path, out_path))

        with open(in_path, 'rb') as f:
            file_data = base64.b64encode(f.read()).decode('utf-8')

        url = '%s/files' % self._base_url
        payload = {
            'path': out_path,
            'content': file_data,
            'encoding': 'base64',
        }

        try:
            verify_ssl = self.get_option('verify_ssl')
            open_url(
                url,
                data=json.dumps(payload),
                headers=self._headers,
                validate_certs=verify_ssl,
                timeout=120,
                method='PUT',
            )
        except Exception as e:
            raise AnsibleError(
                "File upload failed for %s: %s" % (out_path, str(e))
            )

    def fetch_file(self, in_path, out_path):
        """Download a file from the remote device via the API."""
        super(Connection, self).fetch_file(in_path, out_path)

        display.vvv("REST API: downloading %s to %s" % (in_path, out_path))

        url = '%s/files?path=%s' % (self._base_url, in_path)

        try:
            verify_ssl = self.get_option('verify_ssl')
            response = open_url(
                url,
                headers=self._headers,
                validate_certs=verify_ssl,
                timeout=120,
                method='GET',
            )
            result = json.loads(response.read())
            file_data = base64.b64decode(result['content'])

            with open(out_path, 'wb') as f:
                f.write(file_data)
        except Exception as e:
            raise AnsibleError(
                "File download failed for %s: %s" % (in_path, str(e))
            )

    def close(self):
        """Close the connection."""
        if self._connected:
            display.vv("REST API: closing connection to %s" % self._base_url)
            # Optionally call a logout endpoint
            try:
                url = '%s/session' % self._base_url
                verify_ssl = self.get_option('verify_ssl')
                open_url(
                    url,
                    headers=self._headers,
                    validate_certs=verify_ssl,
                    method='DELETE',
                    timeout=5,
                )
            except Exception:
                pass  # Best effort cleanup
            self._connected = False
```

## Using the Connection Plugin

Configure hosts to use the REST API connection:

```yaml
# inventory/hosts.yml
all:
  children:
    appliances:
      hosts:
        firewall-01:
          ansible_host: 10.0.0.1
          ansible_connection: rest_api
          ansible_rest_api_token: "{{ vault_fw_token }}"
          ansible_rest_api_path: /api/v2
          ansible_port: 8443
        switch-01:
          ansible_host: 10.0.0.2
          ansible_connection: rest_api
          ansible_rest_api_token: "{{ vault_sw_token }}"
```

Run commands on the devices:

```yaml
---
- name: Manage network appliances via REST API
  hosts: appliances
  gather_facts: false

  tasks:
    - name: Get device version
      ansible.builtin.raw: show version
      register: version_output

    - name: Display version
      ansible.builtin.debug:
        msg: "{{ version_output.stdout }}"

    - name: Upload configuration
      ansible.builtin.copy:
        src: configs/firewall.conf
        dest: /config/running.conf
```

## Summary

Custom connection plugins let Ansible manage devices that do not support SSH or WinRM. The four methods you must implement (`_connect`, `exec_command`, `put_file`, `fetch_file`) map cleanly to any transport protocol. REST APIs are the most common use case, but the same pattern works for NETCONF, gRPC, serial connections, or proprietary protocols. The connection plugin is transparent to modules, so standard Ansible modules work without modification.
