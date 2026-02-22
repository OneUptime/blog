# How to Debug Custom Ansible Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Module Development, Python

Description: Debug custom Ansible modules using logging, direct execution, ANSIBLE_KEEP_REMOTE_FILES, and the debugger.

---

Debugging custom modules requires different techniques than debugging regular Python code because modules run on remote hosts via SSH.

## Direct Execution

Test modules locally without Ansible:

```bash
# Create args file
echo '{"ANSIBLE_MODULE_ARGS": {"name": "test", "state": "present"}}' > /tmp/args.json

# Run directly
python3 library/my_module.py /tmp/args.json
```

## Keep Remote Files

Tell Ansible to keep the module on the remote host:

```bash
ANSIBLE_KEEP_REMOTE_FILES=1 ansible-playbook test.yml -v
```

Then SSH to the remote host and find the module in ~/.ansible/tmp/.

## Adding Debug Logging

```python
import logging

def run_module():
    module = AnsibleModule(argument_spec=module_args)

    # Log to file for debugging
    logging.basicConfig(filename='/tmp/my_module_debug.log', level=logging.DEBUG)
    logging.debug(f'Module params: {module.params}')

    # Also use module's built-in logging
    module.log('Starting module execution')
    module.warn('This is a warning')
```

## Using the q Library

```python
try:
    import q
    q(module.params)
except ImportError:
    pass
```

## Ansible Debugger Strategy

```yaml
- name: Debug module
  hosts: localhost
  strategy: debug
  tasks:
    - name: Test my module
      my_module:
        name: test
```

When a task fails, Ansible drops into an interactive debugger.

## Key Takeaways

Test modules directly with a JSON args file first. Use ANSIBLE_KEEP_REMOTE_FILES to inspect what runs on remote hosts. Add logging for complex debugging. Use the debug strategy for interactive troubleshooting.
