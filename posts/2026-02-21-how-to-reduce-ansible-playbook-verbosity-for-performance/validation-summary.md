# Validation Summary: How to Reduce Ansible Playbook Verbosity for Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- Ansible callback plugins
- Ansible playbook task keywords
- Ansible configuration files
- Shell output redirection

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible.builtin.minimal callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/minimal_callback.html
- community.general.dense callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/dense_callback.html
- community.general.null callback documentation: https://docs.ansible.com/ansible/latest/collections/community/general/null_callback.html
- community.general.yaml callback deprecation documentation: https://docs.ansible.com/projects/ansible/11/collections/community/general/yaml_callback.html
- Ansible logging documentation, including no_log behavior: https://docs.ansible.com/projects/ansible/latest/reference_appendices/logging.html
- Ansible conditionals and registered variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible error handling documentation for changed_when: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html

## Issues Found
- The post described `minimal` as producing the least output, but the post also recommends a no-output callback. Changed the wording to say it produces less output than the default callback while still showing task results.
- The `dense` callback was shown as `stdout_callback = dense` without noting that current Ansible documentation places it in the `community.general` collection. Updated the snippet to `stdout_callback = community.general.dense` and added the collection caveat.
- The `dense` callback behavior was described as overwriting the previous line and not generating growing output. Current official documentation describes it as compact stdout output and notes that it behaves like the default callback in verbose mode, so the explanation was corrected.
- The `null` callback was shown as `stdout_callback = null` without noting that current documentation places it in `community.general`. Updated the snippet to `stdout_callback = community.general.null` and added the collection caveat.
- The post said every `register` includes the result in output processing. Registered variables are stored in memory and can increase verbose or later debug output, but they do not automatically enlarge normal output. Updated the explanation.
- The post implied `changed_when: false` is a direct output performance optimization. Official documentation frames `changed_when` as change-state control that affects statistics and handlers, so the section was corrected to emphasize accurate change reporting and handler behavior.
- The `tee` example described terminal output as minimal, but `tee` mirrors the command's full output to both destinations. Updated the wording.
- The development config used `stdout_callback = yaml`. The `community.general.yaml` callback is deprecated and removed in favor of using the default callback with `callback_result_format = yaml`, so the config was updated.
- The performance summary said percentages compound in a way that could be read as additive or guaranteed. Updated the wording to clarify that effects can compound but exact percentages should not be summed.

## Review Notes
The specific performance percentages remain anecdotal results from the author's testing and are acceptable because they are presented as test results rather than universal guarantees. The local environment did not have `ansible-playbook` installed, so CLI verification was performed against official Ansible documentation rather than local `--help` output.
