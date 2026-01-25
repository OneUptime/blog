# How to Use Ansible Collections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Collections, Modules, Galaxy, DevOps, Automation

Description: Master Ansible Collections to organize, distribute, and consume reusable automation content including modules, roles, plugins, and playbooks.

---

Ansible Collections are the modern way to package and distribute Ansible content. They bundle related modules, roles, plugins, and playbooks into a single distributable unit. Collections solve the problem of managing dependencies and versioning that plagued the old "everything in ansible-core" approach.

This guide covers installing, using, and creating collections for your automation needs.

## Understanding Collections

Collections provide a namespace for organizing related content:

```
namespace.collection_name
├── docs/                    # Documentation
├── galaxy.yml               # Collection metadata
├── plugins/
│   ├── modules/             # Custom modules
│   ├── inventory/           # Inventory plugins
│   ├── lookup/              # Lookup plugins
│   ├── filter/              # Filter plugins
│   └── callback/            # Callback plugins
├── roles/                   # Roles
├── playbooks/               # Playbooks
└── tests/                   # Tests
```

Common collections you will encounter:
- `ansible.builtin` - Core modules (included with ansible-core)
- `community.general` - Community-maintained general modules
- `community.docker` - Docker management
- `amazon.aws` - AWS modules
- `azure.azcollection` - Azure modules
- `kubernetes.core` - Kubernetes modules

## Installing Collections

Use `ansible-galaxy` to install collections.

```bash
# Install from Ansible Galaxy
ansible-galaxy collection install community.docker
ansible-galaxy collection install amazon.aws

# Install specific version
ansible-galaxy collection install community.docker:3.4.0

# Install multiple collections
ansible-galaxy collection install community.docker community.general kubernetes.core

# Install from a requirements file
ansible-galaxy collection install -r requirements.yml

# Install to a specific path
ansible-galaxy collection install community.docker -p ./collections

# Force reinstall
ansible-galaxy collection install community.docker --force

# List installed collections
ansible-galaxy collection list
```

## Requirements File

Define collection dependencies in a requirements file.

```yaml
# requirements.yml
---
collections:
  # From Ansible Galaxy
  - name: community.docker
    version: ">=3.0.0"

  - name: amazon.aws
    version: "6.5.0"

  - name: kubernetes.core
    version: ">=2.4.0"

  # From Git repository
  - name: https://github.com/company/custom-collection.git
    type: git
    version: main

  # From local tarball
  - name: /path/to/company-custom-1.0.0.tar.gz
    type: file

  # From private Galaxy server
  - name: company.internal
    source: https://galaxy.internal.company.com
```

Install all requirements:

```bash
# Install collections from requirements file
ansible-galaxy collection install -r requirements.yml

# Install with roles in the same file
ansible-galaxy install -r requirements.yml
```

## Using Collections in Playbooks

Reference collection content using fully qualified collection names (FQCN).

```yaml
# playbooks/deploy.yml
---
- name: Deploy application
  hosts: all
  become: yes

  collections:
    - community.docker
    - amazon.aws

  tasks:
    # Using FQCN (recommended)
    - name: Pull Docker image
      community.docker.docker_image:
        name: nginx
        source: pull

    # With collections directive, short names work
    - name: Run container
      docker_container:
        name: web
        image: nginx:latest
        state: started
        ports:
          - "80:80"

    # AWS module
    - name: Get EC2 instance info
      amazon.aws.ec2_instance_info:
        filters:
          instance-state-name: running
      register: ec2_instances
```

## Using Collections in Roles

Reference collection content in role tasks.

```yaml
# roles/webserver/meta/main.yml
---
dependencies: []

collections:
  - community.docker
  - community.general
```

```yaml
# roles/webserver/tasks/main.yml
---
- name: Install Docker
  ansible.builtin.apt:
    name: docker.io
    state: present

- name: Start Nginx container
  community.docker.docker_container:
    name: nginx
    image: nginx:latest
    state: started
```

## Collection Configuration

Configure collection paths in ansible.cfg.

```ini
# ansible.cfg
[defaults]
# Search path for collections
collections_path = ./collections:~/.ansible/collections:/usr/share/ansible/collections

# Default collection for short module names
# (Use FQCNs instead for clarity)
# collections = community.general

[galaxy]
# Custom Galaxy server
server_list = galaxy, private_galaxy

[galaxy_server.galaxy]
url = https://galaxy.ansible.com

[galaxy_server.private_galaxy]
url = https://galaxy.internal.company.com
token = your_api_token
```

## Creating Your Own Collection

Build a custom collection for your organization.

```bash
# Initialize collection structure
ansible-galaxy collection init company.infrastructure

# Structure created:
# company/infrastructure/
# ├── docs/
# ├── galaxy.yml
# ├── plugins/
# │   └── README.md
# ├── README.md
# └── roles/
```

```yaml
# company/infrastructure/galaxy.yml
---
namespace: company
name: infrastructure
version: 1.0.0
readme: README.md

authors:
  - DevOps Team <devops@company.com>

description: Company infrastructure automation collection

license:
  - MIT

tags:
  - infrastructure
  - devops
  - company

dependencies:
  community.general: ">=6.0.0"
  community.docker: ">=3.0.0"

repository: https://github.com/company/ansible-infrastructure
documentation: https://github.com/company/ansible-infrastructure/docs
homepage: https://company.com
issues: https://github.com/company/ansible-infrastructure/issues
```

