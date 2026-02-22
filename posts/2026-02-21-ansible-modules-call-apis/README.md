# How to Create Ansible Modules that Call APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, API, Module Development, REST

Description: Build custom Ansible modules that interact with REST APIs for managing external services and cloud resources.

---

Many custom modules interact with REST APIs to manage external services. Ansible provides built-in URL helpers that work without installing requests or other libraries.

## Using open_url

```python
#!/usr/bin/python
from ansible.module_utils.basic import AnsibleModule
from ansible.module_utils.urls import open_url
import json

def run_module():
    module = AnsibleModule(
        argument_spec=dict(
            api_url=dict(type='str', required=True),
            api_token=dict(type='str', required=True, no_log=True),
            name=dict(type='str', required=True),
            state=dict(type='str', default='present', choices=['present', 'absent']),
            config=dict(type='dict', default={}),
        ),
        supports_check_mode=True,
    )

    headers = {
        'Authorization': 'Bearer ' + module.params['api_token'],
        'Content-Type': 'application/json',
    }
    base_url = module.params['api_url']
    name = module.params['name']

    # Check if resource exists
    try:
        resp = open_url(
            base_url + '/resources/' + name,
            headers=headers,
            method='GET',
        )
        current = json.loads(resp.read())
    except Exception:
        current = None

    if module.params['state'] == 'present':
        if current is None:
            if module.check_mode:
                module.exit_json(changed=True)
            resp = open_url(
                base_url + '/resources',
                headers=headers,
                method='POST',
                data=json.dumps({'name': name, 'config': module.params['config']}),
            )
            result = json.loads(resp.read())
            module.exit_json(changed=True, resource=result)
        else:
            module.exit_json(changed=False, resource=current)

    elif module.params['state'] == 'absent':
        if current is not None:
            if module.check_mode:
                module.exit_json(changed=True)
            open_url(
                base_url + '/resources/' + name,
                headers=headers,
                method='DELETE',
            )
            module.exit_json(changed=True)
        else:
            module.exit_json(changed=False)

def main():
    run_module()

if __name__ == '__main__':
    main()
```

## Error Handling for APIs

```python
try:
    resp = open_url(url, headers=headers, method='POST', data=payload)
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8')
    module.fail_json(msg=f'API returned {e.code}: {body}')
except urllib.error.URLError as e:
    module.fail_json(msg=f'Connection failed: {e.reason}')
```

## Key Takeaways

Use open_url from ansible.module_utils.urls for HTTP requests. Handle HTTP errors with specific error messages. Always support check mode by checking before creating. Check for existing resources before creating to maintain idempotency.
