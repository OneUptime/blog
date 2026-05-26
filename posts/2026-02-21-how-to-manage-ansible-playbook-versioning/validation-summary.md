# Validation Summary: How to Manage Ansible Playbook Versioning

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules and lookup plugins
- Git tags and release workflow commands
- Semantic Versioning
- GitHub Actions release workflows
- YAML changelog files

## Sources Consulted
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible lookup plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible `ansible.builtin.file` lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_lookup.html
- Ansible `ansible.builtin.pipe` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pipe_lookup.html
- Ansible special variables and facts documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible `now()` templating documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating_now.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `mandatory` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/mandatory_filter.html
- Git tag documentation: https://git-scm.com/docs/git-tag
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/reference/workflow-syntax-for-github-actions
- GitHub Actions variables reference: https://docs.github.com/en/actions/reference/workflows-and-actions/variables
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- softprops/action-gh-release README: https://github.com/softprops/action-gh-release
- Semantic Versioning 2.0.0 specification: https://semver.org/

## Issues Found
- The server version stamp example used `ansible.builtin.copy` with templated `content`. Ansible's copy module documentation warns that variable interpolation in `content` can produce unpredictable results and recommends `ansible.builtin.template` for that use case. Changed the task to use `ansible.builtin.template` and added the corresponding `ansible-version.j2` template content.
- The version stamp example used `ansible_date_time.iso8601`, which depends on gathered facts and can become stale in long-running playbooks. Changed it to Ansible's `now(utc=true, fmt=...)` templating function so the timestamp works without relying on fact gathering.
- The examples used short lookup plugin names (`file` and `pipe`). Current Ansible documentation recommends fully qualified collection names for built-in plugins to avoid conflicts. Updated the examples to use `ansible.builtin.file` and `ansible.builtin.pipe`.
- The GitHub Actions release workflow imported `yaml` without installing PyYAML. Added an explicit `python3 -m pip install pyyaml` step before the changelog extraction script.
- The GitHub Release step used an outdated `softprops/action-gh-release@v1` pin and passed `${{ github.ref }}` as `tag_name`, which is the fully formed ref such as `refs/tags/v2.3.0`. Updated the action to the current documented major version and changed `tag_name` to `${{ github.ref_name }}`.

## Review Notes
The article's overall recommendations are technically sound: SemVer-style tags, changelogs, deploying from tags, server-side version stamping, and rollback by checking out a previous tag are appropriate practices for Ansible project release management. The rollback playbook shown verifies tag existence but does not perform the checkout or deployment itself; that is acceptable because it is presented as a starting point for CI rollback automation rather than a complete pipeline.
