# How to Use Ansible Module Basic Authentication Helpers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Authentication, Module Development, Python

Description: Use built-in authentication helpers in custom modules for HTTP Basic Auth and token-based authentication.

---

Ansible provides URL utilities that handle authentication patterns without external libraries.

## Basic Authentication with open_url

```python
from ansible.module_utils.urls import open_url
import base64

def get_with_basic_auth(url, username, password):
    credentials = base64.b64encode(f'{username}:{password}'.encode()).decode()
    headers = {'Authorization': f'Basic {credentials}'}
    response = open_url(url, headers=headers, method='GET')
    return response.read()
```

## Token Authentication

```python
def get_with_token(url, token):
    headers = {'Authorization': f'Bearer {token}'}
    response = open_url(url, headers=headers, method='GET')
    return response.read()
```

## Using url_argument_spec

```python
from ansible.module_utils.urls import url_argument_spec

# Adds standard URL parameters: url, url_username, url_password,
# validate_certs, force_basic_auth, etc.
module_args = url_argument_spec()
module_args.update(dict(
    name=dict(type='str', required=True),
    state=dict(type='str', default='present'),
))
```

## fetch_url Helper

```python
from ansible.module_utils.urls import fetch_url

def run_module():
    module = AnsibleModule(argument_spec=module_args)

    response, info = fetch_url(
        module,
        module.params['url'],
        method='GET',
        headers={'Accept': 'application/json'},
    )

    if info['status'] != 200:
        module.fail_json(msg=f'Request failed: {info["status"]} {info.get("msg", "")}')

    data = json.loads(response.read())
```

## Key Takeaways

Use fetch_url for authenticated requests in modules since it handles proxy settings, SSL verification, and connection pooling. Use url_argument_spec to add standard URL parameters. Use open_url for simpler cases without the full module integration.
