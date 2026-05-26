# Validation Summary: How to Use Ansible Playbook --syntax-check

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-playbook CLI
- ansible-lint
- YAML
- Jinja2 templating
- Ansible Vault
- GitHub Actions
- GitLab CI/CD
- Git pre-commit hooks

## Sources Consulted
- Ansible Community Documentation: ansible-playbook CLI options, including `--syntax-check`, `--check`, `--diff`, inventory, and vault options: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Lint Documentation: `syntax-check` rule behavior, including missing files, unknown modules, and undefined-variable caveats: https://ansible.readthedocs.io/projects/lint/rules/syntax-check/
- Ansible Documentation: check mode and diff mode behavior: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible Core Documentation: vault password options for encrypted variables and files: https://docs.ansible.com/projects/ansible-core/2.13/user_guide/vault.html
- Ansible Community Documentation: playbook keywords, including `gather_facts`: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- GitHub Docs: workflow syntax and path filters for GitHub Actions: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax
- GitLab Docs: CI/CD YAML syntax and `rules:changes`: https://docs.gitlab.com/ee/ci/yaml/
- Local verification with `ansible-core 2.21.0` and `ansible-lint 26.4.0`.

## Issues Found
- The post said syntax check catches missing required module parameters in some cases. Current Ansible syntax checking does not broadly validate module parameters before execution, but it does catch unresolved modules/actions. Updated the catches list accordingly.
- The Jinja2 example used a malformed expression inside a `debug.msg` value, which still passes `ansible-playbook --syntax-check` because that task argument is not templated during parsing. Replaced it with a malformed `import_tasks` expression, which fails while Ansible loads the playbook.
- The post claimed a nonexistent module passes syntax check and fails only at runtime. Current Ansible reports unresolved modules/actions during syntax check. Replaced that example with an invalid module parameter, which is syntactically valid and passes syntax check.
- The undefined-variable limitation was too broad. Updated it to note that most task-level undefined variables are runtime issues, while variables used in parse-time fields such as `hosts` can fail during syntax check.
- The vault section implied syntax checking still works for unencrypted parts without a vault password. Updated it to clarify that syntax check can fail when encrypted variables or files must be loaded.
- The boolean example described `True` as a Python boolean instead of YAML and placed `gather_facts` incorrectly inside a task. Updated it to a valid play-level `gather_facts: true` example and framed lowercase booleans as a linting/style preference.

## Review Notes
- The CI and shell loop examples are technically plausible but intentionally simple. In a production repository, the scripts should handle nested playbooks, `.yaml` files, filenames with spaces, and shell glob behavior when no files match.
- `ansible-lint` includes syntax checking and can also report YAML style issues such as truthy boolean style and duplicate keys that `ansible-playbook --syntax-check` may only warn about or ignore.
