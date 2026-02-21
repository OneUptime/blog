# How to Handle Module Errors and Exceptions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Error Handling, Module Development, Python

Description: Handle errors properly in custom Ansible modules with fail_json, try/except blocks, and meaningful error messages.

---

Error handling is critical because cryptic error messages make debugging impossible. Good error handling tells the user what went wrong and what to do about it.

## Using fail_json

```python
import traceback

def run_module():
    module = AnsibleModule(argument_spec=module_args)

    try:
        result = create_resource(module.params['name'])
    except ConnectionError as e:
        module.fail_json(
            msg='Failed to connect to API: ' + str(e),
            name=module.params['name'],
        )
    except PermissionError as e:
        module.fail_json(
            msg='Permission denied: ' + str(e) + '. Check API token permissions.',
        )
    except Exception as e:
        module.fail_json(
            msg='Unexpected error: ' + str(e),
            exception=traceback.format_exc(),
        )

    module.exit_json(changed=True, resource=result)
```

## Parameter Validation

```python
def validate_params(module):
    name = module.params['name']
    if len(name) > 64:
        module.fail_json(msg='Name exceeds 64 character limit')
    if not name.replace('-', '').isalnum():
        module.fail_json(msg='Name contains invalid characters')

    port = module.params.get('port', 8080)
    if port < 1 or port > 65535:
        module.fail_json(msg='Port ' + str(port) + ' out of range (1-65535)')
```

## Including Tracebacks

The exception key shows detailed traceback with -vvv verbosity:

```python
try:
    do_something()
except Exception as e:
    module.fail_json(msg=str(e), exception=traceback.format_exc())
```

## Warnings for Non-Fatal Issues

```python
warnings = []
if old_api_version:
    warnings.append('Using deprecated API v1. Upgrade to v2.')

module.exit_json(changed=True, warnings=warnings)
```

## Graceful Degradation

```python
try:
    result = primary_action()
except TimeoutError:
    module.warn('Primary timed out, trying fallback')
    try:
        result = fallback_action()
    except Exception as e:
        module.fail_json(msg='Both primary and fallback failed: ' + str(e))
```

## Key Takeaways

Always wrap operations in try/except. Use fail_json with clear, actionable messages. Include tracebacks for debugging. Validate parameters early. Use warnings for non-fatal issues. Test error paths as thoroughly as the happy path.
