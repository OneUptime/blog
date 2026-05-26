# Validation Summary: How to Configure ansible-lint for Monorepos

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible
- ansible-lint
- ansible.cfg
- ansible-galaxy
- GitHub Actions
- GitLab CI
- pre-commit
- yamllint
- Makefile

## Sources Consulted
- Ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible-lint profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions setup-python documentation: https://github.com/actions/setup-python
- GitLab CI rules documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- ansible-lint GitHub releases: https://github.com/ansible/ansible-lint/releases
- yamllint PyPI release history: https://pypi.org/project/yamllint/

## Issues Found
- The post stated that ansible-lint tries to parse every YAML file in the repository. Current ansible-lint documentation says it uses heuristics to determine file types when run without arguments, so the wording was changed to describe the real risk: mixed YAML files can still be picked up, misclassified, or reported as YAML issues if linting is not scoped or excluded correctly.
- The multiple-project commands ran `ansible-lint team-platform/ansible/` and `ansible-lint team-security/ansible/` from the monorepo root while claiming each project would use its own configuration. Current ansible-lint documentation says configuration is loaded from the current project root or an explicitly specified config file, so the commands were changed to run from each Ansible project directory.
- The shared-role example said the `.ansible-lint` file would include shared roles in linting. `roles_path` helps Ansible and ansible-lint syntax checks resolve roles, but it does not by itself mean every external shared role is a lint target. The wording was changed to "Resolve shared roles during linting."
- The Kubernetes false-positive explanation repeated the overly broad claim that ansible-lint would parse those files as playbooks. The wording was corrected to mention YAML reports or possible misclassification.
- The pre-commit example pinned older tool versions. The ansible-lint hook was updated from `v24.10.0` to `v26.4.0`, and yamllint was updated from `v1.35.1` to `v1.38.0`.

## Review Notes
The examples are otherwise consistent with current documented ansible-lint configuration keys such as `profile`, `exclude_paths`, and `skip_list`, current Ansible configuration keys such as `roles_path` and `collections_path`, and documented GitHub Actions and GitLab CI path-based execution patterns. The local environment did not have ansible-lint or Ansible installed, so CLI behavior was verified against official documentation rather than local `--help` output.
