# How to Use Ansible Module no_log Parameter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, Module Development, no_log

Description: Protect sensitive data in custom Ansible modules using the no_log parameter to prevent secrets in logs.

---

The no_log parameter prevents sensitive values from appearing in Ansible output and log files.

## Parameter-Level no_log

```python
module_args = dict(
    username=dict(type='str', required=True),
    password=dict(type='str', required=True, no_log=True),
    api_token=dict(type='str', no_log=True),
    connection_string=dict(type='str', no_log=True),
)
```

With no_log=True, the value is replaced with 'VALUE_SPECIFIED_IN_NO_LOG_PARAMETER' in output.

## Task-Level no_log

```yaml
- name: Create user
  my_module:
    username: admin
    password: secret123
  no_log: true  # Hides entire task output
```

## Protecting Return Values

Do not return sensitive data in exit_json:

```python
# BAD: Exposes password in output
module.exit_json(changed=True, connection_string=conn_str)

# GOOD: Only return safe information
module.exit_json(changed=True, msg='Connection configured')
```

## Handling Secrets in Module Logic

```python
# When building connection strings internally
conn_str = f'postgresql://{user}:{password}@{host}/{db}'
# Never log this!
# module.warn(conn_str)  # NEVER DO THIS

# Safe to log non-sensitive parts
module.log(f'Connecting to {host}/{db} as {user}')
```

## Key Takeaways

Always use no_log=True for passwords, tokens, keys, and connection strings. Never include sensitive values in return data, log messages, or error messages. Use task-level no_log for extra protection.
