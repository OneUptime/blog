# How to Version Custom Ansible Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Versioning, Module Development, Semver

Description: Implement version tracking for custom Ansible modules with semantic versioning and deprecation notices.

---

Versioning custom modules helps track changes and manage compatibility.

## Version in Documentation

```python
DOCUMENTATION = r"""
module: my_module
version_added: '1.0.0'
options:
    name:
        description: Resource name.
        type: str
        version_added: '1.0.0'
    new_feature:
        description: New feature added later.
        type: bool
        version_added: '1.2.0'
    old_param:
        description: Deprecated parameter.
        type: str
        deprecated:
            removed_in: '3.0.0'
            why: Use new_param instead.
            alternative: new_param
"""
```

## Collection Version in galaxy.yml

```yaml
namespace: my_namespace
name: my_collection
version: 1.2.0  # Semantic versioning
```

## Deprecation Warnings in Code

```python
def run_module():
    module = AnsibleModule(argument_spec=module_args)

    if module.params.get('old_param'):
        module.deprecate(
            msg='The old_param parameter is deprecated. Use new_param instead.',
            version='3.0.0',
            collection_name='my_namespace.my_collection',
        )
```

## Changelog

Maintain a CHANGELOG.md:

```markdown
## 1.2.0
- Added new_feature parameter to my_module
- Deprecated old_param (will be removed in 3.0.0)

## 1.1.0
- Added check mode support to my_module
- Fixed idempotency bug

## 1.0.0
- Initial release with my_module
```

## Key Takeaways

Use semantic versioning for your collection. Document version_added for every option. Use the deprecated field and module.deprecate() for deprecations. Maintain a changelog for tracking changes.
