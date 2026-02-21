# How to Add Modules to an Ansible Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Collections, Custom Modules, Python, DevOps

Description: Step-by-step guide to writing and adding custom modules to an Ansible collection with proper documentation, argument specs, and error handling.

---

Modules are the building blocks of Ansible automation. When you write a task in a playbook, you are calling a module. Adding your own modules to a collection lets you extend Ansible to manage resources that the existing modules do not cover, whether that is an internal API, a proprietary system, or a custom workflow.

This post covers the full process of adding a module to an existing collection: where to put the file, how to write the module code, how to handle arguments and errors, and how to document it properly.

## Where Modules Live in a Collection

Modules go in the `plugins/modules/` directory of your collection:

```
my_namespace/my_collection/
  galaxy.yml
  plugins/
    modules/
      my_module.py          # This becomes my_namespace.my_collection.my_module
      another_module.py     # This becomes my_namespace.my_collection.another_module
    module_utils/
      shared_code.py        # Shared helper code for modules
```

The filename (minus the `.py` extension) becomes the module name. So `plugins/modules/app_deploy.py` is referenced in playbooks as `my_namespace.my_collection.app_deploy`.

## Module Skeleton

Every Ansible module follows a consistent pattern. Here is the skeleton you should start with:

```python
#!/usr/bin/python
# plugins/modules/my_module.py
# -*- coding: utf-8 -*-

from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = r"""
---
module: my_module
short_description: One-line description of what the module does
version_added: "1.0.0"
description:
  - Longer description of the module.
  - Can be multiple lines.
options:
  param_one:
    description: What this parameter controls.
    required: true
    type: str
  param_two:
    description: Another parameter.
    required: false
    type: int
    default: 42
author:
  - Your Name (@github_handle)
"""

EXAMPLES = r"""
- name: Basic usage example
  my_namespace.my_collection.my_module:
    param_one: "value"
    param_two: 10
"""

RETURN = r"""
result_key:
  description: What this return value represents.
  type: str
  returned: always
  sample: "some value"
"""

from ansible.module_utils.basic import AnsibleModule


def main():
    module = AnsibleModule(
        argument_spec=dict(
            param_one=dict(type="str", required=True),
            param_two=dict(type="int", default=42),
        ),
        supports_check_mode=True,
    )

    # Your logic here
    result = dict(changed=False, result_key="some value")

    module.exit_json(**result)


if __name__ == "__main__":
    main()
```

The three documentation blocks (`DOCUMENTATION`, `EXAMPLES`, `RETURN`) are not optional. The `ansible-doc` command and the Galaxy documentation site parse these to generate help pages. If you skip them, your module will still work, but nobody will know how to use it.

## A Real-World Module: Managing Application Deployments

Let me build a more realistic module. This one manages application deployments by interacting with an internal deployment API:

