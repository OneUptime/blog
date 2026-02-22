# How to Use Ansible Module with Timeout Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Timeout, Module Development, Python

Description: Add timeout handling to custom Ansible modules for operations that may hang or take too long.

---

Long-running operations need timeout handling to prevent modules from hanging indefinitely.

## Signal-Based Timeout

```python
import signal

class TimeoutError(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutError('Operation timed out')

def run_module():
    module = AnsibleModule(
        argument_spec=dict(
            name=dict(type='str', required=True),
            timeout=dict(type='int', default=60),
        ),
    )

    timeout = module.params['timeout']

    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout)

    try:
        result = long_running_operation(module.params['name'])
        signal.alarm(0)  # Cancel alarm
        module.exit_json(changed=True, result=result)
    except TimeoutError:
        module.fail_json(msg=f'Operation timed out after {timeout}s')
    except Exception as e:
        signal.alarm(0)
        module.fail_json(msg=str(e))
```

## Thread-Based Timeout

For operations that do not support signals:

```python
import threading

def run_with_timeout(func, timeout):
    result = [None]
    error = [None]

    def wrapper():
        try:
            result[0] = func()
        except Exception as e:
            error[0] = e

    thread = threading.Thread(target=wrapper)
    thread.start()
    thread.join(timeout)

    if thread.is_alive():
        return None, 'Timed out'
    if error[0]:
        return None, str(error[0])
    return result[0], None
```

## Key Takeaways

Always add timeouts for network operations, API calls, and shell commands. Use signal-based timeouts when possible. Fall back to thread-based for complex operations. Make the timeout configurable as a module parameter.
