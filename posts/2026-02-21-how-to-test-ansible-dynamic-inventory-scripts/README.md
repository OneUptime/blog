# How to Test Ansible Dynamic Inventory Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, Dynamic Inventory, Python, DevOps

Description: Step-by-step guide to testing Ansible dynamic inventory scripts, covering unit tests, integration tests, and validation of inventory output format.

---

Dynamic inventory scripts let Ansible discover infrastructure from cloud APIs, CMDBs, or any data source you can query. They output JSON that Ansible consumes to build its host list. When these scripts break, your entire automation pipeline stops working. I have been on call when a dynamic inventory script started returning malformed JSON because someone changed an API endpoint without updating the script. Every playbook in the org started failing at once.

Testing dynamic inventory scripts is not optional. Here is how to do it properly.

## Dynamic Inventory Output Format

Before writing tests, you need to understand the expected output format. Ansible expects one of two things when calling your inventory script:

With `--list`, it expects all groups, hosts, and variables:

```json
{
    "webservers": {
        "hosts": ["web1.example.com", "web2.example.com"],
        "vars": {
            "http_port": 80
        }
    },
    "databases": {
        "hosts": ["db1.example.com"],
        "vars": {
            "db_port": 5432
        }
    },
    "_meta": {
        "hostvars": {
            "web1.example.com": {
                "ansible_host": "10.0.1.10"
            },
            "web2.example.com": {
                "ansible_host": "10.0.1.11"
            },
            "db1.example.com": {
                "ansible_host": "10.0.2.10"
            }
        }
    }
}
```

With `--host <hostname>`, it expects variables for that specific host:

```json
{
    "ansible_host": "10.0.1.10",
    "ansible_user": "deploy"
}
```

## Sample Dynamic Inventory Script

Here is a sample inventory script that queries a hypothetical API:

```python
#!/usr/bin/env python3
# inventory/cloud_inventory.py
# Dynamic inventory script that queries a cloud API for hosts
import json
import sys
import argparse
import requests

API_URL = "https://cmdb.example.com/api/v1"
API_TOKEN = None  # Set via environment variable

def get_api_token():
    """Read API token from environment."""
    import os
    return os.environ.get('CMDB_API_TOKEN', '')

def fetch_hosts(api_url, token):
    """Fetch host list from the CMDB API."""
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{api_url}/hosts', headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()

def build_inventory(hosts_data):
    """Transform API response into Ansible inventory format."""
    inventory = {'_meta': {'hostvars': {}}}

    for host in hosts_data:
        group = host.get('role', 'ungrouped')

        if group not in inventory:
            inventory[group] = {'hosts': [], 'vars': {}}

        inventory[group]['hosts'].append(host['hostname'])
        inventory['_meta']['hostvars'][host['hostname']] = {
            'ansible_host': host['ip_address'],
            'ansible_user': host.get('ssh_user', 'root'),
            'environment': host.get('environment', 'unknown'),
        }

    return inventory

def get_host_vars(hostname, hosts_data):
    """Get variables for a specific host."""
    for host in hosts_data:
        if host['hostname'] == hostname:
            return {
                'ansible_host': host['ip_address'],
                'ansible_user': host.get('ssh_user', 'root'),
            }
    return {}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--list', action='store_true')
    parser.add_argument('--host', type=str)
    args = parser.parse_args()

    token = get_api_token()
    hosts_data = fetch_hosts(API_URL, token)

    if args.list:
        print(json.dumps(build_inventory(hosts_data), indent=2))
    elif args.host:
        print(json.dumps(get_host_vars(args.host, hosts_data), indent=2))

if __name__ == '__main__':
    main()
```

## Testing Approach 1: Unit Tests with Mocked API

The most important tests mock the external API and verify the inventory output format:

