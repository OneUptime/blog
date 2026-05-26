# Validation Summary: How to Use the Ansible git Module with Tags

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.git module
- ansible.builtin.shell module
- ansible.builtin.uri module
- Ansible block/rescue error handling
- Jinja/Ansible filters
- Git tags
- git ls-remote
- git describe

## Sources Consulted
- Ansible ansible.builtin.git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible block error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible loop/retry documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible ansible.builtin.last filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/last_filter.html
- Git git-ls-remote documentation: https://git-scm.com/docs/git-ls-remote
- Git git-describe documentation: https://git-scm.com/docs/git-describe
- Git git-tag documentation: https://git-scm.com/docs/git-tag

## Issues Found
- The post described Git tags as immutable and said a tag always points to the same commit. Git tags can be replaced with `git tag --force` and deleted, so this was changed to say published release tags should remain stable and point to a specific commit.
- The "latest 5 tags" example used `available_tags.stdout_lines | last(5)`, but Ansible's documented `last` filter returns the last item of a sequence and does not take a count argument. This was changed to `available_tags.stdout_lines[-5:]`.

## Review Notes
- The Ansible `git` module usage with `repo`, `dest`, `version`, `force`, and `depth` matches the documented parameters.
- The Git commands use documented options for `git ls-remote --tags` and `git describe --tags --exact-match`.
- The health check retry behavior with `retries` and no explicit `until` relies on Ansible 2.16 or newer behavior, where a task retries until it succeeds up to the configured retry count.
