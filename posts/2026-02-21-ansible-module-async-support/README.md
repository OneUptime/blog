# How to Use Ansible Module with Async Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Async, Module Development, Python

Description: Build custom Ansible modules that support asynchronous execution for long-running operations.

---

Ansible's async feature runs tasks in the background and polls for completion. Custom modules support this automatically.

## Using Async in Playbooks

```yaml
- name: Start long-running task
  my_long_module:
    name: big-migration
  async: 3600  # Max runtime: 1 hour
  poll: 30     # Check every 30 seconds
  register: job

- name: Wait for completion
  ansible.builtin.async_status:
    jid: '{{ job.ansible_job_id }}'
  register: result
  until: result.finished
  retries: 120
  delay: 30
```

## Fire and Forget

```yaml
- name: Start background task
  my_long_module:
    name: background-job
  async: 3600
  poll: 0  # Do not wait
  register: bg_job

# Do other things...

- name: Check on background task later
  ansible.builtin.async_status:
    jid: '{{ bg_job.ansible_job_id }}'
  register: bg_result
```

## Module Design for Async

Modules do not need special code for async support. Ansible handles the async wrapper. Just ensure your module:

1. Performs the work synchronously
2. Returns properly with exit_json
3. Handles long-running operations gracefully

```python
def run_module():
    module = AnsibleModule(
        argument_spec=dict(
            name=dict(type='str', required=True),
            timeout=dict(type='int', default=3600),
        ),
    )

    # This runs in the background when async is used
    result = perform_long_operation(module.params['name'])
    module.exit_json(changed=True, result=result)
```

## Key Takeaways

Async is handled by Ansible's execution framework, not the module itself. Design modules that complete their work and return. Use async and poll in playbooks for long tasks. Use poll=0 for fire-and-forget patterns.
