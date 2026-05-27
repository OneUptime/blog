# Validation Summary: How to Use Ansible Module with Async Support

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible asynchronous task execution
- ansible.builtin.async_status
- Custom Ansible module development
- Python

## Sources Consulted
- Ansible Community Documentation: Asynchronous actions and polling - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- Ansible Community Documentation: ansible.builtin.async_status module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- Ansible Community Documentation: Developing modules - https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_modules_general.html

## Issues Found
- The first playbook example used `poll: 30` and then called `ansible.builtin.async_status` in a separate task. With `poll` set to a positive value, Ansible waits for the async task to complete, fail, or time out before moving to the next task. The official documentation also notes that the temporary async job cache file is automatically removed when an async task completes with polling enabled. I changed the example to use `poll: 0`, which is the documented pattern when registering a job ID and waiting later with `async_status`.
- The first `async_status` wait condition used `until: result.finished`. The latest Ansible examples use the `is finished` test. I changed it to `until: result is finished` to match current official documentation.

## Review Notes
- The Python module snippet is intentionally partial and focuses on the async-relevant module body. A complete standalone module would also include the `AnsibleModule` import and the usual `main()` entry point.
- For `poll: 0` tasks, Ansible does not automatically clean up the async job cache file. A future revision could add an `async_status` cleanup example after completion.