## Adding Modules to Collections

Create custom modules within your collection.

```python
# plugins/modules/custom_deploy.py
#!/usr/bin/python

DOCUMENTATION = r'''
---
module: custom_deploy
short_description: Deploy application using company standards
description:
  - Deploys applications following company deployment standards
  - Handles rolling updates and health checks
version_added: "1.0.0"
author:
  - DevOps Team (@devops)
options:
  name:
    description: Application name
    required: true
    type: str
  version:
    description: Version to deploy
    required: true
    type: str
  environment:
    description: Target environment
    choices: ['dev', 'staging', 'production']
    default: dev
    type: str
'''

EXAMPLES = r'''
- name: Deploy application
  company.infrastructure.custom_deploy:
    name: myapp
    version: "1.2.0"
    environment: production
'''

RETURN = r'''
deploy_id:
  description: Deployment ID
  type: str
  returned: always
status:
  description: Deployment status
  type: str
  returned: always
'''

from ansible.module_utils.basic import AnsibleModule


def run_module():
    module_args = dict(
        name=dict(type='str', required=True),
        version=dict(type='str', required=True),
        environment=dict(
            type='str',
            default='dev',
            choices=['dev', 'staging', 'production']
        ),
    )

    result = dict(
        changed=False,
        deploy_id='',
        status='',
    )

    module = AnsibleModule(
        argument_spec=module_args,
        supports_check_mode=True
    )

    if module.check_mode:
        module.exit_json(**result)

    # Deployment logic here
    result['changed'] = True
    result['deploy_id'] = f"deploy-{module.params['name']}-{module.params['version']}"
    result['status'] = 'success'

    module.exit_json(**result)


def main():
    run_module()


if __name__ == '__main__':
    main()
```

## Adding Roles to Collections

Include roles within your collection.

```yaml
# roles/webserver/tasks/main.yml
---
- name: Install Nginx
  ansible.builtin.package:
    name: nginx
    state: present

- name: Configure Nginx
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: restart nginx

- name: Start Nginx
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: yes
```

```yaml
# roles/webserver/handlers/main.yml
---
- name: restart nginx
  ansible.builtin.service:
    name: nginx
    state: restarted
```

Use the collection role in playbooks:

```yaml
# playbooks/site.yml
---
- name: Configure web servers
  hosts: webservers
  become: yes

  roles:
    - company.infrastructure.webserver
```

## Adding Plugins to Collections

Create filter, lookup, and callback plugins.

```python
# plugins/filter/custom_filters.py
"""Custom filter plugins for company infrastructure"""


def mask_secret(value, visible_chars=4):
    """Mask a secret value, showing only the last few characters"""
    if len(value) <= visible_chars:
        return '*' * len(value)
    return '*' * (len(value) - visible_chars) + value[-visible_chars:]


def to_environment_vars(dict_value, prefix=''):
    """Convert dictionary to environment variable format"""
    result = {}
    for key, value in dict_value.items():
        env_key = f"{prefix}{key}".upper().replace('-', '_')
        result[env_key] = str(value)
    return result


class FilterModule:
    """Company custom filters"""

    def filters(self):
        return {
            'mask_secret': mask_secret,
            'to_environment_vars': to_environment_vars,
        }
```

Use custom filters:

```yaml
# playbooks/example.yml
---
- name: Use custom filters
  hosts: localhost

  tasks:
    - name: Display masked password
      debug:
        msg: "Password: {{ db_password | company.infrastructure.mask_secret }}"

    - name: Convert to env vars
      debug:
        msg: "{{ app_config | company.infrastructure.to_environment_vars('APP_') }}"
```

## Building and Publishing Collections

Package and distribute your collection.

```bash
# Build collection tarball
cd company/infrastructure
ansible-galaxy collection build

# Output: company-infrastructure-1.0.0.tar.gz

# Publish to Ansible Galaxy
ansible-galaxy collection publish company-infrastructure-1.0.0.tar.gz --api-key YOUR_API_KEY

# Publish to private Galaxy server
ansible-galaxy collection publish company-infrastructure-1.0.0.tar.gz \
  --server private_galaxy \
  --api-key YOUR_PRIVATE_API_KEY
```

## Testing Collections

Test your collection before publishing.

```bash
# Install test dependencies
pip install ansible-lint molecule pytest

# Run ansible-lint on collection
ansible-lint

# Run molecule tests for roles
cd roles/webserver
molecule test

# Run integration tests
ansible-playbook tests/integration/test_playbook.yml -i tests/inventory
```

```yaml
# tests/integration/test_playbook.yml
---
- name: Test collection modules
  hosts: localhost
  gather_facts: no

  tasks:
    - name: Test custom_deploy module
      company.infrastructure.custom_deploy:
        name: testapp
        version: "1.0.0"
        environment: dev
      register: deploy_result

    - name: Verify deployment
      assert:
        that:
          - deploy_result.changed
          - deploy_result.status == 'success'
```

---

Collections are the future of Ansible content distribution. They provide clear namespacing, version management, and dependency resolution that makes automation more maintainable. Start by using community collections for common tasks, then create your own collections to package organization-specific automation. The investment in proper collection structure pays dividends as your automation library grows.