```python
#!/usr/bin/python
# plugins/modules/app_deploy.py
# Module for triggering application deployments via the internal API

from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = r"""
---
module: app_deploy
short_description: Deploy an application version via the deployment API
version_added: "1.0.0"
description:
  - Triggers a deployment of the specified application version.
  - Waits for the deployment to complete or times out.
  - Supports check mode to preview what would change.
options:
  app_name:
    description: The name of the application to deploy.
    required: true
    type: str
  version:
    description: The version to deploy (e.g., v1.2.3).
    required: true
    type: str
  environment:
    description: Target deployment environment.
    required: true
    type: str
    choices:
      - staging
      - production
  api_url:
    description: Base URL of the deployment API.
    required: true
    type: str
  api_token:
    description: Authentication token for the API.
    required: true
    type: str
    no_log: true
  wait:
    description: Whether to wait for deployment completion.
    required: false
    type: bool
    default: true
  timeout:
    description: Maximum seconds to wait for deployment.
    required: false
    type: int
    default: 300
author:
  - DevOps Team (@devops)
"""

EXAMPLES = r"""
- name: Deploy app to staging
  my_namespace.my_collection.app_deploy:
    app_name: web-frontend
    version: v2.1.0
    environment: staging
    api_url: https://deploy.internal.com/api
    api_token: "{{ vault_deploy_token }}"

- name: Deploy to production without waiting
  my_namespace.my_collection.app_deploy:
    app_name: web-frontend
    version: v2.1.0
    environment: production
    api_url: https://deploy.internal.com/api
    api_token: "{{ vault_deploy_token }}"
    wait: false

- name: Deploy with extended timeout
  my_namespace.my_collection.app_deploy:
    app_name: backend-api
    version: v3.0.0
    environment: staging
    api_url: https://deploy.internal.com/api
    api_token: "{{ vault_deploy_token }}"
    timeout: 600
"""

RETURN = r"""
deployment_id:
  description: The unique ID of the deployment.
  type: str
  returned: success
  sample: "deploy-abc123"
status:
  description: Final status of the deployment.
  type: str
  returned: success
  sample: "completed"
current_version:
  description: The version running before this deployment.
  type: str
  returned: always
  sample: "v2.0.0"
"""

import json
import time

from ansible.module_utils.basic import AnsibleModule
from ansible.module_utils.urls import open_url


def get_current_version(module, api_url, api_token, app_name, environment):
    """Fetch the currently deployed version of an application."""
    url = f"{api_url}/apps/{app_name}/environments/{environment}"
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }
    try:
        response = open_url(url, headers=headers, method="GET")
        data = json.loads(response.read())
        return data.get("current_version", "unknown")
    except Exception as e:
        module.fail_json(msg=f"Failed to get current version: {str(e)}")


def trigger_deployment(module, api_url, api_token, app_name, version, environment):
    """Send a deployment request to the API."""
    url = f"{api_url}/deployments"
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }
    payload = json.dumps({
        "app_name": app_name,
        "version": version,
        "environment": environment,
    })
    try:
        response = open_url(url, headers=headers, method="POST", data=payload)
        data = json.loads(response.read())
        return data.get("deployment_id")
    except Exception as e:
        module.fail_json(msg=f"Failed to trigger deployment: {str(e)}")


def wait_for_deployment(module, api_url, api_token, deployment_id, timeout):
    """Poll the API until deployment completes or times out."""
    url = f"{api_url}/deployments/{deployment_id}"
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            response = open_url(url, headers=headers, method="GET")
            data = json.loads(response.read())
            status = data.get("status")
            if status == "completed":
                return "completed"
            elif status == "failed":
                module.fail_json(
                    msg=f"Deployment {deployment_id} failed",
                    deployment_id=deployment_id,
                    status="failed",
                )
            time.sleep(10)
        except Exception as e:
            module.fail_json(msg=f"Error checking deployment status: {str(e)}")
    module.fail_json(
        msg=f"Deployment {deployment_id} timed out after {timeout} seconds",
        deployment_id=deployment_id,
        status="timeout",
    )


def main():
    module = AnsibleModule(
        argument_spec=dict(
            app_name=dict(type="str", required=True),
            version=dict(type="str", required=True),
            environment=dict(
                type="str",
                required=True,
                choices=["staging", "production"],
            ),
            api_url=dict(type="str", required=True),
            api_token=dict(type="str", required=True, no_log=True),
            wait=dict(type="bool", default=True),
            timeout=dict(type="int", default=300),
        ),
        supports_check_mode=True,
    )

    app_name = module.params["app_name"]
    version = module.params["version"]
    environment = module.params["environment"]
    api_url = module.params["api_url"]
    api_token = module.params["api_token"]

    # Get current version to determine if change is needed
    current_version = get_current_version(
        module, api_url, api_token, app_name, environment
    )

    # If already at the desired version, no change needed
    if current_version == version:
        module.exit_json(
            changed=False,
            current_version=current_version,
            status="already_deployed",
            msg=f"{app_name} is already at version {version}",
        )

    # In check mode, report what would change without doing it
    if module.check_mode:
        module.exit_json(
            changed=True,
            current_version=current_version,
            msg=f"Would deploy {app_name} from {current_version} to {version}",
        )

    # Trigger the deployment
    deployment_id = trigger_deployment(
        module, api_url, api_token, app_name, version, environment
    )

    # Wait for completion if requested
    status = "triggered"
    if module.params["wait"]:
        status = wait_for_deployment(
            module, api_url, api_token, deployment_id, module.params["timeout"]
        )

    module.exit_json(
        changed=True,
        deployment_id=deployment_id,
        status=status,
        current_version=current_version,
    )


if __name__ == "__main__":
    main()
```

## Key Module Patterns

### Idempotency

Modules should be idempotent. Running the same task twice with the same parameters should not make changes the second time. In the example above, we check the current version before deploying and skip the deployment if the version already matches.

### Check Mode

Support check mode by setting `supports_check_mode=True` and checking `module.check_mode` before making changes. This lets users run playbooks with `--check` to see what would change without actually changing anything.

### no_log for Sensitive Parameters

Mark sensitive parameters with `no_log: true` in both the argument spec and the DOCUMENTATION block. This prevents Ansible from logging the value in output or callback plugin data.

### Error Handling

Use `module.fail_json()` for errors and `module.exit_json()` for success. Always include a helpful `msg` parameter in failure cases so users know what went wrong.

## Using Shared Code with module_utils

When multiple modules need the same helper functions, put them in `plugins/module_utils/`:

```python
# plugins/module_utils/api_client.py
# Shared API client used by multiple modules in this collection

from __future__ import absolute_import, division, print_function
__metaclass__ = type

import json
from ansible.module_utils.urls import open_url


class DeployAPIClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def get(self, path):
        url = f"{self.base_url}{path}"
        response = open_url(url, headers=self.headers, method="GET")
        return json.loads(response.read())

    def post(self, path, data):
        url = f"{self.base_url}{path}"
        payload = json.dumps(data)
        response = open_url(url, headers=self.headers, method="POST", data=payload)
        return json.loads(response.read())
```

Import it in your modules with the full collection path:

```python
# In plugins/modules/app_deploy.py
from ansible_collections.my_namespace.my_collection.plugins.module_utils.api_client import DeployAPIClient
```

## Testing Your Module

Run a quick smoke test with `ansible` directly:

```bash
# Test the module with ad-hoc command
ansible localhost -m my_namespace.my_collection.app_deploy \
  -a "app_name=test version=v1.0.0 environment=staging api_url=https://deploy.internal.com/api api_token=test-token" \
  --check
```

For proper testing, use `ansible-test`:

```bash
# Run sanity tests (checks documentation, imports, etc.)
cd my_namespace/my_collection
ansible-test sanity plugins/modules/app_deploy.py

# Run unit tests
ansible-test units plugins/modules/test_app_deploy.py
```

## Conclusion

Adding modules to an Ansible collection follows a well-defined pattern: put the Python file in `plugins/modules/`, include the three documentation blocks, use `AnsibleModule` for argument parsing, support check mode, and handle errors cleanly. The module becomes available to playbooks via its FQCN as soon as the collection is installed. For shared logic across modules, use `module_utils` to keep your code DRY and maintainable.
