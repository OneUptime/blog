# How to Use Ansible Module URL Helpers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, URL, HTTP, Module Development

Description: Use Ansible open_url and fetch_url helpers for HTTP requests in custom modules without external dependencies.

---

Ansible includes HTTP utilities so modules can make web requests without requiring the requests library.

## open_url

The simplest HTTP helper:

```python
from ansible.module_utils.urls import open_url
import json

# GET request
response = open_url('https://api.example.com/resources', method='GET')
data = json.loads(response.read())

# POST request
response = open_url(
    'https://api.example.com/resources',
    method='POST',
    data=json.dumps({'name': 'test'}),
    headers={'Content-Type': 'application/json'},
)

# With SSL verification disabled
response = open_url(url, validate_certs=False)
```

## fetch_url

Integrated with AnsibleModule for proxy and auth support:

```python
from ansible.module_utils.urls import fetch_url

def run_module():
    module = AnsibleModule(argument_spec=module_args)

    response, info = fetch_url(
        module,
        'https://api.example.com/resources',
        method='GET',
        headers={'Authorization': 'Bearer ' + token},
    )

    if info['status'] == -1:
        module.fail_json(msg='Connection failed: ' + info['msg'])
    elif info['status'] != 200:
        module.fail_json(msg='HTTP ' + str(info['status']))

    body = json.loads(response.read())
```

## Error Handling

```python
try:
    response = open_url(url, method='GET')
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    module.fail_json(msg=f'HTTP {e.code}: {error_body}')
except urllib.error.URLError as e:
    module.fail_json(msg=f'Connection error: {e.reason}')
```

## Key Takeaways

Use open_url for simple HTTP requests. Use fetch_url when you need AnsibleModule integration for proxy and auth settings. Both work without external dependencies. Handle HTTP and connection errors explicitly.
