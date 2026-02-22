# How to Use Ansible Module Utilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Module Utilities, Module Development, Python

Description: Use Ansible module_utils for shared code between custom modules including API helpers and common operations.

---

Module utilities (module_utils) let you share code between multiple custom modules. Instead of duplicating helper functions, put them in a shared utility file.

## Creating a Module Utility

```python
# plugins/module_utils/my_api.py
# Shared API client for custom modules
import json
from ansible.module_utils.urls import open_url

class MyAPIClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        }

    def get(self, path):
        url = f'{self.base_url}{path}'
        response = open_url(url, headers=self.headers, method='GET')
        return json.loads(response.read())

    def create(self, path, data):
        url = f'{self.base_url}{path}'
        response = open_url(
            url, headers=self.headers, method='POST',
            data=json.dumps(data)
        )
        return json.loads(response.read())

    def delete(self, path):
        url = f'{self.base_url}{path}'
        open_url(url, headers=self.headers, method='DELETE')
```

## Using Module Utilities

```python
# plugins/modules/my_resource.py
from ansible.module_utils.basic import AnsibleModule
from ansible_collections.my_ns.my_col.plugins.module_utils.my_api import MyAPIClient

def run_module():
    module = AnsibleModule(
        argument_spec=dict(
            api_url=dict(type='str', required=True),
            api_token=dict(type='str', required=True, no_log=True),
            name=dict(type='str', required=True),
            state=dict(type='str', default='present'),
        ),
    )

    client = MyAPIClient(module.params['api_url'], module.params['api_token'])

    try:
        existing = client.get(f'/resources/{module.params["name"]}')
    except Exception:
        existing = None

    if module.params['state'] == 'present' and existing is None:
        result = client.create('/resources', {'name': module.params['name']})
        module.exit_json(changed=True, resource=result)
    elif module.params['state'] == 'absent' and existing:
        client.delete(f'/resources/{module.params["name"]}')
        module.exit_json(changed=True)
    else:
        module.exit_json(changed=False)
```

## Built-in Module Utilities

Ansible provides several built-in utilities:

- `ansible.module_utils.basic` - AnsibleModule class
- `ansible.module_utils.urls` - HTTP helpers (open_url, fetch_url)
- `ansible.module_utils.common` - Common utilities
- `ansible.module_utils.facts` - Fact gathering helpers

## Key Takeaways

Put shared code in module_utils to avoid duplication. Create API clients, validators, and parsers as reusable utilities. Import them in your modules. This keeps modules focused and DRY.
