# How to Test Custom Ansible Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, Module Development, pytest

Description: Test custom Ansible modules with unit tests, integration tests, and ansible-test for reliable automation.

---

Testing ensures modules work correctly before production use.

## Unit Tests

```python
# tests/unit/test_my_module.py
import pytest
from unittest.mock import patch, MagicMock

def test_create_resource():
    from plugins.modules.my_module import run_module
    # Mock AnsibleModule
    with patch('plugins.modules.my_module.AnsibleModule') as mock_cls:
        mock_module = MagicMock()
        mock_module.params = {'name': 'test', 'state': 'present'}
        mock_module.check_mode = False
        mock_cls.return_value = mock_module
        run_module()
        mock_module.exit_json.assert_called_once()
        args = mock_module.exit_json.call_args
        assert args[1]['changed'] == True

def test_idempotency():
    # When resource already exists with same config
    # changed should be False
    pass
```

## Running Tests

```bash
pytest tests/unit/ -v
ansible-test units --python 3.11
```

## Integration Tests

```yaml
# tests/integration/targets/my_module/tasks/main.yml
- name: Create resource
  my_module:
    name: test
    state: present
  register: create

- name: Verify creation
  ansible.builtin.assert:
    that: create.changed

- name: Create again (idempotency)
  my_module:
    name: test
    state: present
  register: idem

- name: Verify idempotency
  ansible.builtin.assert:
    that: not idem.changed

- name: Delete
  my_module:
    name: test
    state: absent
  register: delete

- name: Verify deletion
  ansible.builtin.assert:
    that: delete.changed
```

## Sanity Tests

```bash
ansible-test sanity --test validate-modules
ansible-test sanity --test pep8
```

## Key Takeaways

Test at multiple levels: unit tests for logic, integration tests for behavior, sanity tests for quality. Always test check mode, error paths, and idempotency. Use ansible-test for standardized testing.