```python
# tests/test_cloud_inventory.py
# Unit tests for the cloud inventory script with mocked API calls
import json
import pytest
from unittest.mock import patch, MagicMock
import sys
import os

# Add inventory directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'inventory'))
import cloud_inventory

# Sample API response fixture
SAMPLE_API_RESPONSE = [
    {
        'hostname': 'web1.example.com',
        'ip_address': '10.0.1.10',
        'role': 'webservers',
        'ssh_user': 'deploy',
        'environment': 'production',
    },
    {
        'hostname': 'web2.example.com',
        'ip_address': '10.0.1.11',
        'role': 'webservers',
        'ssh_user': 'deploy',
        'environment': 'production',
    },
    {
        'hostname': 'db1.example.com',
        'ip_address': '10.0.2.10',
        'role': 'databases',
        'ssh_user': 'dbadmin',
        'environment': 'production',
    },
]

class TestBuildInventory:
    """Test the inventory building logic."""

    def test_groups_are_created(self):
        """Verify groups are created from host roles."""
        inventory = cloud_inventory.build_inventory(SAMPLE_API_RESPONSE)
        assert 'webservers' in inventory
        assert 'databases' in inventory

    def test_hosts_assigned_to_groups(self):
        """Verify hosts are placed in correct groups."""
        inventory = cloud_inventory.build_inventory(SAMPLE_API_RESPONSE)
        assert 'web1.example.com' in inventory['webservers']['hosts']
        assert 'web2.example.com' in inventory['webservers']['hosts']
        assert 'db1.example.com' in inventory['databases']['hosts']

    def test_meta_hostvars_populated(self):
        """Verify _meta hostvars contains all hosts."""
        inventory = cloud_inventory.build_inventory(SAMPLE_API_RESPONSE)
        hostvars = inventory['_meta']['hostvars']
        assert 'web1.example.com' in hostvars
        assert hostvars['web1.example.com']['ansible_host'] == '10.0.1.10'

    def test_empty_hosts_returns_valid_inventory(self):
        """Verify empty API response produces valid but empty inventory."""
        inventory = cloud_inventory.build_inventory([])
        assert '_meta' in inventory
        assert 'hostvars' in inventory['_meta']
        assert len(inventory['_meta']['hostvars']) == 0

    def test_missing_role_defaults_to_ungrouped(self):
        """Verify hosts without a role go to 'ungrouped' group."""
        hosts = [{'hostname': 'orphan.example.com', 'ip_address': '10.0.3.1'}]
        inventory = cloud_inventory.build_inventory(hosts)
        assert 'ungrouped' in inventory
        assert 'orphan.example.com' in inventory['ungrouped']['hosts']

class TestGetHostVars:
    """Test individual host variable retrieval."""

    def test_returns_vars_for_known_host(self):
        """Verify variables returned for a valid hostname."""
        vars = cloud_inventory.get_host_vars('web1.example.com', SAMPLE_API_RESPONSE)
        assert vars['ansible_host'] == '10.0.1.10'
        assert vars['ansible_user'] == 'deploy'

    def test_returns_empty_for_unknown_host(self):
        """Verify empty dict returned for unknown hostname."""
        vars = cloud_inventory.get_host_vars('nonexistent.example.com', SAMPLE_API_RESPONSE)
        assert vars == {}

class TestOutputFormat:
    """Verify the output is valid JSON that Ansible can parse."""

    def test_list_output_is_valid_json(self):
        inventory = cloud_inventory.build_inventory(SAMPLE_API_RESPONSE)
        json_str = json.dumps(inventory)
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict)

    def test_inventory_structure_matches_ansible_spec(self):
        """Verify all required fields exist per Ansible inventory spec."""
        inventory = cloud_inventory.build_inventory(SAMPLE_API_RESPONSE)
        # _meta must exist with hostvars
        assert '_meta' in inventory
        assert 'hostvars' in inventory['_meta']
        # Each group must have hosts list
        for key, value in inventory.items():
            if key == '_meta':
                continue
            assert 'hosts' in value, f"Group {key} missing 'hosts' key"
            assert isinstance(value['hosts'], list)
```

## Testing Approach 2: CLI Output Validation

Test the script as Ansible would call it, via command line:

```bash
#!/bin/bash
# tests/test_inventory_cli.sh
# Test the inventory script's CLI interface and JSON output
set -euo pipefail

INVENTORY_SCRIPT="inventory/cloud_inventory.py"

# Test --list flag produces valid JSON
echo "Testing --list output..."
list_output=$(python3 "$INVENTORY_SCRIPT" --list 2>/dev/null)
if echo "$list_output" | python3 -m json.tool > /dev/null 2>&1; then
    echo "  PASS: --list produces valid JSON"
else
    echo "  FAIL: --list output is not valid JSON"
    exit 1
fi

# Verify _meta key exists
if echo "$list_output" | python3 -c "import sys,json; d=json.load(sys.stdin); assert '_meta' in d"; then
    echo "  PASS: _meta key present"
else
    echo "  FAIL: _meta key missing"
    exit 1
fi

# Test --host flag produces valid JSON
echo "Testing --host output..."
host_output=$(python3 "$INVENTORY_SCRIPT" --host web1.example.com 2>/dev/null)
if echo "$host_output" | python3 -m json.tool > /dev/null 2>&1; then
    echo "  PASS: --host produces valid JSON"
else
    echo "  FAIL: --host output is not valid JSON"
    exit 1
fi

echo "All CLI tests passed"
```

## Testing Approach 3: Integration with ansible-inventory

Use Ansible's own inventory parser to validate your script:

```bash
# Use ansible-inventory to parse and validate the dynamic inventory
ansible-inventory -i inventory/cloud_inventory.py --list --output inventory_dump.json

# Verify specific host is reachable via the inventory
ansible -i inventory/cloud_inventory.py web1.example.com -m ping --check
```

## Testing Approach 4: Schema Validation

Validate inventory output against a JSON schema:

```python
# tests/test_inventory_schema.py
# Validate inventory output against JSON schema
import json
import jsonschema
import subprocess

INVENTORY_SCHEMA = {
    "type": "object",
    "required": ["_meta"],
    "properties": {
        "_meta": {
            "type": "object",
            "required": ["hostvars"],
            "properties": {
                "hostvars": {"type": "object"}
            }
        }
    },
    "additionalProperties": {
        "type": "object",
        "properties": {
            "hosts": {"type": "array", "items": {"type": "string"}},
            "vars": {"type": "object"},
            "children": {"type": "array", "items": {"type": "string"}}
        }
    }
}

def test_inventory_matches_schema():
    """Verify inventory output matches Ansible's expected schema."""
    result = subprocess.run(
        ['python3', 'inventory/cloud_inventory.py', '--list'],
        capture_output=True, text=True
    )
    inventory = json.loads(result.stdout)
    jsonschema.validate(inventory, INVENTORY_SCHEMA)
```

## Conclusion

Dynamic inventory scripts sit at the foundation of your Ansible automation. If they produce incorrect output, every playbook built on top of them will fail in unpredictable ways. Unit test the transformation logic with mocked API responses, validate CLI output format, and use `ansible-inventory` for integration testing. Put all three into your CI pipeline and your inventory scripts will stay reliable as your infrastructure grows and changes.
