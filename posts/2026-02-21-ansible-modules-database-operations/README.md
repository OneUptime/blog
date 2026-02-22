# How to Create Ansible Modules for Database Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Database, Module Development, Python

Description: Build custom Ansible modules for database operations like schema management and query execution.

---

Database modules need to handle connections, execute queries, and manage transactions safely.

## PostgreSQL Module Example

```python
#!/usr/bin/python
from ansible.module_utils.basic import AnsibleModule

try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

def run_module():
    module = AnsibleModule(
        argument_spec=dict(
            host=dict(type='str', default='localhost'),
            port=dict(type='int', default=5432),
            database=dict(type='str', required=True),
            user=dict(type='str', required=True),
            password=dict(type='str', no_log=True, required=True),
            setting_name=dict(type='str', required=True),
            setting_value=dict(type='str', required=True),
        ),
        supports_check_mode=True,
    )

    if not HAS_PSYCOPG2:
        module.fail_json(msg='psycopg2 is required. Install with: pip install psycopg2-binary')

    try:
        conn = psycopg2.connect(
            host=module.params['host'],
            port=module.params['port'],
            dbname=module.params['database'],
            user=module.params['user'],
            password=module.params['password'],
        )
        conn.autocommit = True
        cursor = conn.cursor()

        # Check current value
        cursor.execute('SHOW %s', (module.params['setting_name'],))
        current = cursor.fetchone()[0]

        if current == module.params['setting_value']:
            module.exit_json(changed=False, current_value=current)
            return

        if module.check_mode:
            module.exit_json(changed=True, current_value=current)
            return

        cursor.execute(
            'ALTER SYSTEM SET %s = %s',
            (module.params['setting_name'], module.params['setting_value'])
        )
        cursor.execute('SELECT pg_reload_conf()')
        module.exit_json(changed=True)

    except psycopg2.Error as e:
        module.fail_json(msg='Database error: ' + str(e))
    finally:
        if conn:
            conn.close()

def main():
    run_module()

if __name__ == '__main__':
    main()
```

## Key Takeaways

Check for database driver availability at import time. Use try/finally to close connections. Handle database-specific exceptions. Support check mode by querying current state without making changes.
