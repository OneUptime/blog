# Validation Summary: How to Use Ansible max_fail_percentage for Failure Thresholds

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible error handling
- Ansible `max_fail_percentage`
- Ansible `serial`
- Ansible `any_errors_fatal`
- Ansible blocks and rescue handlers
- community.docker modules
- community.general.haproxy module

## Sources Consulted
- Ansible error handling in playbooks: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- community.docker.docker_image module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- community.general.haproxy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/haproxy_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.include_role module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_role_module.html

## Issues Found
- The post described `max_fail_percentage` as a cumulative global threshold. Updated the wording to state that Ansible evaluates failures against the current batch of hosts, matching the official playbook keyword and error-handling documentation.
- The `serial` section claimed there were both per-batch and total failure protections. Removed the global-threshold implication because Ansible applies `max_fail_percentage` to each batch when `serial` is used.
- The post implied `any_errors_fatal` stops immediately on the first failure. Updated the wording to clarify that Ansible finishes the failing task on all hosts in the current batch, then stops the play on all hosts.
- The example text included an illustrative abort message that could be mistaken for exact Ansible output. Replaced it with a neutral description that Ansible aborts the rest of the play.
- The reporting section implied a `rescue` block runs specifically when the threshold is hit. Updated it to explain that `rescue` handles failures on the affected hosts before the threshold stops the play.

## Review Notes
The Docker examples use module short names. The current official documentation recommends fully qualified collection names such as `community.docker.docker_image` and `community.docker.docker_container` for clarity, but the short names remain common in playbooks when the relevant collection is available.
